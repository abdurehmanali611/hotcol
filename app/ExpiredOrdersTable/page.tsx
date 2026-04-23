"use client";

import { Order } from "@/lib/actions";
import { DataTableClientWrapper } from "./DataTableClientWrapper";

export default function ExpiredOrdersPage({ orders }: { orders: Order[] }) {
  return (
    <main className="container mx-auto py-10 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Expired Orders</h1>
        <p className="text-sm text-muted-foreground">Review and manage historical order data.</p>
      </div>
      <DataTableClientWrapper data={orders ?? []} />
    </main>
  );
}