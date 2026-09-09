"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { displayKitchenBarStation } from "@/lib/hotelDailyStation";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import type { MenuItemUsageGroup } from "@/lib/dataTableColumns/recipeUsage";

function formatQty(n: number, unit?: string): string {
  const q = Number(n) || 0;
  const formatted =
    Math.abs(q - Math.round(q)) < 1e-9
      ? String(Math.round(q))
      : q.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const u = String(unit || "").trim();
  return u ? `${formatted} ${u}` : formatted;
}

function formatWhen(iso: Date | string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PreviewBody({ group }: { group: MenuItemUsageGroup }) {
  const preview = group.ingredientUsage.slice(0, 5);
  const more = group.ingredientUsage.length - preview.length;
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{group.menuItemTitle}</p>
          <p className="text-[11px] text-muted-foreground">
            {group.orderCount} order{group.orderCount === 1 ? "" : "s"} ·{" "}
            {group.servingTotal} serving
            {group.servingTotal === 1 ? "" : "s"} ·{" "}
            {displayKitchenBarStation(group.station)}
          </p>
        </div>
        <p className="text-xs font-semibold tabular-nums shrink-0">
          −{group.servingTotal}
        </p>
      </div>
      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
        {preview.map((line) => (
          <div
            key={line.ingredientName}
            className="rounded-lg border border-border/60 bg-card/80 px-2.5 py-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium truncate">
                {line.ingredientName}
              </p>
              <p className="text-sm font-semibold tabular-nums shrink-0">
                −{formatQty(line.amount, line.measuredBy)}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {line.lineCount} deduction{line.lineCount === 1 ? "" : "s"}
            </p>
          </div>
        ))}
      </div>
      {more > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          +{more} more ingredient{more === 1 ? "" : "s"} — click for full detail
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">Click for full detail</p>
      )}
    </div>
  );
}

function SheetBody({ group }: { group: MenuItemUsageGroup }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-2 rounded-xl border border-border/60 bg-muted/25 p-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
          <span>
            <span className="text-muted-foreground text-xs">Orders </span>
            <span className="font-semibold">{group.orderCount}</span>
          </span>
          <span>
            <span className="text-muted-foreground text-xs">Servings </span>
            <span className="font-semibold">{group.servingTotal}</span>
          </span>
          <span>
            <span className="text-muted-foreground text-xs">On hand </span>
            <span className="font-semibold">
              {Number.isFinite(group.servingsAvailable)
                ? `${group.servingsAvailable} left`
                : "—"}
            </span>
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Ingredients used</h3>
          <div className="space-y-1.5">
            {group.ingredientUsage.map((line) => (
              <div
                key={line.ingredientName}
                className="rounded-lg border border-border/60 bg-card/80 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{line.ingredientName}</p>
                  <p className="text-sm font-semibold tabular-nums">
                    −{formatQty(line.amount, line.measuredBy)}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {line.lineCount} deduction{line.lineCount === 1 ? "" : "s"} in
                  range
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Recent deductions</h3>
          <div className="space-y-1.5">
            {group.recentLines.map((line) => (
              <div
                key={line.id}
                className="rounded-lg border border-border/60 bg-card/80 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">
                    {line.ingredientName}
                  </p>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {formatWhen(line.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  −{formatQty(line.amount, line.measuredBy)} · order #
                  {line.orderId} ×{line.orderAmount}
                  {line.completedBy ? ` · ${line.completedBy}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function MenuItemUsageDetailTrigger({
  group,
  children,
  className,
}: {
  group: MenuItemUsageGroup;
  children: ReactNode;
  className?: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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
            aria-label={`Usage details for ${group.menuItemTitle}`}
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
            <SheetTitle className="text-base leading-snug">
              {group.menuItemTitle}
            </SheetTitle>
            <SheetDescription className="text-xs text-pretty">
              Recipe usage for this menu item — hover preview and full sheet keep
              ingredient deductions auditable.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            <SheetBody group={group} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function MenuItemUsageTriggerBadge({
  group,
}: {
  group: MenuItemUsageGroup;
}) {
  return (
    <MenuItemUsageDetailTrigger group={group} className="px-1 py-0.5 -mx-1">
      <Badge variant="outline" className="tabular-nums font-medium cursor-pointer">
        −{group.servingTotal} serving{group.servingTotal === 1 ? "" : "s"}
      </Badge>
    </MenuItemUsageDetailTrigger>
  );
}
