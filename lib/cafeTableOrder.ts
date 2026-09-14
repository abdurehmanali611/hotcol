import type { Order, Table } from "@/lib/actions";
import { isSameCafeBusinessDay } from "@/lib/cafeBusinessDay";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import {
  cafePhysicalTableNo,
  compareCafeTableNos,
  decodeCafeTableSplit,
  encodeCafeTableSplit,
  formatCafeTableSeatTabLabel,
  formatCafeTableSplitLabel,
  isCafeTableSplitCode,
  CAFE_TABLE_SPLIT_MAX_INDEX,
} from "@/lib/cafeTableSplit";

export {
  cafePhysicalTableNo,
  compareCafeTableNos,
  decodeCafeTableSplit,
  encodeCafeTableSplit,
  formatCafeTableSeatTabLabel,
  formatCafeTableSplitLabel,
  isCafeTableSplitCode,
} from "@/lib/cafeTableSplit";

/** Form sentinel when no table is chosen yet (not a real table number). */
export const CAFE_TABLE_UNSELECTED = -1;

/** Any registered café table number (0–999); caption labels are independent of the number. */
export function isValidSelectedCafeTableNo(value: unknown): boolean {
  const n =
    typeof value === "string" ? parseInt(value, 10) : Number(value);
  return Number.isFinite(n) && Math.floor(n) >= 0 && Math.floor(n) <= 999;
}

/** Unpaid, active order for today at this property. Failed tickets never lock tables. */
export function isOpenCafeOrder(order: Order, hotelName: string): boolean {
  if (!rowHotelMatchesTenantScope(order.HotelName, hotelName)) return false;
  if (String(order.payment || "").toLowerCase() === "paid") return false;
  const status = String(order.status || "").toLowerCase();
  if (status === "cancelled" || status === "failed") return false;
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
      // Physical table stays in-use while original or any split is unpaid.
      occupied.add(cafePhysicalTableNo(normalizeOrderTableNo(order)));
    }
  }
  return occupied;
}

/** Open unpaid tickets for a physical table (original + all splits). */
export function openOrdersForPhysicalTable(
  orders: Order[],
  hotelName: string,
  parentTableNo: number,
): Order[] {
  const parent = Math.floor(Number(parentTableNo));
  return orders.filter(
    (order) =>
      isOpenCafeOrder(order, hotelName) &&
      cafePhysicalTableNo(normalizeOrderTableNo(order)) === parent,
  );
}

/** Encoded split tableNos that currently have open unpaid lines. */
export function listOpenCafeTableSplitNos(
  orders: Order[],
  hotelName: string,
  parentTableNo: number,
): number[] {
  const parent = Math.floor(Number(parentTableNo));
  const found = new Set<number>();
  for (const order of openOrdersForPhysicalTable(orders, hotelName, parent)) {
    const n = normalizeOrderTableNo(order);
    if (decodeCafeTableSplit(n)?.parentTableNo === parent) {
      found.add(n);
    }
  }
  return [...found].sort(compareCafeTableNos);
}

/** Next split index (.1, .2, …) while this physical table is still in use. */
export function nextCafeTableSplitIndex(
  orders: Order[],
  hotelName: string,
  parentTableNo: number,
): number {
  let max = 0;
  for (const order of openOrdersForPhysicalTable(
    orders,
    hotelName,
    parentTableNo,
  )) {
    const parts = decodeCafeTableSplit(normalizeOrderTableNo(order));
    if (parts) max = Math.max(max, parts.splitIndex);
  }
  return Math.min(max + 1, CAFE_TABLE_SPLIT_MAX_INDEX);
}

export function allocateNextCafeTableSplit(
  orders: Order[],
  hotelName: string,
  parentTableNo: number,
): number {
  return encodeCafeTableSplit(
    parentTableNo,
    nextCafeTableSplitIndex(orders, hotelName, parentTableNo),
  );
}

export function formatTableSelectLabel(
  table: Pick<Table, "tableNo" | "orderCaption">,
  occupied: boolean,
): string {
  const caption = String(table.orderCaption ?? "").trim();
  const base = caption || formatCafeTableLabel(Number(table.tableNo));
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
      // Caption only — "(In use)" is already in `name` when occupied.
      subText: captionOrEmpty(table.orderCaption),
    };
  });
}

