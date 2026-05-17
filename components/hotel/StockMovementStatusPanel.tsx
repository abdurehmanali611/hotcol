"use client";

import { useMemo } from "react";
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
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package } from "lucide-react";

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

const columns: ColumnDef<StockOutRequestRow>[] = [
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
            <p className="italic text-muted-foreground">{r.rejectionReason.trim()}</p>
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

export function StockMovementStatusPanel({
  rows,
}: {
  rows: StockOutRequestRow[];
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
            <Package className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            Stock movement status
          </CardTitle>
          <CardDescription>
            {sorted.length} movement request{sorted.length !== 1 ? "s" : ""}{" "}
            you submitted (stock out, wastage, return to supplier).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground pb-4">
          Pending movements require approval before quantities change in inventory.
        </CardContent>
      </Card>
      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable columns={columns} data={sorted} />
      </div>
    </div>
  );
}
