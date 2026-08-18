import type { Order } from "@/lib/api/types";

export type CafeCancelledByRole = "Chef/Kitchen" | "Bar" | "Cashier" | "Admin";

export type CafeCancelledByFilter =
  | "all"
  | "chef"
  | "bar"
  | "cashier"
  | "admin";

const CHEF_KITCHEN = "Chef/Kitchen" as const;
const BAR = "Bar" as const;
const CASHIER = "Cashier" as const;
const ADMIN = "Admin" as const;

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
  if (v.includes("admin") || v.includes("manager") || v.includes("reception")) {
    return ADMIN;
  }
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

/**
 * Digital: Chef/Kitchen, Bar, or Cashier.
 * Analog: Admin (manager/admin cancel) or Cashier.
 */
export function normalizeCafeCancelledByLabel(
  order: Pick<Order, "cancelledBy" | "category" | "type">,
  analog = false,
): CafeCancelledByRole {
  const mapped = mapRawCancelledBy(String(order.cancelledBy ?? ""));
  if (analog) {
    if (mapped === CASHIER) return CASHIER;
    if (mapped === ADMIN) return ADMIN;
    if (mapped) return mapped;
    return ADMIN;
  }
  if (mapped === ADMIN) return CASHIER;
  if (mapped) return mapped;
  return inferCancelledByFromOrder(order);
}

export function cafeCancelledByFilterOptions(analog: boolean): {
  value: CafeCancelledByFilter;
  label: string;
}[] {
  if (analog) {
    return [
      { value: "all", label: "All" },
      { value: "admin", label: "Cancelled by admin" },
      { value: "cashier", label: "Cancelled by cashier" },
    ];
  }
  return [
    { value: "all", label: "All" },
    { value: "chef", label: "Cancelled by chef" },
    { value: "bar", label: "Cancelled by bar" },
    { value: "cashier", label: "Cancelled by cashier" },
  ];
}

export function matchesCafeCancelledByFilter(
  order: Pick<Order, "cancelledBy" | "category" | "type">,
  analog: boolean,
  filter: CafeCancelledByFilter,
): boolean {
  if (filter === "all") return true;
  const label = normalizeCafeCancelledByLabel(order, analog);
  if (filter === "chef") return label === CHEF_KITCHEN;
  if (filter === "bar") return label === BAR;
  if (filter === "cashier") return label === CASHIER;
  if (filter === "admin") return label === ADMIN;
  return true;
}
