"use client"

import { useMemo, useState } from "react";
import { Order } from "@/lib/actions";
import type { Table } from "@/lib/actions";
import { DataTableClientWrapper } from "./DataTableClientWrapper";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cafeCancelledByFilterOptions,
  matchesCafeCancelledByFilter,
  type CafeCancelledByFilter,
} from "@/lib/cafeCancelledBy";

export default function CancelledOrders({
  orders,
  tables = [],
  analog = false,
}: {
  orders: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
  analog?: boolean;
}) {
    const [cancelledByFilter, setCancelledByFilter] =
      useState<CafeCancelledByFilter>("all");
    const filterOptions = cafeCancelledByFilterOptions(analog);
    const filteredOrders = useMemo(
      () =>
        (orders ?? []).filter((order) =>
          matchesCafeCancelledByFilter(order, analog, cancelledByFilter),
        ),
      [analog, cancelledByFilter, orders],
    );

    return (
        <main className="w-full py-6 px-4 md:px-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Cancelled Orders</h1>
                    <p className="text-sm text-muted-foreground">View and manage orders that were removed from service.</p>
                </div>
                <div className="flex w-full flex-col gap-1.5 sm:w-56">
                <Label className="text-xs font-medium text-muted-foreground">
                  Cancelled by
                </Label>
                <Select
                  value={cancelledByFilter}
                  onValueChange={(value) =>
                    setCancelledByFilter(value as CafeCancelledByFilter)
                  }
                >
                  <SelectTrigger className="h-9 w-full">
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
            </div>
            <DataTableClientWrapper analog={analog} data={filteredOrders} tables={tables}/>
        </main>
    )
}
