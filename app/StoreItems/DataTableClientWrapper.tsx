"use client"
import { useMemo } from "react";
import { columns, items } from "./columns";
import { DataTable } from "./data-table";

interface WrapperProps {
  data: items[];
  onEdit?: (item: items) => void;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
  readOnly?: boolean;
}

export function DataTableClientWrapper({
  data,
  onEdit,
  refresh,
  hotelStockApprovals,
  readOnly,
}: WrapperProps) {
  const memoizedColumns = useMemo(
    () => columns(onEdit, refresh, { hotelStockApprovals, readOnly }),
    [onEdit, refresh, hotelStockApprovals, readOnly],
  );
  
  return <DataTable columns={memoizedColumns} data={data}/>
}