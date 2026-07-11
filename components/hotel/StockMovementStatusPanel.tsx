"use client";

import { useMemo, useState } from "react";
import type {
  FreshBazaarRow,
  ItemRegistration,
  ItemStatus,
  StockOutRequestRow,
} from "@/lib/actions";
import { DataTable } from "@/app/StoreItems/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  formatMovementType,
  formatQtyWithUnit,
  formatStockMovementRejectorLine,
  formatStockOutRequestStatus,
} from "@/lib/hotelDisplayLabels";
import {
  matchesStockApprovalFilter,
  type StockApprovalFilter,
} from "@/lib/panelFilters";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package } from "lucide-react";
import { FilterChipGroup } from "@/components/hotel/ListPanelFilterBar";
import { RequestStatusFilterBar } from "@/components/hotel/RequestStatusFilterBar";
import { buildVoucherColumn } from "@/lib/dataTableColumns/voucherColumn";
import {
  FIFO_TABLE_SORT,
  requestFifoTimestamp,
  sortRowsByFifo,
} from "@/lib/requestOrdering";
import { applyRequestStatusFilters } from "@/lib/requestStatusFilters";
import { canPrintStockMovementFromStatus } from "@/lib/hotelApproval";
import { buildStockMovementReceiptBundleForStatus } from "@/lib/receiptGrouping";
import { buildRequestStatusReceiptColumn } from "@/components/hotel/requestStatusReceiptColumn";
import { useRequestReceiptPreview } from "@/components/hotel/useRequestReceiptPreview";
import { RequestStatusListPrintActions } from "@/components/hotel/RequestStatusListPrintActions";
import { resolveRequestStatusPrintScope } from "@/lib/requestStatusPrintScope";
import {
  departmentLeaderDisplayLabel,
  mergeAccountabilityFilterOptions,
  REQUESTED_BY_DEPARTMENT_CODES,
} from "@/lib/departments";
import { useDepartmentLeaderSelectOptions } from "@/hooks/useDepartmentLeaderSelectOptions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";

