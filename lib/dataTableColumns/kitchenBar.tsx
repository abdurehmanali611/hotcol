"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type {
  KitchenBarBeginningRow,
  KitchenBarMonthlySnapshotRow,
  StockOutRequestRow,
} from "@/lib/actions";
import {
  displayKitchenBarStation,
  normalizeKitchenBarStationKey,
  summarizeApprovedStockOutForDay,
} from "@/lib/hotelDailyStation";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";

function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export type KitchenBarDerivedMaps = {
  implied: Map<number, number | null>;
  daySales: Map<number, number | null>;
};

export type KitchenBarRollupColumnOptions = {
  syncedHeader?: string;
  formatSyncedAt: (row: KitchenBarMonthlySnapshotRow) => string;
};

export function buildKitchenBarRollupColumns(
  options: KitchenBarRollupColumnOptions,
): ColumnDef<KitchenBarMonthlySnapshotRow>[] {
  const { syncedHeader = "Synced", formatSyncedAt } = options;
  return [
    {
      id: "station",
      header: "Station",
      cell: ({ row }) => displayKitchenBarStation(row.original.station),
    },
    {
      accessorKey: "itemName",
      header: "Item",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.itemName}</span>
      ),
    },
    {
      id: "totalImplied",
      header: () => (
        <span className="block text-right w-full">Σ implied movement</span>
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {Number(row.original.totalImpliedSales).toFixed(2)}
        </span>
      ),
    },
    {
      id: "firstLightsOut",
      header: () => (
        <span className="block text-right w-full">First lights-out on-hand</span>
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {Number(row.original.lastDayClosingOnHand).toFixed(2)}
        </span>
      ),
    },
    {
      id: "remaining",
      header: () => <span className="block text-right w-full">Remaining</span>,
      cell: ({ row }) => {
        const remaining =
          Number(row.original.lastDayClosingOnHand) -
          Number(row.original.totalImpliedSales);
        return (
          <span className="block text-right tabular-nums">
            {remaining.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "synced",
      header: syncedHeader,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatSyncedAt(row.original)}
        </span>
      ),
    },
  ];
}

export type KitchenBarDailyColumnOptions = {
  mode: "manager" | "costControl";
  selectedDayYmd: string;
  derived: KitchenBarDerivedMaps;
  /** Manager: sum approved stock-outs from store requests for the selected day. */
  stockOutRowsForProperty?: StockOutRequestRow[];
  onEdit?: (row: KitchenBarBeginningRow) => void;
  onDelete?: (row: KitchenBarBeginningRow) => void;
  deletePendingId?: number | null;
};

export function buildKitchenBarDailyColumns(
  options: KitchenBarDailyColumnOptions,
): ColumnDef<KitchenBarBeginningRow>[] {
  const {
    mode,
    selectedDayYmd,
    derived,
    stockOutRowsForProperty = [],
    onEdit,
    onDelete,
    deletePendingId = null,
  } = options;

  const cols: ColumnDef<KitchenBarBeginningRow>[] = [
    {
      id: "date",
      header: "Date",
      cell: ({ row }) => {
        const b = row.original;
        const dayYmd = String(selectedDayYmd || "").slice(0, 10);
        const displayDate =
          String(b.calendarDate || "").slice(0, 10) ||
          (b.monthPeriod ? `${b.monthPeriod}-01` : dayYmd);
        return (
          <span className="tabular-nums whitespace-nowrap">{displayDate}</span>
        );
      },
    },
    {
      id: "station",
      header: "Station",
      cell: ({ row }) => displayKitchenBarStation(row.original.station),
    },
    {
      accessorKey: "itemName",
      header: "Item",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.itemName}</span>
      ),
    },
    {
      id: "opening",
      header: () => <span className="block text-right w-full">Opening pulse</span>,
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {row.original.amount} {row.original.measuredBy}
        </span>
      ),
    },
    {
      id: "stockOut",
      header: () => (
        <span className="block text-right w-full">Approved stock-out</span>
      ),
      cell: ({ row }) => {
        const b = row.original;
        const approvedSo =
          mode === "manager"
            ? round2(
                summarizeApprovedStockOutForDay(
                  stockOutRowsForProperty,
                  normalizeKitchenBarStationKey(b.station),
                  b.itemName,
                  String(selectedDayYmd || "").slice(0, 10),
                ),
              )
            : round2(Number(b.stockOutDay ?? 0));
        return (
          <span className="block text-right tabular-nums">
            {approvedSo.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "management",
      header: () => (
        <span className="block text-right w-full">Issued to management</span>
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {Number(row.original.managementTakenDay ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "lightsOut",
      header: () => <span className="block text-right w-full">Lights-out</span>,
      cell: ({ row }) => {
        const b = row.original;
        const approvedSo =
          mode === "manager"
            ? round2(
                summarizeApprovedStockOutForDay(
                  stockOutRowsForProperty,
                  normalizeKitchenBarStationKey(b.station),
                  b.itemName,
                  String(selectedDayYmd || "").slice(0, 10),
                ),
              )
            : round2(Number(b.stockOutDay ?? 0));
        const lightsOut = round2(
          Number(b.amount || 0) +
            approvedSo -
            Number(b.managementTakenDay ?? 0),
        );
        return (
          <span className="block text-right tabular-nums">
            {lightsOut.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "usage",
      header: () => <span className="block text-right w-full">Day usage</span>,
      cell: ({ row }) => {
        const usage = derived.daySales.get(row.original.id);
        return (
          <span className="block text-right tabular-nums text-muted-foreground">
            {usage == null ? "—" : usage.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "implied",
      header: () => (
        <span className="block text-right w-full">Sealed movement</span>
      ),
      cell: ({ row }) => {
        const implied = derived.implied.get(row.original.id);
        return (
          <span className="block text-right tabular-nums text-muted-foreground">
            {implied == null ? "—" : implied.toFixed(2)}
          </span>
        );
      },
    },
  ];

  if (mode === "manager") {
    cols.push({
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="max-w-[220px] truncate text-sm text-muted-foreground block">
          {row.original.notes || "—"}
        </span>
      ),
    });
  } else {
    cols.push({
      id: "actions",
      header: () => <span className="block text-right w-full">Actions</span>,
      cell: ({ row }) => (
        <div className="text-right space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit?.(row.original)}
          >
            Edit
          </Button>
          <PendingButton
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            pending={deletePendingId === row.original.id}
            onClick={() => onDelete?.(row.original)}
          >
            Delete
          </PendingButton>
        </div>
      ),
    });
  }

  return cols;
}
