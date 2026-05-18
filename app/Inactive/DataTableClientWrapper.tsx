"use client";

import { useMemo } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { ItemStatus } from "@/lib/actions";
import { VOUCHER_TABLE_SORT } from "@/lib/voucherSort";

interface WrapperProps {
  data: ItemStatus[];
  admin: boolean;
  refresh: () => void;
}

export function DataTableClientWrapper({ data, admin, refresh }: WrapperProps) {
  const memoizedColumns = useMemo(() => columns(admin, refresh), [admin, refresh]);
  
  return (
    <DataTable
      columns={memoizedColumns}
      data={data}
      initialSorting={VOUCHER_TABLE_SORT}
    />
  );
}