"use client";

import { useState } from "react";
import Link from "next/link";
import AgentChat from "@/components/AgentChat";
import MenuPanel from "@/components/MenuPanel";
import WalletOrders from "@/components/WalletOrders";

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">SRM campus canteen</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">CampusBite</h1>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/kitchen" className="text-sm font-medium text-slate-600 hover:text-slate-950">
            Kitchen screen
          </Link>
          <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-900">
            Log out
          </button>
        </nav>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <AgentChat onDataChanged={() => setRefreshKey((k) => k + 1)} />
        </section>
        <section className="space-y-5 lg:col-span-2">
          <WalletOrders refreshKey={refreshKey} />
          <MenuPanel refreshKey={refreshKey} />
        </section>
      </div>
    </main>
  );
}
