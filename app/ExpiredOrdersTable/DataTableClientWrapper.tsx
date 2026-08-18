"use client";

import { useMemo } from "react";
import { buildExpiredOrderColumns, Order } from "./columns";
import { DataTable } from "./data-table";
import type { Table } from "@/lib/actions";

interface WrapperProps {
  data: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
  analog?: boolean;
}

export function DataTableClientWrapper({
  data,
  tables = [],
  analog = false,
}: WrapperProps) {
  const memoizedColumns = useMemo(
    () => buildExpiredOrderColumns(tables, analog),
    [tables, analog],
  );

  return <DataTable columns={memoizedColumns} data={data} />;
}
