import type {
  ItemRegistration,
  ItemStatus,
  PurchaseRequestRow,
  StockOutRequestRow,
} from "@/lib/actions";
import type { AuditPrintColumn } from "@/components/hotel/BrandedAuditListPrint";
import type {
  AuditPrintFilterLine,
  AuditPrintSummaryRow,
} from "@/lib/brandedListPrint";
import {
  auditRecordsFilterLine,
  formatPrintDateTime,
  formatPrintEtbLabel,
  formatPrintFilterDate,
  formatPrintVoucherRange,
} from "@/lib/brandedListPrint";
import { departmentLabel } from "@/lib/departments";
import {
  formatItemRegistrationStatus,
  formatMovementType,
  formatPurchaseStatus,
  formatQtyWithUnit,
  formatStockOutRequestStatus,
} from "@/lib/hotelDisplayLabels";
import { lineOwedETB } from "@/lib/hotelInventoryPayment";
import {
  purchaseLineMoneyBreakdown,
  registrationLineTotalETB,
  stockLineTotalETB,
  unitPriceByRegistrationIdFromInventory,
  unitPriceByStockOutRequestIdFromItemStatus,
} from "@/lib/inventoryLineTotals";
import type { InventoryListFilters } from "@/lib/inventoryListFilters";
import { purchaseEntranceDate } from "@/lib/purchaseRequestDates";
import { formatVoucherDisplay } from "@/lib/voucherFormat";

export type RequestStatusListPrintFilters = {
  dateFrom: string;
  dateTo: string;
  dateFromLabel?: string;
  dateToLabel?: string;
  department: string;
  departmentLabelText?: string;
  voucherFrom?: string;
  voucherTo?: string;
  approvalLabel?: string;
};

export function requestStatusFilterSummaryLines(
  filters: RequestStatusListPrintFilters,
  filteredCount: number,
  totalCount: number,
): AuditPrintFilterLine[] {
  const lines: AuditPrintFilterLine[] = [
    {
      label: filters.dateFromLabel ?? "From",
      value: formatPrintFilterDate(filters.dateFrom),
    },
    {
      label: filters.dateToLabel ?? "To",
      value: formatPrintFilterDate(filters.dateTo),
    },
    {
      label: filters.departmentLabelText ?? "Department",
      value: filters.department.trim()
        ? departmentLabel(filters.department)
        : "All departments",
    },
    {
      label: "Voucher range",
      value: formatPrintVoucherRange(
        filters.voucherFrom ?? "",
        filters.voucherTo ?? "",
      ),
    },
  ];

  if (filters.approvalLabel) {
    lines.push({ label: "Approval status", value: filters.approvalLabel });
  }

  lines.push(auditRecordsFilterLine(filteredCount, totalCount));
  return lines;
}

export function inventoryFilterSummaryLines(
  filters: InventoryListFilters,
  filteredCount: number,
  totalCount: number,
): AuditPrintFilterLine[] {
  return [
    {
      label: "Registered from",
      value: formatPrintFilterDate(filters.dateFrom),
    },
    {
      label: "Registered to",
      value: formatPrintFilterDate(filters.dateTo),
    },
    {
      label: "Received by department",
      value: filters.department.trim()
        ? departmentLabel(filters.department)
        : "All departments",
    },
    auditRecordsFilterLine(filteredCount, totalCount),
  ];
}

function rowVoucher(row: {
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
}): string {
  return formatVoucherDisplay(row.voucherNumber, row.voucherDisplay);
}

