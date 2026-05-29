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
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Coffee,
  Layers,
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
  border: string;
  gradient: string;
  accent: string;
  iconWrap: string;
  icon: string;
  Icon: LucideIcon;
};

const CATEGORY_THEMES: Record<string, CategoryCardTheme> = {
  food: {
    border: "border-amber-500/20",
    gradient: "from-card to-amber-500/5",
    accent: "from-amber-500/80 to-orange-400/60",
    iconWrap: "border-amber-500/25 bg-amber-500/10",
    icon: "text-amber-700 dark:text-amber-400",
    Icon: Utensils,
  },
  beverage: {
    border: "border-sky-500/20",
    gradient: "from-card to-sky-500/5",
    accent: "from-sky-500/80 to-cyan-400/60",
    iconWrap: "border-sky-500/25 bg-sky-500/10",
    icon: "text-sky-700 dark:text-sky-400",
    Icon: Coffee,
  },
  others: {
    border: "border-violet-500/20",
    gradient: "from-card to-violet-500/5",
    accent: "from-violet-500/80 to-purple-400/60",
    iconWrap: "border-violet-500/25 bg-violet-500/10",
    icon: "text-violet-700 dark:text-violet-400",
    Icon: Layers,
  },
};

const DEFAULT_THEME: CategoryCardTheme = {
  border: "border-primary/20",
  gradient: "from-card to-primary/5",
  accent: "from-primary/80 to-violet-400/60",
  iconWrap: "border-primary/25 bg-primary/10",
  icon: "text-primary",
  Icon: Layers,
};

function themeForCategory(key: string): CategoryCardTheme {
  return CATEGORY_THEMES[key] ?? DEFAULT_THEME;
}

type CafeAdminDailyRevenueCardsProps = {
  orders: Order[];
  hotelName: string;
};

export function CafeAdminDailyRevenueCards({
  orders,
  hotelName,
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

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 px-0.5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isToday ? "Today's revenue" : "Daily revenue"}
          </p>
          <p className="text-sm text-muted-foreground">{businessDayLabel}</p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!isToday ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2.5 text-xs"
              onClick={() => setSelectedDate(startOfLocalDay())}
            >
              Back to today
            </Button>
          ) : null}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-9 min-w-[170px] justify-start text-left font-normal shadow-sm",
                  !selectedDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                <span className="truncate">
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/20 bg-linear-to-br from-card to-primary/5 shadow-md overflow-hidden sm:col-span-2 xl:col-span-1">
          <div className="h-0.5 bg-linear-to-r from-primary/80 to-violet-400/60" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 space-y-1">
                <CardDescription>
                  {isToday ? "Total today" : "Day total"}
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums tracking-tight sm:text-3xl">
                  {formatCafeRevenueETB(totalETB)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Paid orders for this business day
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {displayCategories.map((item) => {
          const theme = themeForCategory(item.key);
          const Icon = theme.Icon;
          return (
            <Card
              key={item.key}
              className={`${theme.border} bg-linear-to-br ${theme.gradient} shadow-md overflow-hidden`}
            >
              <div className={`h-0.5 bg-linear-to-r ${theme.accent}`} />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-xl border p-2.5 ${theme.iconWrap}`}
                  >
                    <Icon className={`h-5 w-5 ${theme.icon}`} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <CardDescription>{item.label}</CardDescription>
                    <CardTitle className="text-2xl tabular-nums tracking-tight sm:text-3xl">
                      {formatCafeRevenueETB(item.revenueETB)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {item.lineCount === 1
                        ? "1 paid line"
                        : `${item.lineCount} paid lines`}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
