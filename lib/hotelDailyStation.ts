/**
 * Canonical station keys for hotel daily counts (kitchen/bar/room).
 * Aligns store stock-out stakeholders with Cost Control daily rows.
 */

export const HOTEL_DAILY_COUNT_STATIONS = [
  { value: "KITCHEN", label: "Kitchen" },
  /** Canonical key stays `BAR` (DB / APIs); label matches store stock-out stakeholder "Barista". */
  { value: "BAR", label: "Bar" },
  { value: "ROOM", label: "Room" },
] as const;

export type HotelDailyCountStation =
  (typeof HOTEL_DAILY_COUNT_STATIONS)[number]["value"];

/** Filter chip ids for day / from–to daily-count reports. */
export type HotelDailyCountStationFilter = "ALL" | HotelDailyCountStation;

export const HOTEL_DAILY_COUNT_STATION_FILTER_OPTIONS: {
  id: HotelDailyCountStationFilter;
  label: string;
}[] = [
  { id: "ALL", label: "All stations" },
  ...HOTEL_DAILY_COUNT_STATIONS.map((s) => ({
    id: s.value as HotelDailyCountStationFilter,
    label: s.label,
  })),
];

/** Store UI: value stored on StockOutRequest.stakeHolderOrReason (must map via normalize). */
export const HOTEL_STORE_STOCK_OUT_STAKEHOLDERS = [
  "Kitchen",
  "Barista",
  "Room",
  "Juicer",
  "Cleaning Service",
  "Housekeeping",
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
  if (s === "room" || s === "rooms" || s === "in room" || s === "in-room") {
    return "ROOM";
  }
  if (s === "juicer") return "JUICER";
  if (s === "cleaning service" || s === "cleaning") return "CLEANING";
  if (s === "housekeeping") return "HOUSEKEEPING";
  if (s === "admin" || s === "management" || s === "manager") return "MANAGEMENT";
  if (s === "maintenance") return "MAINTENANCE";
  const up = String(raw ?? "").trim().toUpperCase();
  if (up === "CHEF" || up === "KITCHEN") return "KITCHEN";
  if (up === "BAR") return "BAR";
  if (up === "ROOM") return "ROOM";
  return up.replace(/\s+/g, "_") || "OTHER";
}

export function displayKitchenBarStation(station: string): string {
  const key = normalizeKitchenBarStationKey(station);
  const row = HOTEL_DAILY_COUNT_STATIONS.find((x) => x.value === key);
  return row?.label ?? station;
}

export function matchesDailyCountStationFilter(
  station: string,
  filter: HotelDailyCountStationFilter,
): boolean {
  if (filter === "ALL") return true;
  return normalizeKitchenBarStationKey(station) === filter;
}

export type StockOutLike = {
  status: string;
  movementType: string;
  itemName: string;
  amount: number;
  stakeHolderOrReason: string;
  decidedAt?: string | null;
  /** Store-chosen business day for the movement (preferred over decidedAt). */
  movementDate?: string | null;
};

/** Calendar day YYYY-MM-DD in UTC (matches backend stock-out approval bucketing). */
export function utcYmdFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Business day for a stock-out: prefer store movementDate, else approval decidedAt.
 * Using movementDate avoids counting a late approval as a different calendar day.
 */
export function stockOutBusinessYmd(row: {
  movementDate?: string | null;
  decidedAt?: string | null;
}): string {
  const movement = row.movementDate ? utcYmdFromIso(String(row.movementDate)) : "";
  if (movement) return movement;
  if (row.decidedAt) return utcYmdFromIso(String(row.decidedAt));
  return "";
}

/**
 * Sum approved store→station stock-outs for one daily row.
 * Uses today's (calendarDate) stock-outs only — never a prior day's last movement —
 * and adds every matching stock-out on that day.
 */
