"use client";

import { useMemo, useState } from "react";
import { DataTableClientWrapper } from "@/app/ExpiredOrdersTable/DataTableClientWrapper";
import type { Order } from "@/lib/actions";
import type { Table } from "@/lib/actions";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cafeReportLiveStatusFilterOptions,
  matchesCafeReportLiveStatusFilter,
  type CafeReportLiveStatusFilter,
} from "@/lib/cafeReportFilter";

function orderLineTotal(order: Order) {
  return order.price * order.orderAmount;
}

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
  const [statusFilter, setStatusFilter] =
    useState<CafeReportLiveStatusFilter>("all");
  const filterOptions = cafeReportLiveStatusFilterOptions(analog);

  const filteredInProgress = useMemo(
    () =>
      inProgress.filter((order) =>
        matchesCafeReportLiveStatusFilter(order, analog, statusFilter),
      ),
    [analog, inProgress, statusFilter],
  );
  const filteredExpired = useMemo(
    () =>
      expired.filter((order) =>
        matchesCafeReportLiveStatusFilter(order, analog, statusFilter),
      ),
    [analog, expired, statusFilter],
  );

  const inProgressTotal = filteredInProgress.reduce(
    (sum, order) => sum + orderLineTotal(order),
    0,
  );
  const expiredTotal = filteredExpired.reduce(
    (sum, order) => sum + orderLineTotal(order),
    0,
  );

  const tableRows = useMemo(
    () => [...filteredInProgress, ...filteredExpired],
    [filteredExpired, filteredInProgress],
  );

  return (
    <div className="w-full space-y-6 py-6 px-4 md:px-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
          <h3 className="text-base font-semibold tracking-tight">
            In progress
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {analog
              ? "Today's tickets that are not paid yet. Cashier approval is still open in Payment."
              : "Today's orders that are still with kitchen or bar."}
          </p>
          <p className="mt-2 text-base font-bold tabular-nums">
            {filteredInProgress.length} line
            {filteredInProgress.length === 1 ? "" : "s"} ·{" "}
            {inProgressTotal.toLocaleString()} ETB
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
          <h3 className="text-base font-semibold tracking-tight">Expired</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {analog
              ? "Orders from before today that never received payment approval."
              : "Orders from before today that kitchen or bar never marked complete, or that were completed but never received cashier payment approval."}
          </p>
          <p className="mt-2 text-base font-bold tabular-nums">
            {filteredExpired.length} line{filteredExpired.length === 1 ? "" : "s"}{" "}
            · {expiredTotal.toLocaleString()} ETB
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:ml-auto sm:w-56">
        <Label className="text-xs font-medium text-muted-foreground">
          Status
        </Label>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as CafeReportLiveStatusFilter)
          }
        >
          <SelectTrigger className="h-10 w-full bg-background">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTableClientWrapper analog={analog} data={tableRows} tables={tables} />
    </div>
  );
}
