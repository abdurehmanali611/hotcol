"use client";

import { useMemo } from "react";
import type { Order } from "@/lib/actions";
import { cafeOrderLineTotalETB } from "@/lib/cafeBankPayment";
import {
  buildAmountTablePaymentPlan,
  type PrimaryAmountChannel,
} from "@/lib/cafeAmountPayment";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Banknote, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  orders: Order[];
  primaryChannel: PrimaryAmountChannel;
  onPrimaryChannelChange: (channel: PrimaryAmountChannel) => void;
  amountInput: string;
  onAmountInputChange: (value: string) => void;
  saving: boolean;
  onConfirm: () => void;
};

export function CafePaymentAmountSplitDialog({
  open,
  onOpenChange,
  title,
  description,
  orders,
  primaryChannel,
  onPrimaryChannelChange,
  amountInput,
  onAmountInputChange,
  saving,
  onConfirm,
}: Props) {
  const tableTotal = useMemo(
    () => orders.reduce((sum, order) => sum + cafeOrderLineTotalETB(order), 0),
    [orders],
  );

  const parsedAmount = useMemo(() => {
    const value = Number(amountInput.replace(/,/g, "").trim());
    return Number.isFinite(value) ? value : NaN;
  }, [amountInput]);

  const effectivePrimary = useMemo(() => {
    if (!Number.isFinite(parsedAmount)) return 0;
    return Math.min(Math.max(0, parsedAmount), tableTotal);
  }, [parsedAmount, tableTotal]);

  const remainderAmount = Math.max(0, tableTotal - effectivePrimary);
  const remainderChannel: PrimaryAmountChannel =
    primaryChannel === "cash" ? "bank" : "cash";

  const plan = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || orders.length === 0) {
      return null;
    }
    return buildAmountTablePaymentPlan(orders, parsedAmount, primaryChannel);
  }, [orders, parsedAmount, primaryChannel]);

  const canConfirm =
    !saving &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= tableTotal + 0.001 &&
    plan != null &&
    plan.cashChannels.length + plan.bankChannels.length > 0;

  const primaryLabel =
    primaryChannel === "cash" ? "Cash received" : "Bank transfer";
  const remainderLabel =
    remainderChannel === "cash" ? "Cash (auto)" : "Bank (auto)";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>{description}</p>

              <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5 text-foreground">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Selection total
                </p>
                <p className="text-lg font-bold tabular-nums">
                  {formatETB(tableTotal)} ETB
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    · {orders.length} items
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-foreground">Customer paid via</p>
                <div className="inline-flex w-full gap-1 rounded-xl border border-border/50 bg-background/60 p-1">
                  {PRIMARY_OPTIONS.map(({ value, label, icon: Icon, active }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onPrimaryChannelChange(value)}
                      className={cn(
                        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        primaryChannel === value
                          ? active
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div
                  className={cn(
                    "rounded-xl border px-3 py-3",
                    primaryChannel === "cash"
                      ? "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                      : "border-sky-200/70 bg-sky-50/40 dark:border-sky-900/50 dark:bg-sky-950/20",
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {primaryLabel}
                  </p>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => onAmountInputChange(e.target.value)}
                    className="mt-2 h-10 bg-background/90 text-base font-semibold tabular-nums"
                  />
                </div>
                <div
                  className={cn(
                    "rounded-xl border px-3 py-3",
                    remainderChannel === "cash"
                      ? "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                      : "border-sky-200/70 bg-sky-50/40 dark:border-sky-900/50 dark:bg-sky-950/20",
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {remainderLabel}
                  </p>
                  <p className="mt-2 text-xl font-bold tabular-nums">
                    {formatETB(remainderAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Selection total minus entered amount
                  </p>
                </div>
              </div>

              {plan ? (
                <p className="text-sm text-foreground">
                  <span className="font-medium">
                    {formatETB(plan.requestedCash)} cash
                  </span>
                  {" + "}
                  <span className="font-medium">
                    {formatETB(plan.requestedBank)} bank
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {plan.cashChannels.length} cash item
                    {plan.cashChannels.length === 1 ? "" : "s"} ·{" "}
                    {plan.bankChannels.length} bank item
                    {plan.bankChannels.length === 1 ? "" : "s"} assigned
                  </span>
                </p>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              "Apply split"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
