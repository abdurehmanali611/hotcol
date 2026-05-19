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
import { Printer, Receipt } from "lucide-react";
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

function bundleColumns(
  onPrint: (bundle: ReceiptBundle) => void,
): ColumnDef<ReceiptBundle>[] {
  return [
    {
      id: "received",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap font-medium">
          {bundleReceivedLabel(row.original)}
        </span>
      ),
    },
    {
      id: "type",
      header: "Receipt",
      cell: ({ row }) => (
        <div className="max-w-[220px]">
          <p className="text-sm font-medium leading-snug">{row.original.title}</p>
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
          <div className="max-w-[180px]">
            <p className="text-sm font-medium truncate">
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
        <div className="min-w-[160px] max-w-[280px]">
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
          <Badge variant="outline" className="font-normal">
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
        <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
          ETB {bundleTotalETB(row.original).toLocaleString()}
        </span>
      ),
    },
    {
      id: "print",
      header: "",
      cell: ({ row }) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => onPrint(row.original)}
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>
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
}: {
  items: ItemRegistration[];
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  purchaseRequests?: PurchaseRequestRow[];
  stockMovements?: StockOutRequestRow[];
}) {
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
    () => groupRegistrationsForReceipt(items, purchaseRequests, stockMovements),
    [items, purchaseRequests, stockMovements],
  );

  const lineCount = useMemo(
    () => bundles.reduce((n, b) => n + b.lines.length, 0),
    [bundles],
  );

  const openPrintBundle = useCallback(
    (bundle: ReceiptBundle) => {
      setPreviewBundle(bundleItemsToPrint(bundle));
      requestAnimationFrame(() => handlePrint());
    },
    [handlePrint],
  );

  const cols = useMemo(() => bundleColumns(openPrintBundle), [openPrintBundle]);

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
              <CardTitle className="text-lg">Item receipt printing</CardTitle>
              <CardDescription className="max-w-2xl text-pretty">
                Print new item registration, purchase request, and stock movement
                receipts. Multi-item receipts are grouped by supplier, date, and
                payment status when payment applies.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            {bundles.length} receipt group{bundles.length !== 1 ? "s" : ""}
          </span>
          <Badge variant="secondary" className="font-normal">
            {lineCount} line{lineCount !== 1 ? "s" : ""}
          </Badge>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable
          columns={cols}
          data={bundles}
          getRowId={(row) => String(row.id)}
          searchColumnId="supplier"
          emptyMessage="No receipt lines to print."
        />
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
