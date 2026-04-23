"use client";

import { Cashout } from "@/lib/actions";
import { DataTableClientWrapper } from "./DataTableClientWrapper";

export default function CashoutsPage({ cashout }: { cashout: Cashout[] }) {
  return (
    <main className="container mx-auto py-10 px-4 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Cashouts</h1>
        <p className="text-muted-foreground text-sm">Manage and track hotel inventory expenses.</p>
      </div>
      <DataTableClientWrapper data={cashout ?? []} />
    </main>
  );
}