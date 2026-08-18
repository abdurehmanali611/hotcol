"use client";

import { useMemo } from "react";
import { Hourglass, TimerOff } from "lucide-react";
import { buildExpiredOrderColumns, Order } from "./columns";
import { DataTable } from "./data-table";
import type { Table } from "@/lib/actions";
import {
  CafeReportMoneySummary,
  sumOrderLines,
} from "@/components/cafe/CafeReportMoneySummary";
import { cafeReportLiveStatusFilterKey } from "@/lib/cafeReportFilter";

interface WrapperProps {
  data: Order[];
  tables?: Pick<Table, "tableNo" | "orderCaption">[];
  analog?: boolean;
}

export function DataTableClientWrapper({
  data,
  tables = [],
  analog = false,
}: WrapperProps) {
  const memoizedColumns = useMemo(
    () => buildExpiredOrderColumns(tables, analog),
    [tables, analog],
  );

  return (
    <DataTable
      columns={memoizedColumns}
      data={data}
      footerSummary={(filteredRows) => {
        const inProgressRows = filteredRows.filter(
          (order) => cafeReportLiveStatusFilterKey(order, analog) === "in-progress",
        );
        const expiredRows = filteredRows.filter(
          (order) => cafeReportLiveStatusFilterKey(order, analog) !== "in-progress",
        );
        const inProgress = sumOrderLines(inProgressRows);
        const expired = sumOrderLines(expiredRows);
        return (
          <CafeReportMoneySummary
            items={[
              {
                label: "In progress",
                amount: inProgress.amount,
                count: inProgress.count,
                tone: "amber",
                icon: <Hourglass className="h-4 w-4 text-amber-500" />,
              },
              {
                label: "Expired",
                amount: expired.amount,
                count: expired.count,
                tone: "slate",
                icon: <TimerOff className="h-4 w-4 text-muted-foreground" />,
              },
            ]}
          />
        );
      }}
    />
  );
}
