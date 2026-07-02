"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Table } from "@/lib/actions";
import type { Item } from "@/lib/api/types";
import {
  buildCompletedOrderColumns,
  type Order,
} from "@/app/CompletedOrdersTable/columns";
import { cafeOrderProfitColumns } from "@/lib/dataTableColumns/cafeOrderProfitColumns";

export function buildPendingPaymentOrderColumns(
  tables: Pick<Table, "tableNo" | "orderCaption">[],
  items: Pick<Item, "name" | "recipeJson">[],
): ColumnDef<Order>[] {
  const base = buildCompletedOrderColumns(tables);
  const withoutMethod = base.filter(
    (col) => (col as { accessorKey?: string }).accessorKey !== "withBank",
  );
  const profitCols = cafeOrderProfitColumns(items);
  const statusCol: ColumnDef<Order> = {
    id: "paymentStatus",
    header: "Payment",
    cell: () => (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
        Awaiting payment
      </span>
    ),
  };

  return [...withoutMethod, ...profitCols, statusCol];
}

export type { Order };
