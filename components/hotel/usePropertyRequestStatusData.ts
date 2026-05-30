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
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { sortRowsByFifo } from "@/lib/requestOrdering";
import { toast } from "sonner";

export function usePropertyRequestStatusData(tenantScope: string | null) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [stocks, setStocks] = useState<StockOutRequestRow[]>([]);
  const [registrations, setRegistrations] = useState<ItemRegistration[]>([]);

  const load = useCallback(async () => {
    try {
      const [pr, so, reg] = await Promise.all([
        fetchPurchaseRequests(),
        fetchStockOutRequests(),
        fetchItemRegistrations(),
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
      setRegistrations(
        t
          ? reg.filter((r: ItemRegistration) =>
              rowHotelMatchesTenantScope(r.HotelName, t),
            )
          : reg,
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
    () => sortRowsByFifo(purchases),
    [purchases],
  );

  const sortedStocks = useMemo(() => sortRowsByFifo(stocks), [stocks]);

  const sortedRegistrations = useMemo(
    () => sortRowsByFifo(registrations),
    [registrations],
  );

  return {
    initialLoading,
    purchases: sortedPurchases,
    stocks: sortedStocks,
    registrations: sortedRegistrations,
    reload: load,
  };
}
