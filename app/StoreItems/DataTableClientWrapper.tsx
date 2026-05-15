"use client";
import { forwardRef, useMemo } from "react";
import { columns, items } from "./columns";
import { DataTable, type DataTableRef } from "./data-table";
import type { ItemRegistration } from "@/lib/actions";
import type { StockOutRequestRow } from "@/lib/actions";

interface WrapperProps {
  data: items[];
  onEdit?: (item: items) => void;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
  readOnly?: boolean;
  onHotelStockRequestCreated?: (row: StockOutRequestRow) => void;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rows: ItemRegistration[]) => void;
}

export const DataTableClientWrapper = forwardRef<
  DataTableRef,
  WrapperProps
>(function DataTableClientWrapper(
  {
    data,
    onEdit,
    refresh,
    hotelStockApprovals,
    readOnly,
    onHotelStockRequestCreated,
    enableRowSelection,
    onRowSelectionChange,
  },
  ref,
) {
  const memoizedColumns = useMemo(
    () =>
      columns(onEdit, refresh, {
        hotelStockApprovals,
        readOnly,
        onHotelStockRequestCreated,
      }),
    [onEdit, refresh, hotelStockApprovals, readOnly, onHotelStockRequestCreated],
  );

  return (
    <DataTable
      ref={ref}
      columns={memoizedColumns}
      data={data}
      enableRowSelection={!!enableRowSelection}
      getRowId={(row) => String(row.id)}
      onRowSelectionChange={onRowSelectionChange}
    />
  );
});
