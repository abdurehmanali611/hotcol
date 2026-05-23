"use client";

import { summarizeInventoryPayment } from "@/lib/hotelInventoryPayment";
import type { ItemRegistration } from "@/lib/actions";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeCheck, CreditCard, Package } from "lucide-react";

export function ActiveInventoryPaymentSummary({
  items,
}: {
  items: ItemRegistration[];
}) {
  const s = summarizeInventoryPayment(items, (r) => ({
    amount: r.amount,
    unitPrice: r.unitPrice,
    paidAmount: r.paidAmount,
    purchaseWithVat: r.purchaseWithVat,
    registeredAmount: r.registeredAmount,
    registeredValue: r.registeredValue,
  }));

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="border-emerald-500/20 bg-card/90 shadow-sm overflow-hidden">
        <div className="h-0.5 bg-linear-to-r from-emerald-500/70 to-teal-400/50" />
        <CardContent className="pt-4 pb-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <BadgeCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fully paid lines
            </p>
            <p className="text-2xl font-bold tabular-nums">{s.paid}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-amber-500/20 bg-card/90 shadow-sm overflow-hidden">
        <div className="h-0.5 bg-linear-to-r from-amber-500/70 to-orange-400/50" />
        <CardContent className="pt-4 pb-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <CreditCard className="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              On supplier credit
            </p>
            <p className="text-2xl font-bold tabular-nums">{s.credit}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              ETB {s.creditAmount.toLocaleString()} outstanding
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/80 bg-card/90 shadow-sm overflow-hidden">
        <div className="h-0.5 bg-linear-to-r from-primary/50 to-violet-400/40" />
        <CardContent className="pt-4 pb-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted border border-border/60">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active SKUs
            </p>
            <p className="text-2xl font-bold tabular-nums">{s.total}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
