"use client";

import { useMemo } from "react";
import {
  buildCancelledOrderColumns,
  type Order,
} from "@/app/CancelledOrdersTable/columns";
import { DataTable } from "@/app/CancelledOrdersTable/data-table";
import type { Table } from "@/lib/actions";

export function DataTableClientWrapper({
  data,
  tables = [],
}: {
  data: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
}) {
  const memoizedColumns = useMemo(
    () =>
      buildCancelledOrderColumns(tables).filter(
        (col) =>
          (col as { accessorKey?: string }).accessorKey !== "cancelledBy",
      ),
    [tables],
  );

  return <DataTable columns={memoizedColumns} data={data} />;
}
