"use client"
import { useCallback, useEffect, useState } from "react"
import { DataTableClientWrapper } from "./DataTableClientWrapper"
import { fetchTables, Table } from "@/lib/actions";

export default function TableTable({ Table }: { Table: Table[] }) {
  const [data, setData] = useState(Table);

  const refetchData = useCallback(async () => {
    const res = await fetchTables();
    setData(res);
  }, []);

  useEffect(() => {
    (async () => {
      await refetchData();
    })();
  }, [refetchData])

  return (
    <div className="container mx-auto py-10">
      <DataTableClientWrapper data={data ?? []} refresh={refetchData}/>
    </div>
  )
}