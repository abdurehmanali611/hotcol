import type { Order, Table } from "@/lib/actions";
import { isSameCafeBusinessDay } from "@/lib/cafeBusinessDay";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";

/** Form sentinel when no table is chosen yet (not a real table number). */
export const CAFE_TABLE_UNSELECTED = -1;

/** Any registered café table number (0–999); caption labels are independent of the number. */
export function isValidSelectedCafeTableNo(value: unknown): boolean {
  const n =
    typeof value === "string" ? parseInt(value, 10) : Number(value);
  return Number.isFinite(n) && Math.floor(n) >= 0 && Math.floor(n) <= 999;
}

/** Unpaid, non-cancelled order for today at this property. */
export function isOpenCafeOrder(order: Order, hotelName: string): boolean {
  if (!rowHotelMatchesTenantScope(order.HotelName, hotelName)) return false;
  if (String(order.payment || "").toLowerCase() === "paid") return false;
  if (String(order.status || "").toLowerCase() === "cancelled") return false;
  if (!isSameCafeBusinessDay(order.createdAt)) {
    return false;
  }
  return true;
}

export function occupiedTableNumbersFromOrders(
  orders: Order[],
  hotelName: string,
  exceptOrderId?: number,
): Set<number> {
  const occupied = new Set<number>();
  for (const order of orders) {
    if (exceptOrderId != null && order.id === exceptOrderId) continue;
    if (isOpenCafeOrder(order, hotelName)) {
      occupied.add(normalizeOrderTableNo(order));
    }
  }
  return occupied;
}

export function formatTableSelectLabel(
  table: Pick<Table, "tableNo" | "orderCaption">,
  occupied: boolean,
): string {
  const caption = String(table.orderCaption ?? "").trim();
  const base = caption || `Table ${table.tableNo}`;
  return occupied ? `${base} (In use)` : base;
}

export function buildTableSelectOptions(
  tables: Table[],
  occupiedTableNos: Set<number>,
) {
  return tables.map((table) => {
    const tableNo = Math.floor(Number(table.tableNo));
    const occupied = occupiedTableNos.has(tableNo);
    return {
      id: table.id,
      name: formatTableSelectLabel(table, occupied),
      realValue: table.tableNo,
      disabled: occupied,
      subText: occupied ? "In use" : captionOrEmpty(table.orderCaption),
    };
  });
}

/** Table dropdown for edit form — always includes the order's current table. */
export function buildEditTableSelectOptions(
  tables: Table[],
  occupiedTableNos: Set<number>,
  currentTableNo: number,
) {
  const current = Math.floor(Number(currentTableNo));
  const options = buildTableSelectOptions(tables, occupiedTableNos);
  const currentTable = tables.find((t) => Number(t.tableNo) === current);
  const withCurrent = options.some((o) => Number(o.realValue) === current)
    ? options
    : [
        {
          id: -1,
          name: formatTableSelectLabel(
            {
              tableNo: current,
              orderCaption: currentTable?.orderCaption ?? null,
            },
            false,
          ),
          realValue: current,
          disabled: false,
        },
        ...options,
      ];
  return [...withCurrent].sort((a, b) => {
    const av = Number(a.realValue);
    const bv = Number(b.realValue);
    if (av === current) return -1;
    if (bv === current) return 1;
    return av - bv;
  });
}

