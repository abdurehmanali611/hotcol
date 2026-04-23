"use client"

import { useMemo } from "react";
import { columns, Order } from "./columns";
import { DataTable } from "./data-table";

export function DataTableClientWrapper({ data }: { data: Order[] }) {
    const memoizedColumns = useMemo(() => columns, []);
    return <DataTable columns={memoizedColumns} data={data}/>
}