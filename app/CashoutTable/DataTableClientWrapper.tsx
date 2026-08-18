"use client";

import { useMemo } from "react";
import { Wallet } from "lucide-react";
import { columns, Cashout } from "./columns";
import { DataTable } from "./data-table";
import { CafeReportMoneySummary } from "@/components/cafe/CafeReportMoneySummary";

interface WrapperProps {
  data: Cashout[];
}

export function DataTableClientWrapper({ data }: WrapperProps) {
  const memoizedColumns = useMemo(() => columns, []);

  return (
    <DataTable
      columns={memoizedColumns}
      data={data}
      footerSummary={(filteredRows) => {
        const amount = filteredRows.reduce(
          (sum, row) => sum + (Number(row.totalCalc) || 0),
          0,
        );
        return (
          <CafeReportMoneySummary
            items={[
              {
                label: "Cashouts",
                amount,
                count: filteredRows.length,
                unit: "cashout",
                tone: "orange",
                icon: <Wallet className="h-4 w-4 text-orange-500" />,
              },
            ]}
          />
        );
      }}
    />
  );
}
