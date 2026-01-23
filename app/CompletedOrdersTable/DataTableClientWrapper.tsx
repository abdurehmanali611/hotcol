/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useMemo } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
export function DataTableClientWrapper({ data }: any) {
    const memoizedColumns = useMemo(() => columns, []);
    return <DataTable columns={memoizedColumns} data={data}/>
}