"use client";

import Image from "next/image";
import { ClipboardList, Package } from "lucide-react";
import type { Order } from "@/lib/actions";
import { aggregateCafeStationPrepByTitle } from "@/lib/cafeTableOrder";
import { cn } from "@/lib/utils";

type Station = "kitchen" | "bar";

const STATION_THEME: Record<
  Station,
  {
    panel: string;
    headerIcon: string;
    qtyBadge: string;
    card: string;
    accentBar: string;
  }
> = {
  kitchen: {
    panel:
      "border-amber-200/90 bg-linear-to-b from-amber-50 via-orange-50/60 to-background dark:border-amber-900/50 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-background",
    headerIcon: "text-amber-600 dark:text-amber-400",
    qtyBadge:
      "bg-amber-600 text-white shadow-sm ring-2 ring-amber-200/80 dark:ring-amber-900/60",
    card: "border-amber-100/90 bg-background/90 hover:border-amber-300/80 dark:border-amber-900/40",
    accentBar: "bg-amber-500",
  },
  bar: {
    panel:
      "border-sky-200/90 bg-linear-to-b from-sky-50 via-cyan-50/60 to-background dark:border-sky-900/50 dark:from-sky-950/40 dark:via-cyan-950/20 dark:to-background",
    headerIcon: "text-sky-600 dark:text-sky-400",
    qtyBadge:
      "bg-sky-600 text-white shadow-sm ring-2 ring-sky-200/80 dark:ring-sky-900/60",
    card: "border-sky-100/90 bg-background/90 hover:border-sky-300/80 dark:border-sky-900/40",
    accentBar: "bg-sky-500",
  },
};

type Props = {
  orders: Order[];
  station: Station;
  className?: string;
};

export function CafeStationPrepSummary({ orders, station, className }: Props) {
  const items = aggregateCafeStationPrepByTitle(orders);
  if (items.length === 0) return null;

  const theme = STATION_THEME[station];
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const maxQty = Math.max(...items.map((item) => item.quantity), 1);
  const stationLabel = station === "kitchen" ? "kitchen" : "bar";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border p-3 shadow-sm md:p-4",
        theme.panel,
        className,
      )}
      aria-label="Items to prepare"
    >
      <div className="mb-3 space-y-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/90 shadow-sm",
              theme.headerIcon,
            )}
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight tracking-tight">
              To prepare
            </h2>
            <p className="text-[11px] text-muted-foreground">
              All tables · {stationLabel}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold tabular-nums",
            theme.qtyBadge,
          )}
        >
          <Package className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          {totalUnits.toLocaleString()}{" "}
          {totalUnits === 1 ? "unit" : "units"} · {items.length}{" "}
          {items.length === 1 ? "dish" : "dishes"}
        </div>
      </div>

      <ul className="max-h-[min(70vh,32rem)] space-y-2 overflow-y-auto pr-0.5">
        {items.map((item) => {
          const widthPct = Math.max(8, (item.quantity / maxQty) * 100);
          return (
            <li
              key={item.title}
              className={cn(
                "rounded-xl border p-2.5 transition-shadow hover:shadow-sm",
                theme.card,
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md ring-1 ring-border/60">
                  <Image
                    src={item.imageUrl || "/placeholder-food.jpg"}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="44px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">to make</p>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg tabular-nums",
                    theme.qtyBadge,
                  )}
                  aria-label={`${item.quantity} ${item.title}`}
                >
                  <span className="text-lg font-bold leading-none">
                    {item.quantity.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted/50">
                <div
                  className={cn("h-full rounded-full", theme.accentBar)}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
