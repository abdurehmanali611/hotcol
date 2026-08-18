import type { Cashout, CafeReportType, Order, ReportFilter } from "@/lib/api/types";
import {
  isSameCafeBusinessDay,
  isSameCafeBusinessHalfYear,
  isSameCafeBusinessMonth,
  isSameCafeBusinessQuarter,
  isSameCafeBusinessYear,
} from "@/lib/cafeBusinessDay";
import { isPaidCafeOrderLine } from "@/lib/cafeDailyRevenueByCategory";
import { isBarStationOrder } from "@/lib/cafeOrderStation";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";

export function matchesCafeReportPeriod(
  dateInput: Date | string | number,
  filter: Pick<ReportFilter, "date" | "type">,
): boolean {
  switch (filter.type) {
    case "Daily":
      return isSameCafeBusinessDay(dateInput, filter.date);
    case "Monthly":
      return isSameCafeBusinessMonth(dateInput, filter.date);
    case "Quarterly":
      return isSameCafeBusinessQuarter(dateInput, filter.date);
    case "HalfYearly":
      return isSameCafeBusinessHalfYear(dateInput, filter.date);
    case "Yearly":
      return isSameCafeBusinessYear(dateInput, filter.date);
    default:
      return false;
  }
}

export function orderMatchesCafeReportPeriod(
  order: Order,
  filter: ReportFilter,
): boolean {
  if (!rowHotelMatchesTenantScope(order.HotelName, filter.HotelName)) {
    return false;
  }
  return matchesCafeReportPeriod(order.createdAt, filter);
}

export function orderMatchesCafeRevenueReport(
  order: Order,
  filter: ReportFilter,
): boolean {
  if (!orderMatchesCafeReportPeriod(order, filter)) return false;
  return isPaidCafeOrderLine(order);
}

export function filterCafeReportRevenueOrders(
  orders: Order[],
  filter: ReportFilter,
): Order[] {
  return orders.filter((order) => orderMatchesCafeRevenueReport(order, filter));
}

export function filterCafeReportPeriodOrders(
  orders: Order[],
  filter: ReportFilter,
): Order[] {
  return orders.filter((order) => orderMatchesCafeReportPeriod(order, filter));
}

export function cashoutMatchesCafeReportPeriod(
  cashout: Cashout,
  filter: Pick<ReportFilter, "date" | "type">,
): boolean {
  if (!cashout.createdAt) return false;
  return matchesCafeReportPeriod(cashout.createdAt, filter);
}

export function filterCafeReportCashouts(
  cashouts: Cashout[],
  filter: Pick<ReportFilter, "date" | "type">,
): Cashout[] {
  return cashouts.filter((cashout) =>
    cashoutMatchesCafeReportPeriod(cashout, filter),
  );
}

export function cafeReportTypeLabel(type: CafeReportType): string {
  switch (type) {
    case "Daily":
      return "Daily";
    case "Monthly":
      return "Monthly";
    case "Quarterly":
      return "Quarterly";
    case "HalfYearly":
      return "Half-Yearly";
    case "Yearly":
      return "Yearly";
    default:
      return type;
  }
}

function orderStatusKey(order: Pick<Order, "status">): string {
  return String(order.status ?? "").trim().toLowerCase();
}

function orderPaymentKey(order: Pick<Order, "payment">): string {
  return String(order.payment ?? "").trim().toLowerCase();
}

function isKitchenOrBarIncomplete(order: Pick<Order, "status">): boolean {
  const status = orderStatusKey(order);
  return status === "" || status === "pending";
}

export function isCafeReportCancelledOrder(
  order: Pick<Order, "status">,
): boolean {
  return orderStatusKey(order) === "cancelled";
}

export function isCafeReportFailedOrder(order: Pick<Order, "status">): boolean {
  return orderStatusKey(order) === "failed";
}

/** Paid sales — analog tickets stay Pending after print; paid is enough. */
export function isCafeReportCompletedOrder(
  order: Pick<Order, "status" | "payment">,
): boolean {
  return orderPaymentKey(order) === "paid" && !isCafeReportCancelledOrder(order);
}

/** Digital: kitchen/bar marked complete, cashier has not collected payment. */
export function isCafeReportPendingPaymentOrder(
  order: Pick<Order, "status" | "payment">,
): boolean {
  return (
    orderStatusKey(order) === "completed" &&
    orderPaymentKey(order) !== "paid" &&
    !isCafeReportCancelledOrder(order)
  );
}

/** Digital pending payment that is still today (live cashier queue). */
export function isCafeReportOpenPendingPaymentOrder(
  order: Pick<Order, "status" | "payment" | "createdAt">,
  now: Date | string | number = new Date(),
): boolean {
  return (
    isCafeReportPendingPaymentOrder(order) &&
    isSameCafeBusinessDay(order.createdAt, now)
  );
}

