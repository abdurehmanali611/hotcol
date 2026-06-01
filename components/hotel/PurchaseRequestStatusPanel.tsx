"use client";

import { useMemo, useState } from "react";
import type { PurchaseRequestRow } from "@/lib/actions";
import { DataTable } from "@/app/StoreItems/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
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
import { Send } from "lucide-react";
import {
  FilterChipGroup,
} from "@/components/hotel/ListPanelFilterBar";
import { RequestStatusFilterBar } from "@/components/hotel/RequestStatusFilterBar";
import { PurchaseRequestUnitPriceRevisions } from "@/components/hotel/PurchaseRequestUnitPriceRevisions";
import { buildVoucherColumn } from "@/lib/dataTableColumns/voucherColumn";
import {
  FIFO_TABLE_SORT,
  requestFifoTimestamp,
  sortRowsByFifo,
} from "@/lib/requestOrdering";
import { applyRequestStatusFilters } from "@/lib/requestStatusFilters";
import { canPrintPurchaseRequestFromStatus } from "@/lib/hotelApproval";
import { buildPurchaseRequestReceiptBundleForStatus } from "@/lib/receiptGrouping";
import { buildRequestStatusReceiptColumn } from "@/components/hotel/requestStatusReceiptColumn";
import { useRequestReceiptPreview } from "@/components/hotel/useRequestReceiptPreview";
import { RequestStatusBulkPrintActions } from "@/components/hotel/RequestStatusBulkPrintSheet";
import { purchasePrintBundlesFromFiltered } from "@/lib/requestStatusPrintBundles";
import {
  formatEtbAmount,
  purchaseLineMoneyBreakdown,
  purchaseVatModeLabel,
} from "@/lib/inventoryLineTotals";

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
}) {
  const [approvalFilter, setApprovalFilter] =
    useState<PurchaseApprovalFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [voucherFrom, setVoucherFrom] = useState("");
  const [voucherTo, setVoucherTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { openPreview, ReceiptPreviewDialog } = useRequestReceiptPreview({
      propertyName,
      propertyTin,
      logoUrl,
    });

  const filtered = useMemo(() => {
    return sortRowsByFifo(
      applyRequestStatusFilters(rows, {
        matchesApproval: (r) =>
          matchesPurchaseApprovalFilter(r, approvalFilter),
        dateFrom,
        dateTo,
        voucherFrom,
        voucherTo,
        getSubmittedDate: (r) => r.createdAt,
        searchQuery,
      }),
    );
  }, [rows, approvalFilter, dateFrom, dateTo, voucherFrom, voucherTo, searchQuery]);

  const printBundles = useMemo(
    () => purchasePrintBundlesFromFiltered(filtered, rows),
    [filtered, rows],
  );

  const hasActiveFilters =
    approvalFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    voucherFrom.trim() !== "" ||
    voucherTo.trim() !== "" ||
    searchQuery.trim() !== "";

  const clearFilters = () => {
    setApprovalFilter("all");
    setDateFrom("");
    setDateTo("");
    setVoucherFrom("");
    setVoucherTo("");
    setSearchQuery("");
  };

  const columns = useMemo((): ColumnDef<PurchaseRequestRow>[] => {
    const cols: ColumnDef<PurchaseRequestRow>[] = [
      buildVoucherColumn<PurchaseRequestRow>(),
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
  }, [rows, showStoreUser, openPreview]);

  return (
    <div className="space-y-4">
      {ReceiptPreviewDialog}
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
            Filter by date, voucher range, or search — then print all authorized
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
        voucherFrom={voucherFrom}
        voucherTo={voucherTo}
        onVoucherFromChange={setVoucherFrom}
        onVoucherToChange={setVoucherTo}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        showClear={hasActiveFilters}
        onClear={clearFilters}
        footer={
          <RequestStatusBulkPrintActions
            bundles={printBundles}
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
