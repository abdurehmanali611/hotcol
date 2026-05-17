"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { StockOutRequestRow } from "@/lib/actions";
import {
  formatMovementType,
  formatQtyWithUnit,
  formatStockMovementRejectorLine,
  formatStockOutRequestStatus,
} from "@/lib/hotelDisplayLabels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

/** Store user's own stock / wastage / return requests. */
export function buildStoreMyStockColumns(): ColumnDef<StockOutRequestRow>[] {
  return [
    {
      accessorKey: "itemName",
      header: "Item",
      cell: ({ row }) => (
        <span className="font-medium max-w-[220px] truncate block">
          {row.original.itemName?.trim()
            ? row.original.itemName
            : "Unknown item (saved name missing)"}
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
        <span className="tabular-nums whitespace-nowrap text-muted-foreground">
          {formatQtyWithUnit(row.original.amount, "")}
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
      header: () => <span className="min-w-[140px]">Rejection / reason</span>,
      cell: ({ row }) => {
        const r = row.original;
        if (r.status !== "REJECTED") {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="text-xs text-muted-foreground max-w-[220px] space-y-0.5">
            <span className="block text-foreground font-medium">
              {formatStockMovementRejectorLine(r)}
            </span>
            {r.rejectionReason?.trim() ? (
              <span className="block italic">{r.rejectionReason.trim()}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "when",
      header: () => <span className="block text-right w-full">When</span>,
      cell: ({ row }) => (
        <span className="block text-right text-xs text-muted-foreground whitespace-nowrap tabular-nums">
          {formatWhen(row.original.decidedAt ?? row.original.createdAt)}
        </span>
      ),
    },
  ];
}

/** Dashboard “recent stock-out” — item, type, quantity, status. */
export function buildStockMovementDashboardColumns(
  resolveMeasuredBy: (itemRegistrationId: number) => string,
): ColumnDef<StockOutRequestRow>[] {
  return [
    {
      accessorKey: "itemName",
      header: "Item",
      cell: ({ row }) => (
        <span className="font-medium max-w-[220px] truncate block">
          {row.original.itemName?.trim()
            ? row.original.itemName
            : "Unknown item (stock line may have been removed)"}
        </span>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => formatMovementType(row.original.movementType),
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: ({ row }) =>
        formatQtyWithUnit(
          row.original.amount,
          resolveMeasuredBy(row.original.itemRegistrationId) || "units",
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
    },
  ];
}
