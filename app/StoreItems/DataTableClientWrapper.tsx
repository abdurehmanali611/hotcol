"use client";
import { forwardRef, useMemo } from "react";
import { columns, items } from "./columns";
import { DataTable, type DataTableRef } from "./data-table";
import type { ItemRegistration } from "@/lib/actions";
import type { StockOutRequestRow } from "@/lib/actions";
import {
  isAggregatedInventoryRow,
} from "@/lib/inventoryAggregation";
import { normalizeInventoryItemName } from "@/lib/tenantRowMatch";

interface WrapperProps {
  data: items[];
  onEdit?: (item: items) => void;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
  readOnly?: boolean;
  /** Edit / delete / stock-out / wastage / return — Store role only (set by parent). */
  showStoreRowActions?: boolean;
  onHotelStockRequestCreated?: (row: StockOutRequestRow) => void;
  enableRowSelection?: boolean;
  aggregateInventory?: boolean;
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
    showStoreRowActions,
    onHotelStockRequestCreated,
    enableRowSelection,
    aggregateInventory,
    onRowSelectionChange,
  },
  ref,
) {
  const resolveRowId = (row: items) => {
    if (aggregateInventory && isAggregatedInventoryRow(row)) {
      return `agg-${normalizeInventoryItemName(row.name)}`;
    }
    return String(row.id);
  };
  const memoizedColumns = useMemo(
    () =>
      columns(onEdit, refresh, {
        hotelStockApprovals,
        readOnly,
        showStoreRowActions,
        onHotelStockRequestCreated,
      }),
    [
      onEdit,
      refresh,
      hotelStockApprovals,
      readOnly,
      showStoreRowActions,
      onHotelStockRequestCreated,
    ],
  );

  return (
    <DataTable
      ref={ref}
      columns={memoizedColumns}
      data={data}
      enableRowSelection={!!enableRowSelection}
      getRowId={resolveRowId}
      onRowSelectionChange={onRowSelectionChange}
    />
  );
});
