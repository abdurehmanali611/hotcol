"use client"

import { useMemo } from "react";
import { buildCompletedOrderColumns, Order } from "./columns";
import { DataTable } from "./data-table";
import type { Table } from "@/lib/actions";
import type { Item } from "@/lib/api/types";
import { cafeOrderProfitColumns } from "@/lib/dataTableColumns/cafeOrderProfitColumns";

interface WrapperProps {
  data: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
  items?: Pick<Item, "name" | "recipeJson">[];
}

export function DataTableClientWrapper({ data, tables = [], items = [] }: WrapperProps) {
    const memoizedColumns = useMemo(() => {
      const base = buildCompletedOrderColumns(tables);
      if (!items.length) return base;
      const methodIndex = base.findIndex(
        (col) => (col as { accessorKey?: string }).accessorKey === "withBank",
      );
      const profitCols = cafeOrderProfitColumns(items);
      if (methodIndex < 0) return [...base, ...profitCols];
      return [
        ...base.slice(0, methodIndex),
        ...profitCols,
        ...base.slice(methodIndex),
      ];
    }, [tables, items]);
    return <DataTable columns={memoizedColumns} data={data}/>
}