"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import type { VoucherGroup } from "@/lib/voucherGrouping";
import { voucherGroupLineSummary } from "@/lib/voucherGrouping";
import { cn } from "@/lib/utils";

type LineRow = {
  id: number;
  itemName?: string | null;
  name?: string | null;
  quantity?: number | null;
  amount?: number | null;
  measuredBy?: string | null;
  notes?: string | null;
  stakeHolderOrReason?: string | null;
  estimatedUnitPrice?: number | null;
};

export function VoucherGroupedRequestCard<T extends LineRow>({
  group,
  title,
  description,
  statusSummary,
  badge,
  actions,
  renderLineExtra,
  renderLineStatus,
  renderLineActions,
  lineLeading,
  headerLeading,
  collapsible = false,
  defaultOpen = false,
  accentClassName = "from-primary/50 via-violet-500/30 to-transparent",
}: {
  group: VoucherGroup<T>;
  title?: string;
  description?: ReactNode;
  statusSummary?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  renderLineExtra?: (row: T) => ReactNode;
  renderLineStatus?: (row: T) => ReactNode;
  renderLineActions?: (row: T) => ReactNode;
  lineLeading?: (row: T) => ReactNode;
  headerLeading?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  accentClassName?: string;
}) {
  const lineCount = group.rows.length;
  const summary = voucherGroupLineSummary(group.rows);

  const headerInner = (
    <>
      {headerLeading ? (
        <div
          className={cn(collapsible && "shrink-0 pt-0.5")}
          onClick={collapsible ? (e) => e.stopPropagation() : undefined}
          onKeyDown={collapsible ? (e) => e.stopPropagation() : undefined}
        >
          {headerLeading}
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3 min-w-0 flex-1">
        <div className="min-w-0 space-y-1 flex-1">
          <CardTitle className="text-base sm:text-lg leading-snug">
            Voucher{" "}
            <span className="font-mono tabular-nums text-primary/90">
              {group.voucherDisplay}
            </span>
            {lineCount > 1 ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                · {lineCount} lines
              </span>
            ) : null}
          </CardTitle>
          {title ? (
            <p className="text-sm text-muted-foreground">{title}</p>
          ) : (
            <p className="text-sm font-medium text-foreground/90">{summary}</p>
          )}
          {statusSummary ? (
            <p className="text-xs text-muted-foreground">{statusSummary}</p>
          ) : null}
          {collapsible ? (
            <p className="text-[11px] text-muted-foreground/90 italic group-data-[state=open]/voucher:hidden">
              Collapsed — expand to review lines and actions
            </p>
          ) : null}
          {description ? (
            <CardDescription className="space-y-1 pt-0.5">
              {description}
            </CardDescription>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {badge ?? null}
          {collapsible ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/voucher:rotate-180" />
          ) : null}
        </div>
      </div>
    </>
  );

  const body = (
    <CardContent className="space-y-4 pb-5 pt-4">
      <ul className="divide-y divide-border/50 rounded-xl border border-border/60 bg-linear-to-b from-muted/20 to-muted/5">
        {group.rows.map((row) => (
          <li
            key={row.id}
            className="px-3.5 py-3 text-sm space-y-1.5 transition-colors hover:bg-muted/25"
          >
            <div className="flex flex-wrap items-center gap-2">
              {lineLeading ? (
                <div className="shrink-0">{lineLeading(row)}</div>
              ) : null}
              <span className="font-medium min-w-0 flex-1">
                {String(row.itemName ?? row.name ?? "").trim() || "—"}
              </span>
              <span className="text-muted-foreground tabular-nums whitespace-nowrap text-xs">
                {row.quantity != null
                  ? formatQtyWithUnit(
                      Number(row.quantity) || 0,
                      row.measuredBy || "units",
                    )
                  : row.amount != null
                    ? formatQtyWithUnit(
                        Number(row.amount) || 0,
                        row.measuredBy || "units",
                      )
                    : "—"}
              </span>
              {renderLineStatus ? (
                <div className="shrink-0">{renderLineStatus(row)}</div>
              ) : null}
            </div>
            {renderLineExtra ? (
              <div className="text-xs text-muted-foreground">
                {renderLineExtra(row)}
              </div>
            ) : null}
            {renderLineActions ? renderLineActions(row) : null}
          </li>
        ))}
      </ul>
      {actions ? (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end pt-1 border-t border-border/40">
          {actions}
        </div>
      ) : null}
    </CardContent>
  );

  const cardClass = cn(
    "border-border/70 shadow-md bg-card/95 overflow-hidden",
    "ring-1 ring-black/4 dark:ring-white/8",
    collapsible && "group/voucher hover:shadow-lg transition-shadow",
  );

  if (!collapsible) {
    return (
      <Card className={cardClass}>
        <div className={cn("h-1 bg-linear-to-r", accentClassName)} aria-hidden />
        <div className="px-5 py-4 border-b border-border/40 space-y-2">
          {headerInner}
        </div>
        {body}
      </Card>
    );
  }

  return (
    <Collapsible defaultOpen={defaultOpen} className="group/voucher">
      <Card className={cardClass}>
        <div className={cn("h-1 bg-linear-to-r", accentClassName)} aria-hidden />
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full text-left px-5 py-4 flex flex-wrap items-start gap-3",
              "hover:bg-muted/30 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            {headerInner}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>{body}</CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function VoucherGroupBadge({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <Badge
      variant="outline"
      className="shrink-0 border-primary/20 bg-primary/5 font-normal"
    >
      Batch · {count} lines
    </Badge>
  );
}

export function ReviewSectionHeading({
  title,
  count,
  accentClassName = "bg-primary",
}: {
  title: string;
  count: number;
  accentClassName?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className={cn("h-9 w-1 rounded-full", accentClassName)} />
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <Badge variant="secondary" className="font-normal tabular-nums">
        {count} line{count !== 1 ? "s" : ""}
      </Badge>
    </div>
  );
}
