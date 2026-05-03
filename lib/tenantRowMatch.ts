/**
 * Item/Order/… `HotelName` may be the tenant TIN or a legacy display string.
 * `tenantScope` from URL/localStorage is the canonical tenant key (usually TIN).
 */
export function rowHotelMatchesTenantScope(
  rowHotelName: string | null | undefined,
  tenantScope: string | null | undefined,
): boolean {
  const row = String(rowHotelName ?? "").trim();
  const tenant = String(tenantScope ?? "").trim();
  if (!row) return false;
  if (tenant && row === tenant) return true;
  if (typeof window === "undefined") return false;
  const display = (localStorage.getItem("hotel_display_name") ?? "").trim();
  if (display && row === display) return true;
  return false;
}

/** Compare inventory item names (trim + case-insensitive). */
export function normalizeInventoryItemName(name: string): string {
  return String(name ?? "").trim().toLowerCase();
}
