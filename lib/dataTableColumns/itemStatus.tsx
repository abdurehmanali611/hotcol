"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ItemStatus } from "@/lib/actions";
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import { buildVoucherColumn } from "@/lib/dataTableColumns/voucherColumn";

export function buildItemStatusColumns(): ColumnDef<ItemStatus>[] {
  return [
    buildVoucherColumn<ItemStatus>(),
    {
      accessorKey: "name",
      header: "Item",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: ({ row }) => (
        <span className="tabular-nums whitespace-nowrap">
          {formatQtyWithUnit(row.original.amount, row.original.measuredBy)}
        </span>
      ),
    },
    {
      accessorKey: "statusBy",
      header: "By",
    },
    {
      id: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.actionDate).toLocaleString()}
        </span>
      ),
    },
  ];
}
