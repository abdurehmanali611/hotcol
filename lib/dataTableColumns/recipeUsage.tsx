"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { displayKitchenBarStation } from "@/lib/hotelDailyStation";
import type { RecipeStockConsumption } from "@/lib/api/types";
import { MenuItemUsageDetailTrigger } from "@/components/inventory/MenuItemUsageDetailTrigger";

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
          className="px-1 py-0.5 -mx-1"
        >
          <div className="flex flex-col gap-0.5 max-w-65">
            <span className="font-medium truncate underline-offset-2 group-hover/detail:underline">
              {g.menuItemTitle}
            </span>
            <span className="text-[10px] leading-snug text-muted-foreground">
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
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-normal">
        {displayKitchenBarStation(row.original.station)}
      </Badge>
    ),
  },
  {
    accessorKey: "servingsAvailable",
    header: () => <div className="text-right">On hand</div>,
    cell: ({ row }) => {
      const left = Number(row.original.servingsAvailable);
      const low = !Number.isFinite(left) || left <= 0;
      const label = !Number.isFinite(left)
        ? "—"
        : `${left} serving${left === 1 ? "" : "s"} left`;
      return (
        <div className="text-right">
          <Badge
            variant={low ? "destructive" : "outline"}
            className="tabular-nums"
          >
            {label}
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
          className="inline-flex justify-end px-1 py-0.5"
        >
          <span className="font-medium tabular-nums text-foreground underline-offset-2 group-hover/detail:underline">
            −{row.original.servingTotal} serving
            {row.original.servingTotal === 1 ? "" : "s"}
          </span>
        </MenuItemUsageDetailTrigger>
        <p className="text-[11px] text-muted-foreground">
          Hover for ingredients
        </p>
      </div>
    ),
  },
  {
    accessorKey: "lastUpdatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
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
