"use client";

/** Cafe `tableNo` offset so room-service stay orders never collide with floor tables (0–999). */
export const ROOM_SERVICE_TABLE_BASE = 900_000;

export function roomServiceTableNo(stayId: number): number {
  return ROOM_SERVICE_TABLE_BASE + Math.floor(Number(stayId) || 0);
}

export function stayIdFromRoomServiceTableNo(tableNo: number): number | null {
  const n = Math.floor(Number(tableNo) || 0);
  if (n < ROOM_SERVICE_TABLE_BASE) return null;
  return n - ROOM_SERVICE_TABLE_BASE;
}

export function isRoomServiceTableNo(tableNo: number | string): boolean {
  const n =
    typeof tableNo === "string" ? parseInt(tableNo, 10) : Math.floor(Number(tableNo));
  return Number.isFinite(n) && n >= ROOM_SERVICE_TABLE_BASE;
}

export function roomServiceCaption(roomNumber: string): string {
  const rooms = String(roomNumber || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
  return rooms ? `Room ${rooms}` : "Room service";
}

/** Calendar-date night count (departure date − arrival date), minimum 1. */
export function nightsFromArrivalDeparture(
  arrival: Date,
  departure: Date,
): number {
  if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime())) {
    return 1;
  }
  const a0 = Date.UTC(
    arrival.getFullYear(),
    arrival.getMonth(),
    arrival.getDate(),
  );
  const d0 = Date.UTC(
    departure.getFullYear(),
    departure.getMonth(),
    departure.getDate(),
  );
  const days = Math.round((d0 - a0) / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

/** Embed café order id so cancels can drop the matching stay bill line. */
export function withCafeOrderMarker(description: string, orderId: number): string {
  const base = String(description || "")
    .replace(/\s*·\s*#co:\d+\s*$/i, "")
    .trim();
  return `${base} · #co:${orderId}`;
}

export function cafeOrderIdFromBillDescription(
  description: string,
): number | null {
  const m = String(description || "").match(/#co:(\d+)\s*$/i);
  return m ? Number(m[1]) : null;
}

export function stripCafeOrderMarker(description: string): string {
  return String(description || "")
    .replace(/\s*·\s*#co:\d+\s*$/i, "")
    .trim();
}

type RoomServiceOrderRef = {
  id: number;
  tableNo: number;
  status: string | null;
  title: string;
  orderAmount: number;
  price: number;
};

type BillLineRef = {
  kind: string;
  description: string;
  quantity?: number;
  unitPriceETB?: number;
  fulfillmentStatus?: string | null;
};

export function cancelledRoomServiceOrdersForStay(
  stayId: number,
  cafeOrders: RoomServiceOrderRef[],
): RoomServiceOrderRef[] {
  const tableNo = roomServiceTableNo(stayId);
  return cafeOrders.filter(
    (o) =>
      Math.floor(Number(o.tableNo)) === tableNo &&
      String(o.status || "").toLowerCase() === "cancelled",
  );
}

export function isCancelledFoodDrinkBillLine(
  line: BillLineRef,
  stayId: number,
  cafeOrders: RoomServiceOrderRef[],
): boolean {
  if (String(line.kind || "").toLowerCase() !== "food_drink") return false;
  const cancelled = cancelledRoomServiceOrdersForStay(stayId, cafeOrders);
  if (cancelled.length === 0) return false;

  const orderId = cafeOrderIdFromBillDescription(line.description);
  if (orderId != null) {
    return cancelled.some((o) => o.id === orderId);
  }

  const desc = stripCafeOrderMarker(line.description).toLowerCase().trim();
  return cancelled.some((o) => {
    const title = String(o.title || "").toLowerCase().trim();
    if (!title) return false;
    const titleMatch =
      desc === title || desc.startsWith(`${title} ·`) || desc.includes(title);
    if (!titleMatch) return false;
    return (
      Number(line.quantity) === Number(o.orderAmount) &&
      Math.abs(Number(line.unitPriceETB) - Number(o.price)) < 0.011
    );
  });
}

export function billLinesExcludingCancelledFoodDrink<
  T extends BillLineRef,
>(stayId: number, lines: T[], cafeOrders: RoomServiceOrderRef[]): T[] {
  if (cafeOrders.length === 0) return lines;
  return lines.filter(
    (l) => !isCancelledFoodDrinkBillLine(l, stayId, cafeOrders),
  );
}

export function billTotalFromLines(lines: { amountETB?: number }[]): number {
  return lines.reduce((sum, l) => sum + Number(l.amountETB || 0), 0);
}

export function isCafeOrderCompleted(status: string | null | undefined): boolean {
  return String(status || "").trim().toLowerCase() === "completed";
}

export function isCafeOrderCancelled(status: string | null | undefined): boolean {
  return String(status || "").trim().toLowerCase() === "cancelled";
}

export function resolveCafeOrderForFoodDrinkLine(
  line: BillLineRef,
  stayId: number,
  cafeOrders: RoomServiceOrderRef[],
): RoomServiceOrderRef | null {
  if (String(line.kind || "").toLowerCase() !== "food_drink") return null;

  const orderId = cafeOrderIdFromBillDescription(line.description);
  if (orderId != null) {
    return cafeOrders.find((o) => o.id === orderId) ?? null;
  }

  const tableNo = roomServiceTableNo(stayId);
  const desc = stripCafeOrderMarker(line.description).toLowerCase().trim();
  const candidates = cafeOrders.filter((o) => {
    if (Math.floor(Number(o.tableNo)) !== tableNo) return false;
    if (isCafeOrderCancelled(o.status)) return false;
    const title = String(o.title || "").toLowerCase().trim();
    if (!title) return false;
    return (
      desc === title ||
      desc.startsWith(`${title} ·`) ||
      desc.includes(title)
    );
  });
  return (
    candidates.find(
      (o) =>
        Number(o.orderAmount) === Number(line.quantity) &&
        Math.abs(Number(o.price) - Number(line.unitPriceETB)) < 0.011,
    ) ||
    candidates[candidates.length - 1] ||
    null
  );
}

/**
 * Transfer / split / checkout kitchen gate.
 * Cancelled café orders are ignored — they never lock the stay.
 * Only non-cancelled F&B still short of Completed blocks.
 */
export function isFoodDrinkLineKitchenComplete(
  line: BillLineRef,
  stayId: number,
  cafeOrders: RoomServiceOrderRef[],
): boolean {
  if (String(line.kind || "").toLowerCase() !== "food_drink") return true;
  if (isCancelledFoodDrinkBillLine(line, stayId, cafeOrders)) return true;

  const order = resolveCafeOrderForFoodDrinkLine(line, stayId, cafeOrders);
  if (!order) return true; // no active linked ticket (incl. cancelled gone from bill)
  if (isCafeOrderCancelled(order.status)) return true;
  return isCafeOrderCompleted(order.status);
}

export function incompleteFoodDrinkLines<T extends BillLineRef>(
  stayId: number,
  lines: T[],
  cafeOrders: RoomServiceOrderRef[],
): T[] {
  return lines.filter((l) => {
    if (String(l.kind || "").toLowerCase() !== "food_drink") return false;
    if (isCancelledFoodDrinkBillLine(l, stayId, cafeOrders)) return false;
    const order = resolveCafeOrderForFoodDrinkLine(l, stayId, cafeOrders);
    if (!order || isCafeOrderCancelled(order.status)) return false;
    return !isCafeOrderCompleted(order.status);
  });
}

/** Laundry must be completed or cancelled before checkout (matches backend gate). */
export function incompleteLaundryLines<T extends BillLineRef>(lines: T[]): T[] {
  return lines.filter((l) => {
    if (String(l.kind || "").toLowerCase() !== "laundry") return false;
    const st = String(l.fulfillmentStatus || "pending").toLowerCase();
    return st !== "completed" && st !== "cancelled";
  });
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function todayYmd(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function nowHm(d = new Date()) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function combineLocalDateTime(dateYmd: string, hm: string): Date {
  return new Date(`${dateYmd}T${hm}`);
}

export function addDaysYmd(dateYmd: string, days: number): string {
  const d = new Date(`${dateYmd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateYmd;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
