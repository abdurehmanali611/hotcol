"use client";

import {
  BedDouble,
  CalendarCheck,
  CalendarX,
  ClipboardCheck,
  Percent,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LodgingDashboardStats } from "@/lib/api/lodgingRooms";

export type LodgingStatCardDef = {
  key: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent: string;
  valueClass: string;
  iconWrap: string;
};

export function buildLodgingStatCards(
  stats: LodgingDashboardStats | null | undefined,
  opts?: {
    includeActiveStays?: boolean;
    /** Manager dashboard — wider KPI set. */
    comprehensive?: boolean;
    openCmLabel?: string;
  },
): LodgingStatCardDef[] {
  const openCmLabel = opts?.openCmLabel ?? "Open CM jobs";
  const cards: LodgingStatCardDef[] = [
    {
      key: "vacantClean",
      label: "Vacant clean",
      value: stats?.vacantClean ?? 0,
      icon: BedDouble,
      accent:
        "border-emerald-500/18 bg-linear-to-br from-emerald-500/6 via-card to-card",
      valueClass: "text-emerald-800/90 dark:text-emerald-300",
      iconWrap: "bg-emerald-500/8 text-emerald-800/90 dark:text-emerald-300",
    },
    {
      key: "vacantDirty",
      label: "Vacant dirty",
      value: stats?.vacantDirty ?? 0,
      icon: Sparkles,
      accent:
        "border-amber-500/18 bg-linear-to-br from-amber-500/6 via-card to-card",
      valueClass: "text-amber-900/90 dark:text-amber-300",
      iconWrap: "bg-amber-500/8 text-amber-900/90 dark:text-amber-300",
    },
    {
      key: "occupied",
      label: "Occupied",
      value: stats?.occupied ?? 0,
      icon: Users,
      accent:
        "border-sky-500/18 bg-linear-to-br from-sky-500/6 via-card to-card",
      valueClass: "text-sky-800/90 dark:text-sky-300",
      iconWrap: "bg-sky-500/8 text-sky-800/90 dark:text-sky-300",
    },
    {
      key: "inspected",
      label: "Inspected",
      value: stats?.inspected ?? 0,
      icon: ClipboardCheck,
      accent:
        "border-teal-500/18 bg-linear-to-br from-teal-500/6 via-card to-card",
      valueClass: "text-teal-800/90 dark:text-teal-300",
      iconWrap: "bg-teal-500/8 text-teal-800/90 dark:text-teal-300",
    },
    {
      key: "onMaintenance",
      label: "On maintenance",
      value: stats?.onMaintenance ?? 0,
      icon: Wrench,
      accent:
        "border-rose-500/18 bg-linear-to-br from-rose-500/6 via-card to-card",
      valueClass: "text-rose-800/90 dark:text-rose-300",
      iconWrap: "bg-rose-500/8 text-rose-800/90 dark:text-rose-300",
    },
    {
      key: "openCm",
      label: openCmLabel,
      value: stats?.openCmAssignments ?? 0,
      icon: Sparkles,
      accent:
        "border-violet-500/18 bg-linear-to-br from-violet-500/6 via-card to-card",
      valueClass: "text-violet-800/90 dark:text-violet-300",
      iconWrap: "bg-violet-500/8 text-violet-800/90 dark:text-violet-300",
    },
  ];

  if (opts?.includeActiveStays) {
    cards.splice(4, 0, {
      key: "activeStays",
      label: "Active stays",
      value: stats?.activeStays ?? 0,
      icon: Users,
      accent:
        "border-primary/18 bg-linear-to-br from-primary/5 via-card to-card",
      valueClass: "text-teal-900/90 dark:text-teal-200",
      iconWrap: "bg-primary/8 text-teal-800/90 dark:text-teal-300",
    });
  }

  if (opts?.comprehensive) {
    cards.push(
      {
        key: "occupancy",
        label: "Occupancy %",
        value: `${Number(stats?.occupancyPercent ?? 0).toFixed(1)}%`,
        icon: Percent,
        accent:
          "border-indigo-500/18 bg-linear-to-br from-indigo-500/6 via-card to-card",
        valueClass: "text-indigo-800/90 dark:text-indigo-300",
        iconWrap: "bg-indigo-500/8 text-indigo-800/90 dark:text-indigo-300",
      },
      {
        key: "todayIn",
        label: "Today check-ins",
        value: stats?.todayCheckIns ?? 0,
        icon: CalendarCheck,
        accent:
          "border-cyan-500/18 bg-linear-to-br from-cyan-500/6 via-card to-card",
        valueClass: "text-cyan-800/90 dark:text-cyan-300",
        iconWrap: "bg-cyan-500/8 text-cyan-800/90 dark:text-cyan-300",
      },
      {
        key: "todayOut",
        label: "Today check-outs",
        value: stats?.todayCheckOuts ?? 0,
        icon: CalendarX,
        accent:
          "border-orange-500/18 bg-linear-to-br from-orange-500/6 via-card to-card",
        valueClass: "text-orange-800/90 dark:text-orange-300",
        iconWrap: "bg-orange-500/8 text-orange-800/90 dark:text-orange-300",
      },
      {
        key: "reservations",
        label: "Open reservations",
        value: stats?.openReservations ?? 0,
        icon: CalendarCheck,
        accent:
          "border-fuchsia-500/18 bg-linear-to-br from-fuchsia-500/6 via-card to-card",
        valueClass: "text-fuchsia-800/90 dark:text-fuchsia-300",
        iconWrap: "bg-fuchsia-500/8 text-fuchsia-800/90 dark:text-fuchsia-300",
      },
    );
  }

  return cards;
}

export function LodgingStatCardsGrid({
  stats,
  includeActiveStays = false,
  comprehensive = false,
  openCmLabel,
  className,
}: {
  stats: LodgingDashboardStats | null | undefined;
  includeActiveStays?: boolean;
  comprehensive?: boolean;
  openCmLabel?: string;
  className?: string;
}) {
  const cards = buildLodgingStatCards(stats, {
    includeActiveStays,
    comprehensive,
    openCmLabel,
  });
  const cols =
    cards.length >= 8
      ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      : cards.length >= 6
        ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        : cards.length === 5
          ? "sm:grid-cols-2 lg:grid-cols-5"
          : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cn("grid gap-3", cols, className)}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.key}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-4 shadow-sm",
              c.accent,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground leading-snug">
                {c.label}
              </p>
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                  c.iconWrap,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p
              className={cn(
                "mt-3 text-3xl font-semibold tabular-nums tracking-tight",
                c.valueClass,
              )}
            >
              {c.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
