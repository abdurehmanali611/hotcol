"use client"
import { useCallback, useEffect, useState } from "react"
import { DataTableClientWrapper } from "./DataTableClientWrapper"
import { fetchWaiters, Waiter } from "@/lib/actions"
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch"

export default function WaiterTable({
  waiter,
  hotelName,
}: {
  waiter: Waiter[];
  hotelName: string;
}) {
  const [data, setData] = useState(waiter);
  
  const refetchData = useCallback(async () => {
    const res = await fetchWaiters();
    setData(
      res.filter((item) =>
        rowHotelMatchesTenantScope(item.HotelName, hotelName),
      ),
    );
  }, [hotelName]);

  useEffect(() => {
    setData(waiter);
  }, [waiter]);

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
