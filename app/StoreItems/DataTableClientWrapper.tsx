"use client"
import { useMemo } from "react";
import { columns, items } from "./columns";
import { DataTable } from "./data-table";

interface WrapperProps {
  data: items[];
  onEdit?: (item: items) => void;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
}

export function DataTableClientWrapper({
  data,
  onEdit,
  refresh,
  hotelStockApprovals,
}: WrapperProps) {
  const memoizedColumns = useMemo(
    () => columns(onEdit, refresh, { hotelStockApprovals }),
    [onEdit, refresh, hotelStockApprovals],
  );
  
  return <DataTable columns={memoizedColumns} data={data}/>
}