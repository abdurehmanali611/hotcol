"use client";

import { useMemo, useRef, useState } from "react";
import type { ItemRegistration } from "@/lib/actions";
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
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import { lineOwedETB, itemPaymentLabel, itemPaymentBucket } from "@/lib/hotelInventoryPayment";
import { isVatEnabled } from "@/lib/hotelInventoryPayment";
import { Printer, Receipt } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  StoreItemRegistrationReceipt,
  type ReceiptGroupItem,
} from "./StoreItemRegistrationReceipt";
import { groupRegistrationsForReceipt } from "@/lib/receiptGrouping";
import { formatVoucherDisplay } from "@/lib/voucherFormat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function receiptColumns(
  onPrint: (item: ItemRegistration) => void,
): ColumnDef<ItemRegistration>[] {
  return [
    {
      accessorKey: "name",
      header: "Item",
      cell: ({ row }) => (
        <div className="min-w-[140px]">
          <p className="font-semibold text-sm">{row.original.name}</p>
          <p className="text-[10px] text-muted-foreground uppercase">
            {row.original.category} · #{row.original.id}
          </p>
        </div>
      ),
    },
    {
      id: "qty",
      header: "Quantity",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums whitespace-nowrap">
          {formatQtyWithUnit(row.original.amount, row.original.measuredBy)}
        </span>
      ),
    },
    {
      accessorKey: "supplierName",
      header: "Supplier",
      cell: ({ row }) => (
        <div className="max-w-[160px]">
          <p className="text-sm font-medium truncate">{row.original.supplierName}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {row.original.supplierPhone}
          </p>
        </div>
      ),
    },
    {
      id: "value",
      header: "Line value",
      cell: ({ row }) => (
        <span className="text-sm font-semibold tabular-nums">
          ETB {lineOwedETB(row.original).toLocaleString()}
        </span>
      ),
    },
    {
      id: "vat",
      header: "VAT",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {isVatEnabled(row.original.purchaseWithVat) ? "With VAT" : "No VAT"}
        </Badge>
      ),
    },
    {
      id: "payment",
      header: "Payment",
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[10px]">
          {itemPaymentLabel(itemPaymentBucket(row.original))}
        </Badge>
      ),
    },
    {
      id: "received",
      header: "Received",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.original.registrationDate).toLocaleDateString()}
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
}: {
  items: ItemRegistration[];
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  purchaseRequests?: import("@/lib/actions").PurchaseRequestRow[];
}) {
  const [previewBundle, setPreviewBundle] = useState<ReceiptGroupItem[] | null>(
    null,
  );
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: previewBundle?.[0]
      ? `Receipt_${previewBundle[0].name}_${previewBundle[0].id}`
      : "Store_Receipt",
  });

  const bundles = useMemo(
    () => groupRegistrationsForReceipt(items, purchaseRequests),
    [items, purchaseRequests],
  );

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.registrationDate).getTime() -
          new Date(a.registrationDate).getTime(),
      ),
    [items],
  );

  const openPrintBundle = (bundleItems: ItemRegistration[]) => {
    const withPr: ReceiptGroupItem[] = bundleItems.map((it) => {
      const bundle = bundles.find((b) => b.items.some((x) => x.id === it.id));
      return {
        ...it,
        purchaseRequestVoucher: bundle?.purchaseRequestVoucher ?? null,
      };
    });
    setPreviewBundle(withPr);
    requestAnimationFrame(() => handlePrint());
  };

  const openPrint = (item: ItemRegistration) => {
    const bundle = bundles.find((b) => b.items.some((x) => x.id === item.id));
    openPrintBundle(bundle?.items ?? [item]);
  };

  const cols = useMemo(() => receiptColumns(openPrint), []);

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
                Every registration line is listed separately — including
                duplicate item names from different suppliers. Print a receiving
                receipt for each batch.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {sorted.length} registration line{sorted.length !== 1 ? "s" : ""}
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable
          columns={cols}
          data={sorted}
          searchColumnId="name"
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
