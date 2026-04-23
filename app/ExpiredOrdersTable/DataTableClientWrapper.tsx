"use client";

import { useMemo } from "react";
import { columns, Order } from "./columns";
import { DataTable } from "./data-table";

interface WrapperProps {
  data: Order[];
}

export function DataTableClientWrapper({ data }: WrapperProps) {
  const memoizedColumns = useMemo(() => columns, []);
  
  return <DataTable columns={memoizedColumns} data={data} />;
}