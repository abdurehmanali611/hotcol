"use client";

import type { ReactNode } from "react";
import { Building2, History, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Lodging chrome — same richness as Manager HR (Overview / ATS OTP / Attendance),
 * with teal·sky·emerald identity instead of violet·indigo.
 */

export const LODGING_ACCENTS = {
  primary: "bg-linear-to-r from-primary/40 via-sky-500/25 to-transparent",
  sky: "bg-linear-to-r from-sky-500/35 via-primary/20 to-transparent",
  emerald: "bg-linear-to-r from-emerald-500/35 via-teal-400/20 to-transparent",
  amber: "bg-linear-to-r from-amber-500/35 via-orange-400/20 to-transparent",
  rose: "bg-linear-to-r from-rose-500/35 via-orange-400/15 to-transparent",
  teal: "bg-linear-to-r from-teal-500/35 via-primary/20 to-transparent",
} as const;

export const lodgingNavActiveClass =
  "h-10 cursor-pointer text-[13px] data-[active=true]:bg-primary/8 data-[active=true]:font-medium data-[active=true]:text-teal-900 data-[active=true]:shadow-sm dark:data-[active=true]:text-teal-100";

export const lodgingFieldClass =
  "h-10 w-full min-w-0 rounded-xl border-border/70 bg-background shadow-sm focus-visible:border-primary/30 focus-visible:ring-primary/12";

export const lodgingPrimaryBtnClass =
  "gap-1.5 rounded-xl border-primary/70 bg-primary text-primary-foreground shadow-sm hover:brightness-105";

export const lodgingGhostBtnClass =
  "text-teal-800/90 hover:bg-primary/8 dark:text-teal-200";

export const lodgingDangerBtnClass =
  "border-rose-500/30 text-rose-800 hover:bg-rose-500/8 dark:text-rose-300";

export const lodgingListFrameClass =
  "overflow-hidden rounded-xl border border-primary/12 bg-background shadow-sm";

export const lodgingListDivideClass = "divide-y divide-primary/8";

export function LodgingPanelShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative space-y-6",
        "before:pointer-events-none before:absolute before:-inset-x-2 before:-top-2 before:h-32 before:rounded-3xl before:bg-linear-to-b before:from-primary/5 before:via-transparent before:to-transparent before:opacity-80",
        className,
      )}
    >
      <div className="relative space-y-6">{children}</div>
    </div>
  );
}

