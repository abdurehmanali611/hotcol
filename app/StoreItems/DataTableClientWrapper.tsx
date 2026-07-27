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
import { VOUCHER_TABLE_SORT } from "@/lib/voucherSort";

interface WrapperProps {
  data: items[];
  onEdit?: (item: items) => void;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
  readOnly?: boolean;
  /** Edit or delete master inventory lines (manager on hotel; store on café). */
  allowEditDelete?: boolean;
  /** Stock-out, wastage, return — store terminal only (set by parent). */
  showStoreMovementActions?: boolean;
  onHotelStockRequestCreated?: (row: StockOutRequestRow) => void;
  enableRowSelection?: boolean;
  /** When true (default), same-name groups expand and use aggregated row ids. */
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
    allowEditDelete,
    showStoreMovementActions,
    onHotelStockRequestCreated,
    enableRowSelection,
    aggregateInventory = true,
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
        allowEditDelete,
        showStoreMovementActions,
        onHotelStockRequestCreated,
      }),
    [
      onEdit,
      refresh,
      hotelStockApprovals,
      readOnly,
      allowEditDelete,
      showStoreMovementActions,
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
      initialSorting={hotelStockApprovals ? VOUCHER_TABLE_SORT : undefined}
      getSubRows={
        aggregateInventory
          ? (row) =>
              isAggregatedInventoryRow(row) ? row.registrationLines : undefined
          : undefined
      }
    />
  );
});
