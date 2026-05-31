"use client";

import { useEffect, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  type DataTableRef,
} from "@/app/StoreItems/data-table";
import { FIFO_TABLE_SORT } from "@/lib/requestOrdering";

export function StoreReviewDraftTable<T extends { id: number }>({
  rows,
  columns,
  selectedIds,
  onSelectedIdsChange,
  searchColumnId,
  searchPlaceholder = "Search voucher, item, or supplier…",
  emptyMessage = "No matching lines.",
}: {
  rows: T[];
  columns: ColumnDef<T, unknown>[];
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  searchColumnId: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}) {
  const tableRef = useRef<DataTableRef>(null);

  useEffect(() => {
    tableRef.current?.setRowSelectionByIds(selectedIds.map(String));
  }, [selectedIds]);

  return (
    <DataTable
      ref={tableRef}
      data={rows}
      columns={columns}
      enableRowSelection
      searchColumnId={searchColumnId}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      initialSorting={FIFO_TABLE_SORT}
      onRowSelectionChange={(selected) =>
        onSelectedIdsChange(selected.map((row) => row.id))
      }
    />
  );
}
