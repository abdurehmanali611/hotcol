"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPurchaseRequests,
  fetchStockOutRequests,
  type PurchaseRequestRow,
  type StockOutRequestRow,
} from "@/lib/actions";
import {
  resolveCanonicalTenantKey,
  rowHotelMatchesTenantScope,
} from "@/lib/tenantRowMatch";
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
  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
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
  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function useStoreRequestStatusData({
  refreshSignal = 0,
  injectedStockRows,
  onClearInjectedStockIds,
  injectedPurchaseRows,
  onClearInjectedPurchaseIds,
}: {
  refreshSignal?: number;
  injectedStockRows?: StockOutRequestRow[];
  onClearInjectedStockIds?: (ids: number[]) => void;
  injectedPurchaseRows?: PurchaseRequestRow[];
  onClearInjectedPurchaseIds?: (ids: number[]) => void;
}) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [stocks, setStocks] = useState<StockOutRequestRow[]>([]);
  const [userName, setUserName] = useState("");

  const load = useCallback(async () => {
    try {
      const name =
        typeof window !== "undefined"
          ? (localStorage.getItem("user_name")?.trim() ?? "")
          : "";
      setUserName(name);
      const [pr, so] = await Promise.all([
        fetchPurchaseRequests(),
        fetchStockOutRequests(),
      ]);
      const tenant = resolveCanonicalTenantKey();
      setPurchases(
        pr.filter((p) => rowHotelMatchesTenantScope(p.HotelName, tenant)),
      );
      setStocks(
        so.filter((s) => rowHotelMatchesTenantScope(s.HotelName, tenant)),
      );
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not load request status";
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setInitialLoading(true);
      await load();
      setInitialLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    if (refreshSignal === 0) return;
    void load();
  }, [refreshSignal, load]);

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
        (p) => userName && p.storeUserName === userName,
      ),
    [mergedPurchases, userName],
  );

  const myStocks = useMemo(
    () =>
      mergedStocks.filter(
        (s) => userName && s.requestedByUserName === userName,
      ),
    [mergedStocks, userName],
  );

  return {
    initialLoading,
    userName,
    myPurchases,
    myStocks,
    reload: load,
  };
}
