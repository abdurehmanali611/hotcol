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
import {
  ChevronRight,
  Coffee,
  Layers3,
  Sparkles,
  Utensils,
} from "lucide-react";
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

function StationBadge({ station }: { station: string }) {
  const isBar = String(station).toUpperCase().includes("BAR");
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] font-normal",
        isBar
          ? "border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-200"
          : "border-sky-500/25 bg-sky-500/10 text-sky-900 dark:text-sky-200",
      )}
    >
      {isBar ? (
        <Coffee className="h-3 w-3" />
      ) : (
        <Utensils className="h-3 w-3" />
      )}
      {displayKitchenBarStation(station)}
    </Badge>
  );
}

function IngredientLineCard({
  name,
  amount,
  measuredBy,
  lineCount,
  compact = false,
}: {
  name: string;
  amount: number;
  measuredBy: string;
  lineCount: number;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-linear-to-br from-card to-muted/20 shadow-sm transition-colors",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-sm font-semibold tabular-nums shrink-0 text-rose-700 dark:text-rose-300">
          −{formatQty(amount, measuredBy)}
        </p>
      </div>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        {lineCount} deduction{lineCount === 1 ? "" : "s"}
        {!compact ? " in selected range" : ""}
      </p>
    </div>
  );
}

function PreviewBody({ group }: { group: MenuItemUsageGroup }) {
  const preview = group.ingredientUsage.slice(0, 5);
  const more = group.ingredientUsage.length - preview.length;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold tracking-tight truncate">
            {group.menuItemTitle}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StationBadge station={group.station} />
            <span className="text-[11px] text-muted-foreground">
              {group.orderCount} order{group.orderCount === 1 ? "" : "s"} ·{" "}
              {group.servingTotal} serving
              {group.servingTotal === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-rose-700 dark:text-rose-300">
          −{group.servingTotal}
        </div>
      </div>

      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
        {preview.map((line) => (
          <IngredientLineCard
            key={line.ingredientName}
            name={line.ingredientName}
            amount={line.amount}
            measuredBy={line.measuredBy}
            lineCount={line.lineCount}
            compact
          />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 opacity-70" />
        {more > 0
          ? `+${more} more ingredient${more === 1 ? "" : "s"} — open full detail`
          : "Click for the full usage sheet"}
      </p>
    </div>
  );
}

function SheetBody({ group }: { group: MenuItemUsageGroup }) {
  const onHand = Number.isFinite(group.servingsAvailable)
    ? group.servingsAvailable
    : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
      <div className="shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-linear-to-br from-muted/40 via-background to-primary/5 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Layers3 className="h-3.5 w-3.5 text-primary/80" />
            {group.ingredientUsage.length} ingredient
            {group.ingredientUsage.length === 1 ? "" : "s"}
          </span>
          <StationBadge station={group.station} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Orders", value: String(group.orderCount) },
            { label: "Servings used", value: String(group.servingTotal) },
            {
              label: "On hand",
              value: onHand == null ? "—" : `${onHand} left`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/50 bg-background/70 px-2.5 py-2 text-center shadow-sm backdrop-blur-sm"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ingredients used
          </h3>
          <div className="space-y-1.5">
            {group.ingredientUsage.map((line) => (
              <IngredientLineCard
                key={line.ingredientName}
                name={line.ingredientName}
                amount={line.amount}
                measuredBy={line.measuredBy}
                lineCount={line.lineCount}
              />
            ))}
          </div>
        </section>

        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent deductions
          </h3>
          <div className="space-y-1.5">
            {group.recentLines.map((line) => (
              <div
                key={line.id}
                className="rounded-xl border border-border/50 bg-card/90 px-3 py-2.5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">
                    {line.ingredientName}
                  </p>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {formatWhen(line.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium tabular-nums text-rose-700 dark:text-rose-300">
                    −{formatQty(line.amount, line.measuredBy)}
                  </span>
                  {" · "}order #{line.orderId} ×{line.orderAmount}
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
              "group/detail max-w-full rounded-md text-left outline-none transition-all",
              "hover:bg-muted/55 focus-visible:ring-2 focus-visible:ring-ring/40",
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
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all group-hover/detail:translate-x-0.5 group-hover/detail:opacity-80" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={8}
          className="w-[min(100vw-2rem,23rem)] rounded-2xl border-border/70 p-3.5 shadow-xl"
          onMouseEnter={schedulePreviewOpen}
          onMouseLeave={schedulePreviewClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <PreviewBody group={group} />
          <Button
            type="button"
            size="sm"
            className="mt-3.5 w-full cursor-pointer rounded-xl"
            onClick={openSheet}
          >
            Open full detail
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </PopoverContent>
      </Popover>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-l border-border/70 p-0 sm:max-w-lg"
        >
          <SheetHeader className="shrink-0 space-y-1.5 border-b border-border/60 bg-linear-to-br from-background via-background to-primary/4 px-5 py-5 pr-12 text-left">
            <SheetTitle className="text-lg font-semibold leading-snug tracking-tight">
              {group.menuItemTitle}
            </SheetTitle>
            <SheetDescription className="text-xs text-pretty text-muted-foreground">
              Live recipe usage for this menu item — ingredients deducted when
              kitchen or barista completes the order.
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
      <Badge
        variant="outline"
        className="cursor-pointer tabular-nums font-medium shadow-sm"
      >
        −{group.servingTotal} serving{group.servingTotal === 1 ? "" : "s"}
      </Badge>
    </MenuItemUsageDetailTrigger>
  );
}
