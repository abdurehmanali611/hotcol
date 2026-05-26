import type { Order, Table } from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";

/** Unpaid, non-cancelled order for today at this property. */
export function isOpenCafeOrder(order: Order, hotelName: string): boolean {
  if (!rowHotelMatchesTenantScope(order.HotelName, hotelName)) return false;
  if (String(order.payment || "").toLowerCase() === "paid") return false;
  if (String(order.status || "").toLowerCase() === "cancelled") return false;
  if (new Date(order.createdAt).toDateString() !== new Date().toDateString()) {
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
    const occupied = occupiedTableNos.has(Number(table.tableNo));
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
  const filteredTables =
    current > 0
      ? tables.filter((t) => Number(t.tableNo) > 0)
      : tables;
  const options = buildTableSelectOptions(filteredTables, occupiedTableNos);
  const withCurrent = options.some((o) => Number(o.realValue) === current)
    ? options
    : [
        {
          id: -1,
          name: formatTableSelectLabel(
            { tableNo: current, orderCaption: null },
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
export function normalizeOrderTableNo(order: Pick<Order, "tableNo">): number {
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
