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
  const s = String(status ?? "").trim().toUpperCase();
  /** Legacy rows created before approval workflow (empty only). */
  if (!s) return true;
  return s === "AUTHORIZED";
}

/** Active stock lines for inventory tables (matches Store terminal / backend Store filter). */
export function filterInventoryListRegistrations<
  T extends { approvalStatus?: string | null },
>(rows: readonly T[]): T[] {
  return rows.filter(
    (r) => isItemRegAuthorized(r.approvalStatus) && !isItemRegVoid(r.approvalStatus),
  );
}

/** Purchase lines that may receive stock or count as approved requests (manager-authorized). */
export function filterPurchaseRequestsAuthorized<
  T extends { status: string },
>(rows: readonly T[]): T[] {
  return rows.filter((r) => isPurchaseAuthorized(r.status));
}

/** Stock movements that have been applied to inventory (manager-approved). */
export function filterStockMovementsApproved<
  T extends { status: string },
>(rows: readonly T[]): T[] {
  return rows.filter((r) => isStockMovementPrintable(r.status));
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

/** Request status panels: print only after manager sign-off. */
export function canPrintPurchaseRequestFromStatus(status: string): boolean {
  return status === "AUTHORIZED";
}

export function canPrintStockMovementFromStatus(status: string): boolean {
  return status === "APPROVED";
}

export function canPrintItemRegistrationFromStatus(
  status?: string | null,
): boolean {
  return isItemRegAuthorized(status) && !isItemRegVoid(status);
}
