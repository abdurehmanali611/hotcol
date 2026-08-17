"use client";

import { DataTableClientWrapper } from "@/app/CancelledOrdersTable/DataTableClientWrapper";
import type { Order } from "@/lib/actions";
import type { Table } from "@/lib/actions";

export default function FailedOrdersTable({
  orders,
  tables = [],
}: {
  orders: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
}) {
  return (
    <main className="w-full py-6 px-4 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Failed orders</h1>
        <p className="text-sm text-muted-foreground">
          Tickets that did not print or save because of cashier PC / POS
          miscommunication. Retry from the order screen after fixing the
          connection.
        </p>
      </div>
      <DataTableClientWrapper data={orders ?? []} tables={tables} />
    </main>
  );
}
