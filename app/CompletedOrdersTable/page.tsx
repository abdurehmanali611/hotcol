"use client"

import { Order } from "@/lib/actions";
import type { Table } from "@/lib/actions";
import { DataTableClientWrapper } from "./DataTableClientWrapper";

export default function CompletedOrders({
  orders,
  tables = [],
}: {
  orders: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
}) {
    return (
        <main className="container mx-auto py-10 px-4 md:px-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Completed Orders</h1>
                <p className="text-sm text-muted-foreground">Overview of all successful transactions and history.</p>
            </div>
            <DataTableClientWrapper data={orders ?? []} tables={tables}/>
        </main>
    )
}