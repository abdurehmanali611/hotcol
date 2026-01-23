"use client"
import { Order } from "@/lib/actions";
import { DataTableClientWrapper } from "./DataTableClientWrapper";

export default function CancelledOrders({orders}: {orders: Order[]}) {
    return (
        <div className="container mx-auto py-10">
            <DataTableClientWrapper data={orders ?? []}/>
        </div>
    )
}