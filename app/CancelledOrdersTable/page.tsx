"use client"

import { Order } from "@/lib/actions";
import { DataTableClientWrapper } from "./DataTableClientWrapper";

export default function CancelledOrders({ orders }: { orders: Order[] }) {
    return (
        <main className="w-full py-6 px-4 md:px-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Cancelled Orders</h1>
                <p className="text-sm text-muted-foreground">View and manage orders that were removed from service.</p>
            </div>
            <DataTableClientWrapper data={orders ?? []}/>
        </main>
    )
}