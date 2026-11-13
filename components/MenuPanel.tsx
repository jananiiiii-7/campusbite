"use client";

import { useEffect, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  is_veg: boolean;
  stock: number;
  prep_minutes: number;
  description: string;
};

const categories = [
  { key: "meal", label: "Meals" },
  { key: "snack", label: "Snacks" },
  { key: "drink", label: "Drinks" },
  { key: "sweet", label: "Sweets" },
];

export default function MenuPanel({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMenu() {
      try {
        const response = await fetch("/api/menu", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load the menu.");
        if (active) {
          setItems(result.items as MenuItem[]);
          setError("");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load the menu.");
      }
    }

    void loadMenu();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold">Today's menu</h2>
        <p className="text-xs text-slate-500">Live availability from the canteen</p>
      </div>
      <div className="space-y-5 p-5">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && items.length === 0 && <p className="text-sm text-slate-500">Loading menu...</p>}
        {categories.map((category) => {
          const categoryItems = items.filter((item) => item.category === category.key);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category.key}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {category.label}
              </h3>
              <ul className="divide-y divide-slate-100">
                {categoryItems.map((item) => (
                  <li key={item.id} className="py-3 first:pt-1 last:pb-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            aria-label={item.is_veg ? "Vegetarian" : "Non-vegetarian"}
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              item.is_veg ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          <p className="text-sm font-medium">{item.name}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">Rs {item.price}</p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            item.stock === 0
                              ? "bg-rose-50 text-rose-700"
                              : item.stock <= 5
                                ? "bg-amber-50 text-amber-800"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {item.stock === 0
                            ? "Sold out"
                            : item.stock <= 5
                              ? `Only ${item.stock} left`
                              : `In stock: ${item.stock}`}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
