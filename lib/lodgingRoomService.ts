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
  T extends BillLineRef & {
    voided?: boolean;
    approvalStatus?: string | null;
    fulfillmentStatus?: string | null;
  },
>(stayId: number, lines: T[], cafeOrders: RoomServiceOrderRef[]): T[] {
  // Keep rejected discounts visible on the folio (with approval note); totals ignore them.
  // Cancelled F&B / laundry must not appear on Active stays or be transferable.
  const active = lines.filter((l) => {
    if (l.voided) return false;
    if (String(l.fulfillmentStatus || "").toLowerCase() === "cancelled") {
      return false;
    }
    return true;
  });
  if (cafeOrders.length === 0) return active;
  return active.filter(
    (l) => !isCancelledFoodDrinkBillLine(l, stayId, cafeOrders),
  );
}

export function billTotalFromLines(
  lines: {
    amountETB?: number;
    taxETB?: number;
    voided?: boolean;
    approvalStatus?: string | null;
    fulfillmentStatus?: string | null;
  }[],
): number {
  return lines.reduce((sum, l) => {
    if (l.voided) return sum;
    const appr = String(l.approvalStatus || "").toLowerCase();
    if (appr === "pending" || appr === "rejected") return sum;
    if (String(l.fulfillmentStatus || "").toLowerCase() === "cancelled") {
      return sum;
    }
    return (
      sum + Number(l.amountETB || 0) + Number(l.taxETB || 0)
    );
  }, 0);
}

/** Per-line amount including lodging tax (skips voided / pending / cancelled). */
export function billLineGrossAmount(line: {
  amountETB?: number;
  taxETB?: number;
  voided?: boolean;
  approvalStatus?: string | null;
  fulfillmentStatus?: string | null;
}): number {
  if (line.voided) return 0;
  const appr = String(line.approvalStatus || "").toLowerCase();
  if (appr === "pending" || appr === "rejected") return 0;
  if (String(line.fulfillmentStatus || "").toLowerCase() === "cancelled") {
    return 0;
  }
  return Number(line.amountETB || 0) + Number(line.taxETB || 0);
}

export type NamedTaxPart = {
  name: string;
  percent: number;
  amountETB: number;
};

export function parseBillLineTaxParts(line: {
  taxETB?: number;
  taxPercent?: number;
  taxDetailJson?: string | null;
}): NamedTaxPart[] {
  const raw = String(line.taxDetailJson || "").trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((p) => {
            const row = p as Record<string, unknown>;
            return {
              name: String(row.name || "Tax").trim() || "Tax",
              percent: Number(row.percent) || 0,
              amountETB: Number(row.amountETB) || 0,
            };
          })
          .filter((p) => p.amountETB > 0 || p.percent > 0);
      }
    } catch {
      /* fall through */
    }
  }
  const tax = Number(line.taxETB) || 0;
  if (tax > 0) {
    return [
      {
        name: "Tax",
        percent: Number(line.taxPercent) || 0,
        amountETB: tax,
      },
    ];
  }
  return [];
}

/** Aggregate named taxes across bill lines (active lines only). */
export function billTaxesByName(
  lines: {
    amountETB?: number;
    taxETB?: number;
    taxPercent?: number;
    taxDetailJson?: string | null;
    voided?: boolean;
    approvalStatus?: string | null;
    fulfillmentStatus?: string | null;
  }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of lines) {
    if (line.voided) continue;
    const appr = String(line.approvalStatus || "").toLowerCase();
    if (appr === "pending" || appr === "rejected") continue;
    if (String(line.fulfillmentStatus || "").toLowerCase() === "cancelled") {
      continue;
    }
    for (const part of parseBillLineTaxParts(line)) {
      out[part.name] = (out[part.name] || 0) + part.amountETB;
    }
  }
  return out;
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

export function incompleteFoodDrinkLines<T extends BillLineRef & { voided?: boolean }>(
  stayId: number,
  lines: T[],
  cafeOrders: RoomServiceOrderRef[],
): T[] {
  return lines.filter((l) => {
    if (l.voided) return false;
    if (String(l.kind || "").toLowerCase() !== "food_drink") return false;
    if (isCancelledFoodDrinkBillLine(l, stayId, cafeOrders)) return false;
    const order = resolveCafeOrderForFoodDrinkLine(l, stayId, cafeOrders);
    if (!order || isCafeOrderCancelled(order.status)) return false;
    return !isCafeOrderCompleted(order.status);
  });
}

/** Laundry must be completed or cancelled before checkout (matches backend gate). */
export function incompleteLaundryLines<
  T extends BillLineRef & { voided?: boolean; fulfillmentStatus?: string | null },
>(lines: T[]): T[] {
  return lines.filter((l) => {
    if (l.voided) return false;
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