/** Table dropdown for edit form — always includes the order's current table. */
export function buildEditTableSelectOptions(
  tables: Table[],
  occupiedTableNos: Set<number>,
  currentTableNo: number,
  extraTableNos: number[] = [],
) {
  const current = Math.floor(Number(currentTableNo));
  const physicalCurrent = cafePhysicalTableNo(current);
  const options = buildTableSelectOptions(tables, occupiedTableNos).map(
    (option) => {
      const optionNo = Number(option.realValue);
      // Keep current seat (or its physical parent) selectable while editing.
      if (optionNo !== current && optionNo !== physicalCurrent) {
        return option;
      }
      const currentTable = tables.find(
        (t) => Number(t.tableNo) === physicalCurrent,
      );
      return {
        ...option,
        disabled: false,
        name: formatTableSelectLabel(
          {
            tableNo: optionNo === current ? current : optionNo,
            orderCaption:
              optionNo === current
                ? null
                : currentTable?.orderCaption ?? null,
          },
          false,
        ),
        subText:
          optionNo === current
            ? undefined
            : captionOrEmpty(currentTable?.orderCaption ?? null),
      };
    },
  );
  const currentTable = tables.find(
    (t) => Number(t.tableNo) === physicalCurrent,
  );
  let withCurrent = options.some((o) => Number(o.realValue) === current)
    ? options
    : [
        {
          id: -1,
          name: formatTableSelectLabel(
            {
              tableNo: current,
              orderCaption: isCafeTableSplitCode(current)
                ? null
                : currentTable?.orderCaption ?? null,
            },
            false,
          ),
          realValue: current,
          disabled: false,
          subText: isCafeTableSplitCode(current)
            ? "Table split"
            : captionOrEmpty(currentTable?.orderCaption ?? null),
        },
        ...options,
      ];

  const seen = new Set(withCurrent.map((o) => Number(o.realValue)));
  for (const raw of extraTableNos) {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || seen.has(n)) continue;
    seen.add(n);
    withCurrent = [
      ...withCurrent,
      {
        id: -1000 - n,
        name: formatCafeTableLabel(n),
        realValue: n,
        disabled: false,
        subText: isCafeTableSplitCode(n) ? "Table split" : undefined,
      },
    ];
  }

  return [...withCurrent].sort((a, b) => {
    const av = Number(a.realValue);
    const bv = Number(b.realValue);
    if (av === current) return -1;
    if (bv === current) return 1;
    return compareCafeTableNos(av, bv);
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

export function formatCafeTableLabel(
  tableNo: number,
  parentCaption?: string | null,
): string {
  const n = Math.floor(Number(tableNo));
  const splitLabel = formatCafeTableSplitLabel(n, parentCaption);
  if (splitLabel) return splitLabel;
  if (n >= 900_000) {
    return `Room service · stay ${n - 900_000}`;
  }
  const caption = String(parentCaption ?? "").trim();
  if (caption) return caption;
  return `Table ${n}`;
}

export function formatCafeTableDisplay(
  tableNo: number,
  caption?: string | null,
): string {
  if (isCafeTableSplitCode(tableNo)) {
    return formatCafeTableLabel(tableNo, caption);
  }
  const c = String(caption ?? "").trim();
  if (c) return c;
  return formatCafeTableLabel(tableNo);
}

/** Caption registered on a table row (Delivery, Takeaway, etc.). */
export function tableCaptionForNo(
  tables: Pick<Table, "tableNo" | "orderCaption">[],
  tableNo: number,
): string | null {
  // Splits inherit the physical parent’s caption for “delivery 0.1” labels.
  const physical = cafePhysicalTableNo(tableNo);
  const row = tables.find((t) => Math.floor(Number(t.tableNo)) === physical);
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
  const physical = cafePhysicalTableNo(tableNo);
  const caption =
    tableCaptionForNo(tables, physical) ||
    String(orderServiceCaption ?? "").trim() ||
    null;
  return formatCafeTableDisplay(tableNo, caption);
}

export type CafePhysicalTableFamily<T> = {
  physicalTableNo: number;
  /** Seat tableNos: original first, then .1, .2, … */
  seats: { tableNo: number; items: T[] }[];
};

/** Collapse original + split seats under one physical table for tabbed UIs. */
export function groupByCafePhysicalTable<T extends { tableNo: number | string }>(
  entries: { tableNo: number; items: T[] }[],
): CafePhysicalTableFamily<T>[] {
  const byPhysical = new Map<number, { tableNo: number; items: T[] }[]>();
  for (const entry of entries) {
    const physical = cafePhysicalTableNo(entry.tableNo);
    const list = byPhysical.get(physical) ?? [];
    list.push(entry);
    byPhysical.set(physical, list);
  }

  return [...byPhysical.entries()]
    .sort(([a], [b]) => a - b)
    .map(([physicalTableNo, seats]) => ({
      physicalTableNo,
      seats: [...seats].sort((a, b) =>
        compareCafeTableNos(a.tableNo, b.tableNo),
      ),
    }));
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

/** Analog tickets are paid on print; same-day paid lines can still receive added items. */
export function isAnalogOrderAddable(order: Order, hotelName: string): boolean {
  if (!rowHotelMatchesTenantScope(order.HotelName, hotelName)) return false;
  if (String(order.status ?? "").trim().toLowerCase() === "cancelled") {
    return false;
  }
  if (String(order.payment ?? "").trim().toLowerCase() !== "paid") return false;
  return isSameCafeBusinessDay(order.createdAt);
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
    .sort(([a], [b]) => compareCafeTableNos(a, b))
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
    .sort(([a], [b]) => compareCafeTableNos(a, b))
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

/** Kitchen/bar ticket: one card per open table (all pending lines for that table). */
export type CafeStationOrderGroup = {
  key: string;
  orders: Order[];
};

/** Paid-order batch: paid lines from one table occupancy session. */
export type CafePaidOrderBatch = {
  key: string;
  tableNo: number;
  createdAt: Date | string;
  orders: Order[];
};

/**
 * @deprecated Kept for callers; station cards now group by table, not time window.
 * Pending kitchen/bar lines from one submission within this window previously shared one card.
 */
export const CAFE_STATION_ORDER_BATCH_WINDOW_MS = 60_000;
/** Same table + paid lines within this window collapse together in payment-type correction. */
export const CAFE_PAID_ORDER_BATCH_WINDOW_MS = 60_000;

function isPaidCafeOrderLine(order: Order): boolean {
  return String(order.payment ?? "").trim().toLowerCase() === "paid";
}

function isCancelledCafeOrderLine(order: Order): boolean {
  return String(order.status ?? "").trim().toLowerCase() === "cancelled";
}

/** Order rows that define table occupancy for session reconstruction. */
export function cafeTableSessionOrders(
  orders: Order[],
  hotelName: string,
): Order[] {
  return orders.filter(
    (order) =>
      rowHotelMatchesTenantScope(order.HotelName, hotelName) &&
      isSameCafeBusinessDay(order.createdAt) &&
      !isCancelledCafeOrderLine(order),
  );
}

/**
 * True when the table was still in use immediately before the next order was placed.
 * Uses creation order plus current payment state — no per-order paidAt required.
 */
export function wasCafeTableInUseBeforeOrder(
  priorOrdersOnTable: Order[],
  nextCreatedAt: Date | string,
): boolean {
  const atMs = new Date(nextCreatedAt).getTime();
  if (!Number.isFinite(atMs) || priorOrdersOnTable.length === 0) return false;

  for (const order of priorOrdersOnTable) {
    if (!isPaidCafeOrderLine(order)) return true;
    const orderMs = new Date(order.createdAt).getTime();
    const hasLaterOrderPlacedBeforeNext = priorOrdersOnTable.some((other) => {
      if (other.id === order.id) return false;
      const otherMs = new Date(other.createdAt).getTime();
      return otherMs > orderMs && otherMs <= atMs;
    });
    if (hasLaterOrderPlacedBeforeNext) return true;
  }
  return false;
}

/** Maps each order id to a stable session key for its table occupancy period. */
export function assignCafeTableOrderSessionKeys(
  orders: Order[],
  hotelName: string,
): Map<number, string> {
  const sessionByOrderId = new Map<number, string>();
  const byTable = new Map<number, Order[]>();

  for (const order of cafeTableSessionOrders(orders, hotelName)) {
    const tableNo = normalizeOrderTableNo(order);
    const list = byTable.get(tableNo) ?? [];
    list.push(order);
    byTable.set(tableNo, list);
  }

  for (const [tableNo, tableOrders] of byTable.entries()) {
    const sorted = [...tableOrders].sort((a, b) => {
      const diff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return diff !== 0 ? diff : a.id - b.id;
    });

    let sessionIndex = 0;
    let priorInSession: Order[] = [];

    for (const order of sorted) {
      if (
        priorInSession.length > 0 &&
        !wasCafeTableInUseBeforeOrder(priorInSession, order.createdAt)
      ) {
        sessionIndex += 1;
        priorInSession = [];
      }
      sessionByOrderId.set(order.id, `${tableNo}|${sessionIndex}`);
      priorInSession.push(order);
    }
  }

  return sessionByOrderId;
}

export type GroupCafePaidOrderBatchOptions = {
  /** All today's orders for the property — used to reconstruct table occupancy sessions. */
  sessionSourceOrders?: Order[];
  hotelName?: string;
};

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

/** 1-minute clusters on one table (payment-type collapsible rows). */
function groupCafePaidOrderMinuteClusters(tableOrders: Order[]): Order[][] {
  const sorted = [...tableOrders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const clusters: Order[][] = [];
  let cluster: Order[] = [];
  let clusterStartMs = 0;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    clusters.push([...cluster].sort((a, b) => a.id - b.id));
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
  return clusters;
}

function minuteClustersToBatches(
  tableNo: number,
  clusters: Order[][],
): CafePaidOrderBatch[] {
  return clusters.map((cluster) => ({
    key: cafePaidOrderBatchKey(tableNo, cluster),
    tableNo,
    createdAt: cluster[0].createdAt,
    orders: cluster,
  }));
}

function mergePaidBatchesByTableSession(
  batches: CafePaidOrderBatch[],
  sessionKeys: Map<number, string>,
): CafePaidOrderBatch[] {
  const bySession = new Map<string, CafePaidOrderBatch[]>();

  for (const batch of batches) {
    const anchor = batch.orders[0];
    const sessionKey =
      sessionKeys.get(anchor.id) ?? `${batch.tableNo}|${anchor.id}`;
    const list = bySession.get(sessionKey) ?? [];
    list.push(batch);
    bySession.set(sessionKey, list);
  }

  const merged: CafePaidOrderBatch[] = [];
  for (const [sessionKey, sessionBatches] of bySession.entries()) {
    if (sessionBatches.length === 1) {
      merged.push(sessionBatches[0]);
      continue;
    }

    const tableNo = sessionBatches[0].tableNo;
    const orders = sessionBatches
      .flatMap((batch) => batch.orders)
      .sort((a, b) => a.id - b.id);
    merged.push({
      key: `${sessionKey}|${orders.map((o) => o.id).join("-")}`,
      tableNo,
      createdAt: orders[0]?.createdAt ?? new Date().toISOString(),
      orders,
    });
  }

  return merged;
}

/**
 * Groups paid orders for payment-type correction:
 * 1) collapse lines paid within one minute on the same table, then
 * 2) merge those clusters when they belong to the same table in-use session.
 */
export function groupCafePaidOrderBatches(
  orders: Order[],
  options?: GroupCafePaidOrderBatchOptions,
): CafePaidOrderBatch[] {
  if (orders.length === 0) return [];

  const byTable = new Map<number, Order[]>();
  for (const order of orders) {
    const tableNo = normalizeOrderTableNo(order);
    const list = byTable.get(tableNo) ?? [];
    list.push(order);
    byTable.set(tableNo, list);
  }

  let batches: CafePaidOrderBatch[] = [];
  for (const [tableNo, tableOrders] of byTable.entries()) {
    const clusters = groupCafePaidOrderMinuteClusters(tableOrders);
    batches.push(...minuteClustersToBatches(tableNo, clusters));
  }

  if (options?.sessionSourceOrders && options.hotelName) {
    const sessionKeys = assignCafeTableOrderSessionKeys(
      options.sessionSourceOrders,
      options.hotelName,
    );
    batches = mergePaidBatchesByTableSession(batches, sessionKeys);
  }

  return batches.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Groups pending station orders into one card per table.
 * Later adds/updates on the same table stay with that table instead of
 * splitting into a new time-window batch.
 */
export function groupCafeStationOrderCards(orders: Order[]): CafeStationOrderGroup[] {
  if (orders.length === 0) return [];

  const byTable = new Map<number, Order[]>();
  for (const order of orders) {
    const tableNo = normalizeOrderTableNo(order);
    const list = byTable.get(tableNo) ?? [];
    list.push(order);
    byTable.set(tableNo, list);
  }

  const groups: CafeStationOrderGroup[] = [];
  for (const [tableNo, tableOrders] of byTable.entries()) {
    const sorted = [...tableOrders].sort((a, b) => {
      const diff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return diff !== 0 ? diff : a.id - b.id;
    });
    groups.push({
      key: `table-${tableNo}`,
      orders: sorted,
    });
  }

  return groups.sort((a, b) => {
    const tableDiff = compareCafeTableNos(
      normalizeOrderTableNo(a.orders[0]),
      normalizeOrderTableNo(b.orders[0]),
    );
    if (tableDiff !== 0) return tableDiff;
    return a.orders[0].id - b.orders[0].id;
  });
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