const STOCK_APPROVAL_OPTIONS: { id: StockApprovalFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "pending_store", label: "Store review" },
  { id: "pending_cc", label: "Pending CC" },
  { id: "pending_finance", label: "Pending finance" },
  { id: "pending_manager", label: "Pending manager" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

function stockBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "REJECTED") return "destructive";
  if (status === "APPROVED") return "default";
  return "secondary";
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function StockMovementStatusPanel({
  rows,
  title = "Stock movement status",
  description,
  showRequestedBy = false,
  propertyName = "Property",
  propertyTin,
  logoUrl,
  linkedInventory = [],
  itemStatusHistory = [],
  freshBazaarArchives = [],
}: {
  rows: StockOutRequestRow[];
  title?: string;
  description?: string;
  showRequestedBy?: boolean;
  propertyName?: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  linkedInventory?: ItemRegistration[];
  itemStatusHistory?: ItemStatus[];
  freshBazaarArchives?: FreshBazaarRow[];
}) {
  const [approvalFilter, setApprovalFilter] = useState<StockApprovalFilter>("all");
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

  const { options: registryDeptOptions } = useDepartmentLeaderSelectOptions(
    REQUESTED_BY_DEPARTMENT_CODES,
  );
  const departmentOptions = useMemo(
    () =>
      mergeAccountabilityFilterOptions(
        registryDeptOptions,
        rows
          .filter((r) => rowHotelMatchesTenantScope(r.HotelName, null))
          .map((r) => ({
            department: r.requestedByDepartment,
            leaderName: r.requestedByLeaderName,
          })),
      ),
    [registryDeptOptions, rows],
  );

  const filtered = useMemo(() => {
    return sortRowsByFifo(
      applyRequestStatusFilters(rows, {
        matchesApproval: (r) => matchesStockApprovalFilter(r, approvalFilter),
        dateFrom,
        dateTo,
        voucherFrom,
        voucherTo,
        getSubmittedDate: (r) => r.createdAt,
        department,
        getDepartment: (r) => r.requestedByDepartment,
        getLeaderName: (r) => r.requestedByLeaderName,
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
        dateFromLabel: "Submitted from",
        dateToLabel: "Submitted to",
        department,
        departmentLabelText: "Requested by department",
        voucherFrom,
        voucherTo,
        approvalLabel:
          STOCK_APPROVAL_OPTIONS.find((o) => o.id === approvalFilter)?.label ??
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

  const columns = useMemo((): ColumnDef<StockOutRequestRow>[] => {
    const cols: ColumnDef<StockOutRequestRow>[] = [
      buildVoucherColumn<StockOutRequestRow>(),
      {
        id: "submitted",
        header: "Submitted",
        accessorFn: (row) => requestFifoTimestamp(row),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
            {formatWhen(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "itemName",
        header: "Item",
        cell: ({ row }) => (
          <span className="font-medium max-w-[200px] truncate block">
            {row.original.itemName?.trim() || "Unknown item"}
          </span>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal">
            {formatMovementType(row.original.movementType)}
          </Badge>
        ),
      },
      {
        id: "quantity",
        header: "Quantity",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground whitespace-nowrap">
            {formatQtyWithUnit(row.original.amount, "")}
          </span>
        ),
      },
      {
        id: "destination",
        header: "Destination / reason",
        cell: ({ row }) => (
          <span className="text-sm max-w-[160px] truncate block text-muted-foreground">
            {row.original.stakeHolderOrReason?.trim() || "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={stockBadgeVariant(row.original.status)}
            className={cn(
              "font-normal",
              row.original.status === "APPROVED" &&
                "bg-emerald-600/90 hover:bg-emerald-600/90",
            )}
          >
            {formatStockOutRequestStatus(row.original.status)}
          </Badge>
        ),
      },
      {
        id: "rejection",
        header: "Rejection / reason",
        cell: ({ row }) => {
          const r = row.original;
          if (r.status !== "REJECTED") {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <div className="text-xs max-w-[200px] space-y-0.5">
              <p className="font-medium">{formatStockMovementRejectorLine(r)}</p>
              {r.rejectionReason?.trim() ? (
                <p className="italic text-muted-foreground">
                  {r.rejectionReason.trim()}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "when",
        header: "When",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
            {formatWhen(row.original.decidedAt ?? row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "deptLeader",
        header: "Requested by (dept)",
        cell: ({ row }) => (
          <span className="text-sm max-w-[180px] truncate block">
            {departmentLeaderDisplayLabel(row.original) || "—"}
          </span>
        ),
      },
      buildRequestStatusReceiptColumn({
        pool: rows,
        canPrintRow: (r) => canPrintStockMovementFromStatus(r.status),
        buildBundle: (r, pool) =>
          buildStockMovementReceiptBundleForStatus(
            r,
            pool,
            linkedInventory,
            itemStatusHistory,
            freshBazaarArchives,
          ),
        openPreview,
      }),
    ];
    if (showRequestedBy) {
      cols.splice(3, 0, {
        accessorKey: "requestedByUserName",
        header: "Requested by",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.requestedByUserName || "—"}
          </span>
        ),
      });
    }
    return cols;
  }, [rows, showRequestedBy, linkedInventory, itemStatusHistory, freshBazaarArchives, openPreview]);

  return (
    <div className="space-y-4">
      {ReceiptPreviewDialog}
      <Card className="border-border/80 bg-card/95 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            {title}
          </CardTitle>
          <CardDescription>
            {description ??
              `${filtered.length} of ${rows.length} movement request${rows.length !== 1 ? "s" : ""} shown.`}
          </CardDescription>
        </CardHeader>
        {!description ? (
          <CardContent className="text-sm text-muted-foreground pb-4">
            Stock out, wastage, and return requests with approval status.
            Filter by date, voucher range, or department — then print the list
            below the filters.
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
        departmentLabelText="Requested by"
        filteredCount={filtered.length}
        totalCount={rows.length}
        helperText={
          department
            ? "Showing stock movements for the selected department leader."
            : "Filter by submission date, voucher range, and requesting department leader."
        }
        showClear={hasActiveFilters}
        onClear={clearFilters}
        printAction={
          <RequestStatusListPrintActions
            variant="stock"
            rows={printScope.rows}
            linkedInventory={linkedInventory}
            itemStatusHistory={itemStatusHistory}
            freshBazaarArchives={freshBazaarArchives}
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
          options={STOCK_APPROVAL_OPTIONS}
        />
      </RequestStatusFilterBar>

      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          hideToolbar
          initialSorting={FIFO_TABLE_SORT}
          emptyMessage="No stock movement requests match these filters."
        />
      </div>
    </div>
  );
}
