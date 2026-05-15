import type { PurchaseRequestRow, StockOutRequestRow } from "@/lib/actions";

export function patchPurchaseRequestStatus(
  rows: PurchaseRequestRow[],
  id: number,
  status: string,
  patch?: Partial<PurchaseRequestRow>,
): PurchaseRequestRow[] {
  return rows.map((row) =>
    row.id === id ? { ...row, ...patch, status } : row,
  );
}

export function patchStockOutRequestStatus(
  rows: StockOutRequestRow[],
  id: number,
  status: string,
  patch?: Partial<StockOutRequestRow>,
): StockOutRequestRow[] {
  return rows.map((row) =>
    row.id === id ? { ...row, ...patch, status } : row,
  );
}