export function buildRegistrationListPrintConfig(
  rows: ItemRegistration[],
  filters: RequestStatusListPrintFilters,
  filteredCount: number,
  totalCount: number,
) {
  let grandTotal = 0;
  for (const row of rows) {
    grandTotal += registrationLineTotalETB(row);
  }

  const columns: AuditPrintColumn<ItemRegistration>[] = [
    { header: "Voucher", cell: (row) => rowVoucher(row) },
    {
      header: "Registered",
      cell: (row) => formatPrintDateTime(row.registrationDate),
    },
    { header: "Item", cell: (row) => row.name },
    {
      header: "Qty",
      cell: (row) => formatQtyWithUnit(row.amount, row.measuredBy),
    },
    { header: "Supplier", cell: (row) => row.supplierName || "—" },
    {
      header: "Received by",
      cell: (row) =>
        row.receivedByDepartment
          ? departmentLabel(row.receivedByDepartment)
          : "—",
    },
    {
      header: "Status",
      cell: (row) =>
        formatItemRegistrationStatus(String(row.approvalStatus ?? "")),
    },
    {
      header: "Line total",
      className: "tabular-nums",
      cell: (row) => formatPrintEtbLabel(registrationLineTotalETB(row)),
    },
  ];

  const summaryRows: AuditPrintSummaryRow[] = [
    { label: "Registration lines", value: String(rows.length) },
    {
      label: "Report grand total",
      value: formatPrintEtbLabel(grandTotal),
      emphasis: true,
      grand: true,
    },
  ];

  return {
    columns,
    summaryRows,
    filterLines: requestStatusFilterSummaryLines(
      filters,
      filteredCount,
      totalCount,
    ),
    eyebrow: "Item registration",
    title: "Item registration status report",
    documentTitle: "Item_Registration_Status",
  };
}

export function buildPurchaseListPrintConfig(
  rows: PurchaseRequestRow[],
  filters: RequestStatusListPrintFilters,
  filteredCount: number,
  totalCount: number,
) {
  let subtotal = 0;
  let vat = 0;
  let grandTotal = 0;

  for (const row of rows) {
    const breakdown = purchaseLineMoneyBreakdown(row);
    subtotal += breakdown.subtotalETB;
    vat += breakdown.vatETB;
    grandTotal += breakdown.totalETB;
  }

  const columns: AuditPrintColumn<PurchaseRequestRow>[] = [
    { header: "Voucher", cell: (row) => rowVoucher(row) },
    {
      header: "Entrance",
      cell: (row) => formatPrintDateTime(purchaseEntranceDate(row)),
    },
    { header: "Item", cell: (row) => row.itemName },
    {
      header: "Qty",
      cell: (row) => formatQtyWithUnit(row.quantity, row.measuredBy),
    },
    { header: "Supplier", cell: (row) => row.supplierName || "—" },
    {
      header: "Requested by",
      cell: (row) =>
        row.requestedByDepartment
          ? departmentLabel(row.requestedByDepartment)
          : "—",
    },
    {
      header: "Status",
      cell: (row) => formatPurchaseStatus(String(row.status ?? "")),
    },
    {
      header: "Line total",
      className: "tabular-nums",
      cell: (row) =>
        formatPrintEtbLabel(purchaseLineMoneyBreakdown(row).totalETB),
    },
  ];

  const summaryRows: AuditPrintSummaryRow[] = [
    { label: "Purchase lines", value: String(rows.length) },
    {
      label: "Subtotal (ex-VAT)",
      value: formatPrintEtbLabel(subtotal),
    },
  ];

  if (vat > 0) {
    summaryRows.push({
      label: "VAT (15%)",
      value: formatPrintEtbLabel(vat),
    });
  }

  summaryRows.push({
    label: "Report grand total",
    value: formatPrintEtbLabel(grandTotal),
    emphasis: true,
    grand: true,
  });

  return {
    columns,
    summaryRows,
    filterLines: requestStatusFilterSummaryLines(
      filters,
      filteredCount,
      totalCount,
    ),
    eyebrow: "Purchase request",
    title: "Purchase request status report",
    documentTitle: "Purchase_Request_Status",
  };
}

