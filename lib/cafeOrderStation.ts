/** Kitchen/bar order routing — keep in sync with `BackEnd/lib/cafeOrderStation.js`. */

export function orderCategoryKey(category: string | null | undefined): string {
  return String(category ?? "").trim().toLowerCase();
}

export function isKitchenStationOrder(order: {
  category?: string | null;
  type?: string | null;
}): boolean {
  const c = orderCategoryKey(order.category);
  if (c === "food" || c === "others") return true;
  const t = String(order.type ?? "").trim().toLowerCase();
  if (t === "bar" || t === "beverage") return false;
  if (t === "kitchen" || t === "food") return true;
  return false;
}

export function isBarStationOrder(order: {
  category?: string | null;
  type?: string | null;
}): boolean {
  const c = orderCategoryKey(order.category);
  if (c === "beverage") return true;
  const t = String(order.type ?? "").trim().toLowerCase();
  return t === "bar" || t === "beverage";
}
