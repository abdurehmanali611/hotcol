/**
 * Canonical station keys for hotel daily counts (kitchen/bar/etc.).
 * Aligns store stock-out stakeholders with Cost Control daily rows.
 */

export const HOTEL_DAILY_COUNT_STATIONS = [
  { value: "KITCHEN", label: "Kitchen / Chef" },
  { value: "BAR", label: "Bar" },
  { value: "JUICER", label: "Juicer" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "HOUSEKEEPING", label: "Housekeeping" },
  { value: "ADMIN", label: "Admin" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
] as const;

/** Store UI: value stored on StockOutRequest.stakeHolderOrReason (must map via normalize). */
export const HOTEL_STORE_STOCK_OUT_STAKEHOLDERS = [
  "Kitchen",
  "Bar",
  "Barista",
  "Juicer",
  "Cleaning Service",
  "Housekeeping",
  "Admin",
  "Maintenance",
] as const;

/**
 * Map free-text stakeholder or legacy CHEF/BAR station to a canonical key
 * (must match BackEnd normalizeKitchenBarStation).
 */
export function normalizeKitchenBarStationKey(raw: string): string {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!s) return "OTHER";
  if (s === "chef" || s === "kitchen" || s === "chef (kitchen)") return "KITCHEN";
  if (s === "bar" || s === "barista") return "BAR";
  if (s === "juicer") return "JUICER";
  if (s === "cleaning service" || s === "cleaning") return "CLEANING";
  if (s === "housekeeping") return "HOUSEKEEPING";
  if (s === "admin") return "ADMIN";
  if (s === "maintenance") return "MAINTENANCE";
  const up = String(raw ?? "").trim().toUpperCase();
  if (up === "CHEF" || up === "KITCHEN") return "KITCHEN";
  if (up === "BAR") return "BAR";
  return up.replace(/\s+/g, "_") || "OTHER";
}

export function displayKitchenBarStation(station: string): string {
  const key = normalizeKitchenBarStationKey(station);
  const row = HOTEL_DAILY_COUNT_STATIONS.find((x) => x.value === key);
  return row?.label ?? station;
}

export type StockOutLike = {
  status: string;
  movementType: string;
  itemName: string;
  amount: number;
  stakeHolderOrReason: string;
  decidedAt?: string | null;
};

/** Calendar day YYYY-MM-DD in UTC (matches backend stock-out approval bucketing). */
export function utcYmdFromIso(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Sum approved store→station stock-outs for one daily row (decidedAt date = calendar day, UTC). */
export function summarizeApprovedStockOutForDay(
  stocks: StockOutLike[],
  stationKey: string,
  itemName: string,
  calendarDate: string,
): number {
  const normItem = itemName.trim().toLowerCase();
  const normStation = normalizeKitchenBarStationKey(stationKey);
  let sum = 0;
  for (const r of stocks) {
    if (r.status !== "APPROVED" || r.movementType !== "STOCK_OUT") continue;
    if (String(r.itemName ?? "").trim().toLowerCase() !== normItem) continue;
    if (!r.decidedAt) continue;
    const d = utcYmdFromIso(String(r.decidedAt));
    if (d !== calendarDate) continue;
    if (normalizeKitchenBarStationKey(r.stakeHolderOrReason) !== normStation) {
      continue;
    }
    sum += Number(r.amount);
  }
  return sum;
}
