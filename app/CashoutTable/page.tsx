"use client";

import { Cashout } from "@/lib/actions";
import { DataTableClientWrapper } from "./DataTableClientWrapper";

export default function CashoutsPage({ cashout }: { cashout: Cashout[] }) {
  return (
    <main className="w-full py-6 px-4 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Cashouts</h1>
        <p className="text-sm text-muted-foreground">
          Inventory purchases paid from the till for this report period.
        </p>
      </div>
      <DataTableClientWrapper data={cashout ?? []} />
    </main>
  );
}
