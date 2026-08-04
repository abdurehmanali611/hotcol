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

/** Stable money rounding for report totals (2 decimal places). */
export function roundMoneyETB(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * True when the order has a frozen per-serving cost from create time.
 * `0` is valid (true zero cost). `null`/`undefined` means unknown /
 * ingredients were not on the menu when this line was sold.
 */
export function hasSnapshottedUnitCost(
  order: Pick<Order, "unitCostAtSale">,
): order is Pick<Order, "unitCostAtSale"> & { unitCostAtSale: number } {
  return (
    order.unitCostAtSale != null && Number.isFinite(Number(order.unitCostAtSale))
  );
}

/** Parse stored recipe JSON from API/DB. */
export function parseMenuRecipe(raw: unknown): MenuRecipe | null {
  let value: unknown = raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const ingredients = (value as MenuRecipe).ingredients;
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
  return roundMoneyETB(
    recipe.ingredients.reduce(
      (sum, line) => sum + recipeIngredientLineCost(line),
      0,
    ),
  );
}

/**
 * Per-serving ingredient cost from a menu item recipe.
 * Used by the backend at order create to freeze `unitCostAtSale`.
 * Reports must NOT use this to rewrite historical lines.
 */
export function unitCostAtSaleFromItem(
  item: Pick<Item, "recipeJson"> | null | undefined,
): number | null {
  const recipe = parseMenuRecipe(item?.recipeJson);
  if (!recipe) return null;
  const cost = recipeCostPerUnit(recipe);
  return Number.isFinite(cost) ? cost : null;
}

/** Ingredient cost for an order line (qty × per-unit recipe cost). */
export function orderLineIngredientCost(
  recipe: MenuRecipe,
  orderAmount: number,
): number {
  const qty = Math.max(0, Number(orderAmount) || 0);
  return roundMoneyETB(recipeCostPerUnit(recipe) * qty);
}

/**
 * Official profit uses only `unitCostAtSale` frozen when the order was placed.
 * Live menu recipe is never used for report / completed-order profit — that
 * would rewrite history after ingredients are added or updated.
 */
export function orderLineResolvedIngredientCost(
  order: Pick<Order, "orderAmount" | "unitCostAtSale">,
  _recipe?: MenuRecipe | null | undefined,
): number | null {
  const qty = Math.max(0, Number(order.orderAmount) || 0);
  if (!hasSnapshottedUnitCost(order)) return null;
  return roundMoneyETB(Number(order.unitCostAtSale) * qty);
}

export function orderLineRevenueETB(
  order: Pick<Order, "price" | "orderAmount">,
): number {
  const qty = Math.max(0, Number(order.orderAmount) || 0);
  const price = Number(order.price) || 0;
  return roundMoneyETB(price * qty);
}

/** Profit = revenue − frozen ingredient cost. Null when no cost at sale. */
export function orderLineProfitETB(
  order: Pick<Order, "title" | "price" | "orderAmount" | "unitCostAtSale">,
  _recipe?: MenuRecipe | null | undefined,
): number | null {
  const cost = orderLineResolvedIngredientCost(order);
  if (cost == null) return null;
  return roundMoneyETB(orderLineRevenueETB(order) - cost);
}

export type OrderLineCostSource = "snapshot" | "none";

/**
 * Report / detail profit for one paid line — only frozen sale cost.
 * Lines sold before ingredients existed (null unitCostAtSale) are excluded.
 * Lines after an ingredient update keep the cost frozen at their sale time.
 */
export function resolveOrderLineCostForReport(
  order: Pick<Order, "price" | "orderAmount" | "unitCostAtSale">,
  _recipe?: MenuRecipe | null | undefined,
): {
  costETB: number | null;
  profitETB: number | null;
  source: OrderLineCostSource;
} {
  const revenue = orderLineRevenueETB(order);
  if (!hasSnapshottedUnitCost(order)) {
    return { costETB: null, profitETB: null, source: "none" };
  }
  const costETB = roundMoneyETB(
    Number(order.unitCostAtSale) *
      Math.max(0, Number(order.orderAmount) || 0),
  );
  return {
    costETB,
    profitETB: roundMoneyETB(revenue - costETB),
    source: "snapshot",
  };
}

export type CafeReportAnalyticsBucket = {
  name: string;
  value: number;
  totalAmount: number;
  profit: number;
};

export type CafeReportAnalytics = {
  category: CafeReportAnalyticsBucket[];
  type: CafeReportAnalyticsBucket[];
  titles: CafeReportAnalyticsBucket[];
  items: {
    name: string;
    sales: number;
    totalAmount: number;
    profit: number;
  }[];
  /** Profit only from lines with unitCostAtSale frozen at sale. */
  totalProfit: number;
  /** Lines included in totalProfit. */
  profitIncludedLines: number;
  /** Lines excluded — no cost frozen at sale (before ingredients existed). */
  profitExcludedLines: number;
  totalOrderUnits: number;
  paidLineCount: number;
};

/**
 * Build report analytics once at Generate time.
 * Profit never falls back to the live menu recipe.
 */
export function buildCafeReportAnalytics(
  orders: Order[],
  _items: Pick<Item, "name" | "recipeJson">[] = [],
): CafeReportAnalytics {
  const categoryMap: Record<
    string,
    { val: number; amt: number; profit: number }
  > = {};
  const typeMap: Record<string, { val: number; amt: number; profit: number }> =
    {};
  const itemMap: Record<string, { val: number; amt: number; profit: number }> =
    {};
  let totalProfit = 0;
  let profitIncludedLines = 0;
  let profitExcludedLines = 0;
  let totalOrderUnits = 0;

  const updateMap = (
    map: Record<string, { val: number; amt: number; profit: number }>,
    key: string,
    sales: number,
    qty: number,
    lineProfit: number,
  ) => {
    if (!map[key]) map[key] = { val: 0, amt: 0, profit: 0 };
    map[key].val = roundMoneyETB(map[key].val + sales);
    map[key].amt += qty;
    map[key].profit = roundMoneyETB(map[key].profit + lineProfit);
  };

  for (const order of orders) {
    const orderQty = Math.max(0, Number(order.orderAmount) || 0);
    totalOrderUnits += orderQty;
    const sales = orderLineRevenueETB(order);
    const resolved = resolveOrderLineCostForReport(order);

    const cat = String(order.category ?? "").trim() || "Uncategorized";
    const type = String(order.type ?? "").trim() || "Others";
    const title = String(order.title ?? "").trim() || "Unknown Item";

    const lineProfit = resolved.profitETB ?? 0;

    if (resolved.source === "snapshot" && resolved.profitETB != null) {
      profitIncludedLines += 1;
      totalProfit = roundMoneyETB(totalProfit + resolved.profitETB);
    } else {
      profitExcludedLines += 1;
    }

    updateMap(categoryMap, cat, sales, orderQty, lineProfit);
    updateMap(typeMap, type, sales, orderQty, lineProfit);
    updateMap(itemMap, title, sales, orderQty, lineProfit);
  }

  const formatData = (
    map: Record<string, { val: number; amt: number; profit: number }>,
  ): CafeReportAnalyticsBucket[] =>
    Object.entries(map).map(([name, data]) => ({
      name: `${name} (${data.amt})`,
      value: data.val,
      totalAmount: data.amt,
      profit: data.profit,
    }));

  return {
    category: formatData(categoryMap),
    type: formatData(typeMap),
    titles: formatData(itemMap),
    items: Object.entries(itemMap)
      .map(([name, data]) => ({
        name,
        sales: data.val,
        totalAmount: data.amt,
        profit: data.profit,
      }))
      .sort((a, b) => b.sales - a.sales || a.name.localeCompare(b.name))
      .slice(0, 10),
    totalProfit,
    profitIncludedLines,
    profitExcludedLines,
    totalOrderUnits,
    paidLineCount: orders.length,
  };
}

export function cafeReportProfitMessage(analytics: CafeReportAnalytics): string {
  const {
    paidLineCount,
    profitIncludedLines,
    profitExcludedLines,
    totalProfit,
  } = analytics;

  if (paidLineCount === 0) {
    return "No paid lines in this period — profit is 0.";
  }

  if (profitIncludedLines === 0) {
    return `Profit is 0 ETB. None of the ${paidLineCount} paid line(s) have ingredient cost frozen at sale (sold before ingredients were entered, or cost was never saved).`;
  }

  if (profitExcludedLines === 0) {
    return `Profit = sales − ingredient cost frozen when each of the ${profitIncludedLines} paid line(s) was placed. Later recipe edits do not change these lines. Locked when you press Generate.`;
  }

  return `Profit = sales − ingredient cost for ${profitIncludedLines} of ${paidLineCount} paid line(s) only (cost frozen at sale). ${profitExcludedLines} line(s) have no sale cost (before ingredients / not frozen) and are not included in the ${totalProfit.toLocaleString()} ETB profit. Later recipe edits do not rewrite older lines.`;
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
