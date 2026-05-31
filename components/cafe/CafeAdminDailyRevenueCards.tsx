"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { Order } from "@/lib/actions";
import { isSameCafeBusinessDay } from "@/lib/cafeBusinessDay";
import {
  computeDailyCafeRevenueByCategory,
  formatCafeBusinessDayLabel,
  formatCafeRevenueETB,
} from "@/lib/cafeDailyRevenueByCategory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Coffee,
  Layers,
  Sparkles,
  TrendingUp,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function startOfLocalDay(date: Date = new Date()): Date {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next;
}

type CategoryCardTheme = {
  ring: string;
  surface: string;
  bar: string;
  iconWrap: string;
  icon: string;
  glow: string;
  Icon: LucideIcon;
};

const CATEGORY_THEMES: Record<string, CategoryCardTheme> = {
  food: {
    ring: "ring-amber-500/15",
    surface:
      "bg-gradient-to-br from-amber-500/[0.07] via-card to-card dark:from-amber-500/10",
    bar: "bg-gradient-to-r from-amber-500 to-orange-400",
    iconWrap: "bg-amber-500/15 ring-amber-500/20",
    icon: "text-amber-700 dark:text-amber-400",
    glow: "shadow-[0_12px_40px_-12px_rgba(245,158,11,0.35)]",
    Icon: Utensils,
  },
  beverage: {
    ring: "ring-sky-500/15",
    surface:
      "bg-gradient-to-br from-sky-500/[0.07] via-card to-card dark:from-sky-500/10",
    bar: "bg-gradient-to-r from-sky-500 to-cyan-400",
    iconWrap: "bg-sky-500/15 ring-sky-500/20",
    icon: "text-sky-700 dark:text-sky-400",
    glow: "shadow-[0_12px_40px_-12px_rgba(14,165,233,0.35)]",
    Icon: Coffee,
  },
  others: {
    ring: "ring-violet-500/15",
    surface:
      "bg-gradient-to-br from-violet-500/[0.07] via-card to-card dark:from-violet-500/10",
    bar: "bg-gradient-to-r from-violet-500 to-purple-400",
    iconWrap: "bg-violet-500/15 ring-violet-500/20",
    icon: "text-violet-700 dark:text-violet-400",
    glow: "shadow-[0_12px_40px_-12px_rgba(139,92,246,0.3)]",
    Icon: Layers,
  },
};

const DEFAULT_THEME: CategoryCardTheme = {
  ring: "ring-primary/15",
  surface: "bg-gradient-to-br from-primary/[0.06] via-card to-card",
  bar: "bg-gradient-to-r from-primary to-violet-400",
  iconWrap: "bg-primary/15 ring-primary/20",
  icon: "text-primary",
  glow: "shadow-[0_12px_40px_-12px_rgba(var(--primary),0.25)]",
  Icon: Layers,
};

function themeForCategory(key: string): CategoryCardTheme {
  return CATEGORY_THEMES[key] ?? DEFAULT_THEME;
}

function sharePercent(revenue: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((revenue / total) * 100));
}

type CafeAdminDailyRevenueCardsProps = {
  orders: Order[];
  hotelName: string;
  loading?: boolean;
};

function RevenueCardsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function CafeAdminDailyRevenueCards({
  orders,
  hotelName,
  loading = false,
}: CafeAdminDailyRevenueCardsProps) {
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isToday = isSameCafeBusinessDay(selectedDate, new Date());

  const { categories, totalETB } = useMemo(
    () => computeDailyCafeRevenueByCategory(orders, hotelName, selectedDate),
    [orders, hotelName, selectedDate],
  );

  const businessDayLabel = formatCafeBusinessDayLabel(selectedDate);
  const displayCategories =
    categories.length > 0
      ? categories
      : [
          { key: "food", label: "Food", revenueETB: 0, lineCount: 0 },
          { key: "beverage", label: "Beverage", revenueETB: 0, lineCount: 0 },
          { key: "others", label: "Others", revenueETB: 0, lineCount: 0 },
        ];

  const hasSales = totalETB > 0;

  if (loading) {
    return (
      <section
        aria-label="Daily sales by category"
        className="rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm backdrop-blur-sm sm:p-6"
      >
        <RevenueCardsSkeleton />
      </section>
    );
  }

  return (
    <section
      aria-label="Daily sales by category"
      className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-muted/40 via-card to-card shadow-sm"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                  Sales by category
                </h3>
                {isToday ? (
                  <Badge
                    variant="secondary"
                    className="border-emerald-500/20 bg-emerald-500/10 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400"
                  >
                    Live · Today
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-medium">
                    Historical
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{businessDayLabel}</p>
              <p className="text-xs text-muted-foreground/80">
                Paid orders for this business day, grouped by menu category
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {!isToday ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedDate(startOfLocalDay())}
              >
                Jump to today
              </Button>
            ) : null}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 min-w-[168px] justify-start gap-2 border-border/80 bg-background/80 font-normal shadow-sm backdrop-blur-sm",
                    !selectedDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="truncate">
                    {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Pick date"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  captionLayout="dropdown"
                  disabled={{ after: new Date() }}
                  onSelect={(date) => {
                    if (!date) return;
                    setSelectedDate(startOfLocalDay(date));
                    setCalendarOpen(false);
                  }}
                  initialFocus
                  classNames={{
                    day: "cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-card to-violet-500/[0.04] p-5 shadow-md ring-1 ring-primary/10 transition-shadow hover:shadow-lg sm:p-6",
            hasSales && "shadow-[0_20px_50px_-24px_rgba(var(--primary),0.45)]",
          )}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/25">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {isToday ? "Total revenue today" : "Total for selected day"}
                </p>
                <p
                  className={cn(
                    "text-3xl font-bold tabular-nums tracking-tight sm:text-4xl",
                    hasSales ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {formatCafeRevenueETB(totalETB)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {displayCategories.reduce((n, c) => n + c.lineCount, 0) === 1
                    ? "1 paid line"
                    : `${displayCategories.reduce((n, c) => n + c.lineCount, 0)} paid lines`}
                  {!hasSales ? " · No sales recorded yet" : ""}
                </p>
              </div>
            </div>

            {hasSales ? (
              <div className="flex flex-wrap gap-2 sm:max-w-[220px] sm:justify-end">
                {displayCategories
                  .filter((c) => c.revenueETB > 0)
                  .map((c) => (
                    <span
                      key={c.key}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm"
                    >
                      <span className="text-foreground">{c.label}</span>
                      <span className="tabular-nums text-foreground/80">
                        {sharePercent(c.revenueETB, totalETB)}%
                      </span>
                    </span>
                  ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayCategories.map((item, index) => {
            const theme = themeForCategory(item.key);
            const Icon = theme.Icon;
            const pct = sharePercent(item.revenueETB, totalETB);
            const active = item.revenueETB > 0;

            return (
              <article
                key={item.key}
                style={{ animationDelay: `${index * 60}ms` }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/50 p-4 ring-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 fill-mode-both",
                  theme.ring,
                  theme.surface,
                  active
                    ? cn("hover:-translate-y-0.5 hover:shadow-md", theme.glow)
                    : "opacity-90",
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl ring-1",
                      theme.iconWrap,
                    )}
                  >
                    <Icon className={cn("h-5 w-5", theme.icon)} />
                  </div>
                  {hasSales ? (
                    <span className="tabular-nums text-xs font-semibold text-muted-foreground">
                      {pct}%
                    </span>
                  ) : null}
                </div>

                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold tabular-nums tracking-tight",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {formatCafeRevenueETB(item.revenueETB)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.lineCount === 1
                    ? "1 paid line"
                    : `${item.lineCount} paid lines`}
                </p>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted/80">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      theme.bar,
                    )}
                    style={{ width: hasSales ? `${Math.max(pct, active ? 4 : 0)}%` : "0%" }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
