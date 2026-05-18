"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { PurchaseRequestRow } from "@/lib/actions";
import {
  formatPurchaseRejectorLine,
  formatPurchaseStatus,
  formatQtyWithUnit,
} from "@/lib/hotelDisplayLabels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buildVoucherColumn } from "@/lib/dataTableColumns/voucherColumn";

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

/** Store user's own purchase requests (status tab). */
export function buildStoreMyPurchaseColumns(): ColumnDef<PurchaseRequestRow>[] {
  return [
    buildVoucherColumn<PurchaseRequestRow>(),
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
        <span className="tabular-nums whitespace-nowrap text-muted-foreground">
          {formatQtyWithUnit(row.original.quantity, row.original.measuredBy)}
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
      header: () => <span className="min-w-[140px]">Rejection / reason</span>,
      cell: ({ row }) => {
        const r = row.original;
        if (r.status !== "REJECTED_CC" && r.status !== "REJECTED_FINANCE") {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="text-xs text-muted-foreground max-w-[220px] space-y-0.5">
            <span className="block text-foreground font-medium">
              {formatPurchaseRejectorLine(r)}
            </span>
            {r.rejectionReason?.trim() ? (
              <span className="block italic">{r.rejectionReason.trim()}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "updated",
      header: () => <span className="block text-right w-full">Last update</span>,
      cell: ({ row }) => (
        <span className="block text-right text-xs text-muted-foreground whitespace-nowrap tabular-nums">
          {formatWhen(
            row.original.financeApprovedAt ??
              row.original.ccApprovedAt ??
              row.original.createdAt,
          )}
        </span>
      ),
    },
  ];
}

/** Dashboard “recent purchases” — item, status, store user, when. */
export function buildPurchaseRequestDashboardColumns(): ColumnDef<PurchaseRequestRow>[] {
  return [
    buildVoucherColumn<PurchaseRequestRow>(),
    {
      accessorKey: "itemName",
      header: "Item",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.itemName}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => formatPurchaseStatus(row.original.status),
    },
    {
      accessorKey: "storeUserName",
      header: "Store user",
    },
    {
      id: "when",
      header: "When",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.original.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];
}

/** Full purchase report — all approval columns. */
export function buildPurchaseRequestReportColumns(): ColumnDef<PurchaseRequestRow>[] {
  return [
    buildVoucherColumn<PurchaseRequestRow>(),
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
        <span className="tabular-nums whitespace-nowrap">
          {formatQtyWithUnit(row.original.quantity, row.original.measuredBy)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => formatPurchaseStatus(row.original.status),
    },
    {
      id: "ccBy",
      header: "CC by",
      cell: ({ row }) => row.original.ccActorName ?? "—",
    },
    {
      id: "finance",
      header: "Finance",
      cell: ({ row }) => row.original.financeActorName ?? "—",
    },
    {
      id: "rejection",
      header: () => <span className="min-w-[140px]">Rejection / reason</span>,
      cell: ({ row }) => {
        const p = row.original;
        if (p.status === "REJECTED_CC" || p.status === "REJECTED_FINANCE") {
          return (
            <div className="text-xs text-muted-foreground max-w-[220px] space-y-0.5">
              <span className="block text-foreground font-medium">
                {formatPurchaseRejectorLine(p)}
              </span>
              {p.rejectionReason?.trim() ? (
                <span className="block italic">{p.rejectionReason.trim()}</span>
              ) : null}
            </div>
          );
        }
        return "—";
      },
    },
    {
      id: "created",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];
}
