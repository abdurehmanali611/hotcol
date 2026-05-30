/** Normalize store draft status fields from API / DB. */
export function isPurchasePendingStore(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toUpperCase() === "PENDING_STORE";
}

export function isStockPendingStore(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toUpperCase() === "PENDING_STORE";
}

export function isRegistrationPendingStore(
  approvalStatus: string | null | undefined,
): boolean {
  return String(approvalStatus ?? "").trim().toUpperCase() === "PENDING_STORE";
}
