"use client";
import { Cashout } from "@/lib/actions";
import { DataTableClientWrapper } from "./DataTableClientWrapper";

export default function Cashouts({ cashout }: { cashout: Cashout[] }) {
  return (
    <div className="container mx-auto py-10">
      <DataTableClientWrapper data={cashout ?? []} />
    </div>
  );
}
