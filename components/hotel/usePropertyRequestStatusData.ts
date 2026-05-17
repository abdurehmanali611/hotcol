"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPurchaseRequests,
  fetchStockOutRequests,
  type PurchaseRequestRow,
  type StockOutRequestRow,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { toast } from "sonner";

export function usePropertyRequestStatusData(tenantScope: string | null) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [stocks, setStocks] = useState<StockOutRequestRow[]>([]);

  const load = useCallback(async () => {
    try {
      const [pr, so] = await Promise.all([
        fetchPurchaseRequests(),
        fetchStockOutRequests(),
      ]);
      const t = String(tenantScope ?? "").trim();
      setPurchases(
        t
          ? pr.filter((p) => rowHotelMatchesTenantScope(p.HotelName, t))
          : pr,
      );
      setStocks(
        t
          ? so.filter((s) => rowHotelMatchesTenantScope(s.HotelName, t))
          : so,
      );
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not load request status";
      toast.error(msg);
    }
  }, [tenantScope]);

  useEffect(() => {
    void (async () => {
      setInitialLoading(true);
      await load();
      setInitialLoading(false);
    })();
  }, [load]);

  const sortedPurchases = useMemo(
    () =>
      [...purchases].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [purchases],
  );

  const sortedStocks = useMemo(
    () =>
      [...stocks].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [stocks],
  );

  return {
    initialLoading,
    purchases: sortedPurchases,
    stocks: sortedStocks,
    reload: load,
  };
}
