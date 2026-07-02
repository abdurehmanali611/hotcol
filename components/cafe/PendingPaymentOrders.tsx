"use client";

import { useMemo } from "react";
import type { Item } from "@/lib/api/types";
import type { Table } from "@/lib/actions";
import {
  buildPendingPaymentOrderColumns,
  type Order,
} from "@/components/cafe/pendingPaymentOrderColumns";
import { DataTable } from "@/app/CompletedOrdersTable/data-table";

export default function PendingPaymentOrders({
  orders = [],
  tables = [],
  items = [],
}: {
  orders?: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
  items?: Pick<Item, "name" | "recipeJson">[];
}) {
  const columns = useMemo(
    () => buildPendingPaymentOrderColumns(tables, items),
    [tables, items],
  );

  const totalRevenue = orders.reduce(
    (sum, o) => sum + o.price * o.orderAmount,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Kitchen or bar marked these complete; cashier has not collected payment
          yet. Profit uses menu item recipes when configured.
        </p>
        <p className="mt-2 text-base font-bold tabular-nums">
          {orders.length} line{orders.length === 1 ? "" : "s"} ·{" "}
          {totalRevenue.toLocaleString()} ETB pending
        </p>
      </div>
      <DataTable columns={columns} data={orders} />
    </div>
  );
}
