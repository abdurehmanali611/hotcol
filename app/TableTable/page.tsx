"use client"
import { useCallback, useEffect, useState } from "react"
import { DataTableClientWrapper } from "./DataTableClientWrapper"
import { fetchTables, Table } from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";

export default function TableTable({
  Table,
  hotelName,
}: {
  Table: Table[];
  hotelName: string;
}) {
  const [data, setData] = useState(Table);

  const refetchData = useCallback(async () => {
    const res = await fetchTables();
    setData(
      res.filter((item) =>
        rowHotelMatchesTenantScope(item.HotelName, hotelName),
      ),
    );
  }, [hotelName]);

  useEffect(() => {
    setData(Table);
  }, [Table]);

  useEffect(() => {
    (async () => {
      await refetchData();
    })();
  }, [refetchData])

  return (
    <div className="w-full min-w-0 py-4">
      <DataTableClientWrapper data={data ?? []} refresh={refetchData}/>
    </div>
  )
}
