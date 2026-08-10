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
import { cn } from "@/lib/utils";

function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function StationBadge({ station }: { station: string }) {
  const key = normalizeKitchenBarStationKey(station);
  const tone =
    key === "KITCHEN"
      ? "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-200"
      : key === "BAR"
        ? "border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-200"
        : key === "ROOM"
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          : "border-border/70 bg-muted/40 text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone,
      )}
    >
      {displayKitchenBarStation(station)}
    </span>
  );
}

export type KitchenBarDerivedMaps = {
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
      cell: ({ row }) => <StationBadge station={row.original.station} />,
    },
    {
      accessorKey: "itemName",
      header: "Items",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.itemName}</span>
      ),
    },
    {
      id: "totalSales",
      header: () => (
        <span className="block text-right w-full">Σ Sales</span>
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {Number(row.original.totalImpliedSales).toFixed(2)}
        </span>
      ),
    },
    {
      id: "onHand",
      header: () => (
        <span className="block text-right w-full">On Hand</span>
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-300">
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

  const storeFor = (b: KitchenBarBeginningRow): number =>
    round2(
      summarizeApprovedStockOutForDay(
        stockOutRowsForProperty,
        normalizeKitchenBarStationKey(b.station),
        b.itemName,
        String(
          b.calendarDate || selectedDayYmd || "",
        ).slice(0, 10),
      ),
    );

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
      cell: ({ row }) => <StationBadge station={row.original.station} />,
    },
    {
      accessorKey: "itemName",
      header: "Items",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.itemName}</span>
      ),
    },
    {
      id: "opening",
      header: () => (
        <span className="block text-right w-full">Beginning (BB)</span>
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {row.original.amount} {row.original.measuredBy}
        </span>
      ),
    },
    {
      id: "stockOut",
      header: () => <span className="block text-right w-full">Store</span>,
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {storeFor(row.original).toFixed(2)}
        </span>
      ),
    },
    {
      id: "total",
      header: () => <span className="block text-right w-full">Total</span>,
      cell: ({ row }) => {
        const b = row.original;
        const total = round2(Number(b.amount || 0) + storeFor(b));
        return (
          <span className="block text-right tabular-nums font-medium">
            {total.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "management",
      header: () => <span className="block text-right w-full">Management</span>,
      cell: ({ row }) => (
        <span className="block text-right tabular-nums text-violet-700 dark:text-violet-300">
          {Number(row.original.managementTakenDay ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "invitation",
      header: () => <span className="block text-right w-full">Invitation</span>,
      cell: ({ row }) => (
        <span className="block text-right tabular-nums text-rose-700 dark:text-rose-300">
          {Number(row.original.invitationTakenDay ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "sales",
      header: () => <span className="block text-right w-full">Sales</span>,
      cell: ({ row }) => {
        const sales = derived.daySales.get(row.original.id);
        return (
          <span className="block text-right tabular-nums text-muted-foreground">
            {sales == null ? "—" : sales.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "variance",
      header: "Variance",
      cell: ({ row }) => {
        const kind = String(row.original.countVariance || "NEUTRAL")
          .trim()
          .toUpperCase();
        const amt = Number(row.original.countVarianceAmount) || 0;
        if (kind === "SHORTAGE" && amt > 0) {
          return (
            <span className="text-xs tabular-nums text-amber-800 dark:text-amber-200">
              Short {amt.toFixed(2)}
            </span>
          );
        }
        if (kind === "OVERAGE" && amt > 0) {
          return (
            <span className="text-xs tabular-nums text-sky-800 dark:text-sky-200">
              Over {amt.toFixed(2)}
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground">Neutral</span>;
      },
    },
    {
      id: "onHand",
      header: () => <span className="block text-right w-full">On Hand</span>,
      cell: ({ row }) => {
        const b = row.original;
        const store = storeFor(b);
        const total = round2(Number(b.amount || 0) + store);
        const sales = derived.daySales.get(b.id);
        const salesQty = sales == null ? 0 : Number(sales);
        const management = Number(b.managementTakenDay ?? 0);
        const invitation = Number(b.invitationTakenDay ?? 0);
        const onHand = round2(total - salesQty - management - invitation);
        const roomSrc = String(b.roomSourceStation || "").trim().toUpperCase();
        return (
          <div className="text-right">
            <span className="block tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">
              {onHand.toFixed(2)}
            </span>
            {normalizeKitchenBarStationKey(b.station) === "ROOM" &&
            (roomSrc === "KITCHEN" || roomSrc === "BAR") ? (
              <span className="text-[10px] text-muted-foreground">
                via {roomSrc === "BAR" ? "Bar" : "Kitchen"}
              </span>
            ) : null}
          </div>
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
