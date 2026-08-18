"use client"

import { useMemo } from "react";
import { buildCancelledOrderColumns, Order } from "./columns";
import { DataTable } from "./data-table";
import type { Table } from "@/lib/actions";

export function DataTableClientWrapper({
  data,
  tables = [],
  analog = false,
}: {
  data: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
  analog?: boolean;
}) {
    const memoizedColumns = useMemo(
      () => buildCancelledOrderColumns(tables, analog),
      [tables, analog],
    );
    return <DataTable columns={memoizedColumns} data={data}/>
}
