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

/** Orders eligible for live correction — kitchen/bar still preparing (pending only). */
export function isLiveOrderEditable(order: Order, hotelName: string): boolean {
  if (!isOpenCafeOrder(order, hotelName)) return false;
  return String(order.status || "").toLowerCase() === "pending";
}

import { isBarStationOrder } from "./cafeOrderStation";

/** Kitchen vs bar routing label from order category/type. */
export function orderStationLabel(order: {
  type?: string | null;
  category?: string | null;
}): "Kitchen" | "Bar" {
  return isBarStationOrder(order) ? "Bar" : "Kitchen";
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

/** One unpaid table in order-update: pending lines to edit + context for add-items. */
export type CafeOrderUpdateTableGroup = {
  tableNo: number;
  /** Pending tickets only — completed lines are omitted from the list UI. */
  pendingOrders: Order[];
  waiterName: string;
  serviceCaption?: string | null;
};

/**
 * Groups today's unpaid tables for cashier order update.
 * Tables with only completed (but unpaid) lines are included so staff can add new orders.
 */
export function groupCafeOrderUpdateTables(
  orders: Order[],
  hotelName: string,
): CafeOrderUpdateTableGroup[] {
  const openByTable = new Map<number, Order[]>();
  for (const order of orders) {
    if (!isOpenCafeOrder(order, hotelName)) continue;
    const key = normalizeOrderTableNo(order);
    const list = openByTable.get(key);
    if (list) list.push(order);
    else openByTable.set(key, [order]);
  }

  return [...openByTable.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tableNo, tableOrders]) => {
      const sorted = [...tableOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const pendingOrders = sorted.filter((o) =>
        isLiveOrderEditable(o, hotelName),
      );
      const anchor = sorted[0];
      return {
        tableNo,
        pendingOrders,
        waiterName: String(anchor?.waiterName ?? "").trim() || "Self-Service",
        serviceCaption:
          sorted.find((o) => String(o.serviceCaption ?? "").trim())?.serviceCaption ??
          null,
      };
    });
}

/** Kitchen/bar ticket: one card per batch (same table + waiter + short time window). */
export type CafeStationOrderGroup = {
  key: string;
  orders: Order[];
};

/** Paid-order batch: lines on the same table paid/placed within a short window. */
export type CafePaidOrderBatch = {
  key: string;
  tableNo: number;
  createdAt: Date | string;
  orders: Order[];
};

const CAFE_BATCH_CARD_WINDOW_MS = 15_000;
/** Same table + orders within this window are one collapsible batch in payment-type correction. */
export const CAFE_PAID_ORDER_BATCH_WINDOW_MS = 60_000;

/** Stable batch key from table and member order ids. */
export function cafePaidOrderBatchKey(
  tableNo: number,
  orders: Pick<Order, "id">[],
): string {
  const ids = orders.map((o) => o.id).sort((a, b) => a - b);
  return `${tableNo}|${ids.join("-")}`;
}

