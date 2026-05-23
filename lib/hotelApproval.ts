/** Hotel workflow status helpers (aligned with backend). */

export function isPurchaseAuthorized(status: string): boolean {
  return status === "AUTHORIZED" || status === "APPROVED_FINANCE";
}

export function isStockPendingCC(status: string): boolean {
  return status === "PENDING_CC" || status === "PENDING";
}

export function isStockPendingFinance(status: string): boolean {
  return status === "PENDING_FINANCE";
}

export function isStockPendingManager(status: string): boolean {
  return status === "PENDING_MANAGER";
}

export function isItemRegAuthorized(status?: string | null): boolean {
  const s = String(status || "AUTHORIZED");
  return !s || s === "AUTHORIZED";
}

export function isItemRegVoid(status?: string | null): boolean {
  return status === "VOID";
}

export function isCompanyAuthorized(status?: string | null): boolean {
  const s = String(status || "AUTHORIZED");
  return s === "AUTHORIZED" || s === "";
}

/** Receipts may only print when workflow is complete for the entity type. */
export function isItemRegistrationPrintable(status?: string | null): boolean {
  return isItemRegAuthorized(status) && !isItemRegVoid(status);
}

export function isPurchaseRequestPrintable(status: string): boolean {
  return isPurchaseAuthorized(status);
}

export function isStockMovementPrintable(status: string): boolean {
  return status === "APPROVED";
}
