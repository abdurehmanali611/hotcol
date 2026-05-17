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
  ListPanelFilterBar,
} from "@/components/hotel/ListPanelFilterBar";

const PURCHASE_APPROVAL_OPTIONS: { id: PurchaseApprovalFilter; label: string }[] =
  [
    { id: "all", label: "All" },
    { id: "pending", label: "Awaiting approval" },
    { id: "pending_cc", label: "Pending CC" },
    { id: "pending_finance", label: "Pending finance" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ];

function purchaseBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "REJECTED_CC" || status === "REJECTED_FINANCE")
    return "destructive";
  if (status === "APPROVED_FINANCE") return "default";
  return "secondary";
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildColumns(showStoreUser: boolean): ColumnDef<PurchaseRequestRow>[] {
  const cols: ColumnDef<PurchaseRequestRow>[] = [
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
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={purchaseBadgeVariant(row.original.status)}
          className={cn(
            "font-normal",
            row.original.status === "APPROVED_FINANCE" &&
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
}

export function PurchaseRequestStatusPanel({
  rows,
  title = "Purchase request status",
  description,
  showStoreUser = false,
}: {
  rows: PurchaseRequestRow[];
  title?: string;
  description?: string;
  showStoreUser?: boolean;
}) {
  const [approvalFilter, setApprovalFilter] =
    useState<PurchaseApprovalFilter>("all");

  const filtered = useMemo(() => {
    return [...rows]
      .filter((r) => matchesPurchaseApprovalFilter(r, approvalFilter))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [rows, approvalFilter]);

  const hasActiveFilters = approvalFilter !== "all";

  return (
    <div className="space-y-4">
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
          </CardContent>
        ) : null}
      </Card>

      <ListPanelFilterBar
        showClear={hasActiveFilters}
        onClear={() => setApprovalFilter("all")}
      >
        <FilterChipGroup
          label="Approval status"
          value={approvalFilter}
          onChange={setApprovalFilter}
          options={PURCHASE_APPROVAL_OPTIONS}
        />
      </ListPanelFilterBar>

      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable
          columns={buildColumns(showStoreUser)}
          data={filtered}
          hideToolbar
          searchColumnId="itemName"
          emptyMessage="No purchase requests match these filters."
        />
      </div>
    </div>
  );
}
