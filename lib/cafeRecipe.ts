import type { Item, Order } from "@/lib/api/types";

export type MenuRecipeIngredient = {
  name: string;
  amount: number;
  measuredBy: string;
  unitPrice: number;
};

export type MenuRecipe = {
  ingredients: MenuRecipeIngredient[];
};

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function hasSnapshottedUnitCost(
  order: Pick<Order, "unitCostAtSale">,
): order is Pick<Order, "unitCostAtSale"> & { unitCostAtSale: number } {
  return (
    order.unitCostAtSale != null && Number.isFinite(Number(order.unitCostAtSale))
  );
}

/** Parse stored recipe JSON from API/DB. */
export function parseMenuRecipe(raw: unknown): MenuRecipe | null {
  if (!raw || typeof raw !== "object") return null;
  const ingredients = (raw as MenuRecipe).ingredients;
  if (!Array.isArray(ingredients) || ingredients.length === 0) return null;

  const parsed: MenuRecipeIngredient[] = [];
  for (const row of ingredients) {
    if (!row || typeof row !== "object") continue;
    const name = String((row as MenuRecipeIngredient).name ?? "").trim();
    if (!name) continue;
    parsed.push({
      name,
      amount: asNumber((row as MenuRecipeIngredient).amount),
      measuredBy: String((row as MenuRecipeIngredient).measuredBy ?? "").trim(),
      unitPrice: asNumber((row as MenuRecipeIngredient).unitPrice),
    });
  }

  return parsed.length > 0 ? { ingredients: parsed } : null;
}

export function recipeIngredientLineCost(ingredient: MenuRecipeIngredient): number {
  return ingredient.amount * ingredient.unitPrice;
}

/** Ingredient cost for one menu item (one serving). */
export function recipeCostPerUnit(recipe: MenuRecipe): number {
  return recipe.ingredients.reduce(
    (sum, line) => sum + recipeIngredientLineCost(line),
    0,
  );
}

/** Ingredient cost for an order line (qty × per-unit recipe cost). */
export function orderLineIngredientCost(
  recipe: MenuRecipe,
  orderAmount: number,
): number {
  const qty = Math.max(0, Number(orderAmount) || 0);
  return recipeCostPerUnit(recipe) * qty;
}

/**
 * Prefer `unitCostAtSale` frozen on the order; fall back to live recipe for
 * legacy rows created before cost snapshotting.
 */
export function orderLineResolvedIngredientCost(
  order: Pick<Order, "orderAmount" | "unitCostAtSale">,
  recipe: MenuRecipe | null | undefined,
): number | null {
  const qty = Math.max(0, Number(order.orderAmount) || 0);
  if (hasSnapshottedUnitCost(order)) {
    return Number(order.unitCostAtSale) * qty;
  }
  if (!recipe) return null;
  return orderLineIngredientCost(recipe, order.orderAmount);
}

export function orderLineRevenueETB(order: Pick<Order, "price" | "orderAmount">): number {
  const qty = Math.max(0, Number(order.orderAmount) || 0);
  const price = Number(order.price) || 0;
  return price * qty;
}

/** Profit = revenue − ingredient cost. Returns null when no snapshotted or live cost. */
export function orderLineProfitETB(
  order: Pick<Order, "title" | "price" | "orderAmount" | "unitCostAtSale">,
  recipe: MenuRecipe | null | undefined,
): number | null {
  const cost = orderLineResolvedIngredientCost(order, recipe);
  if (cost == null) return null;
  return orderLineRevenueETB(order) - cost;
}

export function findItemRecipeByTitle(
  items: Pick<Item, "name" | "recipeJson">[],
  title: string,
): MenuRecipe | null {
  const key = String(title ?? "").trim().toLowerCase();
  if (!key) return null;
  const item = items.find((i) => i.name.trim().toLowerCase() === key);
  return item ? parseMenuRecipe(item.recipeJson) : null;
}

export function menuRecipeToJson(
  recipe: MenuRecipe | null | undefined,
): MenuRecipe | null {
  if (!recipe?.ingredients?.length) return null;
  return {
    ingredients: recipe.ingredients.map((line) => ({
      name: line.name.trim(),
      amount: asNumber(line.amount),
      measuredBy: line.measuredBy.trim(),
      unitPrice: asNumber(line.unitPrice),
    })),
  };
}
