import { NextResponse } from "next/server";
import { CURRENT_STUDENT_ID } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabase();
  const [walletResult, ordersResult] = await Promise.all([
    supabase
      .from("wallets")
      .select("student_id, name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .maybeSingle(),
    supabase
      .from("orders")
      .select(
        "id, total, status, created_at, pickup_slots(slot_time), order_items(quantity, price, menu_items(name))"
      )
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (walletResult.error) {
    console.error("[GET /api/me] wallet", walletResult.error.message);
    return NextResponse.json({ error: "Could not load the wallet." }, { status: 500 });
  }
  if (ordersResult.error) {
    console.error("[GET /api/me] orders", ordersResult.error.message);
    return NextResponse.json({ error: "Could not load recent orders." }, { status: 500 });
  }
  if (!walletResult.data) {
    return NextResponse.json({ error: "Wallet not found for the current student." }, { status: 404 });
  }

  return NextResponse.json({ wallet: walletResult.data, orders: ordersResult.data });
}