/** Table number on an order (GraphQL may return number or numeric string). */
export function normalizeOrderTableNo(order: {
  tableNo: number | string;
}): number {
  const raw = order.tableNo;
  const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

export function formatCafeTableLabel(tableNo: number): string {
  const n = Math.floor(Number(tableNo));
  return `Table ${n}`;
}

export function formatCafeTableDisplay(
  tableNo: number,
  caption?: string | null,
): string {
  const c = String(caption ?? "").trim();
  if (c) return c;
  return formatCafeTableLabel(tableNo);
}

/** Caption registered on a table row (Delivery, Takeaway, etc.). */
export function tableCaptionForNo(
  tables: Pick<Table, "tableNo" | "orderCaption">[],
  tableNo: number,
): string | null {
  const n = Math.floor(Number(tableNo));
  const row = tables.find((t) => Math.floor(Number(t.tableNo)) === n);
  const c = String(row?.orderCaption ?? "").trim();
  return c || null;
}

export type CafeTableCaptionLookup = Map<number, string>;

export function buildTableCaptionByNoMap(
  tables: Pick<Table, "tableNo" | "orderCaption">[],
): CafeTableCaptionLookup {
  const map = new Map<number, string>();
  for (const t of tables) {
    const c = String(t.orderCaption ?? "").trim();
    if (c) map.set(Math.floor(Number(t.tableNo)), c);
  }
  return map;
}

/** Prefer table registry caption; fall back to order snapshot if present. */
export function formatCafeTableDisplayFromRegistry(
  tableNo: number,
  tables: Pick<Table, "tableNo" | "orderCaption">[],
  orderServiceCaption?: string | null,
): string {
  const caption =
    tableCaptionForNo(tables, tableNo) ||
    String(orderServiceCaption ?? "").trim() ||
    null;
  return formatCafeTableDisplay(tableNo, caption);
}

/** Alias used across café UIs for order / payment table labels. */
export const formatOrderTableDisplay = formatCafeTableDisplayFromRegistry;

export function orderToLiveEditFormValues(order: Order): {
  id: number;
  tableNo: number;
  waiterName: string;
  orderAmount: number;
  title: string;
} {
  return {
    id: order.id,
    tableNo: normalizeOrderTableNo(order),
    waiterName: String(order.waiterName ?? "").trim(),
    orderAmount: Math.max(1, Number(order.orderAmount) || 1),
    title: String(order.title ?? "").trim(),
  };
}

function captionOrEmpty(caption?: string | null): string | undefined {
  const c = String(caption ?? "").trim();
  return c || undefined;
}

/** Paid cash or bank order from today — eligible for payment-type correction. */
export function isPaidCashOrBankCafeOrder(
  order: Order,
  hotelName: string,
): boolean {
  if (!rowHotelMatchesTenantScope(order.HotelName, hotelName)) return false;
  if (String(order.payment ?? "").trim().toLowerCase() !== "paid") return false;
  if (String(order.status ?? "").trim().toLowerCase() === "cancelled") {
    return false;
  }
  if (order.credit === true) return false;
  if (!isSameCafeBusinessDay(order.createdAt)) return false;
  return order.withBank === true || order.withBank === false;
}

/** Orders eligible for live correction after kitchen/bar received them. */
export function isLiveOrderEditable(order: Order, hotelName: string): boolean {
  if (!isOpenCafeOrder(order, hotelName)) return false;
  const status = String(order.status || "").toLowerCase();
  return status === "pending" || status === "completed";
}

/** Kitchen vs bar routing label from order type. */
export function orderStationLabel(order: {
  type?: string | null;
}): "Kitchen" | "Bar" {
  const t = String(order.type || "").trim().toLowerCase();
  return t === "bar" ? "Bar" : "Kitchen";
}

export function sumOrderLinesETB(orders: Order[]): number {
  return orders.reduce(
    (sum, o) => sum + Number(o.price || 0) * Number(o.orderAmount || 0),
    0,
  );
}

/** Open unpaid line on a table with the same menu item title (for merge on add-items). */
export function findOpenOrderLineForTableItem(
  orders: Order[],
  hotelName: string,
  tableNo: number,
  title: string,
): Order | undefined {
  const n = Math.floor(Number(tableNo));
  const t = String(title ?? "").trim().toLowerCase();
  if (!t) return undefined;
  return orders
    .filter(
      (o) =>
        isLiveOrderEditable(o, hotelName) &&
        normalizeOrderTableNo(o) === n &&
        String(o.title ?? "").trim().toLowerCase() === t,
    )
    .sort((a, b) => b.id - a.id)[0];
}

export function groupEditableOrdersByTable(
  orders: Order[],
): { tableNo: number; orders: Order[] }[] {
  const map = new Map<number, Order[]>();
  for (const order of orders) {
    const key = normalizeOrderTableNo(order);
    const list = map.get(key);
    if (list) list.push(order);
    else map.set(key, [order]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tableNo, tableOrders]) => ({
      tableNo,
      orders: tableOrders.sort((a, b) => b.id - a.id),
    }));
}
