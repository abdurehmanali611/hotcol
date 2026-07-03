"use client";

import { useMemo } from "react";
import type { ItemRegistration } from "@/lib/actions";
import { countUniqueInventoryNames } from "@/lib/inventoryAggregation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MinusCircle, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

type StoreInventorySummaryRowProps = {
  items: ItemRegistration[];
  movementCount: number;
  inventoryLabel?: string;
  className?: string;
};

export function StoreInventorySummaryRow({
  items,
  movementCount,
  inventoryLabel = "Inventory items",
  className,
}: StoreInventorySummaryRowProps) {
  const uniqueInventoryCount = useMemo(
    () => countUniqueInventoryNames(items),
    [items],
  );

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <Card className="border-emerald-500/20 bg-linear-to-br from-card to-emerald-500/4 shadow-md overflow-hidden">
        <div className="h-0.5 bg-linear-to-r from-emerald-500/80 to-teal-400/60" />
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
              <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardDescription>{inventoryLabel}</CardDescription>
              <CardTitle className="text-3xl tabular-nums tracking-tight">
                {uniqueInventoryCount}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Unique items ({items.length} registration line
                {items.length === 1 ? "" : "s"})
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>
      <Card className="border-violet-500/20 bg-linear-to-br from-card to-violet-500/5 shadow-md overflow-hidden">
        <div className="h-0.5 bg-linear-to-r from-violet-500/70 to-indigo-400/50" />
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5">
              <MinusCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardDescription>Status / inactive rows</CardDescription>
              <CardTitle className="text-3xl tabular-nums tracking-tight">
                {movementCount}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Tracked movements & inactive lines
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
