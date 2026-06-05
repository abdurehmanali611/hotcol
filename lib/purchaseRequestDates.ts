import type { PurchaseRequestRow } from "@/lib/actions";

export type PurchaseEntranceDateRow = Pick<
  PurchaseRequestRow,
  "entranceDate" | "createdAt"
>;

/** Business date for a purchase line (entrance day, else legacy createdAt). */
export function purchaseEntranceDate(
  row: PurchaseEntranceDateRow,
): string | Date | null | undefined {
  return row.entranceDate ?? row.createdAt;
}

export function formatPurchaseEntranceDate(
  row: PurchaseEntranceDateRow,
  style: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const raw = purchaseEntranceDate(row);
  if (!raw) return "—";
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleDateString(undefined, style);
}

export function purchaseEntranceDateYmd(row: PurchaseEntranceDateRow): string {
  const raw = purchaseEntranceDate(row);
  if (!raw) return "";
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return "";
  return t.toISOString().slice(0, 10);
}