export function buildStockListPrintConfig(
  rows: StockOutRequestRow[],
  linkedInventory: ItemRegistration[],
  filters: RequestStatusListPrintFilters,
  filteredCount: number,
  totalCount: number,
  itemStatusHistory: ItemStatus[] = [],
) {
  const lookup = unitPriceByRegistrationIdFromInventory(linkedInventory);
  const statusLookup = unitPriceByStockOutRequestIdFromItemStatus(itemStatusHistory);
  const measuredByById = new Map<number, string>();
  for (const item of linkedInventory) {
    const id = Math.floor(Number(item.id));
    if (Number.isFinite(id) && id > 0) {
      measuredByById.set(id, item.measuredBy);
    }
  }
  let movementTotal = 0;
  let pricedLines = 0;

  for (const row of rows) {
    const total = stockLineTotalETB(row, lookup, statusLookup);
    if (total != null) {
      movementTotal += total;
      pricedLines += 1;
    }
  }

  const columns: AuditPrintColumn<StockOutRequestRow>[] = [
    { header: "Voucher", cell: (row) => rowVoucher(row) },
    {
      header: "Submitted",
      cell: (row) => formatPrintDateTime(row.createdAt),
    },
    { header: "Item", cell: (row) => row.itemName },
    {
      header: "Type",
      cell: (row) => formatMovementType(String(row.movementType ?? "")),
    },
    {
      header: "Qty",
      cell: (row) =>
        formatQtyWithUnit(
          row.amount,
          measuredByById.get(row.itemRegistrationId) ?? "units",
        ),
    },
    {
      header: "Destination / reason",
      cell: (row) => row.stakeHolderOrReason || "—",
    },
    {
      header: "Requested by",
      cell: (row) =>
        row.requestedByDepartment
          ? departmentLabel(row.requestedByDepartment)
          : "—",
    },
    {
      header: "Status",
      cell: (row) => formatStockOutRequestStatus(String(row.status ?? "")),
    },
    {
      header: "Line total",
      className: "tabular-nums",
      cell: (row) => {
        const total = stockLineTotalETB(row, lookup, statusLookup);
        return total == null ? "—" : formatPrintEtbLabel(total);
      },
    },
  ];

  const summaryRows: AuditPrintSummaryRow[] = [
    { label: "Stock movement lines", value: String(rows.length) },
    {
      label: "Priced movement lines",
      value: String(pricedLines),
    },
    {
      label: "Stock movement account total",
      value: formatPrintEtbLabel(movementTotal),
      emphasis: true,
    },
    {
      label: "Report grand total",
      value: formatPrintEtbLabel(movementTotal),
      grand: true,
    },
  ];

  return {
    columns,
    summaryRows,
    filterLines: requestStatusFilterSummaryLines(
      filters,
      filteredCount,
      totalCount,
    ),
    eyebrow: "Stock movement",
    title: "Stock movement status report",
    documentTitle: "Stock_Movement_Status",
  };
}

export function buildInventoryListPrintConfig(
  rows: ItemRegistration[],
  filters: InventoryListFilters,
  filteredCount: number,
  totalCount: number,
) {
  let grandTotal = 0;
  for (const row of rows) {
    grandTotal += lineOwedETB(row);
  }

  const columns: AuditPrintColumn<ItemRegistration>[] = [
    { header: "Voucher", cell: (row) => rowVoucher(row) },
    {
      header: "Registered",
      cell: (row) => formatPrintDateTime(row.registrationDate),
    },
    { header: "Item", cell: (row) => row.name },
    { header: "Category", cell: (row) => row.category || "—" },
    {
      header: "Qty",
      className: "tabular-nums",
      cell: (row) => String(row.amount),
    },
    { header: "Unit", cell: (row) => row.measuredBy || "—" },
    {
      header: "Unit price",
      className: "tabular-nums",
      cell: (row) => formatPrintEtbLabel(Number(row.unitPrice) || 0),
    },
    {
      header: "Total",
      className: "tabular-nums",
      cell: (row) => formatPrintEtbLabel(lineOwedETB(row)),
    },
    { header: "Supplier", cell: (row) => row.supplierName || "—" },
    {
      header: "Department",
      cell: (row) =>
        row.receivedByDepartment
          ? departmentLabel(row.receivedByDepartment)
          : "—",
    },
  ];

  const summaryRows: AuditPrintSummaryRow[] = [
    { label: "Inventory lines", value: String(rows.length) },
    {
      label: "Inventory value total",
      value: formatPrintEtbLabel(grandTotal),
      emphasis: true,
    },
    {
      label: "Report grand total",
      value: formatPrintEtbLabel(grandTotal),
      grand: true,
    },
  ];

  return {
    columns,
    summaryRows,
    filterLines: inventoryFilterSummaryLines(
      filters,
      filteredCount,
      totalCount,
    ),
    eyebrow: "Active inventory",
    title: "Master inventory report",
    documentTitle: "Master_Inventory",
  };
}

export function printDocumentTitle(
  prefix: string,
  propertyName: string,
): string {
  const property = (propertyName || "Property").trim() || "Property";
  return `${prefix}_${property.replace(/\s+/g, "_")}`;
}
