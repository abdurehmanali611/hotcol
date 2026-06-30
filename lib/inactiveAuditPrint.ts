import type { AuditPrintColumn } from "@/components/hotel/BrandedAuditListPrint";
import type { AuditPrintSummaryRow } from "@/lib/brandedListPrint";
import {
  auditRecordsFilterLine,
  formatPrintEtb,
  formatPrintEtbLabel,
  formatPrintFilterDate,
  formatPrintWhen,
} from "@/lib/brandedListPrint";
import type { InactiveItemFilters } from "@/lib/inactiveItemFilters";
import {
  isStockMovementInactiveRow,
  type InactiveItemRow,
} from "@/lib/inactiveItemFilters";
import { departmentLabel } from "@/lib/departments";
import { formatMovementType } from "@/lib/hotelDisplayLabels";
import { formatVoucherDisplay } from "@/lib/voucherFormat";

export {
  formatPrintEtb as formatInactiveEtb,
  formatPrintFilterDate as formatInactiveFilterDate,
} from "@/lib/brandedListPrint";

export function inactiveFilterSummaryLines(
  filters: InactiveItemFilters,
  filteredCount: number,
  totalCount: number,
): { label: string; value: string }[] {
  return [
    { label: "From", value: formatPrintFilterDate(filters.dateFrom) },
    { label: "To", value: formatPrintFilterDate(filters.dateTo) },
    {
      label: "Movement type",
      value: String(filters.movementType ?? "").trim()
        ? formatMovementType(filters.movementType)
        : "All movements",
    },
    {
      label: "Department",
      value: filters.department.trim()
        ? departmentLabel(filters.department)
        : "All departments",
    },
    auditRecordsFilterLine(filteredCount, totalCount),
  ];
}

export function inactiveRowVoucher(row: InactiveItemRow): string {
  return formatVoucherDisplay(row.voucherNumber, row.voucherDisplay);
}

export function inactiveRowActionDate(row: InactiveItemRow): string {
  return formatPrintWhen(row.actionDate);
}

export function inactiveRowLineTotalEtb(row: InactiveItemRow): number {
  return (Number(row.amount) || 0) * (Number(row.unitPrice) || 0);
}

export function inactiveRowTotal(row: InactiveItemRow): string {
  return formatPrintEtbLabel(inactiveRowLineTotalEtb(row));
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

export function inactiveSummaryRows(
  totals: InactiveAuditPrintTotals,
): AuditPrintSummaryRow[] {
  const rows: AuditPrintSummaryRow[] = [
    {
      label: "Stock movement lines",
      value: String(totals.movementLineCount),
    },
    {
      label: "Stock movement account total",
      value: formatPrintEtbLabel(totals.movementTotalEtb),
      emphasis: true,
    },
  ];

  if (totals.otherLineCount > 0) {
    rows.push(
      {
        label: "Other inactive lines",
        value: String(totals.otherLineCount),
      },
      {
        label: "Other inactive total",
        value: formatPrintEtbLabel(totals.otherTotalEtb),
      },
    );
  }

  rows.push({
    label: "Report grand total",
    value: formatPrintEtbLabel(totals.grandTotalEtb),
    grand: true,
  });

  return rows;
}

export function buildInactiveListPrintConfig(
  rows: InactiveItemRow[],
  filters: InactiveItemFilters,
  filteredCount: number,
  totalCount: number,
  title = "Stock movement account report",
) {
  const totals = summarizeInactiveAuditPrint(rows);

  const columns: AuditPrintColumn<InactiveItemRow>[] = [
    { header: "Voucher", cell: (row) => inactiveRowVoucher(row) },
    { header: "Product", cell: (row) => row.name },
    { header: "Category", cell: (row) => row.category },
    {
      header: "Qty",
      className: "tabular-nums",
      cell: (row) => row.amount,
    },
    { header: "Unit", cell: (row) => row.measuredBy },
    {
      header: "Unit price",
      className: "tabular-nums",
      cell: (row) => `ETB ${formatPrintEtb(Number(row.unitPrice) || 0)}`,
    },
    {
      header: "Total",
      className: "tabular-nums",
      cell: (row) => inactiveRowTotal(row),
    },
    { header: "Provider", cell: (row) => row.supplierName || "—" },
    { header: "Department", cell: (row) => row.movementDepartmentLabel || "—" },
    { header: "Status", cell: (row) => row.status },
    { header: "By", cell: (row) => row.statusBy || "—" },
    { header: "Date", cell: (row) => inactiveRowActionDate(row) },
  ];

  return {
    columns,
    summaryRows: inactiveSummaryRows(totals),
    filterLines: inactiveFilterSummaryLines(
      filters,
      filteredCount,
      totalCount,
    ),
    eyebrow: "Stock movement account",
    title,
    documentTitle: "Stock_Movement_Account",
  };
}
