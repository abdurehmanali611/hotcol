"use client"
import { useMemo } from "react";
import { columns, items } from "./columns";
import { DataTable } from "./data-table";

import type { StockOutRequestRow } from "@/lib/actions";

interface WrapperProps {
  data: items[];
  onEdit?: (item: items) => void;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
  readOnly?: boolean;
  onHotelStockRequestCreated?: (row: StockOutRequestRow) => void;
}

export function DataTableClientWrapper({
  data,
  onEdit,
  refresh,
  hotelStockApprovals,
  readOnly,
  onHotelStockRequestCreated,
}: WrapperProps) {
  const memoizedColumns = useMemo(
    () =>
      columns(onEdit, refresh, {
        hotelStockApprovals,
        readOnly,
        onHotelStockRequestCreated,
      }),
    [onEdit, refresh, hotelStockApprovals, readOnly, onHotelStockRequestCreated],
  );
  
  return <DataTable columns={memoizedColumns} data={data}/>
}