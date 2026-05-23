/**
 * Item/Order/… `HotelName` may be the tenant TIN or a legacy display string.
 * `tenantScope` from URL/localStorage is the canonical tenant key (usually TIN).
 */

/** All identifiers that may appear in row `HotelName` for the signed-in property. */
export function collectTenantIdentifiers(
  preferredScope?: string | null,
): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  const add = (v: string | null | undefined) => {
    const s = String(v ?? "").trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    ids.push(s);
  };

  add(preferredScope);
  if (typeof window !== "undefined") {
    add(localStorage.getItem("tin_number"));
    add(localStorage.getItem("hotel_name"));
    add(localStorage.getItem("hotel_display_name"));
  }
  return ids;
}

/** Preferred tenant key for writes (TIN when available). */
export function resolveCanonicalTenantKey(
  fallback?: string | null,
): string {
  if (typeof window === "undefined") return String(fallback ?? "").trim();
  return (
    localStorage.getItem("tin_number")?.trim() ||
    localStorage.getItem("hotel_name")?.trim() ||
    String(fallback ?? "").trim()
  );
}

export function rowHotelMatchesTenantScope(
  rowHotelName: string | null | undefined,
  tenantScope: string | null | undefined,
): boolean {
  const row = String(rowHotelName ?? "").trim();
  if (!row) return false;
  return collectTenantIdentifiers(tenantScope).some((id) => row === id);
}

/** Compare inventory item names (trim + case-insensitive). */
export function normalizeInventoryItemName(name: string): string {
  return String(name ?? "").trim().toLowerCase();
}

/**
 * React `tenantScope` can be empty on the first client paint before `localStorage.hotel_name`
 * is applied. Hotel terminals should fall back to stored keys so fetches and filters
 * never briefly show every property's rows.
 */
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
  const canonical = resolveCanonicalTenantKey(reactTenantScope);
  if (canonical) return canonical;
  if (!options?.requireHotelTerminal) return "";
  return "";
}
