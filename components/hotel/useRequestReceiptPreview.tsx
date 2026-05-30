"use client";

import { useCallback, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StoreItemRegistrationReceipt } from "@/components/hotel/StoreItemRegistrationReceipt";
import {
  bundleItemsToPrint,
  type ReceiptBundle,
} from "@/lib/receiptGrouping";

export function useRequestReceiptPreview({
  propertyName,
  propertyTin,
  logoUrl,
}: {
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [bundle, setBundle] = useState<ReceiptBundle | null>(null);
  const [canPrint, setCanPrint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: bundle
      ? `${bundle.title.replace(/\s+/g, "_")}_${bundle.date || "receipt"}`
      : "Request_Receipt",
  });

  const openPreview = useCallback(
    (next: ReceiptBundle, printable: boolean) => {
      setBundle(bundleItemsToPrint(next));
      setCanPrint(printable);
      setOpen(true);
    },
    [],
  );

  const resolvedTin =
    propertyTin ??
    (typeof window !== "undefined"
      ? localStorage.getItem("tin_number")?.trim() || null
      : null);

  const ReceiptPreviewDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden p-0 gap-0 border-border/80 shadow-2xl">
        <div className="h-1 bg-linear-to-r from-primary/60 via-emerald-500/45 to-cyan-500/35" />
        <DialogHeader className="px-6 pt-6 pb-3 space-y-2 border-b border-border/50 bg-muted/15">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1 min-w-0">
              <DialogTitle className="text-lg tracking-tight">
                Receipt preview
              </DialogTitle>
              <DialogDescription className="text-pretty">
                {canPrint
                  ? "This matches the authorized receipt. Use Print below when you are ready."
                  : "Preview only. Printing unlocks after manager authorization."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {bundle ? (
          <div className="overflow-y-auto max-h-[calc(92vh-11rem)]">
            <div className="px-4 py-4 sm:px-6">
              <div
                ref={printRef}
                className="rounded-xl border border-border/60 bg-white dark:bg-card shadow-sm overflow-hidden"
              >
                <StoreItemRegistrationReceipt
                  bundle={bundle}
                  propertyName={propertyName}
                  propertyTin={resolvedTin}
                  logoUrl={logoUrl}
                />
              </div>
            </div>
            <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-border/60 bg-background/95 backdrop-blur-sm print:hidden">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              {canPrint ? (
                <Button className="gap-2 shadow-sm" onClick={() => handlePrint()}>
                  <Printer className="h-4 w-4" />
                  Print receipt
                </Button>
              ) : (
                <Button disabled className="gap-2" title="Authorize first">
                  <Printer className="h-4 w-4" />
                  Print (after authorization)
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );

  return { openPreview, ReceiptPreviewDialog };
}
