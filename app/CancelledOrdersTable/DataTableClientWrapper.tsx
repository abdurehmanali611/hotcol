"use client"

import { useMemo } from "react";
import { buildCancelledOrderColumns, Order } from "./columns";
import { DataTable } from "./data-table";
import type { Table } from "@/lib/actions";

export function DataTableClientWrapper({
  data,
  tables = [],
}: {
  data: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
}) {
    const memoizedColumns = useMemo(
      () => buildCancelledOrderColumns(tables),
      [tables],
    );
    return <DataTable columns={memoizedColumns} data={data}/>
}