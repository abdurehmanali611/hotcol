import type { Order } from "@/lib/actions";
import {
  cafeBusinessDateYmd,
  isSameCafeBusinessDay,
} from "@/lib/cafeBusinessDay";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";

export type CafeRevenueBreakdownItem = {
  key: string;
  label: string;
  revenueETB: number;
  lineCount: number;
};

/** @deprecated Use CafeRevenueBreakdownItem */
export type CafeCategoryRevenue = CafeRevenueBreakdownItem;

const CATEGORY_ORDER = ["food", "beverage", "others"] as const;

export function normalizeCafeCategoryKey(category?: string | null): string {
  const value = String(category ?? "").trim().toLowerCase();
  if (value === "food") return "food";
  if (value === "beverage") return "beverage";
  if (value === "others") return "others";
  return value || "others";
}

export function formatCafeCategoryLabel(key: string): string {
  if (key === "food") return "Food";
  if (key === "beverage") return "Beverage";
  if (key === "others") return "Others";
  if (!key) return "Others";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function isPaidCafeOrderLine(order: Order): boolean {
  if (String(order.payment ?? "").trim().toLowerCase() !== "paid") return false;
  if (String(order.status ?? "").trim().toLowerCase() === "cancelled") {
    return false;
  }
  return true;
}

export function formatCafeRevenueETB(amount: number): string {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
}

export function formatCafeBusinessDayLabel(ref: Date = new Date()): string {
  const ymd = cafeBusinessDateYmd(ref);
  if (!ymd) return "Today";
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function computeDailyCafeRevenueByCategory(
  orders: Order[],
  hotelName: string,
  refDate: Date = new Date(),
): { categories: CafeCategoryRevenue[]; totalETB: number } {
  const raw = accumulatePaidCafeRevenue(
    orders,
    hotelName,
    refDate,
    (order) => normalizeCafeCategoryKey(order.category),
    (order) => formatCafeCategoryLabel(normalizeCafeCategoryKey(order.category)),
  );

  const byKey = new Map(raw.map((row) => [row.key, row]));
  const categories: CafeCategoryRevenue[] = [];

  for (const key of CATEGORY_ORDER) {
    const row = byKey.get(key);
    if (!row) continue;
    categories.push({
      key,
      label: formatCafeCategoryLabel(key),
      revenueETB: row.revenueETB,
      lineCount: row.lineCount,
    });
    byKey.delete(key);
  }

  for (const row of byKey.values()) {
    categories.push({
      key: row.key,
      label: formatCafeCategoryLabel(row.key),
      revenueETB: row.revenueETB,
      lineCount: row.lineCount,
    });
  }

  const totalETB = categories.reduce((sum, item) => sum + item.revenueETB, 0);
  return { categories, totalETB };
}

export function normalizeCafeTypeKey(type?: string | null): string {
  const value = String(type ?? "").trim();
  if (!value) return "uncategorized";
  return value.toLowerCase();
}

export function formatCafeTypeLabel(key: string, fallbackLabel?: string): string {
  const trimmed = String(fallbackLabel ?? "").trim();
  if (trimmed) return trimmed;
  if (key === "uncategorized") return "Uncategorized";
  return key
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function accumulatePaidCafeRevenue(
  orders: Order[],
  hotelName: string,
  refDate: Date,
  keyForOrder: (order: Order) => string,
  labelForOrder: (order: Order) => string,
): CafeRevenueBreakdownItem[] {
  const map = new Map<
    string,
    { revenue: number; lines: number; label: string }
  >();

  for (const order of orders) {
    if (!rowHotelMatchesTenantScope(order.HotelName, hotelName)) continue;
    if (!isPaidCafeOrderLine(order)) continue;
    if (!isSameCafeBusinessDay(order.createdAt, refDate)) continue;

    const key = keyForOrder(order);
    const sales =
      (Number(order.price) || 0) * (Number(order.orderAmount) || 0);
    const row = map.get(key) ?? {
      revenue: 0,
      lines: 0,
      label: labelForOrder(order),
    };
    row.revenue += sales;
    row.lines += 1;
    if (!row.label) row.label = labelForOrder(order);
    map.set(key, row);
  }

  return [...map.entries()]
    .map(([key, row]) => ({
      key,
      label: formatCafeTypeLabel(key, row.label),
      revenueETB: row.revenue,
      lineCount: row.lines,
    }))
    .sort((a, b) => b.revenueETB - a.revenueETB || a.label.localeCompare(b.label));
}

export function computeDailyCafeRevenueByType(
  orders: Order[],
  hotelName: string,
  refDate: Date = new Date(),
): { types: CafeRevenueBreakdownItem[]; totalETB: number } {
  const types = accumulatePaidCafeRevenue(
    orders,
    hotelName,
    refDate,
    (order) => normalizeCafeTypeKey(order.type),
    (order) => String(order.type ?? "").trim() || "Uncategorized",
  );
  const totalETB = types.reduce((sum, item) => sum + item.revenueETB, 0);
  return { types, totalETB };
}
