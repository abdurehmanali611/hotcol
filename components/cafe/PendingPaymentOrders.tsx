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
  variant = "kitchen-completed",
}: {
  orders?: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
  items?: Pick<Item, "name" | "recipeJson">[];
  /** kitchen-completed: digital after kitchen/bar; unpaid: any unpaid line; analog-unpaid: thermal mode before payment approval */
  variant?: "kitchen-completed" | "unpaid" | "analog-unpaid";
}) {
  const columns = useMemo(
    () => buildPendingPaymentOrderColumns(tables, items),
    [tables, items],
  );

  const totalRevenue = orders.reduce(
    (sum, o) => sum + o.price * o.orderAmount,
    0,
  );

  const bannerCopy =
    variant === "analog-unpaid"
      ? "Ticket printed but payment not verified yet. Cashier must approve cash, bank, or credit in the Payment section."
      : variant === "unpaid"
        ? "Orders waiting for cashier payment approval (not cancelled or failed)."
        : "Kitchen or bar marked these complete; cashier has not collected payment yet. Profit uses menu item recipes when configured.";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <p className="text-sm text-muted-foreground">{bannerCopy}</p>
        <p className="mt-2 text-base font-bold tabular-nums">
          {orders.length} line{orders.length === 1 ? "" : "s"} ·{" "}
          {totalRevenue.toLocaleString()} ETB pending
        </p>
      </div>
      <DataTable columns={columns} data={orders} />
    </div>
  );
}
