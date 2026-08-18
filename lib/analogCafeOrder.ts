"use client";

import { toast } from "sonner";
import type { OrderCreationData } from "@/lib/api/types";
import { createBatchOrders, createOrder } from "@/lib/api/cafeOrders";
import { isBarStationOrder } from "@/lib/cafeOrderStation";
import { printCafeOrderTicket, type CafePrintLine } from "@/lib/posAgent";

export const ANALOG_FAILED_ORDER_MESSAGE = "Failed order";

type AnalogPrintStation = "Kitchen" | "Bar";

function analogFailedDescription(error: unknown): string {
  const msg = error instanceof Error ? error.message.trim() : "";
  if (msg) return msg;
  return "Could not print the ticket. Try again.";
}

export function announceAnalogFailedOrder(error: unknown): void {
  toast.error(ANALOG_FAILED_ORDER_MESSAGE, {
    description: analogFailedDescription(error),
    duration: 8000,
  });
}

function toPrintLine(order: OrderCreationData): CafePrintLine {
  return {
    title: String(order.title),
    quantity: Math.max(1, Math.floor(Number(order.orderAmount) || 1)),
    price: Number(order.price) || 0,
  };
}

function analogPrintStation(order: OrderCreationData): AnalogPrintStation {
  return isBarStationOrder(order) ? "Bar" : "Kitchen";
}

function groupOrdersByPrintStation(orders: OrderCreationData[]): {
  station: AnalogPrintStation;
  orders: OrderCreationData[];
}[] {
  const kitchen: OrderCreationData[] = [];
  const bar: OrderCreationData[] = [];
  for (const order of orders) {
    if (analogPrintStation(order) === "Bar") bar.push(order);
    else kitchen.push(order);
  }
  const groups: { station: AnalogPrintStation; orders: OrderCreationData[] }[] =
    [];
  if (kitchen.length) groups.push({ station: "Kitchen", orders: kitchen });
  if (bar.length) groups.push({ station: "Bar", orders: bar });
  return groups;
}

/** Persist lines that never printed so manager reports can list POS failures. */
async function logAnalogFailedOrders(
  orders: OrderCreationData[],
  reason: string,
): Promise<void> {
  if (orders.length === 0) return;
  const payload = orders.map((o) => ({
    ...o,
    status: "Failed",
    payment: "Unpaid",
  }));
  try {
    if (payload.length === 1) {
      await createOrder(payload[0]!, { silent: true });
    } else {
      await createBatchOrders(payload, { silent: true });
    }
  } catch {
    console.warn("[analog] Could not log failed order:", reason);
  }
}

async function saveAnalogPendingOrders(
  orders: OrderCreationData[],
): Promise<unknown> {
  const pendingRows = orders.map((o) => ({
    ...o,
    status: "Pending",
    payment: "Unpaid",
  }));
  if (pendingRows.length === 1) {
    return createOrder(pendingRows[0]!, { silent: true });
  }
  return createBatchOrders(pendingRows, { silent: true });
}

export async function submitAnalogPrintedOrders(
  orders: OrderCreationData[],
  options?: { isUpdate?: boolean; hotelName?: string },
): Promise<unknown> {
  if (orders.length === 0) {
    throw new Error("Add at least one item before printing");
  }
  const first = orders[0]!;
  const base = {
    hotelName: options?.hotelName || first.HotelName || "",
    isUpdate: Boolean(options?.isUpdate),
  };

  const groups = groupOrdersByPrintStation(orders);
  const printed: OrderCreationData[] = [];
  const failed: OrderCreationData[] = [];
  let lastPrintError: unknown;

  for (const group of groups) {
    try {
      await printCafeOrderTicket({
        isUpdate: base.isUpdate,
        hotelName: base.hotelName,
        tableNo: Number(first.tableNo),
        waiterName: String(first.waiterName || ""),
        station: group.station,
        lines: group.orders.map(toPrintLine),
      });
      printed.push(...group.orders);
    } catch (error) {
      lastPrintError = error;
      failed.push(...group.orders);
    }
  }

  if (failed.length > 0) {
    await logAnalogFailedOrders(failed, "print");
    announceAnalogFailedOrder(lastPrintError);
  }

  if (printed.length === 0) {
    throw lastPrintError instanceof Error
      ? lastPrintError
      : new Error("The thermal printer did not confirm the ticket.");
  }

  try {
    const saved = await saveAnalogPendingOrders(printed);
    if (failed.length > 0) {
      toast.warning(
        "Some tickets failed to print. Reprint them from Failed orders.",
      );
    }
    return saved;
  } catch (error) {
    await logAnalogFailedOrders(printed, "save-after-print");
    toast.error("Ticket printed but the order was not saved. Try again.");
    throw error;
  }
}
