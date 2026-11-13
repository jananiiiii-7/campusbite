import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { getSupabase } from "../supabase";
import { CURRENT_STUDENT_ID, formatSlot } from "../campusbite";

const getMenu = defineTool({
  name: "getMenu",
  description:
    "Use this when you need current menu items, prices, dietary options, or stock before recommending or ordering food.",
  schema: z.object({
    category: z.enum(["meal", "snack", "drink", "sweet"]).optional().describe("Optional menu category"),
    veg_only: z.boolean().optional().describe("When true, return only vegetarian items"),
    max_price: z.number().int().positive().optional().describe("Maximum price per item in rupees"),
  }),
  run: async ({ category, veg_only, max_price }) => {
    let query = getSupabase()
      .from("menu_items")
      .select("id, name, category, price, is_veg, stock, prep_minutes, description")
      .gt("stock", 0)
      .order("category", { ascending: true })
      .order("price", { ascending: true });
    if (category) query = query.eq("category", category);
    if (veg_only) query = query.eq("is_veg", true);
    if (max_price !== undefined) query = query.lte("price", max_price);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { count: data.length, items: data };
  },
});

const getWalletBalance = defineTool({
  name: "getWalletBalance",
  description: "Use this when checking the student's current wallet balance or whether they can afford an order.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("wallets")
      .select("name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Wallet not found for the current student.");
    return data;
  },
});

const getPickupSlots = defineTool({
  name: "getPickupSlots",
  description: "Use this when checking which pickup times still have capacity before placing an order.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("pickup_slots")
      .select("id, slot_time, capacity, booked")
      .order("slot_time", { ascending: true });
    if (error) throw new Error(error.message);
    return data
      .filter((slot) => slot.booked < slot.capacity)
      .map((slot) => ({
        id: slot.id,
        time: formatSlot(slot.slot_time),
        capacity: slot.capacity,
        booked: slot.booked,
        free: slot.capacity - slot.booked,
      }));
  },
});

const getMyOrders = defineTool({
  name: "getMyOrders",
  description: "Use this when the student wants to review or cancel one of their recent orders.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("orders")
      .select(
        "id, total, status, created_at, pickup_slots(slot_time), order_items(quantity, price, menu_items(name))"
      )
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return {
      orders: data.map((order) => ({
        ...order,
        pickup_time: order.pickup_slots[0] ? formatSlot(order.pickup_slots[0].slot_time) : null,
      })),
    };
  },
});

const placeOrder = defineTool({
  name: "placeOrder",
  description:
    "Use this when the student clearly asks to place an order, after checking the menu, wallet, and requested pickup slot.",
  writes: true,
  schema: z.object({
    slot_id: z.number().int().positive().describe("Pickup slot ID returned by getPickupSlots"),
    items: z
      .array(
        z.object({
          menu_item_id: z.number().int().positive().describe("Menu item ID returned by getMenu"),
          quantity: z.number().int().min(1).max(5).describe("Quantity of this menu item"),
        })
      )
      .min(1)
      .describe("Items the student explicitly requested"),
  }),
  run: async ({ slot_id, items }) => {
    const { data, error } = await getSupabase().rpc("place_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_slot_id: slot_id,
      p_items: items,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

const cancelOrder = defineTool({
  name: "cancelOrder",
  description: "Use this when the student asks to cancel an order; identify it with getMyOrders first if needed.",
  writes: true,
  schema: z.object({
    order_id: z.number().int().positive().describe("The student's order ID"),
  }),
  run: async ({ order_id }) => {
    const { data, error } = await getSupabase().rpc("cancel_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_order_id: order_id,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

export const tools: AgentTool[] = [
  getMenu,
  getWalletBalance,
  getPickupSlots,
  getMyOrders,
  placeOrder,
  cancelOrder,
];
