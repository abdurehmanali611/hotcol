"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  ItemRegistration,
  PurchaseRequestRow,
  StockOutRequestRow,
} from "@/lib/actions";
import { DataTable } from "@/app/StoreItems/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRightLeft,
  FileText,
  PackagePlus,
  Printer,
  Receipt,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { StoreItemRegistrationReceipt } from "./StoreItemRegistrationReceipt";
import {
  bundleItemSummary,
  bundleItemsToPrint,
  bundleReceivedLabel,
  bundleSupplierName,
  bundleTotalETB,
  bundleTypeLabel,
  groupRegistrationsForReceipt,
  type ReceiptBundle,
} from "@/lib/receiptGrouping";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ReceiptSectionConfig = {
  kind: ReceiptBundle["kind"];
  title: string;
  description: string;
  emptyMessage: string;
  searchPlaceholder: string;
  icon: typeof FileText;
  accentClassName: string;
};

const HOTEL_RECEIPT_SECTIONS: ReceiptSectionConfig[] = [
  {
    kind: "purchase_request",
    title: "Purchase request",
    description:
      "Print grouped purchase request receipts using the supplier and date rules.",
    emptyMessage: "No purchase request receipts to print.",
    searchPlaceholder: "Search purchase request receipts...",
    icon: FileText,
    accentClassName: "from-sky-500/70 via-cyan-500/55 to-teal-400/45",
  },
  {
    kind: "registration",
    title: "New item registration",
    description:
      "Print new item registration receipts grouped by supplier, date, and payment status.",
    emptyMessage: "No new item registration receipts to print.",
    searchPlaceholder: "Search new registrations...",
    icon: PackagePlus,
    accentClassName: "from-emerald-500/70 via-green-500/55 to-lime-400/45",
  },
  {
    kind: "stock_movement",
    title: "Stock movement",
    description:
      "Print stock movement receipts with specific titles such as stock out movement receipt.",
    emptyMessage: "No stock movement receipts to print.",
    searchPlaceholder: "Search stock movement receipts...",
    icon: ArrowRightLeft,
    accentClassName: "from-amber-500/70 via-orange-500/55 to-rose-400/45",
  },
];

const CAFE_RECEIPT_SECTIONS: ReceiptSectionConfig[] = [
  {
    kind: "registration",
    title: "Item receipts",
    description:
      "Print goods receiving vouchers for authorized store registrations, including newly registered items and petty-cash stock-in.",
    emptyMessage: "No item receipts ready to print.",
    searchPlaceholder: "Search item receipts...",
    icon: PackagePlus,
    accentClassName: "from-emerald-500/70 via-green-500/55 to-lime-400/45",
  },
];

