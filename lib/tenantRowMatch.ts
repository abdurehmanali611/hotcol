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

/**
 * React `tenantScope` can be empty on the first client paint before `localStorage.hotel_name`
 * is applied. Hotel terminals should fall back to that key so fetches and filters never
 * briefly show every property's rows.
 */
/** Find the first row whose `HotelName` matches the tenant scope (TIN or display name). */
export function findRowByTenantScope<T>(
  rows: T[],
  tenantScope: string | null | undefined,
): T | undefined {
  return rows.find((row) =>
    rowHotelMatchesTenantScope(
      (row as { HotelName?: string | null }).HotelName,
      tenantScope,
    ),
  );
}

export function effectiveTenantScopeForHotelTerminal(
  reactTenantScope: string | null | undefined,
  options?: { requireHotelTerminal?: boolean },
): string {
  const fromProps = String(reactTenantScope ?? "").trim();
  if (fromProps) return fromProps;
  if (!options?.requireHotelTerminal) return "";
  if (typeof window === "undefined") return "";
  return localStorage.getItem("hotel_name")?.trim() || "";
}
