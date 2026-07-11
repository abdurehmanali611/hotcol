"use client";

import { useMemo, useState } from "react";
import type { ItemRegistration, PurchaseRequestRow } from "@/lib/actions";
import { DataTable } from "@/app/StoreItems/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  formatItemRegistrationStatus,
  formatQtyWithUnit,
} from "@/lib/hotelDisplayLabels";
import {
  matchesRegistrationApprovalFilter,
  type RegistrationApprovalFilter,
} from "@/lib/panelFilters";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PackagePlus } from "lucide-react";
import { FilterChipGroup } from "@/components/hotel/ListPanelFilterBar";
import { RequestStatusFilterBar } from "@/components/hotel/RequestStatusFilterBar";
import { buildVoucherColumn } from "@/lib/dataTableColumns/voucherColumn";
import {
  FIFO_TABLE_SORT,
  requestFifoTimestamp,
  sortRowsByFifo,
} from "@/lib/requestOrdering";
import { applyRequestStatusFilters } from "@/lib/requestStatusFilters";
import { canPrintItemRegistrationFromStatus } from "@/lib/hotelApproval";
import { buildRegistrationReceiptBundleForStatus } from "@/lib/receiptGrouping";
import { buildRequestStatusReceiptColumn } from "@/components/hotel/requestStatusReceiptColumn";
import { useRequestReceiptPreview } from "@/components/hotel/useRequestReceiptPreview";
import { RequestStatusListPrintActions } from "@/components/hotel/RequestStatusListPrintActions";
import { resolveRequestStatusPrintScope } from "@/lib/requestStatusPrintScope";
import {
  departmentLeaderDisplayLabel,
  REGISTRATION_RECEIVED_BY_CODES,
} from "@/lib/departments";
import { useDepartmentLeaderSelectOptions } from "@/hooks/useDepartmentLeaderSelectOptions";

const REG_APPROVAL_OPTIONS: {
  id: RegistrationApprovalFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Awaiting approval" },
  { id: "pending_store", label: "Store review" },
  { id: "pending_cc", label: "Pending CC" },
  { id: "pending_finance", label: "Pending finance" },
  { id: "pending_manager", label: "Pending manager" },
  { id: "authorized", label: "Authorized" },
  { id: "rejected", label: "Rejected" },
];

function regBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const s = String(status || "").trim().toUpperCase();
  if (s.startsWith("REJECTED") || s === "VOID") return "destructive";
  if (s === "AUTHORIZED" || !s) return "default";
  return "secondary";
}

