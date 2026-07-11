"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ChevronRight, Layers3 } from "lucide-react";

function sourceBadge(row: InventoryPaymentRow) {
  if (row.paymentSource === "fresh_bazaar") {
    return (
      <Badge
        variant="outline"
        className="w-fit text-[9px] font-normal border-cyan-500/30 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200"
      >
        Fresh bazaar
      </Badge>
    );
  }
  if (row.paymentSource === "depleted") {
    return (
      <Badge
        variant="outline"
        className="w-fit text-[9px] font-normal border-border/70 bg-muted/40 text-muted-foreground"
      >
        Stocked out
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="w-fit text-[9px] font-normal border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
    >
      In store
    </Badge>
  );
}

function paymentBadgeClass(bucket: ReturnType<typeof itemPaymentBucket>) {
  if (bucket === "paid")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (bucket === "credit")
    return "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  return "border-border/70 bg-muted/50 text-muted-foreground";
}

function LineDetailCard({
  line,
  compact = false,
}: {
  line: InventoryPaymentRow;
  compact?: boolean;
}) {
  const qty = registeredAmountOf(line);
  const bucket = itemPaymentBucket(line);
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card/80 transition-colors",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-1">
        {sourceBadge(line)}
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {rowRegistrationYmd(line.registrationDate) || "—"}
        </span>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium tabular-nums">
          {formatQtyWithUnit(qty, line.measuredBy)}
          <span className="text-muted-foreground font-normal">
            {" "}
            · {lineOwedETB(line).toLocaleString()} ETB
          </span>
        </p>
        <Badge
          variant="outline"
          className={cn("font-normal text-[10px]", paymentBadgeClass(bucket))}
        >
          {itemPaymentLabel(bucket)}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground truncate">
        <span className="text-foreground/90">{line.supplierName || "—"}</span>
        {isVatEnabled(line.purchaseWithVat) ? " · With VAT" : " · Without VAT"}
        {creditAmountETB(line) > 0.01
          ? ` · Credit ${creditAmountETB(line).toLocaleString()} ETB`
          : ""}
      </p>
      {!compact && (line.supplierTinNumber || "").trim() ? (
        <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
          TIN {(line.supplierTinNumber || "").trim()}
        </p>
      ) : null}
    </div>
  );
}

function linesGroupedBySupplier(lines: InventoryPaymentRow[]) {
  const map = new Map<string, InventoryPaymentRow[]>();
  for (const line of lines) {
    const key = String(line.supplierName ?? "").trim() || "Unknown supplier";
    const list = map.get(key);
    if (list) list.push(line);
    else map.set(key, [line]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function PreviewBody({ group }: { group: InventoryPaymentItemGroup }) {
  const preview = group.lines.slice(0, 5);
  const more = group.lines.length - preview.length;
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{group.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {formatPaymentSourceBreakdown(group)}
          </p>
        </div>
        <p className="text-xs font-semibold tabular-nums shrink-0">
          {group.totalLineValue.toLocaleString()} ETB
        </p>
      </div>
      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
        {preview.map((line) => (
          <LineDetailCard key={line.id} line={line} compact />
        ))}
      </div>
      {more > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          +{more} more line{more === 1 ? "" : "s"} — click for full detail
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Click for full detail
        </p>
      )}
    </div>
  );
}

function SheetBody({
  group,
  focusSuppliers,
}: {
  group: InventoryPaymentItemGroup;
  focusSuppliers: boolean;
}) {
  const bySupplier = linesGroupedBySupplier(group.lines);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-2 rounded-xl border border-border/60 bg-muted/25 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Layers3 className="h-3.5 w-3.5 opacity-70" />
            {group.lineCount} line{group.lineCount === 1 ? "" : "s"}
          </span>
          <span aria-hidden>·</span>
          <span>{formatPaymentSourceBreakdown(group)}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
          <span>
            <span className="text-muted-foreground text-xs">Qty </span>
            <span className="font-semibold">
              {formatQtyWithUnit(group.totalQty, group.measuredBy)}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground text-xs">Value </span>
            <span className="font-semibold">
              {group.totalLineValue.toLocaleString()} ETB
            </span>
          </span>
          {group.totalCredit > 0.01 ? (
            <span>
              <span className="text-muted-foreground text-xs">Credit </span>
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                {group.totalCredit.toLocaleString()} ETB
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {focusSuppliers || bySupplier.length > 1
          ? bySupplier.map(([supplier, lines]) => {
              const subtotal = lines.reduce((s, l) => s + lineOwedETB(l), 0);
              return (
                <section key={supplier} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-1">
                    <h3 className="text-sm font-semibold truncate">{supplier}</h3>
                    <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                      {lines.length} · {subtotal.toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {lines.map((line) => (
                      <LineDetailCard key={line.id} line={line} />
                    ))}
                  </div>
                </section>
              );
            })
          : group.lines.map((line) => (
              <LineDetailCard key={line.id} line={line} />
            ))}
      </div>
    </div>
  );
}

export function InventoryPaymentGroupDetailTrigger({
  group,
  children,
  className,
  openFocus = "lines",
}: {
  group: InventoryPaymentItemGroup;
  children: ReactNode;
  className?: string;
  /** Prefer supplier-grouped layout when opened from the supplier cell. */
  openFocus?: "lines" | "suppliers";
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetFocus, setSheetFocus] = useState<"lines" | "suppliers">("lines");
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const schedulePreviewOpen = () => {
    if (sheetOpen) return;
    clearTimers();
    openTimer.current = setTimeout(() => setPreviewOpen(true), 220);
  };

  const schedulePreviewClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setPreviewOpen(false), 160);
  };

  const openSheet = () => {
    clearTimers();
    setPreviewOpen(false);
    setSheetFocus(openFocus);
    setSheetOpen(true);
  };

  return (
    <>
      <Popover
        open={previewOpen && !sheetOpen}
        onOpenChange={(next) => {
          if (!next) setPreviewOpen(false);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "group/detail max-w-full rounded-md text-left outline-none transition-colors",
              "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40",
              "cursor-pointer",
              className,
            )}
            onMouseEnter={schedulePreviewOpen}
            onMouseLeave={schedulePreviewClose}
            onFocus={schedulePreviewOpen}
            onBlur={schedulePreviewClose}
            onClick={(e) => {
              e.stopPropagation();
              openSheet();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openSheet();
              }
            }}
            aria-label={`Details for ${group.name}`}
          >
            <span className="inline-flex max-w-full items-center gap-1">
              <span className="min-w-0 flex-1">{children}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/detail:opacity-70" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          className="w-[min(100vw-2rem,22rem)] p-3 shadow-lg border-border/70"
          onMouseEnter={schedulePreviewOpen}
          onMouseLeave={schedulePreviewClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <PreviewBody group={group} />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3 w-full cursor-pointer"
            onClick={openSheet}
          >
            Open full detail
          </Button>
        </PopoverContent>
      </Popover>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-lg p-0"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-5 py-4 pr-12 text-left">
            <SheetTitle className="text-base leading-snug">{group.name}</SheetTitle>
            <SheetDescription className="text-xs text-pretty">
              Purchase lines for this item — fresh bazaar, stocked out, and store
              balances stay separate so payment stays auditable.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            <SheetBody
              group={group}
              focusSuppliers={sheetFocus === "suppliers"}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