function bundleColumns(
  onPrint: (bundle: ReceiptBundle) => void,
  printable: boolean,
): ColumnDef<ReceiptBundle>[] {
  return [
    {
      id: "received",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap font-medium tabular-nums">
          {bundleReceivedLabel(row.original)}
        </span>
      ),
    },
    {
      id: "type",
      header: "Receipt",
      cell: ({ row }) => (
        <div className="min-w-[220px] max-w-[280px]">
          <p className="text-sm font-medium leading-snug text-foreground">
            {row.original.title}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {bundleTypeLabel(row.original)}
          </p>
        </div>
      ),
    },
    {
      id: "supplier",
      header: "Supplier",
      accessorFn: (row) => bundleSupplierName(row),
      cell: ({ row }) => {
        const firstPhone = row.original.supplierPhone;
        return (
          <div className="min-w-[170px] max-w-[220px]">
            <p className="text-sm font-medium truncate text-foreground">
              {bundleSupplierName(row.original)}
            </p>
            {firstPhone ? (
              <p className="text-[10px] text-muted-foreground truncate">
                {firstPhone}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "lines",
      header: "Items on receipt",
      cell: ({ row }) => (
        <div className="min-w-[200px] max-w-[320px]">
          <p className="text-sm text-foreground leading-snug">
            {bundleItemSummary(row.original)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {row.original.lines.length} line
            {row.original.lines.length !== 1 ? "s" : ""}
          </p>
        </div>
      ),
    },
    {
      id: "payment",
      header: "Payment",
      cell: ({ row }) =>
        row.original.paymentLabel ? (
          <Badge
            variant="outline"
            className="font-normal whitespace-nowrap border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200"
          >
            {row.original.paymentLabel}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
    {
      id: "total",
      header: "Total value",
      cell: ({ row }) => (
        <span className="text-sm font-semibold tabular-nums whitespace-nowrap text-foreground">
          ETB {bundleTotalETB(row.original).toLocaleString()}
        </span>
      ),
    },
    {
      id: "print",
      header: "",
      cell: ({ row }) =>
        printable ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            className="gap-1.5 whitespace-nowrap"
            onClick={() => onPrint(row.original)}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        ) : (
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            Not authorized
          </span>
        ),
    },
  ];
}

export function StoreItemReceiptPrinting({
  items,
  propertyName,
  propertyTin,
  logoUrl,
  purchaseRequests = [],
  stockMovements = [],
  variant = "hotel",
}: {
  items: ItemRegistration[];
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  purchaseRequests?: PurchaseRequestRow[];
  stockMovements?: StockOutRequestRow[];
  /** Café store: registration receipts only (no PR / stock movement). */
  variant?: "hotel" | "cafe-store";
}) {
  const isCafe = variant === "cafe-store";
  const receiptSections = isCafe ? CAFE_RECEIPT_SECTIONS : HOTEL_RECEIPT_SECTIONS;
  const resolvedTin =
    propertyTin ??
    (typeof window !== "undefined"
      ? localStorage.getItem("tin_number")?.trim() || null
      : null);
  const [previewBundle, setPreviewBundle] = useState<ReceiptBundle | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: previewBundle
      ? `${previewBundle.title.replace(/\s+/g, "_")}_${previewBundle.date || "receipt"}`
      : "Store_Receipt",
  });

  const bundles = useMemo(
    () =>
      groupRegistrationsForReceipt(items, purchaseRequests, stockMovements, {
        registrationsOnly: isCafe,
      }),
    [items, purchaseRequests, stockMovements, isCafe],
  );

  const lineCount = useMemo(
    () => bundles.reduce((n, b) => n + b.lines.length, 0),
    [bundles],
  );
  const totalValue = useMemo(
    () => bundles.reduce((sum, bundle) => sum + bundle.totalETB, 0),
    [bundles],
  );

  const sectionBundles = useMemo(
    () =>
      receiptSections.map((section) => ({
        ...section,
        bundles: bundles.filter((bundle) => bundle.kind === section.kind),
        totalLines: bundles
          .filter((bundle) => bundle.kind === section.kind)
          .reduce((sum, bundle) => sum + bundle.lines.length, 0),
        totalValue: bundles
          .filter((bundle) => bundle.kind === section.kind)
          .reduce((sum, bundle) => sum + bundle.totalETB, 0),
      })),
    [bundles, receiptSections],
  );

  const openPrintBundle = useCallback(
    (bundle: ReceiptBundle) => {
      setPreviewBundle(bundleItemsToPrint(bundle));
      requestAnimationFrame(() => handlePrint());
    },
    [handlePrint],
  );

  const cols = useMemo(
    () => bundleColumns(openPrintBundle, true),
    [openPrintBundle],
  );

  return (
    <div className="space-y-6 py-2">
      <Card className="border-primary/15 shadow-lg overflow-hidden bg-card/95">
        <div className="h-1 bg-linear-to-r from-primary/60 via-emerald-500/50 to-cyan-500/40" />
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Item receipt printing
              </CardTitle>
              <CardDescription className="max-w-2xl text-pretty">
                {isCafe
                  ? "Print goods receiving vouchers for all authorized store registrations, including newly registered items and petty-cash stock-in."
                  : "Print new item registration, purchase request, and stock movement receipts. Multi-item receipts are grouped by supplier, date, and payment status when payment applies."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="font-normal">
            {bundles.length} receipt group{bundles.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            {lineCount} line{lineCount !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            ETB {totalValue.toLocaleString()}
          </Badge>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {sectionBundles.map((section) => (
          <Card
            key={section.kind}
            className="border-border/80 shadow-md bg-card/95 overflow-hidden"
          >
            <div className={`h-1 bg-linear-to-r ${section.accentClassName}`} />
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/50">
                    <section.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">
                      {section.title}
                    </CardTitle>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="font-normal">
                        {section.bundles.length} receipt
                        {section.bundles.length !== 1 ? "s" : ""}
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        {section.totalLines} line
                        {section.totalLines !== 1 ? "s" : ""}
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        ETB {section.totalValue.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="max-w-sm text-right">
                  <CardDescription className="max-w-2xl">
                    {section.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <DataTable
                  columns={cols}
                  data={section.bundles}
                  getRowId={(row) => `${section.kind}-${row.id}`}
                  searchColumnId="supplier"
                  searchPlaceholder={section.searchPlaceholder}
                  emptyMessage={section.emptyMessage}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!previewBundle}
        onOpenChange={(open) => !open && setPreviewBundle(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Receipt preview</DialogTitle>
          </DialogHeader>
          {previewBundle ? (
            <div className="px-2 pb-6">
              <div ref={printRef}>
                <StoreItemRegistrationReceipt
                  bundle={previewBundle}
                  propertyName={propertyName}
                  propertyTin={resolvedTin}
                  logoUrl={logoUrl}
                />
              </div>
              <div className="flex justify-end gap-2 px-6 pt-4 print:hidden">
                <Button variant="outline" onClick={() => setPreviewBundle(null)}>
                  Close
                </Button>
                <Button className="gap-2" onClick={() => handlePrint()}>
                  <Printer className="h-4 w-4" />
                  Print receipt
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
