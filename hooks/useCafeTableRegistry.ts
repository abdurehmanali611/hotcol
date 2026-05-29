"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchTables, type Table } from "@/lib/actions";
import {
  buildTableCaptionByNoMap,
  formatCafeTableDisplayFromRegistry,
  type CafeTableCaptionLookup,
} from "@/lib/cafeTableOrder";
import {
  effectiveTenantScopeForHotelTerminal,
  rowHotelMatchesTenantScope,
} from "@/lib/tenantRowMatch";

/** Loads property tables and resolves order captions (Delivery, Takeaway, etc.). */
export function useCafeTableRegistry(hotelName: string) {
  const [tables, setTables] = useState<Table[]>([]);
  const scope = effectiveTenantScopeForHotelTerminal(hotelName);

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    void fetchTables()
      .then((rows) => {
        if (cancelled) return;
        setTables(
          rows.filter((t) =>
            rowHotelMatchesTenantScope(t.HotelName, scope),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setTables([]);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const scopedTables = useMemo(
    () => (scope ? tables : []),
    [scope, tables],
  );

  const captionByNo: CafeTableCaptionLookup = useMemo(
    () => buildTableCaptionByNoMap(scopedTables),
    [scopedTables],
  );

  const labelFor = useCallback(
    (tableNo: number, orderServiceCaption?: string | null) =>
      formatCafeTableDisplayFromRegistry(
        tableNo,
        scopedTables,
        orderServiceCaption,
      ),
    [scopedTables],
  );

  return { tables: scopedTables, captionByNo, labelFor };
}
