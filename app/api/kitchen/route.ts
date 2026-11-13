import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateStatusSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.enum(["preparing", "ready", "collected"]),
});

const nextStatus: Record<string, string> = {
  placed: "preparing",
  preparing: "ready",
  ready: "collected",
};

export async function GET() {
  const { data, error } = await getSupabase()
    .from("orders")
    .select(
      "id, student_id, total, status, created_at, wallets(name), pickup_slots(slot_time), order_items(quantity, price, menu_items(name))"
    )
    .in("status", ["placed", "preparing", "ready"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/kitchen]", error.message);
    return NextResponse.json({ error: "Could not load kitchen orders." }, { status: 500 });
  }
  return NextResponse.json({ orders: data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order status update.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  const { data: current, error: lookupError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", parsed.data.order_id)
    .maybeSingle();

  if (lookupError) {
    console.error("[POST /api/kitchen] lookup", lookupError.message);
    return NextResponse.json({ error: "Could not find that order." }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (nextStatus[current.status] !== parsed.data.status) {
    return NextResponse.json(
      { error: `Cannot move an order from ${current.status} to ${parsed.data.status}.` },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.order_id)
    .eq("status", current.status)
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error("[POST /api/kitchen] update", error.message);
    return NextResponse.json({ error: "Could not update the order." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Order status changed; refresh and try again." }, { status: 409 });
  }
  return NextResponse.json({ order: data });
}
