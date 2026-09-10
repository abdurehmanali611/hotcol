"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { displayKitchenBarStation } from "@/lib/hotelDailyStation";
import type { RecipeStockConsumption } from "@/lib/api/types";
import { MenuItemUsageDetailTrigger } from "@/components/inventory/MenuItemUsageDetailTrigger";
import { cn } from "@/lib/utils";
import { Coffee, Utensils } from "lucide-react";

export type MenuItemIngredientUsage = {
  ingredientName: string;
  measuredBy: string;
  amount: number;
  lineCount: number;
};

export type MenuItemUsageGroup = {
  id: string;
  menuItemTitle: string;
  station: string;
  /** Unique completed orders in range. */
  orderCount: number;
  /** Sum of servings (order amounts) across unique orders. */
  servingTotal: number;
  /** Live bottleneck servings still makeable from station stock. */
  servingsAvailable: number;
  ingredientUsage: MenuItemIngredientUsage[];
  recentLines: RecipeStockConsumption[];
  lastUpdatedAt: Date | string | null;
};

function formatWhen(iso: Date | string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StationChip({ station }: { station: string }) {
  const label = displayKitchenBarStation(station);
  const isBar = String(station).toUpperCase().includes("BAR");
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-normal border-border/70 bg-background/80 shadow-sm",
        isBar
          ? "text-violet-800 dark:text-violet-200 border-violet-500/25 bg-violet-500/10"
          : "text-sky-900 dark:text-sky-200 border-sky-500/25 bg-sky-500/10",
      )}
    >
      {isBar ? (
        <Coffee className="h-3 w-3 opacity-80" />
      ) : (
        <Utensils className="h-3 w-3 opacity-80" />
      )}
      {label}
    </Badge>
  );
}

/** Usage status: one row per menu item — On hand + Usage (hover/sheet). */
export const menuItemUsageStatusColumns: ColumnDef<MenuItemUsageGroup>[] = [
  {
    accessorKey: "menuItemTitle",
    header: "Menu item",
    cell: ({ row }) => {
      const g = row.original;
      const footerParts = [
        `${g.orderCount} order${g.orderCount === 1 ? "" : "s"}`,
        `${g.servingTotal} serving${g.servingTotal === 1 ? "" : "s"}`,
        `${g.ingredientUsage.length} ingredient${g.ingredientUsage.length === 1 ? "" : "s"}`,
      ];
      return (
        <MenuItemUsageDetailTrigger
          group={g}
          className="px-1.5 py-1 -mx-1.5 rounded-lg"
        >
          <div className="flex flex-col gap-0.5 max-w-[16rem]">
            <span className="font-semibold tracking-tight truncate underline-offset-4 decoration-primary/40 group-hover/detail:underline group-hover/detail:decoration-primary/70">
              {g.menuItemTitle}
            </span>
            <span className="text-[10px] leading-snug text-muted-foreground/90">
              {footerParts.join(" · ")}
            </span>
          </div>
        </MenuItemUsageDetailTrigger>
      );
    },
  },
  {
    accessorKey: "station",
    header: "Station",
    cell: ({ row }) => <StationChip station={row.original.station} />,
  },
  {
    accessorKey: "servingsAvailable",
    header: () => <div className="text-right">On hand</div>,
    cell: ({ row }) => {
      const left = Number(row.original.servingsAvailable);
      const unknown = !Number.isFinite(left);
      const empty = !unknown && left <= 0;
      const low = !unknown && left > 0 && left <= 3;
      const label = unknown
        ? "—"
        : `${left} serving${left === 1 ? "" : "s"}`;
      return (
        <div className="text-right">
          <Badge
            variant="outline"
            className={cn(
              "tabular-nums font-medium shadow-sm",
              empty &&
                "border-destructive/35 bg-destructive/10 text-destructive",
              low &&
                !empty &&
                "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200",
              !empty &&
                !low &&
                !unknown &&
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
              unknown && "text-muted-foreground",
            )}
          >
            {label}
            {!unknown ? (
              <span className="ml-1 font-normal opacity-70">left</span>
            ) : null}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "servingTotal",
    header: () => <div className="text-right">Usage</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <MenuItemUsageDetailTrigger
          group={row.original}
          className="inline-flex justify-end rounded-lg px-1.5 py-1"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-foreground shadow-sm underline-offset-4 group-hover/detail:underline group-hover/detail:bg-muted/70">
            <span className="text-rose-600/90 dark:text-rose-300">−</span>
            {row.original.servingTotal}
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              srv
            </span>
          </span>
        </MenuItemUsageDetailTrigger>
        <p className="mt-1 text-[10px] text-muted-foreground/80">
          Hover · click detail
        </p>
      </div>
    ),
  },
  {
    accessorKey: "lastUpdatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {formatWhen(row.original.lastUpdatedAt)}
      </span>
    ),
  },
];

/** @deprecated */
export const recipeUsageStatusColumns = menuItemUsageStatusColumns;
/** @deprecated */
export const recipeUsageColumns = menuItemUsageStatusColumns;
/** @deprecated */
export const stationOnHandColumns = menuItemUsageStatusColumns;
/** @deprecated */
export const ingredientStationStatusColumns = menuItemUsageStatusColumns;
