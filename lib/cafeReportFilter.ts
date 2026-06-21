import type { Cashout, Order, ReportFilter } from "@/lib/api/types";
import {
  isSameCafeBusinessDay,
  isSameCafeBusinessMonth,
} from "@/lib/cafeBusinessDay";
import { isPaidCafeOrderLine } from "@/lib/cafeDailyRevenueByCategory";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";

export function orderMatchesCafeReportPeriod(
  order: Order,
  filter: ReportFilter,
): boolean {
  if (!rowHotelMatchesTenantScope(order.HotelName, filter.HotelName)) {
    return false;
  }
  if (filter.type === "Daily") {
    return isSameCafeBusinessDay(order.createdAt, filter.date);
  }
  return isSameCafeBusinessMonth(order.createdAt, filter.date);
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
  if (filter.type === "Daily") {
    return isSameCafeBusinessDay(cashout.createdAt, filter.date);
  }
  return isSameCafeBusinessMonth(cashout.createdAt, filter.date);
}

export function filterCafeReportCashouts(
  cashouts: Cashout[],
  filter: Pick<ReportFilter, "date" | "type">,
): Cashout[] {
  return cashouts.filter((cashout) =>
    cashoutMatchesCafeReportPeriod(cashout, filter),
  );
}
