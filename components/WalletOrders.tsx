"use client";

import { useEffect, useState } from "react";
import { formatSlot } from "@/lib/campusbite";

type OrderItem = {
  quantity: number;
  price: number;
  menu_items: { name: string } | { name: string }[] | null;
};

type StudentOrder = {
  id: number;
  total: number;
  status: string;
  created_at: string;
  pickup_slots: { slot_time: string } | { slot_time: string }[] | null;
  order_items: OrderItem[];
};

type StudentData = {
  wallet: { name: string; balance: number };
  orders: StudentOrder[];
};

function indiaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

export default function WalletOrders({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<StudentData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load wallet and orders.");
        if (active) {
          setData(result as StudentData);
          setError("");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load wallet and orders.");
      }
    }

    void refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  const today = indiaDateKey(new Date());
  const todaysOrders = data?.orders.filter((order) => indiaDateKey(new Date(order.created_at)) === today) ?? [];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-semibold">Your wallet & orders</h2>
          <p className="text-xs text-slate-500">Today at the canteen</p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">Balance</p>
          <p className="font-semibold text-emerald-900">
            {data ? `Rs ${data.wallet.balance}` : "-"}
          </p>
        </div>
      </div>

      <div className="px-5 py-3">
        {error && <p className="py-2 text-sm text-red-600">{error}</p>}
        {!error && data && todaysOrders.length === 0 && (
          <p className="py-3 text-sm text-slate-500">No orders yet today. What sounds good?</p>
        )}
        {todaysOrders.map((order) => {
          const pickupSlot = firstRelation(order.pickup_slots);
          return (
            <article key={order.id} className="border-b border-slate-100 py-3 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Order #{order.id}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {order.order_items
                      .map((item) => `${item.quantity}x ${firstRelation(item.menu_items)?.name ?? "Menu item"}`)
                      .join(", ")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-700">
                  {order.status}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>
                  Pickup{" "}
                  {pickupSlot ? formatSlot(pickupSlot.slot_time) : "time unavailable"}
                </span>
                <span>Rs {order.total}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