/** Page band — same presence as HR Overview readiness hero. */
export function LodgingPageHero({
  eyebrow = "Lodging workspace",
  title,
  description,
  icon,
  actions,
  badge,
  stats,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  stats?: { label: string; value: string | number; tone?: string }[];
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/12 bg-linear-to-b from-primary/4 via-card to-sky-500/3 shadow-sm",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 size-60 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 left-1/4 size-72 rounded-full bg-sky-500/10 blur-3xl"
      />
      <div className="h-px bg-linear-to-r from-transparent via-primary/35 to-transparent" />
      <div className="relative space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 ring-1 ring-primary/15">
                <span className="text-teal-800/90 dark:text-teal-300">{icon}</span>
              </div>
            ) : null}
            <div className="min-w-0 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700/55 dark:text-teal-300/65">
                {eyebrow}
              </p>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                {title}
              </h2>
              {description ? (
                <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
        {badge}
        {stats?.length ? (
          <div
            className={cn(
              "grid gap-3",
              stats.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
            )}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "rounded-2xl border border-border/60 bg-linear-to-br p-4 shadow-sm",
                  stat.tone ?? "from-primary/6 to-transparent",
                )}
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/** Single tinted metric tile — HR `HrMetricCard` equivalent with rooming identity. */
export const LODGING_METRIC_TONES = {
  primary: "border-primary/15 from-primary/8",
  sky: "border-sky-500/15 from-sky-500/8",
  emerald: "border-emerald-500/15 from-emerald-500/8",
  amber: "border-amber-500/18 from-amber-500/10",
  rose: "border-rose-500/18 from-rose-500/10",
  violet: "border-violet-500/15 from-violet-500/8",
  teal: "border-teal-500/15 from-teal-500/8",
  slate: "border-slate-500/20 from-slate-500/8",
} as const;

export type LodgingMetricTone = keyof typeof LODGING_METRIC_TONES;

export function LodgingMetricCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: LodgingMetricTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-linear-to-br to-card p-4 shadow-sm transition-shadow hover:shadow-md",
        LODGING_METRIC_TONES[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
        </div>
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-teal-700/85 dark:text-teal-300">
            {icon}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Filter bar — HR `HrFilterBar` equivalent for rooming lists. */
export function LodgingFilterBar({
  title = "Filters",
  children,
  onClear,
  showClear,
  className,
}: {
  title?: string;
  children: ReactNode;
  onClear?: () => void;
  showClear?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-primary/12 bg-muted/20 px-4 py-3.5 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-800/60 dark:text-teal-300/70">
          {title}
        </span>
        {showClear && onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            onClick={onClear}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function LodgingSectionCard({
  title,
  description,
  icon,
  accent = LODGING_ACCENTS.primary,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  accent?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/70 bg-card/95 shadow-sm ring-1 ring-black/3 dark:ring-white/5",
        className,
      )}
    >
      <div className={cn("h-1", accent)} />
      <CardHeader className="flex flex-col gap-3 space-y-0 bg-muted/10 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2.5 text-lg tracking-tight md:text-xl">
            {icon ? (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/6 text-teal-800/90 dark:text-teal-300">
                {icon}
              </span>
            ) : null}
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="max-w-3xl text-pretty leading-relaxed">
              {description}
            </CardDescription>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Form block — Attendance-style tinted section. */
export function LodgingFormSection({
  title,
  description,
  children,
  className,
  tone = "primary",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  tone?: "primary" | "sky" | "amber" | "emerald" | "rose" | "muted";
}) {
  const toneClass =
    tone === "sky"
      ? "border-sky-500/15 bg-sky-500/3"
      : tone === "amber"
        ? "border-amber-500/15 bg-amber-500/3"
        : tone === "emerald"
          ? "border-emerald-500/15 bg-emerald-500/3"
          : tone === "rose"
            ? "border-rose-500/15 bg-rose-500/3"
            : tone === "muted"
              ? "border-border/70 bg-muted/10"
              : "border-primary/12 bg-primary/3";

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border p-4 sm:p-5",
        toneClass,
        className,
      )}
    >
      <div className="space-y-1 border-b border-border/40 pb-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800/65 dark:text-teal-300/70">
          {title}
        </h3>
        {description ? (
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** Action / highlight band — ATS “selected role” style. */
export function LodgingActionBand({
  eyebrow,
  title,
  description,
  children,
  tone = "sky",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  tone?: "sky" | "amber" | "emerald" | "primary";
  className?: string;
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/20 bg-linear-to-br from-amber-500/8 via-card to-orange-500/4"
      : tone === "emerald"
        ? "border-emerald-500/18 bg-linear-to-br from-emerald-500/7 via-card to-teal-500/3"
        : tone === "primary"
          ? "border-primary/15 bg-linear-to-br from-primary/6 via-card to-sky-500/3"
          : "border-sky-500/15 bg-linear-to-br from-sky-500/6 via-card to-primary/3";

  const eyebrowClass =
    tone === "amber"
      ? "text-amber-800/75 dark:text-amber-300/80"
      : tone === "emerald"
        ? "text-emerald-800/75 dark:text-emerald-300/80"
        : "text-sky-800/70 dark:text-sky-300/80";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border p-4 sm:p-5",
        toneClass,
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wider",
                eyebrowClass,
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <p className="text-lg font-semibold tracking-tight">{title}</p>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children ? (
          <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LodgingEmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/15 bg-primary/3 px-4 py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/12 bg-primary/6 text-primary">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-pretty text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function LodgingFilterChips<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-primary/12 bg-background/90 p-1">
        {options.map((opt) => (
          <Button
            key={opt.id}
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 rounded-lg px-3.5 text-xs font-medium transition-colors",
              value === opt.id
                ? "bg-primary/90 text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                : "text-muted-foreground hover:bg-primary/8 hover:text-foreground",
            )}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function LodgingTableFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-primary/12 bg-card/95 shadow-sm",
        className,
      )}
    >
      <div className="h-1 bg-linear-to-r from-primary/40 via-sky-500/25 to-transparent" />
      <div className="space-y-3 p-3 sm:p-4">{children}</div>
    </div>
  );
}

/** Soft status wash for room directory — gentle, not neon. */
export function lodgingRoomCardTone(status: string): string {
  switch (status) {
    case "vacant_clean":
      return "border-emerald-500/20 bg-linear-to-br from-emerald-500/7 via-card to-card";
    case "vacant_dirty":
      return "border-amber-500/20 bg-linear-to-br from-amber-500/7 via-card to-card";
    case "occupied":
      return "border-sky-500/20 bg-linear-to-br from-sky-500/7 via-card to-card";
    case "on_maintenance":
      return "border-rose-500/20 bg-linear-to-br from-rose-500/7 via-card to-card";
    case "inspected":
      return "border-teal-500/20 bg-linear-to-br from-teal-500/7 via-card to-card";
    case "out_of_order":
    case "out_of_service":
    case "blocked":
      return "border-slate-500/25 bg-linear-to-br from-slate-500/6 via-card to-card";
    case "reserved":
      return "border-primary/18 bg-linear-to-br from-primary/6 via-card to-card";
    default:
      return "border-border/70 bg-card";
  }
}

export function LodgingStatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const s = String(status || "").toLowerCase();
  const className =
    s === "vacant_clean" ||
    s === "clean" ||
    s === "completed" ||
    s === "approved"
      ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-800 dark:text-emerald-300"
      : s === "vacant_dirty" ||
          s === "dirty" ||
          s === "pending" ||
          s === "open"
        ? "border-amber-500/20 bg-amber-500/8 text-amber-900 dark:text-amber-300"
        : s === "occupied" || s === "in_progress"
          ? "border-sky-500/20 bg-sky-500/8 text-sky-800 dark:text-sky-300"
          : s === "on_maintenance" ||
              s === "rejected" ||
              s === "cancelled"
            ? "border-rose-500/20 bg-rose-500/8 text-rose-800 dark:text-rose-300"
            : s === "inspected"
              ? "border-teal-500/20 bg-teal-500/8 text-teal-800 dark:text-teal-300"
              : "border-primary/18 bg-primary/6 text-teal-800 dark:text-teal-300";

  return (
    <Badge variant="outline" className={cn("font-medium capitalize", className)}>
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}

/** Minimal shape of a lodging action log row (matches `LodgingActionLog`). */
export type LodgingActivityRow = {
  id: number | string;
  action: string;
  actorRole?: string | null;
  actorName?: string | null;
  entityType?: string | null;
  createdAt: string | Date;
};

function relativeFromNow(value: string | Date): string {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}

/**
 * Framed audit list — gives every role's “Recent activity” block the same
 * polish: tinted icon chip, role pill, relative time, hover wash.
 */
export function LodgingActivityList({
  rows,
  limit = 10,
  emptyTitle = "No activity yet",
  emptyDescription = "Actions performed on this property will show up here with who did them and when.",
  icon,
}: {
  rows: LodgingActivityRow[];
  limit?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  icon?: ReactNode;
}) {
  const visible = rows.slice(0, limit);
  if (visible.length === 0) {
    return (
      <LodgingEmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={icon}
      />
    );
  }
  return (
    <ul
      className={cn(
        lodgingListFrameClass,
        lodgingListDivideClass,
        "divide-y",
      )}
    >
      {visible.map((row) => (
        <li
          key={row.id}
          className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-primary/4"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/12 bg-primary/6 text-teal-800/85 transition-colors group-hover:border-primary/25 dark:text-teal-300">
            {icon ?? <History className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium leading-snug text-pretty">
              {row.action}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {row.actorRole ? (
                <span className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium">
                  {row.actorRole}
                </span>
              ) : null}
              {row.actorName ? <span>{row.actorName}</span> : null}
              {row.actorName && row.entityType ? <span aria-hidden>·</span> : null}
              {row.entityType ? <span>{row.entityType}</span> : null}
            </div>
          </div>
          <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
            {relativeFromNow(row.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LodgingCountBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-primary/15 bg-primary/6 font-normal tabular-nums text-teal-900 dark:text-teal-200",
        className,
      )}
    >
      {children}
    </Badge>
  );
}

/**
 * Company check-in marker — shows the billing company and its TIN.
 * Renders nothing for personal stays (or company rows missing a name).
 *
 * `variant`:
 *   - "chip"    compact inline pill for pickers / list rows
 *   - "block"   fuller stacked block for detail headers
 */
export function LodgingCompanyBadge({
  isCompany,
  companyName,
  companyTin,
  variant = "chip",
  className,
}: {
  isCompany?: boolean | null;
  companyName?: string | null;
  companyTin?: string | null;
  variant?: "chip" | "block";
  className?: string;
}) {
  const name = (companyName || "").trim();
  const tin = (companyTin || "").trim();
  if (!isCompany || (!name && !tin)) return null;

  if (variant === "block") {
    return (
      <div
        className={cn(
          "inline-flex max-w-full items-start gap-2.5 rounded-xl border border-sky-500/25 bg-sky-500/6 px-3 py-2 text-sky-900 dark:text-sky-200",
          className,
        )}
      >
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/12 text-sky-700 dark:text-sky-300">
          <Building2 className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 space-y-0.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700/70 dark:text-sky-300/75">
            Company check-in
          </span>
          <span className="block truncate text-sm font-semibold tracking-tight">
            {name || "Company"}
          </span>
          {tin ? (
            <span className="block text-xs tabular-nums text-sky-800/75 dark:text-sky-300/80">
              TIN {tin}
            </span>
          ) : null}
        </span>
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-sky-500/30 bg-sky-500/8 font-medium text-sky-900 dark:text-sky-200",
        className,
      )}
    >
      <Building2 className="h-3 w-3 shrink-0 opacity-80" />
      <span className="min-w-0 truncate">
        {name || "Company"}
        {tin ? (
          <span className="font-normal opacity-70"> · TIN {tin}</span>
        ) : null}
      </span>
    </Badge>
  );
}
