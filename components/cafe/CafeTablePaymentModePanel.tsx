"use client";

import { useMemo } from "react";
import type { Order } from "@/lib/actions";
import { cafeOrderLineTotalETB } from "@/lib/cafeBankPayment";
import {
  buildAmountTablePaymentPlan,
  type PrimaryAmountChannel,
} from "@/lib/cafeAmountPayment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowLeftRight,
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardEdit,
  Clock,
  Loader2,
  Receipt,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type TablePaymentMode = "orders" | "amount" | "update";

const MODE_OPTIONS = [
  {
    value: "orders" as const,
    label: "By order",
    icon: Receipt,
  },
  {
    value: "amount" as const,
    label: "By amount",
    icon: ArrowLeftRight,
  },
  {
    value: "update" as const,
    label: "Order update",
    icon: ClipboardEdit,
  },
] as const;

const PRIMARY_OPTIONS = [
  {
    value: "cash" as const,
    label: "Cash",
    icon: Banknote,
    active:
      "bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-900/60",
  },
  {
    value: "bank" as const,
    label: "Bank",
    icon: Building2,
    active:
      "bg-sky-50 text-sky-900 shadow-sm ring-1 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-900/60",
  },
] as const;

function formatETB(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  tableNo: number;
  completedOrders: Order[];
  tableTotal: number;
  allOrdersCompleted: boolean;
  mode: TablePaymentMode;
  onModeChange: (mode: TablePaymentMode) => void;
  primaryChannel: PrimaryAmountChannel;
  onPrimaryChannelChange: (channel: PrimaryAmountChannel) => void;
  amountInput: string;
  onAmountInputChange: (value: string) => void;
  processing: boolean;
  onSubmitAmountPayment: () => void;
  /** Rendered when mode is Order update (scoped to this table). */
  orderUpdateContent?: ReactNode;
};

