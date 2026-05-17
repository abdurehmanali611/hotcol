"use client";

import { useMemo } from "react";
import type { PurchaseRequestRow } from "@/lib/actions";
import { DataTable } from "@/app/StoreItems/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  formatPurchaseRejectorLine,
  formatPurchaseStatus,
  formatQtyWithUnit,
} from "@/lib/hotelDisplayLabels";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Send } from "lucide-react";

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

const columns: ColumnDef<PurchaseRequestRow>[] = [
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
            <p className="italic text-muted-foreground">{r.rejectionReason.trim()}</p>
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

export function PurchaseRequestStatusPanel({
  rows,
}: {
  rows: PurchaseRequestRow[];
}) {
  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [rows],
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/80 bg-card/95 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Purchase request status
          </CardTitle>
          <CardDescription>
            {sorted.length} purchase request{sorted.length !== 1 ? "s" : ""}{" "}
            submitted under your store login.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground pb-4">
          Track Cost Control and Finance approval for items you requested to buy.
        </CardContent>
      </Card>
      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable columns={columns} data={sorted} />
      </div>
    </div>
  );
}
