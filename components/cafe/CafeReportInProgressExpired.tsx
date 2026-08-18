"use client";

import { DataTableClientWrapper } from "@/app/ExpiredOrdersTable/DataTableClientWrapper";
import type { Order } from "@/lib/actions";
import type { Table } from "@/lib/actions";

export default function CafeReportInProgressExpired({
  analog,
  inProgress,
  expired,
  tables = [],
}: {
  analog: boolean;
  inProgress: Order[];
  expired: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
}) {
  const inProgressTotal = inProgress.reduce(
    (sum, order) => sum + order.price * order.orderAmount,
    0,
  );
  const expiredTotal = expired.reduce(
    (sum, order) => sum + order.price * order.orderAmount,
    0,
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <h3 className="text-base font-semibold tracking-tight">In progress</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {analog
              ? "Today's tickets that are not paid yet. Cashier approval is still open in Payment."
              : "Today's orders that are still with kitchen or bar."}
          </p>
          <p className="mt-2 text-base font-bold tabular-nums">
            {inProgress.length} line{inProgress.length === 1 ? "" : "s"} ·{" "}
            {inProgressTotal.toLocaleString()} ETB
          </p>
        </div>
        <DataTableClientWrapper data={inProgress} tables={tables} />
      </section>

      <section className="space-y-3">
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
          <h3 className="text-base font-semibold tracking-tight">Expired</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {analog
              ? "Orders from before today that never received payment approval."
              : "Orders from before today that kitchen or bar never marked complete."}
          </p>
          <p className="mt-2 text-base font-bold tabular-nums">
            {expired.length} line{expired.length === 1 ? "" : "s"} ·{" "}
            {expiredTotal.toLocaleString()} ETB
          </p>
        </div>
        <DataTableClientWrapper data={expired} tables={tables} />
      </section>
    </div>
  );
}