/**
 * Today's live lines in the selected report period.
 * Analog: printed / saved but not paid.
 * Digital: still with kitchen or bar (not marked complete).
 */
export function isCafeReportInProgressOrder(
  order: Pick<Order, "status" | "payment" | "createdAt">,
  analog: boolean,
  now: Date | string | number = new Date(),
): boolean {
  if (isCafeReportCancelledOrder(order) || isCafeReportFailedOrder(order)) {
    return false;
  }
  if (orderPaymentKey(order) === "paid") return false;
  if (!isSameCafeBusinessDay(order.createdAt, now)) return false;
  if (analog) return true;
  return isKitchenOrBarIncomplete(order);
}

/**
 * Lines from before today in the selected report period.
 * Analog: never received payment approval.
 * Digital: kitchen/bar never marked complete, or completed but cashier never approved payment.
 */
export function isCafeReportExpiredOrder(
  order: Pick<Order, "status" | "payment" | "createdAt">,
  analog: boolean,
  now: Date | string | number = new Date(),
): boolean {
  if (isCafeReportCancelledOrder(order) || isCafeReportFailedOrder(order)) {
    return false;
  }
  if (orderPaymentKey(order) === "paid") return false;
  if (isSameCafeBusinessDay(order.createdAt, now)) return false;
  if (analog) return true;
  return (
    isKitchenOrBarIncomplete(order) || isCafeReportPendingPaymentOrder(order)
  );
}

export type CafeReportLiveStatusFilter =
  | "all"
  | "in-progress"
  | "expired"
  | "expired-by-chef"
  | "expired-by-bar"
  | "expired-by-cashier";

export type CafeReportLiveStatusLabel =
  | "In progress"
  | "Expired"
  | "Expired by chef"
  | "Expired by bar"
  | "Expired by cashier";

const LIVE_STATUS_LABEL: Record<
  Exclude<CafeReportLiveStatusFilter, "all">,
  CafeReportLiveStatusLabel
> = {
  "in-progress": "In progress",
  expired: "Expired",
  "expired-by-chef": "Expired by chef",
  "expired-by-bar": "Expired by bar",
  "expired-by-cashier": "Expired by cashier",
};

export function cafeReportLiveStatusFilterKey(
  order: Pick<Order, "status" | "payment" | "createdAt" | "category" | "type">,
  analog: boolean,
  now: Date | string | number = new Date(),
): Exclude<CafeReportLiveStatusFilter, "all"> | null {
  if (isCafeReportInProgressOrder(order, analog, now)) return "in-progress";
  if (!isCafeReportExpiredOrder(order, analog, now)) return null;
  if (analog) return "expired";
  if (isCafeReportPendingPaymentOrder(order)) return "expired-by-cashier";
  if (isBarStationOrder(order)) return "expired-by-bar";
  return "expired-by-chef";
}

export function cafeReportLiveStatusLabel(
  order: Pick<Order, "status" | "payment" | "createdAt" | "category" | "type">,
  analog: boolean,
  now: Date | string | number = new Date(),
): CafeReportLiveStatusLabel | "" {
  const key = cafeReportLiveStatusFilterKey(order, analog, now);
  return key ? LIVE_STATUS_LABEL[key] : "";
}

export function cafeReportLiveStatusFilterOptions(analog: boolean): {
  value: CafeReportLiveStatusFilter;
  label: string;
}[] {
  if (analog) {
    return [
      { value: "all", label: "All" },
      { value: "in-progress", label: "In progress" },
      { value: "expired", label: "Expired" },
    ];
  }
  return [
    { value: "all", label: "All" },
    { value: "in-progress", label: "In progress" },
    { value: "expired-by-chef", label: "Expired by chef" },
    { value: "expired-by-bar", label: "Expired by bar" },
    { value: "expired-by-cashier", label: "Expired by cashier" },
  ];
}

export function matchesCafeReportLiveStatusFilter(
  order: Pick<Order, "status" | "payment" | "createdAt" | "category" | "type">,
  analog: boolean,
  filter: CafeReportLiveStatusFilter,
  now: Date | string | number = new Date(),
): boolean {
  if (filter === "all") return true;
  return cafeReportLiveStatusFilterKey(order, analog, now) === filter;
}

export function cafeReportProfitLabel(type: CafeReportType): string {
  switch (type) {
    case "Daily":
      return "Total Profit Today";
    case "Monthly":
      return "Total Profit This Month";
    case "Quarterly":
      return "Total Profit This Quarter";
    case "HalfYearly":
      return "Total Profit This Half-Year";
    case "Yearly":
      return "Total Profit This Year";
    default:
      return "Total Profit";
  }
}
