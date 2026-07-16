"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchItemRegistrations,
  fetchPurchaseRequests,
  fetchStockOutRequests,
  type ItemRegistration,
  type PurchaseRequestRow,
  type StockOutRequestRow,
} from "@/lib/actions";
import {
  resolveCanonicalTenantKey,
  rowHotelMatchesTenantScope,
} from "@/lib/tenantRowMatch";
import { sortRowsByFifo } from "@/lib/requestOrdering";
import { matchesStoreOwner } from "@/lib/storeDraftOwner";
import { isItemRegVoid } from "@/lib/hotelApproval";
import { fetchMe } from "@/lib/api/auth";
import { invalidateGraphqlListCache } from "@/lib/api/client";
import { toast } from "sonner";

function mergeStockOutRows(
  server: StockOutRequestRow[],
  injected: StockOutRequestRow[] | undefined,
): StockOutRequestRow[] {
  if (!injected?.length) return server;
  const byId = new Map<number, StockOutRequestRow>();
  for (const s of server) byId.set(s.id, s);
  for (const e of injected) {
    if (!byId.has(e.id)) byId.set(e.id, e);
  }
  return sortRowsByFifo([...byId.values()]);
}

function mergePurchaseRows(
  server: PurchaseRequestRow[],
  injected: PurchaseRequestRow[] | undefined,
): PurchaseRequestRow[] {
  if (!injected?.length) return server;
  const byId = new Map<number, PurchaseRequestRow>();
  for (const s of server) byId.set(s.id, s);
  for (const e of injected) {
    if (!byId.has(e.id)) byId.set(e.id, e);
  }
  return sortRowsByFifo([...byId.values()]);
}

export function useStoreRequestStatusData({
  enabled = true,
  tenantScope = null,
  refreshSignal = 0,
  injectedStockRows,
  onClearInjectedStockIds,
  injectedPurchaseRows,
  onClearInjectedPurchaseIds,
}: {
  /** When false, skips network load until a status/receipt view is opened. */
  enabled?: boolean;
  /** Property scope from URL / parent terminal (preferred over localStorage alone). */
  tenantScope?: string | null;
  refreshSignal?: number;
  injectedStockRows?: StockOutRequestRow[];
  onClearInjectedStockIds?: (ids: number[]) => void;
  injectedPurchaseRows?: PurchaseRequestRow[];
  onClearInjectedPurchaseIds?: (ids: number[]) => void;
}) {
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready">("idle");
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [stocks, setStocks] = useState<StockOutRequestRow[]>([]);
  const [registrations, setRegistrations] = useState<ItemRegistration[]>([]);
  const [userName, setUserName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("user_name")?.trim() ?? "";
  });

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      if (refreshSignal > 0) {
        invalidateGraphqlListCache([
          "hotel:stockOutRequests",
          "hotel:purchaseRequests",
          "ItemStatus:list",
          "ItemRegistration:list",
        ]);
      }
      const storedName =
        typeof window !== "undefined"
          ? (localStorage.getItem("user_name")?.trim() ?? "")
          : "";
      const me = await fetchMe();
      const name = me?.UserName?.trim() || storedName;
      if (name && typeof window !== "undefined") {
        localStorage.setItem("user_name", name);
      }
      setUserName(name);
      const [pr, so, reg] = await Promise.all([
        fetchPurchaseRequests(),
        fetchStockOutRequests(),
        fetchItemRegistrations(),
      ]);
      const tenant = resolveCanonicalTenantKey(tenantScope);
      setPurchases(
        pr.filter((p) => rowHotelMatchesTenantScope(p.HotelName, tenant)),
      );
      setStocks(
        so.filter((s) => rowHotelMatchesTenantScope(s.HotelName, tenant)),
      );
      setRegistrations(
        reg.filter((r: ItemRegistration) =>
          rowHotelMatchesTenantScope(r.HotelName, tenant),
        ),
      );
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not load request status";
      toast.error(msg);
    }
  }, [enabled, tenantScope, refreshSignal]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      setLoadState("loading");
      await load();
      if (!cancelled) setLoadState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [load, refreshSignal, enabled]);

  const initialLoading = enabled && loadState !== "ready";

  useEffect(() => {
    if (!onClearInjectedStockIds || !injectedStockRows?.length) return;
    const ids = new Set(stocks.map((s) => s.id));
    const consumed = injectedStockRows
      .filter((r) => ids.has(r.id))
      .map((r) => r.id);
    if (consumed.length) onClearInjectedStockIds(consumed);
  }, [stocks, injectedStockRows, onClearInjectedStockIds]);

  useEffect(() => {
    if (!onClearInjectedPurchaseIds || !injectedPurchaseRows?.length) return;
    const ids = new Set(purchases.map((p) => p.id));
    const consumed = injectedPurchaseRows
      .filter((r) => ids.has(r.id))
      .map((r) => r.id);
    if (consumed.length) onClearInjectedPurchaseIds(consumed);
  }, [purchases, injectedPurchaseRows, onClearInjectedPurchaseIds]);

  const mergedPurchases = useMemo(
    () => mergePurchaseRows(purchases, injectedPurchaseRows),
    [purchases, injectedPurchaseRows],
  );

  const mergedStocks = useMemo(
    () => mergeStockOutRows(stocks, injectedStockRows),
    [stocks, injectedStockRows],
  );

  const myPurchases = useMemo(
    () =>
      mergedPurchases.filter(
        (p) => userName && matchesStoreOwner(p.storeUserName, userName),
      ),
    [mergedPurchases, userName],
  );

  const myStocks = useMemo(
    () =>
      mergedStocks.filter(
        (s) => userName && matchesStoreOwner(s.requestedByUserName, userName),
      ),
    [mergedStocks, userName],
  );

  const myRegistrations = useMemo(
    () =>
      sortRowsByFifo(
        registrations.filter((r) => {
          if (isItemRegVoid(r.approvalStatus)) return false;
          const by = String(r.statusBy ?? "").trim();
          if (!by) return true;
          if (!userName) return true;
          return matchesStoreOwner(by, userName);
        }),
      ),
    [registrations, userName],
  );

  /** Tenant-scoped purchase / stock lists (not filtered to signed-in store user). */
  const tenantPurchases = mergedPurchases;
  const tenantStocks = mergedStocks;

  return {
    initialLoading,
    userName,
    myPurchases,
    myStocks,
    myRegistrations,
    tenantPurchases,
    tenantStocks,
    reload: load,
  };
}