export function CafeTablePaymentModePanel({
  tableNo,
  completedOrders,
  tableTotal,
  allOrdersCompleted,
  mode,
  onModeChange,
  primaryChannel,
  onPrimaryChannelChange,
  amountInput,
  onAmountInputChange,
  processing,
  onSubmitAmountPayment,
  orderUpdateContent,
}: Props) {
  const amountInputId = `table-${tableNo}-amount`;

  const parsedAmount = useMemo(() => {
    const value = Number(amountInput.replace(/,/g, "").trim());
    return Number.isFinite(value) ? value : NaN;
  }, [amountInput]);

  const effectivePrimary = useMemo(() => {
    if (!Number.isFinite(parsedAmount)) return 0;
    return Math.min(Math.max(0, parsedAmount), tableTotal);
  }, [parsedAmount, tableTotal]);

  const remainderChannel: PrimaryAmountChannel =
    primaryChannel === "cash" ? "bank" : "cash";

  const remainderAmount = useMemo(
    () => Math.max(0, tableTotal - effectivePrimary),
    [tableTotal, effectivePrimary],
  );

  const allocatedSplit = useMemo(() => {
    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      completedOrders.length === 0
    ) {
      return null;
    }
    return buildAmountTablePaymentPlan(
      completedOrders,
      parsedAmount,
      primaryChannel,
    );
  }, [completedOrders, parsedAmount, primaryChannel]);

  const displayCash = allocatedSplit?.requestedCash ?? 0;
  const displayBank = allocatedSplit?.requestedBank ?? 0;

  const isFullSingleChannel =
    effectivePrimary >= tableTotal - 0.001 && tableTotal > 0;

  const canSubmit =
    allOrdersCompleted &&
    completedOrders.length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= tableTotal + 0.001 &&
    allocatedSplit != null &&
    (primaryChannel === "cash"
      ? allocatedSplit.cashChannels.length > 0 ||
        allocatedSplit.bankChannels.length > 0
      : allocatedSplit.bankChannels.length > 0 ||
        allocatedSplit.cashChannels.length > 0);

  const primaryLabel = primaryChannel === "cash" ? "Cash received" : "Bank transfer";
  const remainderLabel =
    remainderChannel === "cash" ? "Cash (auto)" : "Bank (auto)";

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/50 bg-muted/25 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Checkout</p>
          <p className="text-xs text-muted-foreground">
            Choose how to pay or update this table
          </p>
        </div>
        <div className="inline-flex w-full gap-1 rounded-lg border bg-muted/40 p-1 sm:w-auto">
          {MODE_OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onModeChange(value)}
                className={cn(
                  "inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors sm:flex-none sm:px-4",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {mode === "amount" ? (
        <div className="p-4 sm:p-5">
          {!allOrdersCompleted ? (
            <Alert className="border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              <Clock className="h-4 w-4" />
              <AlertTitle>Waiting on kitchen</AlertTitle>
              <AlertDescription>
                Amount settlement unlocks when every order on this table is
                marked completed.
              </AlertDescription>
            </Alert>
          ) : completedOrders.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No billable items</AlertTitle>
              <AlertDescription>
                There are no completed orders to settle on this table.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/70 bg-linear-to-r from-emerald-50/90 to-teal-50/50 px-4 py-3 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-teal-950/20">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-900/50 dark:text-emerald-200 dark:ring-emerald-800/60">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                      Ready to settle
                    </p>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
                      {completedOrders.length} item
                      {completedOrders.length === 1 ? "" : "s"} · enter one
                      channel; the other is calculated automatically
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-300/60 bg-white/60 px-3 py-1 text-base font-bold tabular-nums text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                >
                  {formatETB(tableTotal)} ETB
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Customer paid via</p>
                <div className="inline-flex w-full gap-1 rounded-xl border border-border/50 bg-background/60 p-1 sm:w-auto">
                  {PRIMARY_OPTIONS.map(({ value, label, icon: Icon, active }) => {
                    const isActive = primaryChannel === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onPrimaryChannelChange(value)}
                        className={cn(
                          "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-all sm:flex-none",
                          isActive
                            ? active
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Table total
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                    {formatETB(tableTotal)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">ETB</p>
                </div>

                <div
                  className={cn(
                    "rounded-xl border px-4 py-3.5",
                    primaryChannel === "cash"
                      ? "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                      : "border-sky-200/70 bg-sky-50/40 dark:border-sky-900/50 dark:bg-sky-950/20",
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {primaryChannel === "cash" ? (
                      <Banknote className="h-3.5 w-3.5" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5" />
                    )}
                    {primaryLabel}
                  </div>
                  <div className="relative mt-2">
                    <Input
                      id={amountInputId}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amountInput}
                      onChange={(e) => onAmountInputChange(e.target.value)}
                      className="h-11 bg-background/90 pr-12 text-lg font-semibold tabular-nums shadow-none"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      ETB
                    </span>
                  </div>
                </div>

                <div
                  className={cn(
                    "rounded-xl border px-4 py-3.5",
                    remainderChannel === "cash"
                      ? "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                      : "border-sky-200/70 bg-sky-50/40 dark:border-sky-900/50 dark:bg-sky-950/20",
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {remainderLabel}
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                    {formatETB(remainderAmount)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isFullSingleChannel
                      ? `Full ${primaryChannel} — no remainder`
                      : "Table total minus entered amount"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {formatETB(displayCash)} cash
                  </span>
                  {" + "}
                  <span className="font-medium text-foreground">
                    {formatETB(displayBank)} bank
                  </span>
                  {allocatedSplit &&
                  completedOrders.length === 1 &&
                  allocatedSplit.requestedCash > 0.001 &&
                  allocatedSplit.requestedBank > 0.001 ? (
                    <span className="block text-xs">
                      One line split — {formatETB(allocatedSplit.requestedCash)}{" "}
                      cash + {formatETB(allocatedSplit.requestedBank)} bank on
                      this item
                    </span>
                  ) : allocatedSplit &&
                    primaryChannel === "cash" &&
                    allocatedSplit.cashLineTotal + allocatedSplit.bankLineTotal >
                      0 ? (
                    <span className="block text-xs">
                      {allocatedSplit.cashChannels.length} cash item
                      {allocatedSplit.cashChannels.length === 1 ? "" : "s"} (
                      {formatETB(allocatedSplit.cashLineTotal)}) ·{" "}
                      {allocatedSplit.bankChannels.length} bank item
                      {allocatedSplit.bankChannels.length === 1 ? "" : "s"} at
                      line totals ({formatETB(allocatedSplit.bankLineTotal)})
                    </span>
                  ) : allocatedSplit &&
                    primaryChannel === "bank" &&
                    allocatedSplit.cashLineTotal + allocatedSplit.bankLineTotal >
                      0 ? (
                    <span className="block text-xs">
                      {allocatedSplit.bankChannels.length} bank item
                      {allocatedSplit.bankChannels.length === 1 ? "" : "s"} (
                      {formatETB(allocatedSplit.requestedBank)} transfer) ·{" "}
                      {allocatedSplit.cashChannels.length} cash item
                      {allocatedSplit.cashChannels.length === 1 ? "" : "s"} (
                      {formatETB(allocatedSplit.cashLineTotal)})
                    </span>
                  ) : (
                    <span className="block text-xs">
                      Remainder is calculated automatically from the table total.
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="w-full gap-2 bg-linear-to-r from-emerald-600 to-teal-600 shadow-md hover:from-emerald-700 hover:to-teal-700 sm:w-auto sm:min-w-44"
                  disabled={processing || !canSubmit}
                  onClick={onSubmitAmountPayment}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  Settle {formatETB(tableTotal)} ETB
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : mode === "update" ? (
        <div className="p-4 sm:p-5">{orderUpdateContent}</div>
      ) : (
        <div className="px-4 py-4 sm:px-5">
          <p className="text-sm text-muted-foreground">
            Use <span className="font-semibold text-foreground">Pay Now</span> on
            each item, or{" "}
            <span className="font-semibold text-foreground">Pay All Now</span> when
            the table is ready.
          </p>
        </div>
      )}
    </div>
  );
}

export function sumCompletedTableTotal(orders: Order[]): number {
  return orders.reduce((sum, order) => sum + cafeOrderLineTotalETB(order), 0);
}
