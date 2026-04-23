"use client"
import { useMemo } from "react";
import { columns, items } from "./columns";
import { DataTable } from "./data-table";

interface WrapperProps {
  data: items[];
  onEdit?: (item: items) => void;
  refresh?: () => void;
}

export function DataTableClientWrapper({ data, onEdit, refresh }: WrapperProps) {
  const memoizedColumns = useMemo(() => columns(onEdit, refresh), [onEdit, refresh]);
  
  return <DataTable columns={memoizedColumns} data={data}/>
}