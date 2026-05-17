"use client";

import { useMemo, useState } from "react";
import type { StockOutRequestRow } from "@/lib/actions";
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
import {
  FilterChipGroup,
  ListPanelFilterBar,
} from "@/components/hotel/ListPanelFilterBar";

const STOCK_APPROVAL_OPTIONS: { id: StockApprovalFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
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

function buildColumns(showRequestedBy: boolean): ColumnDef<StockOutRequestRow>[] {
  const cols: ColumnDef<StockOutRequestRow>[] = [
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
}

export function StockMovementStatusPanel({
  rows,
  title = "Stock movement status",
  description,
  showRequestedBy = false,
}: {
  rows: StockOutRequestRow[];
  title?: string;
  description?: string;
  showRequestedBy?: boolean;
}) {
  const [approvalFilter, setApprovalFilter] = useState<StockApprovalFilter>("all");

  const filtered = useMemo(() => {
    return [...rows]
      .filter((r) => matchesStockApprovalFilter(r, approvalFilter))
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
            Stock out, wastage, and return-to-supplier requests with current
            approval status.
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
          options={STOCK_APPROVAL_OPTIONS}
        />
      </ListPanelFilterBar>

      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable
          columns={buildColumns(showRequestedBy)}
          data={filtered}
          hideToolbar
          searchColumnId="itemName"
          emptyMessage="No stock movement requests match these filters."
        />
      </div>
    </div>
  );
}
