"use client";

import { useEffect, useState } from "react";

/**
 * `hotel` query param and `localStorage.hotel_name` hold the tenant scope (e.g. TIN)
 * for matching Item/Order rows. `localStorage.hotel_display_name` is the human-facing
 * business name and must be used for UI labels only.
 */
export function useTenantScopeAndDisplay(hotelFromUrl: string | null | undefined) {
  const url = (hotelFromUrl ?? "").trim();
  const [tenantScope, setTenantScope] = useState(url);
  const [displayName, setDisplayName] = useState("");

  // After mount, read browser storage so headers match login without SSR/localStorage mismatch on first paint.
  useEffect(() => {
    const tenant = localStorage.getItem("hotel_name")?.trim() || url;
    const display = localStorage.getItem("hotel_display_name")?.trim() || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration read from localStorage
    setTenantScope(tenant);
    setDisplayName(display);
  }, [url]);

  return { tenantScope, displayName };
}
