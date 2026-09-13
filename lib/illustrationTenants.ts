/**
 * Shared illustration-tenant detection (Apex / ApexAnalog cafe + hotel only).
 * Used to gate crystal-name selectors and related demo tooling.
 */
import { readTenantBillingFromStorage } from "@/lib/tenantModules";

/** Canonical display names (lowercase, collapsed spaces). */
export const ILLUSTRATION_TENANT_DISPLAY_NAMES = [
  "apex cafe and restaurant",
  "apexanalog cafe and restaurant",
  "apex hotel",
  "apexanalog hotel",
] as const;

/** Known illustration TIN / HotelName keys from DB. */
export const ILLUSTRATION_TENANT_TINS = [
  "4DtJvzSwGnYL",
  "TIN_1aZAQVXx3q79FkCk",
  "TIN_lXhLoXQVfEOXUVez",
  "TIN_ScxemuziHnkICOoz",
] as const;

function normalizeDisplayName(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isIllustrationTenantKey(hotelOrTinOrDisplay: string): boolean {
  const raw = String(hotelOrTinOrDisplay || "").trim();
  if (!raw) return false;
  if (
    ILLUSTRATION_TENANT_TINS.some(
      (t) => t.toLowerCase() === raw.toLowerCase(),
    )
  ) {
    return true;
  }
  return ILLUSTRATION_TENANT_DISPLAY_NAMES.includes(
    normalizeDisplayName(raw) as (typeof ILLUSTRATION_TENANT_DISPLAY_NAMES)[number],
  );
}

/** Browser: true only for Apex / ApexAnalog illustration properties. */
export function isCurrentTenantIllustration(): boolean {
  if (typeof window === "undefined") return false;

  try {
    if (readTenantBillingFromStorage().isIllustrationTenant) return true;
  } catch {
    // ignore storage parse issues
  }

  const display = localStorage.getItem("hotel_display_name") || "";
  const tin = localStorage.getItem("tin_number") || "";
  const hotel = localStorage.getItem("hotel_name") || "";

  return (
    isIllustrationTenantKey(display) ||
    isIllustrationTenantKey(tin) ||
    isIllustrationTenantKey(hotel)
  );
}
