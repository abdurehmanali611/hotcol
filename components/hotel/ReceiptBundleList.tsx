"use client";

import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bundleItemSummary,
  bundleReceivedLabel,
  bundleSupplierName,
  bundleTotalETB,
  bundleTypeLabel,
  type ReceiptBundle,
} from "@/lib/receiptGrouping";
import { cn } from "@/lib/utils";

export function ReceiptBundleList({
  bundles,
  searchPlaceholder = "Search receipts…",
  emptyMessage = "No receipts to show.",
  onViewReceipt,
}: {
  bundles: ReceiptBundle[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  onViewReceipt: (bundle: ReceiptBundle) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bundles;
    return bundles.filter((b) => {
      const hay = [
        b.title,
        bundleTypeLabel(b),
        bundleSupplierName(b),
        bundleItemSummary(b),
        b.date,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [bundles, query]);

  if (bundles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        className="h-10 max-w-md bg-background/80"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No receipts match your search.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((bundle) => (
            <ReceiptBundleRow
              key={`${bundle.kind}-${bundle.id}`}
              bundle={bundle}
              onViewReceipt={() => onViewReceipt(bundle)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReceiptBundleRow({
  bundle,
  onViewReceipt,
}: {
  bundle: ReceiptBundle;
  onViewReceipt: () => void;
}) {
  const total = bundleTotalETB(bundle);

  return (
    <li
      className={cn(
        "rounded-xl border border-border/60 bg-background/70 px-4 py-3.5 sm:px-5",
        "flex flex-wrap items-center gap-3 gap-y-2",
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold leading-snug text-foreground">
          {bundle.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {bundleReceivedLabel(bundle)} · {bundleSupplierName(bundle)} ·{" "}
          {bundleTypeLabel(bundle)}
          {bundle.paymentLabel ? ` · ${bundle.paymentLabel}` : ""}
        </p>
        <p className="text-xs text-foreground/80 line-clamp-2">
          {bundleItemSummary(bundle)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Badge variant="outline" className="font-normal text-[10px]">
          {bundle.lines.length} line{bundle.lines.length !== 1 ? "s" : ""}
        </Badge>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          ETB {total.toLocaleString()}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 border-primary/20 hover:bg-primary/5"
          onClick={onViewReceipt}
        >
          <Receipt className="h-3.5 w-3.5" />
          View receipt
        </Button>
      </div>
    </li>
  );
}
