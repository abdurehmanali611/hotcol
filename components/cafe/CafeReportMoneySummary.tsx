"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CafeReportMoneySummaryItem = {
  label: string;
  amount: number;
  count: number;
  icon?: ReactNode;
  tone?: "amber" | "slate" | "rose" | "emerald" | "orange";
  unit?: string;
};

const TONE_CLASS: Record<NonNullable<CafeReportMoneySummaryItem["tone"]>, string> =
  {
    amber: "border-amber-500/25 bg-amber-500/5",
    slate: "border-border bg-muted/40",
    rose: "border-rose-500/25 bg-rose-500/5",
    emerald: "border-emerald-500/25 bg-emerald-500/5",
    orange: "border-orange-500/25 bg-orange-500/5",
  };

export function CafeReportMoneySummary({
  items,
  className,
}: {
  items: CafeReportMoneySummaryItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        items.length > 1 ? "sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-xl border px-4 py-4 shadow-sm",
            TONE_CLASS[item.tone ?? "slate"],
          )}
        >
          <div className="flex items-center gap-2">
            {item.icon}
            <p className="text-sm font-semibold tracking-tight">{item.label}</p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">
            {item.amount.toLocaleString()} ETB
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.count} {item.unit ?? "order"}
            {item.count === 1 ? "" : "s"}
          </p>
        </div>
      ))}
    </div>
  );
}

export function sumOrderLines(
  rows: { price: number; orderAmount: number }[],
): { amount: number; count: number } {
  return {
    count: rows.length,
    amount: rows.reduce((sum, row) => sum + row.price * row.orderAmount, 0),
  };
}