export function summarizeApprovedStockOutForDay(
  stocks: StockOutLike[],
  stationKey: string,
  itemName: string,
  calendarDate: string,
): number {
  const normItem = itemName.trim().toLowerCase();
  const normStation = normalizeKitchenBarStationKey(stationKey);
  const day = String(calendarDate || "").slice(0, 10);
  if (!normItem || !day) return 0;
  let sum = 0;
  for (const r of stocks) {
    if (r.status !== "APPROVED" || r.movementType !== "STOCK_OUT") continue;
    if (String(r.itemName ?? "").trim().toLowerCase() !== normItem) continue;
    const d = stockOutBusinessYmd(r);
    if (!d || d !== day) continue;
    if (normalizeKitchenBarStationKey(r.stakeHolderOrReason) !== normStation) {
      continue;
    }
    sum += Number(r.amount) || 0;
  }
  return sum;
}

function roundDaily2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** Prefer stored closing on hand (including 0); fall back to beginning for legacy rows. */
export function previousDayOnHandAmount(prev: {
  closingOnHand?: number | null;
  amount?: number | null;
} | null | undefined): number | null {
  if (!prev) return null;
  const closing = Number(prev.closingOnHand);
  if (Number.isFinite(closing)) return roundDaily2(closing);
  const opening = Number(prev.amount);
  return Number.isFinite(opening) ? roundDaily2(opening) : null;
}

/** Calendar day shifted by `deltaDays` (local YYYY-MM-DD arithmetic). */
export function shiftCalendarYmd(ymd: string, deltaDays: number): string {
  const day = String(ymd || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Find the latest daily-count row for the same station+item before calendarDate.
 * Item names match case-insensitively.
 */
export function findPreviousDailyCountRow<
  T extends {
    station: string;
    itemName: string;
    calendarDate: string;
    closingOnHand?: number | null;
    amount?: number | null;
  },
>(
  rows: T[],
  station: string,
  itemName: string,
  calendarDate: string,
): T | null {
  const stationKey = normalizeKitchenBarStationKey(station);
  const itemKey = itemName.trim().toLowerCase();
  const day = String(calendarDate || "").slice(0, 10);
  if (!itemKey || !day) return null;
  let best: T | null = null;
  for (const row of rows) {
    if (normalizeKitchenBarStationKey(row.station) !== stationKey) continue;
    if (String(row.itemName || "").trim().toLowerCase() !== itemKey) continue;
    const rowDay = String(row.calendarDate || "").slice(0, 10);
    if (!rowDay || rowDay >= day) continue;
    if (!best || rowDay > String(best.calendarDate || "").slice(0, 10)) {
      best = row;
    }
  }
  return best;
}

/**
 * If this station+item was counted yesterday (case-insensitive name), return that
 * row so Beginning can carry forward yesterday's On Hand. Older gaps are ignored.
 */
export function findYesterdayDailyCountRow<
  T extends {
    station: string;
    itemName: string;
    calendarDate: string;
    closingOnHand?: number | null;
    amount?: number | null;
  },
>(
  rows: T[],
  station: string,
  itemName: string,
  calendarDate: string,
): T | null {
  const yesterday = shiftCalendarYmd(calendarDate, -1);
  if (!yesterday) return null;
  const prev = findPreviousDailyCountRow(rows, station, itemName, calendarDate);
  if (!prev) return null;
  const prevDay = String(prev.calendarDate || "").slice(0, 10);
  return prevDay === yesterday ? prev : null;
}

/** Prefer explicit salesDay; otherwise legacy beginning − prior on hand. */
export function resolveDailyCountSalesQty(
  row: {
    amount: number;
    salesDay?: number | null;
  },
  prev: {
    closingOnHand?: number | null;
    amount?: number | null;
  } | null,
): number | null {
  if (row.salesDay != null && Number.isFinite(Number(row.salesDay))) {
    return roundDaily2(Number(row.salesDay) || 0);
  }
  const prevOnHand = previousDayOnHandAmount(prev);
  if (prevOnHand == null) return null;
  return roundDaily2(Number(row.amount) - prevOnHand);
}
