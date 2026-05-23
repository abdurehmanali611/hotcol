import type { InventoryNotificationAudience } from "@/lib/inventoryNotifications";

export function inventoryNotificationSeenKey(
  audience: InventoryNotificationAudience,
  storeUserName?: string,
): string {
  const base = `hotcol-inv-seen:${audience}`;
  const user = storeUserName?.trim();
  return user ? `${base}:${user}` : base;
}

export function readSeenNotificationIds(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function writeSeenNotificationIds(key: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // ignore quota / private mode
  }
}
