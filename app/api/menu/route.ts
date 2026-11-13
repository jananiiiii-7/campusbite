import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await getSupabase()
    .from("menu_items")
    .select("id, name, category, price, is_veg, stock, prep_minutes, description")
    .order("category", { ascending: true })
    .order("price", { ascending: true });

  if (error) {
    console.error("[GET /api/menu]", error.message);
    return NextResponse.json({ error: "Could not load the menu." }, { status: 500 });
  }
  return NextResponse.json({ items: data });
}
