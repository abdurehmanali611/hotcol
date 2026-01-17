"use client"
import { useCallback, useEffect, useState } from "react"
import { DataTableClientWrapper } from "./DataTableClientWrapper"
import { fetchWaiters, Waiter } from "@/lib/actions"

export default function WaiterTable({ waiter }: { waiter: Waiter[] }) {
  const [data, setData] = useState(waiter);
  
  const refetchData = useCallback(async () => {
    const res = await fetchWaiters();
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