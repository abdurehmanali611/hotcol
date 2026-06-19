import type { Order } from "@/lib/api/types";

export type CafeCancelledByRole = "Chef/Kitchen" | "Bar" | "Cashier";

const CHEF_KITCHEN = "Chef/Kitchen" as const;
const BAR = "Bar" as const;
const CASHIER = "Cashier" as const;

function mapRawCancelledBy(raw: string): CafeCancelledByRole | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v.includes("chef") || v.includes("kitchen") || v === "food") {
    return CHEF_KITCHEN;
  }
  if (v.includes("barista") || v.includes("bar") || v === "beverage") {
    return BAR;
  }
  if (v.includes("cashier")) return CASHIER;
  return null;
}

function inferCancelledByFromOrder(
  order: Pick<Order, "category" | "type">,
): CafeCancelledByRole {
  const category = String(order.category ?? "").trim().toLowerCase();
  const type = String(order.type ?? "").trim().toLowerCase();
  if (category === "beverage" || type.includes("beverage") || type.includes("drink")) {
    return BAR;
  }
  if (category === "food") return CHEF_KITCHEN;
  return CASHIER;
}

/** Admin cancelled-orders: only Chef/Kitchen, Bar, or Cashier. */
export function normalizeCafeCancelledByLabel(
  order: Pick<Order, "cancelledBy" | "category" | "type">,
): CafeCancelledByRole {
  const mapped = mapRawCancelledBy(String(order.cancelledBy ?? ""));
  if (mapped) return mapped;
  return inferCancelledByFromOrder(order);
}
