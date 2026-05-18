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
