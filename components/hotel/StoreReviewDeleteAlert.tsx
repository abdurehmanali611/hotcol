"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import type {
  ItemRegistration,
  PurchaseRequestRow,
  StockOutRequestRow,
} from "@/lib/actions";
import {
  formatMovementType,
  formatQtyWithUnit,
} from "@/lib/hotelDisplayLabels";
import { formatVoucherDisplay } from "@/lib/voucherFormat";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export type StoreReviewDeleteTarget =
  | {
      requestType: "purchase";
      mode: "single";
      row: PurchaseRequestRow;
    }
  | {
      requestType: "purchase";
      mode: "batch";
      ids: number[];
      sampleRows: PurchaseRequestRow[];
    }
  | {
      requestType: "stock";
      mode: "single";
      row: StockOutRequestRow;
    }
  | {
      requestType: "stock";
      mode: "batch";
      ids: number[];
      sampleRows: StockOutRequestRow[];
    }
  | {
      requestType: "registration";
      mode: "single";
      row: ItemRegistration & { id: number };
    }
  | {
      requestType: "registration";
      mode: "batch";
      ids: number[];
      sampleRows: ItemRegistration[];
    };

const REQUEST_LABELS = {
  purchase: "purchase request",
  stock: "stock movement",
  registration: "registration",
} as const;

function SampleLine({
  target,
  row,
}: {
  target: StoreReviewDeleteTarget;
  row: PurchaseRequestRow | StockOutRequestRow | ItemRegistration;
}) {
  const voucher = formatVoucherDisplay(
    "voucherNumber" in row ? row.voucherNumber : null,
    "voucherDisplay" in row ? row.voucherDisplay : null,
  );

  if (target.requestType === "purchase") {
    const pr = row as PurchaseRequestRow;
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{pr.itemName}</span>
          <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
            {voucher}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatQtyWithUnit(pr.quantity, pr.measuredBy)} · ETB{" "}
          {Number(pr.estimatedUnitPrice || 0).toLocaleString()} est. / unit ·{" "}
          {pr.supplierName || "—"}
        </p>
      </>
    );
  }

  if (target.requestType === "stock") {
    const so = row as StockOutRequestRow;
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">
            {so.itemName?.trim() || "Unknown item"}
          </span>
          <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
            {voucher}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatMovementType(so.movementType)} ·{" "}
          {formatQtyWithUnit(so.amount, "")} ·{" "}
          {so.stakeHolderOrReason?.trim() || "—"}
        </p>
      </>
    );
  }

  const reg = row as ItemRegistration;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-sm">{reg.name}</span>
        <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
          {voucher}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatQtyWithUnit(reg.amount, reg.measuredBy)} · ETB{" "}
        {Number(reg.unitPrice || 0).toLocaleString()} / unit ·{" "}
        {reg.supplierName || "—"}
      </p>
    </>
  );
}

export function StoreReviewDeleteAlert({
  target,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  target: StoreReviewDeleteTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isPending: (key: string) => boolean;
}) {
  if (!target) return null;

  const pendingKey = `review-${target.requestType}-delete`;
  const isBatch = target.mode === "batch";
  const count = isBatch ? target.ids.length : 1;
  const label = REQUEST_LABELS[target.requestType];
  const sample =
    target.mode === "single" ? [target.row] : target.sampleRows.slice(0, 3);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md gap-0 overflow-hidden p-0 border-destructive/20">
        <div className="h-1 bg-linear-to-r from-destructive/80 via-rose-500/60 to-orange-400/40" />
        <AlertDialogHeader className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-1.5">
            <AlertDialogTitle className="text-left text-lg tracking-tight">
              {isBatch
                ? `Delete ${count} ${label} line${count !== 1 ? "s" : ""}?`
                : `Remove this ${label} line?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left text-pretty leading-relaxed">
              Selected lines will be removed from your review queue before cost
              control. This cannot be undone.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {sample.length > 0 ? (
          <>
            <Separator />
            <ul className="px-6 py-4 space-y-2.5 max-h-[220px] overflow-y-auto">
              {sample.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5 space-y-1"
                >
                  <SampleLine target={target} row={row} />
                </li>
              ))}
              {isBatch && count > sample.length ? (
                <li className="text-xs text-muted-foreground text-center pt-1">
                  + {count - sample.length} more line
                  {count - sample.length !== 1 ? "s" : ""}
                </li>
              ) : null}
            </ul>
          </>
        ) : null}

        <AlertDialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/10 sm:justify-end gap-2">
          <AlertDialogCancel disabled={isPending(pendingKey)}>
            Keep line{isBatch && count !== 1 ? "s" : ""}
          </AlertDialogCancel>
          <PendingButton
            variant="destructive"
            pending={isPending(pendingKey)}
            className="gap-1.5 shadow-sm"
            onClick={() => void onConfirm()}
          >
            <Trash2 className="h-4 w-4" />
            Delete{isBatch ? ` (${count})` : ""}
          </PendingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