export function formatCafeOrderBatchTime(createdAt: Date | string): string {
  return new Date(createdAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Groups paid orders on the same table when their timestamps fall within one minute.
 * Handles slight lag between sequential payment approvals so related lines stay together.
 */
export function groupCafePaidOrderBatches(orders: Order[]): CafePaidOrderBatch[] {
  if (orders.length === 0) return [];

  const byTable = new Map<number, Order[]>();
  for (const order of orders) {
    const tableNo = normalizeOrderTableNo(order);
    const list = byTable.get(tableNo) ?? [];
    list.push(order);
    byTable.set(tableNo, list);
  }

  const batches: CafePaidOrderBatch[] = [];

  for (const [tableNo, tableOrders] of byTable.entries()) {
    const sorted = [...tableOrders].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    let cluster: Order[] = [];
    let clusterStartMs = 0;

    const flushCluster = () => {
      if (cluster.length === 0) return;
      const clusterSorted = [...cluster].sort((a, b) => a.id - b.id);
      batches.push({
        key: cafePaidOrderBatchKey(tableNo, clusterSorted),
        tableNo,
        createdAt: clusterSorted[0].createdAt,
        orders: clusterSorted,
      });
      cluster = [];
    };

    for (const order of sorted) {
      const ts = new Date(order.createdAt).getTime();
      if (
        cluster.length === 0 ||
        ts - clusterStartMs <= CAFE_PAID_ORDER_BATCH_WINDOW_MS
      ) {
        if (cluster.length === 0) clusterStartMs = ts;
        cluster.push(order);
      } else {
        flushCluster();
        clusterStartMs = ts;
        cluster.push(order);
      }
    }
    flushCluster();
  }

  return batches.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Groups pending station orders so batch submissions appear as one card.
 * Single orders at the same table stay separate when placed outside the batch window.
 */
export function groupCafeStationOrderCards(orders: Order[]): CafeStationOrderGroup[] {
  if (orders.length === 0) return [];

  const sorted = [...orders].sort((a, b) => a.id - b.id);
  const bucketMap = new Map<string, Order[]>();

  for (const order of sorted) {
    const tableNo = normalizeOrderTableNo(order);
    const waiter = String(order.waiterName ?? "").trim().toLowerCase();
    const ts = Math.floor(
      new Date(order.createdAt).getTime() / CAFE_BATCH_CARD_WINDOW_MS,
    );
    const bucketKey = `${tableNo}|${waiter}|${ts}`;
    const list = bucketMap.get(bucketKey) ?? [];
    list.push(order);
    bucketMap.set(bucketKey, list);
  }

  const groups: CafeStationOrderGroup[] = [];
  for (const list of bucketMap.values()) {
    groups.push({
      key: list.length === 1 ? String(list[0].id) : list.map((o) => o.id).join("-"),
      orders: list,
    });
  }

  return groups.sort((a, b) => a.orders[0].id - b.orders[0].id);
}

/** One menu line rolled up across all tables for kitchen/bar prep totals. */
export type CafeStationPrepItem = {
  title: string;
  quantity: number;
  imageUrl: string | null;
};

/** Sum pending station lines by item title (e.g. 2 + 4 burgers → 6 burgers). */
export function aggregateCafeStationPrepByTitle(
  orders: Pick<Order, "title" | "orderAmount" | "imageUrl">[],
  qtyVisibleTitles?: ReadonlySet<string>,
): CafeStationPrepItem[] {
  const map = new Map<
    string,
    { title: string; quantity: number; imageUrl: string | null }
  >();

  for (const order of orders) {
    const title = String(order.title ?? "").trim() || "Unknown item";
    const key = title.toLowerCase();
    if (qtyVisibleTitles && !qtyVisibleTitles.has(key)) continue;
    const qty = Math.max(1, Number(order.orderAmount) || 1);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += qty;
      if (!existing.imageUrl && order.imageUrl) {
        existing.imageUrl = order.imageUrl;
      }
    } else {
      map.set(key, {
        title,
        quantity: qty,
        imageUrl: order.imageUrl ?? null,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.quantity - a.quantity);
}

/** Menu item names approved for aggregated quantity in kitchen/bar prep summary. */
export function buildStationPrepQtyVisibleTitles(
  menuItems: { name: string; showStationPrepQty?: boolean }[],
): Set<string> {
  const set = new Set<string>();
  for (const item of menuItems) {
    if (item.showStationPrepQty === false) continue;
    const name = String(item.name ?? "").trim();
    if (name) set.add(name.toLowerCase());
  }
  return set;
}

/** Sum unpaid lines for one table (includes completed, excludes cancelled/paid). */
export function sumOpenTableOrdersETB(
  orders: Order[],
  hotelName: string,
  tableNo: number,
): number {
  const n = Math.floor(Number(tableNo));
  return sumOrderLinesETB(
    orders.filter(
      (o) =>
        isOpenCafeOrder(o, hotelName) && normalizeOrderTableNo(o) === n,
    ),
  );
}
