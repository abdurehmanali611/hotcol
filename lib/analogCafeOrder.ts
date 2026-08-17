"use client";

import { toast } from "sonner";
import type { OrderCreationData } from "@/lib/api/types";
import { createBatchOrders, createOrder } from "@/lib/api/cafeOrders";
import { printCafeOrderTicket, type CafePrintLine } from "@/lib/posAgent";

export const ANALOG_FAILED_ORDER_MESSAGE = "Failed order";

function analogFailedDescription(error: unknown): string {
  const msg = error instanceof Error ? error.message.trim() : "";
  if (msg) return msg;
  return "The thermal printer did not confirm the ticket. Nothing was saved — try again.";
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
    station: String(order.category || order.type || ""),
  };
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

  try {
    await printCafeOrderTicket({
      isUpdate: base.isUpdate,
      hotelName: base.hotelName,
      tableNo: Number(first.tableNo),
      waiterName: String(first.waiterName || ""),
      lines: orders.map(toPrintLine),
    });
  } catch (error) {
    await logAnalogFailedOrders(orders, "print");
    announceAnalogFailedOrder(error);
    throw error;
  }

  const pendingRows = orders.map((o) => ({
    ...o,
    status: "Pending",
    payment: "Unpaid",
  }));

  try {
    if (pendingRows.length === 1) {
      return await createOrder(pendingRows[0]!, { silent: true });
    }
    return await createBatchOrders(pendingRows, { silent: true });
  } catch (error) {
    await logAnalogFailedOrders(pendingRows, "save-after-print");
    toast.error("Ticket printed but the order was not saved. Try again.");
    throw error;
  }
}
