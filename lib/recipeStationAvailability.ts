/**
 * Shared recipe ↔ station-stock availability (Cafe + Inventory dual-module).
 * Keep aligned with BackEnd/lib/recipeStockDecrement.js name/station matching.
 */

import type { ModuleOption } from "@/constants";
import { parseMenuRecipe, type MenuRecipe } from "@/lib/cafeRecipe";
import { isBarStationOrder } from "@/lib/cafeOrderStation";
import { normalizeKitchenBarStationKey } from "@/lib/hotelDailyStation";
import type { Item, StationIngredientStock } from "@/lib/api/types";
import { tenantHasModule } from "@/lib/subscriptionModules";

export function normalizeIngredientNameKey(name: string): string {
  return String(name || "")
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function recipeStationForMenuItem(item: {
  category?: string | null;
  type?: string | null;
}): "KITCHEN" | "BAR" {
  return isBarStationOrder(item) ? "BAR" : "KITCHEN";
}

export function tenantEnforcesRecipeStationStock(
  modules: readonly ModuleOption[] | null | undefined,
): boolean {
  const list = modules ?? [];
  return (
    tenantHasModule(list, "Inventory") &&
    tenantHasModule(list, "Cafe and Restaurant")
  );
}

/** Build on-hand map: `${station}\t${nameKey}` → qty */
export function buildStationOnHandMap(
  stocks: StationIngredientStock[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of stocks) {
    const station = normalizeKitchenBarStationKey(s.station);
    if (station !== "KITCHEN" && station !== "BAR") continue;
    const key = `${station}\t${normalizeIngredientNameKey(s.itemName)}`;
    const prev = map.get(key) || 0;
    map.set(
      key,
      Math.round((prev + (Number(s.amount) || 0) + Number.EPSILON) * 100) / 100,
    );
  }
  return map;
}

export type RecipeStockGap = {
  ingredientName: string;
  measuredBy: string;
  needed: number;
  onHand: number;
  shortfall: number;
};

export type RecipeStationAvailability = {
  /** False when dual-module tenant and any recipe ingredient is short for `servings`. */
  ok: boolean;
  station: "KITCHEN" | "BAR";
  recipe: MenuRecipe | null;
  /** Bottleneck servings that can still be made (Infinity if no recipe). */
  servingsAvailable: number;
  gaps: RecipeStockGap[];
};

export function evaluateRecipeStationAvailability(opts: {
  item: Pick<Item, "name" | "category" | "type" | "recipeJson">;
  stocks: StationIngredientStock[];
  servings?: number;
}): RecipeStationAvailability {
  const servings = Math.max(1, Math.floor(Number(opts.servings) || 1));
  const station = recipeStationForMenuItem(opts.item);
  const recipe = parseMenuRecipe(opts.item.recipeJson);
  if (!recipe?.ingredients?.length) {
    return {
      ok: true,
      station,
      recipe: null,
      servingsAvailable: Number.POSITIVE_INFINITY,
      gaps: [],
    };
  }

  const onHandMap = buildStationOnHandMap(opts.stocks);
  const gaps: RecipeStockGap[] = [];
  let servingsAvailable = Number.POSITIVE_INFINITY;

  for (const ing of recipe.ingredients) {
    const per = Number(ing.amount) || 0;
    if (!(per > 0)) continue;
    const key = `${station}\t${normalizeIngredientNameKey(ing.name)}`;
    const onHand = onHandMap.get(key) || 0;
    const needed = Math.round((per * servings + Number.EPSILON) * 100) / 100;
    const shortfall = Math.round((Math.max(0, needed - onHand) + Number.EPSILON) * 100) / 100;
    const canMake = Math.floor(onHand / per + Number.EPSILON);
    servingsAvailable = Math.min(servingsAvailable, canMake);
    if (shortfall > 0) {
      gaps.push({
        ingredientName: ing.name,
        measuredBy: ing.measuredBy,
        needed,
        onHand,
        shortfall,
      });
    }
  }

  if (!Number.isFinite(servingsAvailable)) servingsAvailable = 0;

  return {
    ok: gaps.length === 0,
    station,
    recipe,
    servingsAvailable: Math.max(0, servingsAvailable),
    gaps,
  };
}

/** True when dual-module + has recipe + station cannot cover one serving. */
export function isRecipeStationStockBlocked(
  item: Pick<Item, "name" | "category" | "type" | "recipeJson">,
  stocks: StationIngredientStock[],
  modules: readonly ModuleOption[] | null | undefined,
): boolean {
  if (!tenantEnforcesRecipeStationStock(modules)) return false;
  const recipe = parseMenuRecipe(item.recipeJson);
  if (!recipe?.ingredients?.length) return false;
  return !evaluateRecipeStationAvailability({ item, stocks, servings: 1 }).ok;
}

/** Max servings station can cover right now (Infinity when not enforced / no recipe). */
export function maxRecipeServingsAvailable(
  item: Pick<Item, "name" | "category" | "type" | "recipeJson">,
  stocks: StationIngredientStock[],
  modules: readonly ModuleOption[] | null | undefined,
): number {
  if (!tenantEnforcesRecipeStationStock(modules)) {
    return Number.POSITIVE_INFINITY;
  }
  const recipe = parseMenuRecipe(item.recipeJson);
  if (!recipe?.ingredients?.length) return Number.POSITIVE_INFINITY;
  return evaluateRecipeStationAvailability({ item, stocks, servings: 1 })
    .servingsAvailable;
}

/**
 * Whether `servings` can be covered by current station on-hand.
 * When not dual-module / no recipe → always true.
 */
export function canCoverRecipeServings(
  item: Pick<Item, "name" | "category" | "type" | "recipeJson">,
  stocks: StationIngredientStock[],
  modules: readonly ModuleOption[] | null | undefined,
  servings: number,
): boolean {
  if (!tenantEnforcesRecipeStationStock(modules)) return true;
  const recipe = parseMenuRecipe(item.recipeJson);
  if (!recipe?.ingredients?.length) return true;
  const qty = Math.max(0, Math.floor(Number(servings) || 0));
  if (!(qty > 0)) return true;
  return evaluateRecipeStationAvailability({ item, stocks, servings: qty }).ok;
}

/**
 * Deduct a multi-line cart from a working on-hand map.
 * Returns an error message for the first shortfall, or null if OK.
 */
export function findCartRecipeStationShortfall(
  lines: Array<{
    item: Pick<Item, "name" | "category" | "type" | "recipeJson">;
    servings: number;
  }>,
  stocks: StationIngredientStock[],
  modules: readonly ModuleOption[] | null | undefined,
): string | null {
  if (!tenantEnforcesRecipeStationStock(modules)) return null;
  const onHand = buildStationOnHandMap(stocks);

  for (const line of lines) {
    const servings = Math.max(0, Math.floor(Number(line.servings) || 0));
    if (!(servings > 0)) continue;
    const recipe = parseMenuRecipe(line.item.recipeJson);
    if (!recipe?.ingredients?.length) continue;
    const station = recipeStationForMenuItem(line.item);

    for (const ing of recipe.ingredients) {
      const per = Number(ing.amount) || 0;
      if (!(per > 0)) continue;
      const key = `${station}\t${normalizeIngredientNameKey(ing.name)}`;
      const have = onHand.get(key) || 0;
      const need =
        Math.round((per * servings + Number.EPSILON) * 100) / 100;
      if (have + 1e-9 < need) {
        const stationLabel = station === "BAR" ? "Bar" : "Kitchen";
        const u = ing.measuredBy ? ` ${ing.measuredBy}` : "";
        return `Not enough “${ing.name}” at ${stationLabel} for “${line.item.name}” (need ${need}${u}, on hand ${have}${u}).`;
      }
      onHand.set(
        key,
        Math.round((have - need + Number.EPSILON) * 100) / 100,
      );
    }
  }
  return null;
}
