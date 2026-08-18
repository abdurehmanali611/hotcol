"use client"

import { Order } from "@/lib/actions";
import type { Table } from "@/lib/actions";
import type { Item } from "@/lib/api/types";
import { DataTableClientWrapper } from "./DataTableClientWrapper";

export default function CompletedOrders({
  orders,
  tables = [],
  items = [],
}: {
  orders: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
  items?: Pick<Item, "name" | "recipeJson">[];
}) {
    return (
        <main className="w-full py-6 px-4 md:px-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Completed Orders</h1>
                <p className="text-sm text-muted-foreground">Overview of all successful transactions and history.</p>
            </div>
            <DataTableClientWrapper data={orders ?? []} tables={tables} items={items}/>
        </main>
    )
}