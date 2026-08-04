"use client";

import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { Item, Order } from "@/lib/api/types";
import {
  orderLineResolvedIngredientCost,
  orderLineProfitETB,
} from "@/lib/cafeRecipe";

/**
 * Cost / profit columns for report detail tables.
 * Uses only `unitCostAtSale` frozen when the order was placed — never the
 * live menu recipe (so pre-ingredient lines stay blank and recipe updates
 * do not rewrite older lines).
 */
export function cafeOrderProfitColumns(
  _items: Pick<Item, "name" | "recipeJson">[] = [],
): ColumnDef<Order>[] {
  return [
    {
      id: "ingredientCost",
      header: "Cost at sale",
      cell: ({ row }) => {
        const cost = orderLineResolvedIngredientCost(row.original);
        if (cost == null) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return (
          <span className="text-sm tabular-nums text-muted-foreground">
            {cost.toLocaleString()} ETB
          </span>
        );
      },
    },
    {
      id: "profit",
      header: "Profit at sale",
      cell: ({ row }) => {
        const profit = orderLineProfitETB(row.original);
        if (profit === null) {
          return (
            <span className="text-xs text-muted-foreground">No cost at sale</span>
          );
        }
        return (
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              profit >= 0 ? "text-emerald-600" : "text-destructive",
            )}
          >
            {profit.toLocaleString()} ETB
          </span>
        );
      },
    },
  ];
}
