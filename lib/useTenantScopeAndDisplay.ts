"use client";

import { useEffect, useState } from "react";

function readStoredTenant(fallbackUrl: string): string {
  if (typeof window === "undefined") return fallbackUrl;
  return (
    localStorage.getItem("tin_number")?.trim() ||
    localStorage.getItem("hotel_name")?.trim() ||
    fallbackUrl
  );
}

function readStoredDisplay(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("hotel_display_name")?.trim() || "";
}

/**
 * `hotel` query param and `localStorage.hotel_name` hold the tenant scope (e.g. TIN)
 * for matching Item/Order rows. `localStorage.hotel_display_name` is the human-facing
 * business name and must be used for UI labels only.
 */
export function useTenantScopeAndDisplay(hotelFromUrl: string | null | undefined) {
  const url = (hotelFromUrl ?? "").trim();
  const [tenantScope, setTenantScope] = useState(() => readStoredTenant(url));
  const [displayName, setDisplayName] = useState(() => readStoredDisplay());

  // Keep in sync when the URL param changes or storage updates after navigation.
  useEffect(() => {
    const tenant =
      localStorage.getItem("tin_number")?.trim() ||
      localStorage.getItem("hotel_name")?.trim() ||
      url;
    const display = localStorage.getItem("hotel_display_name")?.trim() || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration read from localStorage
    setTenantScope(tenant);
    setDisplayName(display);
  }, [url]);

  return { tenantScope, displayName };
}
