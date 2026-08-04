import type { Cashout, CafeReportType, Order, ReportFilter } from "@/lib/api/types";
import {
  isSameCafeBusinessDay,
  isSameCafeBusinessHalfYear,
  isSameCafeBusinessMonth,
  isSameCafeBusinessQuarter,
  isSameCafeBusinessYear,
} from "@/lib/cafeBusinessDay";
import { isPaidCafeOrderLine } from "@/lib/cafeDailyRevenueByCategory";
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
