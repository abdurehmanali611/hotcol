import type { SortingState } from "@tanstack/react-table";

/** Default table sort: voucher column ascending (0001, 0002, …). */
export const VOUCHER_TABLE_SORT: SortingState = [{ id: "voucher", desc: false }];

export function voucherSortKey(
  row: { voucherNumber?: number | null },
): number {
  return Math.max(0, Math.floor(Number(row.voucherNumber) || 0));
}

export function sortRowsByVoucherNumber<
  T extends { voucherNumber?: number | null },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => voucherSortKey(a) - voucherSortKey(b));
}
