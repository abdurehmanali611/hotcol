"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { displayKitchenBarStation } from "@/lib/hotelDailyStation";
import type {
  RecipeStockConsumption,
  StationIngredientStock,
} from "@/lib/api/types";
import { AlertTriangle } from "lucide-react";

function formatQty(n: number, unit?: string): string {
  const q = Number(n) || 0;
  const formatted =
    Math.abs(q - Math.round(q)) < 1e-9
      ? String(Math.round(q))
      : q.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const u = String(unit || "").trim();
  return u ? `${formatted} ${u}` : formatted;
}

function formatWhen(iso: Date | string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const stationOnHandColumns: ColumnDef<StationIngredientStock>[] = [
  {
    accessorKey: "itemName",
    header: "Ingredient",
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.original.itemName}</span>
    ),
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
    accessorKey: "amount",
    header: () => <div className="text-right">On hand</div>,
    cell: ({ row }) => {
      const low = Number(row.original.amount) <= 0;
      return (
        <div className="text-right">
          <Badge
            variant={low ? "destructive" : "outline"}
            className="tabular-nums"
          >
            {formatQty(row.original.amount, row.original.measuredBy)}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "measuredBy",
    header: "Unit",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.measuredBy || "—"}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {formatWhen(row.original.updatedAt)}
      </span>
    ),
  },
];

export const recipeUsageColumns: ColumnDef<RecipeStockConsumption>[] = [
  {
    accessorKey: "createdAt",
    header: "When",
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {formatWhen(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "menuItemTitle",
    header: "Menu item",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {row.original.menuItemTitle}
        </p>
        <p className="text-[11px] text-muted-foreground">
          ×{row.original.orderAmount} · order #{row.original.orderId}
        </p>
      </div>
    ),
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
    accessorKey: "ingredientName",
    header: "Ingredient",
    cell: ({ row }) => (
      <span className="text-foreground">{row.original.ingredientName}</span>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Deducted</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums text-foreground">
        −{formatQty(row.original.amount, row.original.measuredBy)}
      </div>
    ),
  },
  {
    accessorKey: "shortfallAmount",
    header: "Coverage",
    cell: ({ row }) => {
      const short = Number(row.original.shortfallAmount) || 0;
      if (short > 0) {
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Short {formatQty(short, row.original.measuredBy)}
          </Badge>
        );
      }
      return (
        <Badge
          variant="secondary"
          className="border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
        >
          Covered
        </Badge>
      );
    },
  },
  {
    accessorKey: "completedBy",
    header: "By",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.completedBy || "—"}
      </span>
    ),
  },
];
