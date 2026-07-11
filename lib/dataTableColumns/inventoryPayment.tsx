"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  creditAmountETB,
  isVatEnabled,
  itemPaymentBucket,
  itemPaymentLabel,
  lineOwedETB,
  registeredAmountOf,
  type InventoryPaymentRow,
} from "@/lib/hotelInventoryPayment";
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import { rowRegistrationYmd } from "@/lib/panelFilters";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function paymentBadgeClass(bucket: ReturnType<typeof itemPaymentBucket>) {
  if (bucket === "paid")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (bucket === "credit")
    return "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  if (bucket === "none")
    return "border-border/70 bg-muted/50 text-muted-foreground";
  return "font-normal";
}

export function buildInventoryPaymentColumns(options?: {
  includeRegistered?: boolean;
  creditOnlyWhenCredit?: boolean;
}): ColumnDef<InventoryPaymentRow>[] {
  const { includeRegistered = true, creditOnlyWhenCredit = false } = options ?? {};
  const cols: ColumnDef<InventoryPaymentRow>[] = [
    {
      accessorKey: "name",
      header: "Item",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 max-w-[220px]">
          <span className="font-medium truncate">{row.original.name}</span>
          {row.original.paymentSource === "fresh_bazaar" ? (
            <Badge
              variant="outline"
              className="w-fit text-[9px] font-normal border-cyan-500/30 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200"
            >
              Fresh bazaar
            </Badge>
          ) : null}
        </div>
      ),
    },
  ];
  if (includeRegistered) {
    cols.push({
      id: "registered",
      header: "Registered",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
          {rowRegistrationYmd(row.original.registrationDate) || "—"}
        </span>
      ),
    });
  }
  cols.push(
    {
      id: "qty",
      header: "Quantity",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground whitespace-nowrap text-sm">
          {formatQtyWithUnit(
            registeredAmountOf(row.original),
            row.original.measuredBy,
          )}
        </span>
      ),
    },
    {
      id: "lineValue",
      header: () => (
        <span className="block text-right w-full">Line value (ETB)</span>
      ),
      cell: ({ row }) => (
        <span className="block text-right font-semibold tabular-nums text-sm">
          {lineOwedETB(row.original).toLocaleString()}
        </span>
      ),
    },
    {
      id: "payment",
      header: "Payment",
      cell: ({ row }) => {
        const bucket = itemPaymentBucket(row.original);
        return (
          <Badge
            variant="outline"
            className={cn("font-normal text-[10px]", paymentBadgeClass(bucket))}
          >
            {itemPaymentLabel(bucket)}
          </Badge>
        );
      },
    },
    {
      id: "credit",
      header: () => (
        <span className="block text-right w-full">
          {creditOnlyWhenCredit ? "Credit amount (ETB)" : "Credit (ETB)"}
        </span>
      ),
      cell: ({ row }) => {
        const bucket = itemPaymentBucket(row.original);
        const credit = creditAmountETB(row.original);
        return (
          <span className="block text-right tabular-nums text-sm font-medium">
            {creditOnlyWhenCredit && bucket !== "credit"
              ? "0"
              : credit.toLocaleString()}
          </span>
        );
      },
    },
    {
      id: "vat",
      header: "VAT",
      cell: ({ row }) => {
        const withVat = isVatEnabled(row.original.purchaseWithVat);
        return (
          <Badge
            variant={withVat ? "secondary" : "outline"}
            className={cn(
              "text-[10px] font-normal",
              withVat &&
                "bg-violet-500/10 text-violet-800 dark:text-violet-200 border-violet-500/25",
            )}
          >
            {withVat ? "With VAT" : "Without VAT"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "supplierName",
      header: "Supplier",
      cell: ({ row }) => (
        <span className="text-sm max-w-[180px] truncate block">
          {row.original.supplierName || "—"}
        </span>
      ),
    },
    {
      id: "tin",
      header: "Supplier TIN",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {(row.original.supplierTinNumber || "").trim() || "—"}
        </span>
      ),
    },
  );
  return cols;
}
