"use client"

import { useMemo } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { ItemRegistration } from "@/lib/actions";

interface WrapperProps {
  data: ItemRegistration[];
}

export function DataTableClientWrapper({ data }: WrapperProps) {
    const memoizedColumns = useMemo(() => columns, []);
    return <DataTable columns={memoizedColumns} data={data}/>
}