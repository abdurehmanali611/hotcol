import { parseYmdToDate } from "@/lib/hotelDateYmd";
import type { InactiveItemFilters } from "@/lib/inactiveItemFilters";
import {
  isStockMovementInactiveRow,
  type InactiveItemRow,
} from "@/lib/inactiveItemFilters";
import { departmentLabel } from "@/lib/departments";
import { formatVoucherDisplay } from "@/lib/voucherFormat";

export function formatInactiveEtb(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatInactiveFilterDate(ymd: string): string {
  const trimmed = String(ymd ?? "").trim();
  if (!trimmed) return "Any date";
  const d = parseYmdToDate(trimmed);
  if (!d) return trimmed;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function inactiveFilterSummaryLines(
  filters: InactiveItemFilters,
  filteredCount: number,
  totalCount: number,
): { label: string; value: string }[] {
  return [
    { label: "From", value: formatInactiveFilterDate(filters.dateFrom) },
    { label: "To", value: formatInactiveFilterDate(filters.dateTo) },
    {
      label: "Department",
      value: filters.department.trim()
        ? departmentLabel(filters.department)
        : "All departments",
    },
    {
      label: "Records",
      value: `${filteredCount} of ${totalCount}`,
    },
  ];
}

export function inactiveRowVoucher(row: InactiveItemRow): string {
  return formatVoucherDisplay(row.voucherNumber, row.voucherDisplay);
}

export function inactiveRowActionDate(row: InactiveItemRow): string {
  const d = new Date(row.actionDate);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function inactiveRowLineTotalEtb(row: InactiveItemRow): number {
  return (Number(row.amount) || 0) * (Number(row.unitPrice) || 0);
}

export function inactiveRowTotal(row: InactiveItemRow): string {
  return `ETB ${formatInactiveEtb(inactiveRowLineTotalEtb(row))}`;
}

export type InactiveAuditPrintTotals = {
  lineCount: number;
  movementLineCount: number;
  movementTotalEtb: number;
  otherLineCount: number;
  otherTotalEtb: number;
  grandTotalEtb: number;
};

export function summarizeInactiveAuditPrint(
  rows: InactiveItemRow[],
): InactiveAuditPrintTotals {
  let movementLineCount = 0;
  let movementTotalEtb = 0;
  let otherLineCount = 0;
  let otherTotalEtb = 0;

  for (const row of rows) {
    const lineTotal = inactiveRowLineTotalEtb(row);
    if (isStockMovementInactiveRow(row)) {
      movementLineCount += 1;
      movementTotalEtb += lineTotal;
    } else {
      otherLineCount += 1;
      otherTotalEtb += lineTotal;
    }
  }

  return {
    lineCount: rows.length,
    movementLineCount,
    movementTotalEtb,
    otherLineCount,
    otherTotalEtb,
    grandTotalEtb: movementTotalEtb + otherTotalEtb,
  };
}
