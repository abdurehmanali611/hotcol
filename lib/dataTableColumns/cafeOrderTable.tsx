"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Table } from "@/lib/actions";
import {
  formatCafeTableDisplayFromRegistry,
  normalizeOrderTableNo,
} from "@/lib/cafeTableOrder";

type RowWithTable = {
  tableNo: number | string;
  serviceCaption?: string | null;
};

export function cafeOrderTableColumn<T extends RowWithTable>(
  tables: Pick<Table, "tableNo" | "orderCaption">[],
  opts?: { header?: string },
): ColumnDef<T> {
  return {
    accessorKey: "tableNo",
    header: opts?.header ?? "Table",
    cell: ({ row }) => (
      <span className="text-sm font-medium text-muted-foreground">
        {formatCafeTableDisplayFromRegistry(
          normalizeOrderTableNo(row.original),
          tables,
          row.original.serviceCaption,
        )}
      </span>
    ),
  };
}