function formatWhen(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ItemRegistrationStatusPanel({
  rows,
  purchaseRequests = [],
  title = "Item registration status",
  description,
  showRegisteredBy = false,
  propertyName = "Property",
  propertyTin,
  logoUrl,
}: {
  rows: ItemRegistration[];
  purchaseRequests?: PurchaseRequestRow[];
  title?: string;
  description?: string;
  showRegisteredBy?: boolean;
  propertyName?: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
}) {
  const [approvalFilter, setApprovalFilter] =
    useState<RegistrationApprovalFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [voucherFrom, setVoucherFrom] = useState("");
  const [voucherTo, setVoucherTo] = useState("");
  const [department, setDepartment] = useState("");

  const { openPreview, ReceiptPreviewDialog } = useRequestReceiptPreview({
      propertyName,
      propertyTin,
      logoUrl,
    });

  const { options: departmentOptions } = useDepartmentLeaderSelectOptions(
    REGISTRATION_RECEIVED_BY_CODES,
  );

  const filtered = useMemo(() => {
    return sortRowsByFifo(
      applyRequestStatusFilters(rows, {
        matchesApproval: (r) =>
          matchesRegistrationApprovalFilter(r, approvalFilter),
        dateFrom,
        dateTo,
        voucherFrom,
        voucherTo,
        getSubmittedDate: (r) => r.registrationDate,
        department,
        getDepartment: (r) => r.receivedByDepartment,
        getLeaderName: (r) => r.receivedByLeaderName,
      }),
    );
  }, [rows, approvalFilter, dateFrom, dateTo, voucherFrom, voucherTo, department]);

  const hasActiveFilters =
    approvalFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    voucherFrom.trim() !== "" ||
    voucherTo.trim() !== "" ||
    department.trim() !== "";

  const printScope = useMemo(
    () =>
      resolveRequestStatusPrintScope(rows, filtered, hasActiveFilters, {
        dateFrom,
        dateTo,
        dateFromLabel: "Registered from",
        dateToLabel: "Registered to",
        department,
        departmentLabelText: "Received by department",
        voucherFrom,
        voucherTo,
        approvalLabel:
          REG_APPROVAL_OPTIONS.find((o) => o.id === approvalFilter)?.label ??
          "All",
      }),
    [
      rows,
      filtered,
      hasActiveFilters,
      dateFrom,
      dateTo,
      department,
      voucherFrom,
      voucherTo,
      approvalFilter,
    ],
  );

  const clearFilters = () => {
    setApprovalFilter("all");
    setDateFrom("");
    setDateTo("");
    setVoucherFrom("");
    setVoucherTo("");
    setDepartment("");
  };

  const columns = useMemo((): ColumnDef<ItemRegistration>[] => {
    const cols: ColumnDef<ItemRegistration>[] = [
      buildVoucherColumn<ItemRegistration>(),
      {
        id: "submitted",
        header: "Registered",
        accessorFn: (row) => requestFifoTimestamp(row),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
            {formatWhen(row.original.registrationDate)}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Item",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "quantity",
        header: "Quantity",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground whitespace-nowrap">
            {formatQtyWithUnit(row.original.amount, row.original.measuredBy)}
          </span>
        ),
      },
      {
        accessorKey: "supplierName",
        header: "Supplier",
        cell: ({ row }) => (
          <span className="text-sm max-w-[140px] truncate block">
            {row.original.supplierName || "—"}
          </span>
        ),
      },
      {
        id: "receivedBy",
        header: "Received by",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {departmentLeaderDisplayLabel(row.original) || "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={regBadgeVariant(row.original.approvalStatus ?? "")}
            className={cn(
              "font-normal",
              (row.original.approvalStatus === "AUTHORIZED" ||
                !String(row.original.approvalStatus ?? "").trim()) &&
                "bg-emerald-600/90 hover:bg-emerald-600/90",
            )}
          >
            {formatItemRegistrationStatus(row.original.approvalStatus ?? "")}
          </Badge>
        ),
      },
      buildRequestStatusReceiptColumn({
        pool: rows,
        canPrintRow: (r) =>
          canPrintItemRegistrationFromStatus(r.approvalStatus),
        buildBundle: (r, pool) =>
          buildRegistrationReceiptBundleForStatus(r, pool, purchaseRequests),
        openPreview,
      }),
    ];
    if (showRegisteredBy) {
      cols.splice(1, 0, {
        accessorKey: "statusBy",
        header: "Registered by",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.statusBy || "—"}
          </span>
        ),
      });
    }
    return cols;
  }, [rows, showRegisteredBy, purchaseRequests, openPreview]);

  return (
    <div className="space-y-4">
      {ReceiptPreviewDialog}
      <Card className="border-border/80 bg-card/95 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {title}
          </CardTitle>
          <CardDescription>
            {description ??
              `${filtered.length} of ${rows.length} registration${rows.length !== 1 ? "s" : ""} shown.`}
          </CardDescription>
        </CardHeader>
        {!description ? (
          <CardContent className="text-sm text-muted-foreground pb-4">
            Item registrations through the approval pipeline. Filter by date,
            voucher range, or department — then print all authorized receipts from
            the filtered results, or open one receipt from the table.
          </CardContent>
        ) : null}
      </Card>

      <RequestStatusFilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        voucherFrom={voucherFrom}
        voucherTo={voucherTo}
        onVoucherFromChange={setVoucherFrom}
        onVoucherToChange={setVoucherTo}
        department={department}
        onDepartmentChange={setDepartment}
        departmentOptions={departmentOptions}
        departmentLabelText="Received by"
        dateFromLabel="Registered from"
        dateToLabel="Registered to"
        filteredCount={filtered.length}
        totalCount={rows.length}
        helperText={
          department
            ? "Showing registrations for the selected department leader."
            : "Filter by registration date, voucher range, and receiving department leader."
        }
        showClear={hasActiveFilters}
        onClear={clearFilters}
        printAction={
          <RequestStatusListPrintActions
            variant="registration"
            rows={printScope.rows}
            filters={printScope.filters}
            filteredCount={printScope.filteredCount}
            totalCount={printScope.totalCount}
            propertyName={propertyName}
            propertyTin={propertyTin}
            logoUrl={logoUrl}
          />
        }
      >
        <FilterChipGroup
          label="Approval status"
          value={approvalFilter}
          onChange={setApprovalFilter}
          options={REG_APPROVAL_OPTIONS}
        />
      </RequestStatusFilterBar>

      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          hideToolbar
          initialSorting={FIFO_TABLE_SORT}
          emptyMessage="No item registrations match these filters."
        />
      </div>
    </div>
  );
}
