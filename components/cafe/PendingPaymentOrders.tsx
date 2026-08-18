"use client";

import { useMemo } from "react";
import { Hourglass } from "lucide-react";
import type { Item } from "@/lib/api/types";
import type { Table } from "@/lib/actions";
import {
  buildPendingPaymentOrderColumns,
  type Order,
} from "@/components/cafe/pendingPaymentOrderColumns";
import { DataTable } from "@/app/CompletedOrdersTable/data-table";
import {
  CafeReportMoneySummary,
  sumOrderLines,
} from "@/components/cafe/CafeReportMoneySummary";

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

  const bannerCopy =
    variant === "analog-unpaid"
      ? "Ticket printed but payment not verified yet. Cashier must approve cash, bank, or credit in the Payment section."
      : variant === "unpaid"
        ? "Orders waiting for cashier payment approval (not cancelled or failed)."
        : "Kitchen or bar marked these complete; cashier has not collected payment yet.";

  return (
    <div className="w-full py-6 px-4 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Pending payment</h1>
        <p className="text-sm text-muted-foreground">{bannerCopy}</p>
      </div>
      <DataTable
        columns={columns}
        data={orders}
        footerSummary={(filteredRows) => {
          const totals = sumOrderLines(filteredRows);
          return (
            <CafeReportMoneySummary
              items={[
                {
                  label: "Pending payment",
                  amount: totals.amount,
                  count: totals.count,
                  tone: "amber",
                  icon: <Hourglass className="h-4 w-4 text-amber-500" />,
                },
              ]}
            />
          );
        }}
      />
    </div>
  );
}
