"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import type { ReceiptBundle } from "@/lib/receiptGrouping";

export function RequestStatusReceiptActions({
  onPreview,
}: {
  onPreview: () => void;
}) {
  return (
    <div className="flex justify-end">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5 h-8 border-primary/20 hover:bg-primary/5"
        onClick={onPreview}
      >
        <Receipt className="h-3.5 w-3.5" />
        View receipt
      </Button>
    </div>
  );
}

export function buildRequestStatusReceiptColumn<T>(opts: {
  pool: T[];
  canPrintRow: (row: T) => boolean;
  buildBundle: (row: T, pool: T[]) => ReceiptBundle | null;
  openPreview: (bundle: ReceiptBundle, canPrint: boolean) => void;
}): {
  id: string;
  header: () => ReactNode;
  cell: (ctx: { row: { original: T } }) => ReactNode;
} {
  return {
    id: "receipt",
    header: () => (
      <span className="block text-right w-full">Receipt</span>
    ),
    cell: ({ row }) => {
      const r = row.original;
      const bundle = opts.buildBundle(r, opts.pool);
      if (!bundle) {
        return <span className="text-muted-foreground text-xs">—</span>;
      }
      const printable = opts.canPrintRow(r);
      return (
        <RequestStatusReceiptActions
          onPreview={() => opts.openPreview(bundle, printable)}
        />
      );
    },
  };
}
