"use client"

import { useMemo } from "react";
import { Ban } from "lucide-react";
import { buildCancelledOrderColumns, Order } from "./columns";
import { DataTable } from "./data-table";
import type { Table } from "@/lib/actions";
import {
  CafeReportMoneySummary,
  sumOrderLines,
} from "@/components/cafe/CafeReportMoneySummary";

export function DataTableClientWrapper({
  data,
  tables = [],
  analog = false,
}: {
  data: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
  analog?: boolean;
}) {
    const memoizedColumns = useMemo(
      () => buildCancelledOrderColumns(tables, analog),
      [tables, analog],
    );
    return (
      <DataTable
        columns={memoizedColumns}
        data={data}
        footerSummary={(filteredRows) => {
          const totals = sumOrderLines(filteredRows);
          return (
            <CafeReportMoneySummary
              items={[
                {
                  label: "Cancelled",
                  amount: totals.amount,
                  count: totals.count,
                  tone: "rose",
                  icon: <Ban className="h-4 w-4 text-rose-500" />,
                },
              ]}
            />
          );
        }}
      />
    );
}
