import type { Order } from "@/lib/actions";
import {
  cafeBusinessDateYmd,
  isSameCafeBusinessDay,
} from "@/lib/cafeBusinessDay";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";

export type CafeCategoryRevenue = {
  key: string;
  label: string;
  revenueETB: number;
  lineCount: number;
};

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
  const map = new Map<string, { revenue: number; lines: number }>();

  for (const order of orders) {
    if (!rowHotelMatchesTenantScope(order.HotelName, hotelName)) continue;
    if (!isPaidCafeOrderLine(order)) continue;
    if (!isSameCafeBusinessDay(order.createdAt, refDate)) continue;

    const key = normalizeCafeCategoryKey(order.category);
    const sales =
      (Number(order.price) || 0) * (Number(order.orderAmount) || 0);
    const row = map.get(key) ?? { revenue: 0, lines: 0 };
    row.revenue += sales;
    row.lines += 1;
    map.set(key, row);
  }

  const categories: CafeCategoryRevenue[] = [];

  for (const key of CATEGORY_ORDER) {
    const row = map.get(key);
    if (!row) continue;
    categories.push({
      key,
      label: formatCafeCategoryLabel(key),
      revenueETB: row.revenue,
      lineCount: row.lines,
    });
    map.delete(key);
  }

  for (const [key, row] of map) {
    categories.push({
      key,
      label: formatCafeCategoryLabel(key),
      revenueETB: row.revenue,
      lineCount: row.lines,
    });
  }

  const totalETB = categories.reduce((sum, item) => sum + item.revenueETB, 0);
  return { categories, totalETB };
}
