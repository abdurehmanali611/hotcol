"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  ItemRegistration,
  ItemStatus,
  PurchaseRequestRow,
  StockOutRequestRow,
  FreshBazaarRow,
} from "@/lib/actions";
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
import { bundleItemsToPrint, groupRegistrationsForReceipt, type ReceiptBundle } from "@/lib/receiptGrouping";
import { ReceiptBundleList } from "@/components/hotel/ReceiptBundleList";
import { RequestTypeCollapsibleSection } from "@/components/hotel/RequestTypeCollapsibleSection";
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
      "Grouped purchase request vouchers — expand a row, then view and print from preview.",
    emptyMessage: "No purchase request receipts to print.",
    searchPlaceholder: "Search purchase request receipts...",
    icon: FileText,
    accentClassName: "from-sky-500/70 via-cyan-500/55 to-teal-400/45",
  },
  {
    kind: "registration",
    title: "New item registration",
    description:
      "Registration receipts grouped by supplier, date, and payment when applicable.",
    emptyMessage: "No new item registration receipts to print.",
    searchPlaceholder: "Search new registrations...",
    icon: PackagePlus,
    accentClassName: "from-emerald-500/70 via-green-500/55 to-lime-400/45",
  },
  {
    kind: "stock_movement",
    title: "Stock movement",
    description:
      "Stock movement vouchers with titles such as stock out movement receipt.",
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
      "Goods receiving vouchers for authorized registrations and petty-cash stock-in.",
    emptyMessage: "No item receipts ready to print.",
    searchPlaceholder: "Search item receipts...",
    icon: PackagePlus,
    accentClassName: "from-emerald-500/70 via-green-500/55 to-lime-400/45",
  },
];

export function StoreItemReceiptPrinting({
  items,
  propertyName,
  propertyTin,
  logoUrl,
  purchaseRequests = [],
  stockMovements = [],
  itemStatusHistory = [],
  freshBazaarArchives = [],
  variant = "hotel",
}: {
  items: ItemRegistration[];
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  purchaseRequests?: PurchaseRequestRow[];
  stockMovements?: StockOutRequestRow[];
  /** Inactive rows for stock-out unit price when inventory registration was removed. */
  itemStatusHistory?: ItemStatus[];
  /** Kitchen fresh-bazaar archives when inventory registration was removed. */
  freshBazaarArchives?: FreshBazaarRow[];
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
  const [previewCanPrint, setPreviewCanPrint] = useState(true);
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
        itemStatusHistory,
        freshBazaarArchives,
      }),
    [items, purchaseRequests, stockMovements, isCafe, itemStatusHistory, freshBazaarArchives],
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

  const openReceiptPreview = useCallback((bundle: ReceiptBundle) => {
    setPreviewBundle(bundleItemsToPrint(bundle));
    setPreviewCanPrint(true);
  }, []);

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
                  ? "Expand item receipts to list vouchers, then open View receipt and print from the preview."
                  : "Expand purchase, registration, or stock movement to list receipts, then open View receipt and print from the preview."}
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

      <div className="space-y-4">
        {bundles.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-6 py-10 text-center">
            {isCafe
              ? "No item receipts to show yet. They appear here once items are registered in the store."
              : "No authorized receipts to show yet. They appear here after requests are approved through the pipeline."}
          </p>
        ) : null}
        {sectionBundles
          .filter((section) => section.bundles.length > 0)
          .map((section) => (
          <RequestTypeCollapsibleSection
            key={section.kind}
            title={section.title}
            count={section.totalLines}
            accentBarClassName={section.accentClassName}
            summary={`${section.bundles.length} receipt${section.bundles.length !== 1 ? "s" : ""} · ETB ${section.totalValue.toLocaleString()} — ${section.description}`}
          >
            <ReceiptBundleList
              bundles={section.bundles}
              searchPlaceholder={section.searchPlaceholder}
              emptyMessage={section.emptyMessage}
              onViewReceipt={openReceiptPreview}
            />
          </RequestTypeCollapsibleSection>
        ))}
      </div>

      <Dialog
        open={!!previewBundle}
        onOpenChange={(open) => !open && setPreviewBundle(null)}
      >
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden p-0 gap-0 border-border/80 shadow-2xl">
          <div className="h-1 bg-linear-to-r from-primary/60 via-emerald-500/45 to-cyan-500/35" />
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/50 bg-muted/15">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1 min-w-0">
                <DialogTitle className="text-lg tracking-tight">
                  Receipt preview
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {previewCanPrint
                    ? "Authorized receipt — print when ready."
                    : "Preview only until authorization."}
                </p>
              </div>
            </div>
          </DialogHeader>
          {previewBundle ? (
            <div className="overflow-y-auto max-h-[calc(92vh-11rem)]">
              <div className="px-4 py-4 sm:px-6">
                <div
                  ref={printRef}
                  className="rounded-xl border border-border/60 bg-white dark:bg-card shadow-sm overflow-hidden"
                >
                  <StoreItemRegistrationReceipt
                    bundle={previewBundle}
                    propertyName={propertyName}
                    propertyTin={resolvedTin}
                    logoUrl={logoUrl}
                  />
                </div>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 px-6 py-4 border-t border-border/60 bg-background/95 backdrop-blur-sm print:hidden">
                <Button variant="outline" onClick={() => setPreviewBundle(null)}>
                  Close
                </Button>
                {previewCanPrint ? (
                  <Button className="gap-2 shadow-sm" onClick={() => handlePrint()}>
                    <Printer className="h-4 w-4" />
                    Print receipt
                  </Button>
                ) : (
                  <Button disabled className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print (after authorization)
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
