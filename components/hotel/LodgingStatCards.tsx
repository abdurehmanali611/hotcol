"use client";

import { BedDouble, Sparkles, Users, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LodgingDashboardStats } from "@/lib/api/lodgingRooms";

export type LodgingStatCardDef = {
  key: string;
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
  valueClass: string;
  iconWrap: string;
};

const DEFAULT_KEYS = [
  "vacantClean",
  "vacantDirty",
  "occupied",
  "onMaintenance",
  "openCm",
] as const;

export function buildLodgingStatCards(
  stats: LodgingDashboardStats | null | undefined,
  opts?: {
    includeActiveStays?: boolean;
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
        "border-emerald-500/35 bg-linear-to-br from-emerald-500/15 via-card to-card shadow-emerald-500/10",
      valueClass: "text-emerald-700 dark:text-emerald-400",
      iconWrap: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    },
    {
      key: "vacantDirty",
      label: "Vacant dirty",
      value: stats?.vacantDirty ?? 0,
      icon: Sparkles,
      accent:
        "border-amber-500/35 bg-linear-to-br from-amber-500/15 via-card to-card shadow-amber-500/10",
      valueClass: "text-amber-800 dark:text-amber-400",
      iconWrap: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
    },
    {
      key: "occupied",
      label: "Occupied",
      value: stats?.occupied ?? 0,
      icon: Users,
      accent:
        "border-sky-500/35 bg-linear-to-br from-sky-500/15 via-card to-card shadow-sky-500/10",
      valueClass: "text-sky-700 dark:text-sky-400",
      iconWrap: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
    },
    {
      key: "onMaintenance",
      label: "On maintenance",
      value: stats?.onMaintenance ?? 0,
      icon: Wrench,
      accent:
        "border-rose-500/35 bg-linear-to-br from-rose-500/15 via-card to-card shadow-rose-500/10",
      valueClass: "text-rose-700 dark:text-rose-400",
      iconWrap: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
    },
    {
      key: "openCm",
      label: openCmLabel,
      value: stats?.openCmAssignments ?? 0,
      icon: Sparkles,
      accent:
        "border-violet-500/35 bg-linear-to-br from-violet-500/15 via-card to-card shadow-violet-500/10",
      valueClass: "text-violet-700 dark:text-violet-400",
      iconWrap: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    },
  ];

  if (opts?.includeActiveStays) {
    cards.splice(4, 0, {
      key: "activeStays",
      label: "Active stays",
      value: stats?.activeStays ?? 0,
      icon: Users,
      accent:
        "border-primary/35 bg-linear-to-br from-primary/12 via-card to-card shadow-primary/10",
      valueClass: "text-primary",
      iconWrap: "bg-primary/15 text-primary",
    });
  }

  void DEFAULT_KEYS;
  return cards;
}

export function LodgingStatCardsGrid({
  stats,
  includeActiveStays = false,
  openCmLabel,
  className,
}: {
  stats: LodgingDashboardStats | null | undefined;
  includeActiveStays?: boolean;
  openCmLabel?: string;
  className?: string;
}) {
  const cards = buildLodgingStatCards(stats, {
    includeActiveStays,
    openCmLabel,
  });
  const cols =
    cards.length >= 6
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
              "relative overflow-hidden rounded-2xl border p-4 shadow-md",
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
