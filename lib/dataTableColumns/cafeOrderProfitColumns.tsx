"use client";

import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { Item, Order } from "@/lib/api/types";
import {
  findItemRecipeByTitle,
  orderLineIngredientCost,
  orderLineProfitETB,
} from "@/lib/cafeRecipe";

export function cafeOrderProfitColumns(
  items: Pick<Item, "name" | "recipeJson">[],
): ColumnDef<Order>[] {
  return [
    {
      id: "ingredientCost",
      header: "Ingredient cost",
      cell: ({ row }) => {
        const recipe = findItemRecipeByTitle(items, row.original.title);
        if (!recipe) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        const cost = orderLineIngredientCost(recipe, row.original.orderAmount);
        return (
          <span className="text-sm tabular-nums text-muted-foreground">
            {cost.toLocaleString()} ETB
          </span>
        );
      },
    },
    {
      id: "profit",
      header: "Est. profit",
      cell: ({ row }) => {
        const recipe = findItemRecipeByTitle(items, row.original.title);
        const profit = orderLineProfitETB(row.original, recipe);
        if (profit === null) {
          return <span className="text-xs text-muted-foreground">No recipe</span>;
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
