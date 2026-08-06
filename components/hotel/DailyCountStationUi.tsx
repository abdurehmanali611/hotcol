"use client";

import type { ReactNode } from "react";
import { BedDouble, ChefHat, Wine } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HOTEL_DAILY_COUNT_STATIONS,
  HOTEL_DAILY_COUNT_STATION_FILTER_OPTIONS,
  type HotelDailyCountStationFilter,
} from "@/lib/hotelDailyStation";
import {
  FilterChipGroup,
  ListPanelFilterBar,
} from "@/components/hotel/ListPanelFilterBar";

const STATION_VISUAL: Record<
  string,
  { icon: typeof ChefHat; accent: string; selected: string; ring: string }
> = {
  KITCHEN: {
    icon: ChefHat,
    accent: "text-amber-700 dark:text-amber-300",
    selected:
      "border-amber-500/60 bg-amber-500/10 shadow-sm shadow-amber-500/10",
    ring: "ring-amber-500/30",
  },
  BAR: {
    icon: Wine,
    accent: "text-sky-700 dark:text-sky-300",
    selected: "border-sky-500/60 bg-sky-500/10 shadow-sm shadow-sky-500/10",
    ring: "ring-sky-500/30",
  },
  ROOM: {
    icon: BedDouble,
    accent: "text-emerald-700 dark:text-emerald-300",
    selected:
      "border-emerald-500/60 bg-emerald-500/10 shadow-sm shadow-emerald-500/10",
    ring: "ring-emerald-500/30",
  },
};

export function DailyCountStationPicker({
  value,
  onChange,
  id = "kb-station",
}: {
  value: string;
  onChange: (station: string) => void;
  id?: string;
}) {
  return (
    <div className="space-y-2" role="radiogroup" aria-labelledby={`${id}-label`}>
      <p
        id={`${id}-label`}
        className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
      >
        Station
      </p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {HOTEL_DAILY_COUNT_STATIONS.map((s) => {
          const visual = STATION_VISUAL[s.value] ?? STATION_VISUAL.KITCHEN;
          const Icon = visual.icon;
          const selected = value === s.value;
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(s.value)}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border px-3 py-3.5 text-center transition-all duration-200",
                "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                visual.ring,
                selected
                  ? visual.selected
                  : "border-border/70 bg-background/60 hover:border-border",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full bg-background/80 ring-1 ring-border/60 transition-transform duration-200",
                  selected && "scale-105",
                  visual.accent,
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span
                className={cn(
                  "text-sm font-semibold tracking-tight",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DailyCountStationFilterBar({
  value,
  onChange,
  title = "Station filter",
}: {
  value: HotelDailyCountStationFilter;
  onChange: (v: HotelDailyCountStationFilter) => void;
  title?: string;
}) {
  return (
    <ListPanelFilterBar
      title={title}
      showClear={value !== "ALL"}
      onClear={() => onChange("ALL")}
      className="border-border/60 bg-linear-to-br from-muted/30 via-background/40 to-muted/20"
    >
      <FilterChipGroup
        label="Station"
        value={value}
        onChange={onChange}
        options={HOTEL_DAILY_COUNT_STATION_FILTER_OPTIONS}
      />
    </ListPanelFilterBar>
  );
}

export function DailyCountMetricTile({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "muted" | "primary" | "management" | "invitation" | "onhand";
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary/25 bg-primary/5"
      : tone === "management"
        ? "border-violet-500/25 bg-violet-500/5"
        : tone === "invitation"
          ? "border-rose-500/25 bg-rose-500/5"
          : tone === "onhand"
            ? "border-emerald-500/30 bg-emerald-500/8"
            : "border-border/70 bg-muted/35";

  return (
    <div className={cn("rounded-xl border px-3.5 py-3 shadow-sm", toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function DailyCountFormulaStrip() {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        How On Hand is calculated
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs sm:text-sm">
        <FormulaChip>Total</FormulaChip>
        <span className="text-muted-foreground">−</span>
        <FormulaChip>Sales</FormulaChip>
        <span className="text-muted-foreground">−</span>
        <FormulaChip tone="management">Management</FormulaChip>
        <span className="text-muted-foreground">−</span>
        <FormulaChip tone="invitation">Invitation</FormulaChip>
        <span className="text-muted-foreground">=</span>
        <FormulaChip tone="onhand">On Hand</FormulaChip>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
        Total is Beginning + Store. Enter Sales for the day; Beginning carries
        forward yesterday&apos;s On Hand when a prior count exists.
      </p>
    </div>
  );
}

function FormulaChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "management" | "invitation" | "onhand";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        tone === "management" &&
          "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200",
        tone === "invitation" &&
          "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200",
        tone === "onhand" &&
          "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
        tone === "default" &&
          "border-border/70 bg-background/80 text-foreground",
      )}
    >
      {children}
    </span>
  );
}
