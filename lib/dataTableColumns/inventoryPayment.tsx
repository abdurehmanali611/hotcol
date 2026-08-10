"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  creditAmountETB,
  formatPaymentSourceBreakdown,
  isVatEnabled,
  itemPaymentBucket,
  itemPaymentLabel,
  lineOwedETB,
  registeredAmountOf,
  type InventoryPaymentItemGroup,
  type InventoryPaymentRow,
} from "@/lib/hotelInventoryPayment";
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import { rowRegistrationYmd } from "@/lib/panelFilters";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InventoryPaymentGroupDetailTrigger } from "@/components/hotel/InventoryPaymentGroupDetailTrigger";

function paymentBadgeClass(
  bucket: ReturnType<typeof itemPaymentBucket> | "mixed",
) {
  if (bucket === "paid")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (bucket === "credit")
    return "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  if (bucket === "mixed")
    return "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200";
  if (bucket === "none")
    return "border-border/70 bg-muted/50 text-muted-foreground";
  return "font-normal";
}

function paymentGroupLabel(
  bucket: InventoryPaymentItemGroup["paymentBucket"],
): string {
  if (bucket === "mixed") return "Mixed payment";
  return itemPaymentLabel(bucket);
}

/** One row per item name, with source breakdown under the title. */
export function buildInventoryPaymentGroupColumns(options?: {
  /** With-VAT view: show VAT amount + total paid (incl. VAT) columns. */
  showVatAmountColumns?: boolean;
}): ColumnDef<InventoryPaymentItemGroup>[] {
  const showVatAmountColumns = Boolean(options?.showVatAmountColumns);

  const cols: ColumnDef<InventoryPaymentItemGroup>[] = [
    {
      accessorKey: "name",
      header: "Item",
      cell: ({ row }) => {
        const g = row.original;
        const breakdown = formatPaymentSourceBreakdown(g);
        return (
          <InventoryPaymentGroupDetailTrigger
            group={g}
            openFocus="lines"
            className="px-1 py-0.5 -mx-1"
          >
            <div className="flex flex-col gap-0.5 max-w-[240px]">
              <span className="font-medium truncate underline-offset-2 group-hover/detail:underline">
                {g.name}
              </span>
              <span className="text-[10px] leading-snug text-muted-foreground">
                {breakdown}
                {g.lineCount > 1 ? (
                  <span className="text-muted-foreground/80">
                    {" "}
                    · {g.lineCount} lines
                  </span>
                ) : null}
              </span>
            </div>
          </InventoryPaymentGroupDetailTrigger>
        );
      },
    },
    {
      id: "registered",
      header: "Registered",
      cell: ({ row }) => {
        const from = rowRegistrationYmd(row.original.registrationFrom);
        const to = rowRegistrationYmd(row.original.registrationTo);
        if (!from && !to)
          return <span className="text-xs text-muted-foreground">—</span>;
        if (from && to && from !== to) {
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
              {from} – {to}
            </span>
          );
        }
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
            {from || to}
          </span>
        );
      },
    },
    {
      id: "qty",
      header: "Quantity",
      cell: ({ row }) => (
        <div className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
          {formatQtyWithUnit(row.original.totalQty, row.original.measuredBy)}
        </div>
      ),
    },
    {
      id: "lineValue",
      header: () => (
        <span className="block text-right w-full">
          {showVatAmountColumns
            ? "Total paid incl. VAT (ETB)"
            : "Line value (ETB)"}
        </span>
      ),
      cell: ({ row }) => (
        <span className="block text-right font-semibold tabular-nums text-sm">
          {row.original.totalLineValue.toLocaleString()}
        </span>
      ),
    },
  ];

  if (showVatAmountColumns) {
    cols.push({
      id: "vatAmount",
      header: () => (
        <span className="block text-right w-full">VAT amount (ETB)</span>
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums text-sm font-medium text-violet-800 dark:text-violet-200">
          {row.original.totalVat.toLocaleString()}
        </span>
      ),
    });
  }

  cols.push(
    {
      id: "payment",
      header: "Payment",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "font-normal text-[10px]",
            paymentBadgeClass(row.original.paymentBucket),
          )}
        >
          {paymentGroupLabel(row.original.paymentBucket)}
        </Badge>
      ),
    },
    {
      id: "credit",
      header: () => (
        <span className="block text-right w-full">Credit (ETB)</span>
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums text-sm font-medium">
          {row.original.totalCredit.toLocaleString()}
        </span>
      ),
    },
    {
      id: "vat",
      header: "VAT",
      cell: ({ row }) => {
        const mode = row.original.vatMode;
        const withVat = mode === "with";
        const mixed = mode === "mixed";
        return (
          <Badge
            variant={withVat || mixed ? "secondary" : "outline"}
            className={cn(
              "text-[10px] font-normal",
              withVat &&
                "bg-violet-500/10 text-violet-800 dark:text-violet-200 border-violet-500/25",
              mixed &&
                "bg-sky-500/10 text-sky-900 dark:text-sky-200 border-sky-500/25",
            )}
          >
            {mixed ? "Mixed VAT" : withVat ? "With VAT" : "Without VAT"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "supplierLabel",
      header: "Supplier",
      cell: ({ row }) => {
        const g = row.original;
        return (
          <InventoryPaymentGroupDetailTrigger
            group={g}
            openFocus="suppliers"
            className="px-1 py-0.5 -mx-1 max-w-[180px]"
          >
            <span className="text-sm truncate block underline-offset-2 group-hover/detail:underline">
              {g.supplierLabel}
            </span>
          </InventoryPaymentGroupDetailTrigger>
        );
      },
    },
  );

  return cols;
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
          ) : row.original.paymentSource === "depleted" ? (
            <Badge
              variant="outline"
              className="w-fit text-[9px] font-normal border-border/70 bg-muted/40 text-muted-foreground"
            >
              Stocked out
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
      cell: ({ row }) => {
        const registered = registeredAmountOf(row.original);
        const unit = row.original.measuredBy;
        return (
          <div className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
            {formatQtyWithUnit(registered, unit)}
          </div>
        );
      },
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
