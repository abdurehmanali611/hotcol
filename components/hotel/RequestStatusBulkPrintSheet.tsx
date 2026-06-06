"use client";

import { useMemo, useRef } from "react";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { StoreItemRegistrationReceipt } from "@/components/hotel/StoreItemRegistrationReceipt";
import type { ReceiptBundle } from "@/lib/receiptGrouping";
import { paginateBundlesForA4Print } from "@/lib/receiptPrintPagination";
import { cn } from "@/lib/utils";

export function RequestStatusBulkPrintActions({
  bundles,
  propertyName,
  propertyTin,
  logoUrl,
}: {
  bundles: ReceiptBundle[];
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
}) {
  const bulkPrintRef = useRef<HTMLDivElement>(null);
  const resolvedTin =
    propertyTin ??
    (typeof window !== "undefined"
      ? localStorage.getItem("tin_number")?.trim() || null
      : null);

  const printPages = useMemo(
    () => paginateBundlesForA4Print(bundles),
    [bundles],
  );

  const handleBulkPrint = useReactToPrint({
    contentRef: bulkPrintRef,
    documentTitle: `Request_Receipts_${bundles.length || "batch"}`,
  });

  if (bundles.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 shrink-0"
        title={`${bundles.length} authorized receipt${bundles.length !== 1 ? "s" : ""} on ${printPages.length} A4 sheet${printPages.length !== 1 ? "s" : ""}`}
        onClick={() => handleBulkPrint()}
      >
        <Printer className="h-3.5 w-3.5" />
        Print filtered ({bundles.length})
      </Button>
      <div
        aria-hidden
        className="fixed left-[-9999px] top-0 w-0 h-0 overflow-hidden"
      >
        <div ref={bulkPrintRef} className="receipt-bulk-print-root">
          {printPages.map((pageBundles, pageIndex) => (
            <div
              key={`print-page-${pageIndex}`}
              className="receipt-print-sheet"
            >
              {pageBundles.map((bundle, slotIndex) => (
                <div
                  key={bundle.key}
                  className={cn(
                    "receipt-print-slot",
                    pageBundles.length === 1 && "receipt-print-slot--solo",
                    slotIndex === 1 && "receipt-print-slot--second",
                  )}
                >
                  <StoreItemRegistrationReceipt
                    bundle={bundle}
                    propertyName={propertyName}
                    propertyTin={resolvedTin}
                    logoUrl={logoUrl}
                    layout="bulk"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
