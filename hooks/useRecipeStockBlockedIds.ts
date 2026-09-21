"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchStationIngredientStocks,
  type Item,
  type StationIngredientStock,
} from "@/lib/actions";
import {
  canCoverRecipeServings,
  isRecipeStationStockBlocked,
  maxRecipeServingsAvailable,
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
      /* Soft check — missing stock API must not toast on reception/laundry/cashier. */
      setStocks([]);
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

  const modules = useMemo(
    () => readTenantSubscriptionFromStorage().modules,
    // Re-read when stocks refresh so module flips after re-login are picked up with poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: bind to stock load cycle
    [stocks, enforce],
  );

  const blockedIds = useMemo(() => {
    const set = new Set<number>();
    if (!enforce) return set;
    for (const item of items) {
      if (isRecipeStationStockBlocked(item, stocks, modules)) {
        set.add(item.id);
      }
    }
    return set;
  }, [enforce, items, stocks, modules]);

  const maxServingsById = useMemo(() => {
    const map = new Map<number, number>();
    if (!enforce) return map;
    for (const item of items) {
      map.set(item.id, maxRecipeServingsAvailable(item, stocks, modules));
    }
    return map;
  }, [enforce, items, stocks, modules]);

  const canServe = useCallback(
    (item: Item, servings: number) =>
      canCoverRecipeServings(item, stocks, modules, servings),
    [stocks, modules],
  );

  return {
    blockedIds,
    maxServingsById,
    stocks,
    enforce,
    canServe,
    reload: load,
  };
}
