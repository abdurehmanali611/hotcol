"use client";

import { useMemo } from "react";
import { buildExpiredOrderColumns, Order } from "./columns";
import { DataTable } from "./data-table";
import type { Table } from "@/lib/actions";

interface WrapperProps {
  data: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
}

export function DataTableClientWrapper({ data, tables = [] }: WrapperProps) {
  const memoizedColumns = useMemo(
    () => buildExpiredOrderColumns(tables),
    [tables],
  );

  return <DataTable columns={memoizedColumns} data={data} />;
}
