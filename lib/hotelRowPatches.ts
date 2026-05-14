import type { PurchaseRequestRow, StockOutRequestRow } from "@/lib/actions";

export function patchPurchaseRequestStatus(
  rows: PurchaseRequestRow[],
  id: number,
  status: string,
): PurchaseRequestRow[] {
  return rows.map((row) => (row.id === id ? { ...row, status } : row));
}

export function patchStockOutRequestStatus(
  rows: StockOutRequestRow[],
  id: number,
  status: string,
): StockOutRequestRow[] {
  return rows.map((row) => (row.id === id ? { ...row, status } : row));
}
