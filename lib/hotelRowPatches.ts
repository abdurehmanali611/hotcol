import type {
  ItemRegistration,
  PurchaseRequestRow,
  StockOutRequestRow,
} from "@/lib/actions";

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

export function patchItemRegistrationApproval(
  rows: ItemRegistration[],
  id: number,
  approvalStatus: string,
  patch?: Partial<ItemRegistration>,
): ItemRegistration[] {
  return rows.map((row) =>
    row.id === id ? { ...row, ...patch, approvalStatus } : row,
  );
}

export function patchItemRegistrationsFromBatch(
  rows: ItemRegistration[],
  results: { id: number; approvalStatus: string }[],
): ItemRegistration[] {
  const byId = new Map(results.map((r) => [r.id, r.approvalStatus]));
  return rows.map((row) => {
    const next = byId.get(row.id);
    return next != null ? { ...row, approvalStatus: next } : row;
  });
}
