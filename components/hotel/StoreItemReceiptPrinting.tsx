"use client";

import { useMemo, useRef, useState } from "react";
import type { ItemRegistration, PurchaseRequestRow } from "@/lib/actions";
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
import {
  StoreItemRegistrationReceipt,
  type ReceiptGroupItem,
} from "./StoreItemRegistrationReceipt";
import {
  bundleItemsToPrint,
  bundleReceivedLabel,
  bundleSupplierName,
  bundleTotalETB,
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
      header: "Received",
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap font-medium">
          {bundleReceivedLabel(row.original)}
        </span>
      ),
    },
    {
      id: "supplier",
      header: "Supplier",
      accessorFn: (row) => bundleSupplierName(row),
      cell: ({ row }) => {
        const first = row.original.items[0];
        return (
          <div className="max-w-[180px]">
            <p className="text-sm font-medium truncate">
              {bundleSupplierName(row.original)}
            </p>
            {first?.supplierPhone ? (
              <p className="text-[10px] text-muted-foreground truncate">
                {first.supplierPhone}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "lines",
      header: "Items on receipt",
      cell: ({ row }) => {
        const names = row.original.items.map((i) => i.name);
        const preview =
          names.length <= 3
            ? names.join(", ")
            : `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
        return (
          <div className="min-w-[160px] max-w-[280px]">
            <p className="text-sm text-foreground leading-snug">{preview}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {row.original.items.length} line
              {row.original.items.length !== 1 ? "s" : ""} · one combined print
            </p>
          </div>
        );
      },
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
          Print{row.original.items.length > 1 ? ` (${row.original.items.length})` : ""}
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
}: {
  items: ItemRegistration[];
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  purchaseRequests?: PurchaseRequestRow[];
}) {
  const [previewBundle, setPreviewBundle] = useState<ReceiptGroupItem[] | null>(
    null,
  );
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: previewBundle?.[0]
      ? `Receipt_${previewBundle[0].supplierName}_${new Date(
          previewBundle[0].registrationDate,
        ).toISOString().slice(0, 10)}`
      : "Store_Receipt",
  });

  const bundles = useMemo(
    () => groupRegistrationsForReceipt(items, purchaseRequests),
    [items, purchaseRequests],
  );

  const lineCount = useMemo(
    () => bundles.reduce((n, b) => n + b.items.length, 0),
    [bundles],
  );

  const openPrintBundle = (bundle: ReceiptBundle) => {
    setPreviewBundle(bundleItemsToPrint(bundle));
    requestAnimationFrame(() => handlePrint());
  };

  const cols = useMemo(() => bundleColumns(openPrintBundle), []);

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
                Registrations with the same supplier and received date are
                grouped into one receipt. Use a single print action per group.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            {bundles.length} receipt group{bundles.length !== 1 ? "s" : ""}
          </span>
          <Badge variant="secondary" className="font-normal">
            {lineCount} registration line{lineCount !== 1 ? "s" : ""}
          </Badge>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable
          columns={cols}
          data={bundles}
          getRowId={(row) => String(row.id)}
          searchColumnId="supplier"
          emptyMessage="No registration lines to print."
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
                  items={previewBundle}
                  propertyName={propertyName}
                  propertyTin={propertyTin}
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
