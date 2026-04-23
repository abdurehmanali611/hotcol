/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { CreditRegistration, fetchCreditRegistrations } from "@/lib/actions";
import { DataTableClientWrapper } from "./DataTableClientWrapper";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function Credittor({
  credittor,
}: {
  credittor: CreditRegistration[];
}) {
  const [data, setData] = useState<CreditRegistration[]>(credittor ?? []);

  const fetchCredittor = async () => {
    try {
      const response = await fetchCreditRegistrations();
      setData(response);
    } catch (error: any) {
      toast.error(error.message);
      console.log(error);
    }
  };

  useEffect(() => {
    (async() => (
      await fetchCredittor()
    ))()
  }, [data.length]);

  return (
    <div className="container mx-auto py-10">
      <DataTableClientWrapper data={data} refresh={fetchCredittor} />
    </div>
  );
}
