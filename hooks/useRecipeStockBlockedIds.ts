"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchStationIngredientStocks,
  type Item,
  type StationIngredientStock,
} from "@/lib/actions";
import {
  isRecipeStationStockBlocked,
  tenantEnforcesRecipeStationStock,
} from "@/lib/recipeStationAvailability";
import { readTenantSubscriptionFromStorage } from "@/lib/tenantModules";

/**
 * Dual Cafe+Inventory: menu items whose recipe cannot be covered by station on-hand.
 * Polls station stock so cashier/admin UIs stay aligned after stock-outs.
 */
export function useRecipeStockBlockedIds(
  items: Item[],
  opts?: { enabled?: boolean; pollMs?: number },
) {
  const enabled = opts?.enabled !== false;
  const pollMs = opts?.pollMs ?? 12_000;
  const [stocks, setStocks] = useState<StationIngredientStock[]>([]);
  const enforce = useMemo(() => {
    if (!enabled) return false;
    const sub = readTenantSubscriptionFromStorage();
    return tenantEnforcesRecipeStationStock(sub.modules);
  }, [enabled]);

  const load = useCallback(async () => {
    if (!enforce) {
      setStocks([]);
      return;
    }
    try {
      const rows = await fetchStationIngredientStocks();
      setStocks(Array.isArray(rows) ? rows : []);
    } catch {
      /* toast already emitted */
    }
  }, [enforce]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!enforce) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void load();
    };
    const id = window.setInterval(tick, pollMs);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, [enforce, load, pollMs]);

  const blockedIds = useMemo(() => {
    const set = new Set<number>();
    if (!enforce) return set;
    for (const item of items) {
      if (isRecipeStationStockBlocked(item, stocks, readTenantSubscriptionFromStorage().modules)) {
        set.add(item.id);
      }
    }
    return set;
  }, [enforce, items, stocks]);

  return { blockedIds, stocks, enforce, reload: load };
}
