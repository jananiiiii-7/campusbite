"use client";

import { useEffect, useState } from "react";
import { formatSlot } from "@/lib/campusbite";

type KitchenOrder = {
  id: number;
  student_id: string;
  total: number;
  status: "placed" | "preparing" | "ready";
  created_at: string;
  wallets: { name: string } | { name: string }[] | null;
  pickup_slots: { slot_time: string } | { slot_time: string }[] | null;
  order_items: {
    quantity: number;
    price: number;
    menu_items: { name: string } | { name: string }[] | null;
  }[];
};

function firstRelation<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

const columns = [
  { status: "placed", title: "New orders", next: "preparing", action: "Start preparing" },
  { status: "preparing", title: "Preparing", next: "ready", action: "Mark ready" },
  { status: "ready", title: "Ready for pickup", next: "collected", action: "Mark collected" },
] as const;

export default function KitchenBoard() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [error, setError] = useState("");
  const [busyOrder, setBusyOrder] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        const response = await fetch("/api/kitchen", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load kitchen orders.");
        if (active) {
          setOrders(result.orders as KitchenOrder[]);
          setError("");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load kitchen orders.");
      }
    }

    void loadOrders();
    const interval = window.setInterval(loadOrders, 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [reloadKey]);

  async function advanceOrder(orderId: number, status: (typeof columns)[number]["next"]) {
    setBusyOrder(orderId);
    setError("");
    try {
      const response = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update the order.");
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the order.");
    } finally {
      setBusyOrder(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">CampusBite - SRM</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Kitchen board</h1>
          <p className="mt-1 text-sm text-slate-400">Live orders - refreshes every 3 seconds</p>
        </div>
        <a
          href="/"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Back to student view
        </a>
      </header>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-rose-900 bg-rose-950/60 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {columns.map((column) => {
          const columnOrders = orders.filter((order) => order.status === column.status);
          return (
            <section key={column.status} className="min-h-[65vh] rounded-2xl border border-slate-800 bg-slate-900/70">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
                <h2 className="font-semibold">{column.title}</h2>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                  {columnOrders.length}
                </span>
              </div>
              <div className="space-y-3 p-3">
                {columnOrders.length === 0 && (
                  <p className="px-2 py-5 text-center text-sm text-slate-500">No orders here right now</p>
                )}
                {columnOrders.map((order) => {
                  const wallet = firstRelation(order.wallets);
                  const pickupSlot = firstRelation(order.pickup_slots);
                  return (
                    <article key={order.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">Order #{order.id}</h3>
                          <p className="mt-1 text-xs text-slate-400">
                            {wallet?.name ?? order.student_id} - pickup{" "}
                            {pickupSlot ? formatSlot(pickupSlot.slot_time) : "-"}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-amber-300">Rs {order.total}</p>
                      </div>
                      <ul className="my-4 space-y-1.5 border-y border-slate-700 py-3 text-sm">
                        {order.order_items.map((item, index) => (
                          <li key={`${order.id}-${index}`} className="flex justify-between gap-2">
                            <span>{firstRelation(item.menu_items)?.name ?? "Menu item"}</span>
                            <span className="text-slate-400">x {item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        disabled={busyOrder !== null}
                        onClick={() => advanceOrder(order.id, column.next)}
                        className="w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
                      >
                        {busyOrder === order.id ? "Updating..." : column.action}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
