"use client";

import { useMemo, useState } from "react";
import type { PurchaseRequestRow } from "@/lib/actions";
import { deletePurchaseRequestApi, notifyApiFailure } from "@/lib/actions";
import { DataTable } from "@/app/StoreItems/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PendingButton } from "@/components/ui/pending-button";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { PurchaseReviewEditDialog } from "@/components/hotel/PurchaseReviewEditDialog";
import {
  canManageAuthorizedPurchaseRequest,
  canPrintPurchaseRequestFromStatus,
} from "@/lib/hotelApproval";
import {
  formatPurchaseRejectorLine,
  formatPurchaseStatus,
  formatQtyWithUnit,
} from "@/lib/hotelDisplayLabels";
import {
  matchesPurchaseApprovalFilter,
  type PurchaseApprovalFilter,
} from "@/lib/panelFilters";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Send, Pencil, Trash2 } from "lucide-react";
import {
  FilterChipGroup,
} from "@/components/hotel/ListPanelFilterBar";
import { RequestStatusFilterBar } from "@/components/hotel/RequestStatusFilterBar";
import { PurchaseRequestUnitPriceRevisions } from "@/components/hotel/PurchaseRequestUnitPriceRevisions";
import { buildVoucherColumn } from "@/lib/dataTableColumns/voucherColumn";
import { FIFO_TABLE_SORT, sortRowsByFifo } from "@/lib/requestOrdering";
import { purchaseEntranceDate } from "@/lib/purchaseRequestDates";
import { buildPurchaseEntranceDateColumn } from "@/lib/dataTableColumns/purchaseRequests";
import { applyRequestStatusFilters } from "@/lib/requestStatusFilters";
import { buildPurchaseRequestReceiptBundleForStatus } from "@/lib/receiptGrouping";
import { buildRequestStatusReceiptColumn } from "@/components/hotel/requestStatusReceiptColumn";
import { useRequestReceiptPreview } from "@/components/hotel/useRequestReceiptPreview";
import {
  departmentLeaderDisplayLabel,
  mergeAccountabilityFilterOptions,
  PURCHASE_REQUESTED_BY_DEPARTMENT_CODES,
} from "@/lib/departments";
import { useDepartmentLeaderSelectOptions } from "@/hooks/useDepartmentLeaderSelectOptions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { RequestStatusListPrintActions } from "@/components/hotel/RequestStatusListPrintActions";
import { resolveRequestStatusPrintScope } from "@/lib/requestStatusPrintScope";
import { formatEtbAmount, purchaseLineMoneyBreakdown, purchaseVatModeLabel } from "@/lib/inventoryLineTotals";
import { toast } from "sonner";

const PURCHASE_APPROVAL_OPTIONS: { id: PurchaseApprovalFilter; label: string }[] =
  [
    { id: "all", label: "All" },
    { id: "pending", label: "Awaiting approval" },
    { id: "pending_store", label: "Store review" },
    { id: "pending_cc", label: "Pending CC" },
    { id: "pending_finance", label: "Pending finance" },
    { id: "pending_manager", label: "Pending manager" },
    { id: "approved", label: "Authorized" },
    { id: "rejected", label: "Rejected" },
  ];

function purchaseBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "REJECTED_CC" || status === "REJECTED_FINANCE")
    return "destructive";
  if (status === "AUTHORIZED" || status === "APPROVED_FINANCE") return "default";
  return "secondary";
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PurchaseRequestStatusPanel({
  rows,
  title = "Purchase request status",
  description,
  showStoreUser = false,
  unitPriceRole,
  onRefresh,
  propertyName = "Property",
  propertyTin,
  logoUrl,
  allowAuthorizedEditDelete = false,
}: {
  rows: PurchaseRequestRow[];
  title?: string;
  description?: string;
  showStoreUser?: boolean;
  unitPriceRole?: "Store" | "CostControl" | "Finance" | "Manager";
  onRefresh?: () => void;
  propertyName?: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  /** Manager: edit/delete authorized purchase lines (like master inventory). */
  allowAuthorizedEditDelete?: boolean;
}) {
  const { isPending, run } = useConcurrentActions();
  const [editRow, setEditRow] = useState<PurchaseRequestRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<PurchaseRequestRow | null>(null);
  const [approvalFilter, setApprovalFilter] =
    useState<PurchaseApprovalFilter>("all");
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
    PURCHASE_REQUESTED_BY_DEPARTMENT_CODES,
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
        matchesApproval: (r) =>
          matchesPurchaseApprovalFilter(r, approvalFilter),
        dateFrom,
        dateTo,
        voucherFrom,
        voucherTo,
        getSubmittedDate: (r) => purchaseEntranceDate(r),
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
        dateFromLabel: "Entrance from",
        dateToLabel: "Entrance to",
        department,
        departmentLabelText: "Requested by department",
        voucherFrom,
        voucherTo,
        approvalLabel:
          PURCHASE_APPROVAL_OPTIONS.find((o) => o.id === approvalFilter)
            ?.label ?? "All",
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

  const columns = useMemo((): ColumnDef<PurchaseRequestRow>[] => {
    const cols: ColumnDef<PurchaseRequestRow>[] = [
      buildVoucherColumn<PurchaseRequestRow>(),
      buildPurchaseEntranceDateColumn(),
      {
        accessorKey: "itemName",
        header: "Item",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.itemName}</span>
        ),
      },
      {
        id: "quantity",
        header: "Quantity",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground whitespace-nowrap">
            {formatQtyWithUnit(row.original.quantity, row.original.measuredBy)}
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
        id: "deptLeader",
        header: "Requested by (dept)",
        cell: ({ row }) => (
          <span className="text-sm max-w-[180px] truncate block">
            {departmentLeaderDisplayLabel(row.original) || "—"}
          </span>
        ),
      },
      {
        id: "vatMode",
        header: "VAT",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal">
            {purchaseVatModeLabel(row.original.purchaseWithVat)}
          </Badge>
        ),
      },
      {
        id: "lineTotal",
        header: "Line total",
        cell: ({ row }) => {
          const { subtotalETB, vatETB, totalETB, withVat } =
            purchaseLineMoneyBreakdown(row.original);
          return (
            <div className="text-sm tabular-nums whitespace-nowrap">
              <p className="font-medium">{formatEtbAmount(totalETB)}</p>
              {withVat ? (
                <p className="text-[11px] text-muted-foreground">
                  {formatEtbAmount(subtotalETB)} + VAT {formatEtbAmount(vatETB)}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={purchaseBadgeVariant(row.original.status)}
            className={cn(
              "font-normal",
              (row.original.status === "AUTHORIZED" ||
                row.original.status === "APPROVED_FINANCE") &&
                "bg-emerald-600/90 hover:bg-emerald-600/90",
            )}
          >
            {formatPurchaseStatus(row.original.status)}
          </Badge>
        ),
      },
      {
        id: "rejection",
        header: "Rejection / reason",
        cell: ({ row }) => {
          const r = row.original;
          if (r.status !== "REJECTED_CC" && r.status !== "REJECTED_FINANCE") {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <div className="text-xs max-w-[200px] space-y-0.5">
              <p className="font-medium">{formatPurchaseRejectorLine(r)}</p>
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
        id: "updated",
        header: "Last update",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
            {formatWhen(
              row.original.financeApprovedAt ??
                row.original.ccApprovedAt ??
                row.original.createdAt,
            )}
          </span>
        ),
      },
      buildRequestStatusReceiptColumn({
        pool: rows,
        canPrintRow: (r) => canPrintPurchaseRequestFromStatus(r.status),
        buildBundle: (r, pool) =>
          buildPurchaseRequestReceiptBundleForStatus(r, pool),
        openPreview,
      }),
    ];
    if (allowAuthorizedEditDelete) {
      cols.push({
        id: "manage",
        header: () => (
          <span className="text-muted-foreground text-xs font-medium">Manage</span>
        ),
        enableHiding: false,
        cell: ({ row }) => {
          if (!canManageAuthorizedPurchaseRequest(row.original.status)) {
            return <span className="text-muted-foreground text-xs">—</span>;
          }
          return (
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => setEditRow(row.original)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteRow(row.original)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          );
        },
      });
    }
    if (showStoreUser) {
      cols.splice(1, 0, {
        accessorKey: "storeUserName",
        header: "Store user",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.storeUserName || "—"}
          </span>
        ),
      });
    }
    return cols;
  }, [rows, showStoreUser, openPreview, allowAuthorizedEditDelete]);

  const handleDeleteAuthorized = () => {
    if (!deleteRow) return;
    const id = deleteRow.id;
    void run(`delete-pr-${id}`, async () => {
      try {
        await deletePurchaseRequestApi(id);
        toast.success("Purchase request removed");
        setDeleteRow(null);
        onRefresh?.();
      } catch (e) {
        notifyApiFailure(e, "Could not delete purchase request");
      }
    });
  };

  return (
    <div className="space-y-4">
      {ReceiptPreviewDialog}
      <PurchaseReviewEditDialog
        row={editRow}
        open={editRow != null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
        variant="authorized"
        onSaved={() => {
          setEditRow(null);
          onRefresh?.();
        }}
        isPending={isPending}
        run={run}
      />
      <AlertDialog
        open={deleteRow != null}
        onOpenChange={(open) => {
          if (!open) setDeleteRow(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete authorized purchase request?</AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
              {deleteRow ? (
                <>
                  Remove <span className="font-medium">{deleteRow.itemName}</span>{" "}
                  from authorized purchase records. This cannot be undone. Deletion is
                  blocked if stock has already been received against this voucher.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending(`delete-pr-${deleteRow?.id ?? 0}`)}>
              Keep
            </AlertDialogCancel>
            <PendingButton
              variant="destructive"
              pending={isPending(`delete-pr-${deleteRow?.id ?? 0}`)}
              onClick={handleDeleteAuthorized}
            >
              Delete
            </PendingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card className="border-border/80 bg-card/95 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>
            {description ??
              `${filtered.length} of ${rows.length} purchase request${rows.length !== 1 ? "s" : ""} shown.`}
          </CardDescription>
        </CardHeader>
        {!description ? (
          <CardContent className="text-sm text-muted-foreground pb-4">
            Track Cost Control and Finance approval through the pipeline.
            Filter by date, voucher range, or department — then print all authorized
            receipts from the filtered results.
          </CardContent>
        ) : null}
      </Card>

      {unitPriceRole && onRefresh ? (
        <PurchaseRequestUnitPriceRevisions
          rows={rows}
          role={unitPriceRole}
          onRefresh={onRefresh}
        />
      ) : null}

      <RequestStatusFilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        dateFromLabel="Entrance from"
        dateToLabel="Entrance to"
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
            ? "Showing purchase requests for the selected department leader."
            : "Filter by entrance date, voucher range, and requesting department leader."
        }
        showClear={hasActiveFilters}
        onClear={clearFilters}
        printAction={
          <RequestStatusListPrintActions
            variant="purchase"
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
          options={PURCHASE_APPROVAL_OPTIONS}
        />
      </RequestStatusFilterBar>

      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          hideToolbar
          initialSorting={FIFO_TABLE_SORT}
          emptyMessage="No purchase requests match these filters."
        />
      </div>
    </div>
  );
}
