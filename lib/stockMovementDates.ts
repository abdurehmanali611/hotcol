import type { StockOutRequestRow } from "@/lib/actions";
import { toYmdLocal } from "@/lib/hotelDateYmd";

export type StockMovementDateRow = Pick<
  StockOutRequestRow,
  "movementDate" | "createdAt"
>;

/** Business date for a stock movement (selected day when stocking out, else createdAt). */
export function stockMovementBusinessDate(
  row: StockMovementDateRow,
): string | Date | null | undefined {
  return row.movementDate ?? row.createdAt;
}

export function formatStockMovementBusinessDate(
  row: StockMovementDateRow,
  style: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const raw = stockMovementBusinessDate(row);
  if (!raw) return "—";
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleDateString(undefined, style);
}

/** Local calendar YYYY-MM-DD for grouping / filters (not UTC ISO date). */
export function stockMovementBusinessDateYmd(row: StockMovementDateRow): string {
  const raw = stockMovementBusinessDate(row);
  if (!raw) return "";
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return "";
  return toYmdLocal(t);
}
