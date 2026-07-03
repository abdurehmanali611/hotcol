"use client";

import { useMemo } from "react";
import type { ItemRegistration } from "@/lib/actions";
import { countUniqueInventoryNames } from "@/lib/inventoryAggregation";
import { summarizeInventoryPayment } from "@/lib/hotelInventoryPayment";
import { Card, CardContent } from "@/components/ui/card";
import {
  Archive,
  BadgeCheck,
  CreditCard,
  Layers,
  Package,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

function inventoryStockValueEtb(items: ItemRegistration[]): number {
  return items.reduce(
    (sum, row) =>
      sum + (Number(row.amount) || 0) * (Number(row.unitPrice) || 0),
    0,
  );
}

function formatEtb(amount: number): string {
  return `ETB ${amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

type StoreInventoryOverviewProps = {
  items: ItemRegistration[];
  movementCount?: number;
  pettyCashBalance?: number | null;
  showPaymentBreakdown?: boolean;
  className?: string;
};

export function StoreInventoryOverview({
  items,
  movementCount = 0,
  pettyCashBalance = null,
  showPaymentBreakdown = true,
  className,
}: StoreInventoryOverviewProps) {
  const uniqueSkus = useMemo(
    () => countUniqueInventoryNames(items),
    [items],
  );
  const stockValue = useMemo(() => inventoryStockValueEtb(items), [items]);
  const payment = useMemo(
    () =>
      summarizeInventoryPayment(items, (r) => ({
        amount: r.amount,
        unitPrice: r.unitPrice,
        paidAmount: r.paidAmount,
        purchaseWithVat: r.purchaseWithVat,
        registeredAmount: r.registeredAmount,
        registeredValue: r.registeredValue,
      })),
    [items],
  );

  const showPettyCash = pettyCashBalance != null;

  const cards = [
    {
      key: "skus",
      label: "Active SKUs",
      value: String(uniqueSkus),
      hint: `${items.length} registration line${items.length === 1 ? "" : "s"}`,
      icon: Package,
      accent: "from-emerald-500/70 to-teal-400/50",
      iconClass: "text-emerald-600 dark:text-emerald-400",
      iconWrap: "bg-emerald-500/10 border-emerald-500/20",
      border: "border-emerald-500/20",
      largeValue: false,
    },
    {
      key: "value",
      label: "Stock on hand",
      value: formatEtb(stockValue),
      hint: "Quantity × unit price",
      icon: Layers,
      accent: "from-sky-500/70 to-cyan-400/50",
      iconClass: "text-sky-700 dark:text-sky-400",
      iconWrap: "bg-sky-500/10 border-sky-500/20",
      border: "border-sky-500/20",
      largeValue: true,
    },
    {
      key: "movements",
      label: "Movement history",
      value: String(movementCount),
      hint: "Inactive and audit rows",
      icon: Archive,
      accent: "from-violet-500/70 to-indigo-400/50",
      iconClass: "text-violet-600 dark:text-violet-400",
      iconWrap: "bg-violet-500/10 border-violet-500/20",
      border: "border-violet-500/20",
      largeValue: false,
    },
    ...(showPettyCash
      ? [
          {
            key: "petty",
            label: "Petty cash",
            value: formatEtb(Number(pettyCashBalance) || 0),
            hint: "Available for stock-in",
            icon: Wallet,
            accent: "from-amber-500/70 to-orange-400/50",
            iconClass: "text-amber-700 dark:text-amber-400",
            iconWrap: "bg-amber-500/10 border-amber-500/20",
            border: "border-amber-500/20",
            largeValue: true,
          },
        ]
      : []),
    ...(showPaymentBreakdown
      ? [
          {
            key: "paid",
            label: "Fully paid",
            value: String(payment.paid),
            hint: "Lines settled with supplier at registration",
            icon: BadgeCheck,
            accent: "from-emerald-500/60 to-teal-400/40",
            iconClass: "text-emerald-600 dark:text-emerald-400",
            iconWrap: "bg-emerald-500/10 border-emerald-500/20",
            border: "border-emerald-500/20",
            largeValue: false,
          },
          {
            key: "credit",
            label: "On supplier credit",
            value: String(payment.credit),
            hint:
              payment.creditAmount > 0
                ? `${formatEtb(payment.creditAmount)} outstanding`
                : "No open supplier credit",
            icon: CreditCard,
            accent: "from-amber-500/60 to-orange-400/40",
            iconClass: "text-amber-700 dark:text-amber-400",
            iconWrap: "bg-amber-500/10 border-amber-500/20",
            border: "border-amber-500/20",
            largeValue: false,
          },
        ]
      : []),
  ];

  return (
    <div className={cn("w-full min-w-0", className)}>
      <div
        className={cn(
          "grid gap-4 w-full",
          cards.length <= 2 && "grid-cols-1 sm:grid-cols-2",
          cards.length === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          cards.length >= 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        )}
        role="list"
        aria-label="Inventory summary"
      >
        {cards.map(({ key, ...card }) => (
          <SummaryCard key={key} {...card} />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  iconClass,
  iconWrap,
  border,
  largeValue,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Package;
  accent: string;
  iconClass: string;
  iconWrap: string;
  border: string;
  largeValue: boolean;
}) {
  return (
    <Card
      role="listitem"
      className={cn(
        "bg-card/95 shadow-sm overflow-hidden h-full w-full",
        border,
      )}
    >
      <div className={cn("h-1 bg-linear-to-r", accent)} />
      <CardContent className="p-4 sm:p-5 flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-snug">
            {label}
          </p>
          <div
            className={cn(
              "p-2 rounded-lg border shrink-0",
              iconWrap,
            )}
          >
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconClass)} aria-hidden />
          </div>
        </div>
        <p
          className={cn(
            "font-bold tabular-nums tracking-tight text-foreground wrap-break-word",
            largeValue ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl",
          )}
        >
          {value}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-auto">
          {hint}
        </p>
      </CardContent>
    </Card>
  );
}

