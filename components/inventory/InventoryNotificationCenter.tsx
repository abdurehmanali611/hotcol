"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Package,
  ShieldAlert,
  TrendingUp,
  Truck,
} from "lucide-react";
import type {
  ItemRegistration,
  PurchaseRequestRow,
  StockOutRequestRow,
} from "@/lib/actions";
import {
  audienceLabel,
  buildInventoryNotifications,
  filterNotificationsBySeverity,
  prepareNotificationsForDisplay,
  summarizeInventoryNotifications,
  type InventoryAlertSeverity,
  type InventoryNotification,
  type InventoryNotificationAudience,
  type InventoryNotificationInput,
} from "@/lib/inventoryNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function SeverityBadge({ severity }: { severity: InventoryAlertSeverity }) {
  if (severity === "critical") {
    return (
      <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
        Critical
      </Badge>
    );
  }
  if (severity === "warning") {
    return (
      <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 text-[10px] uppercase tracking-wide">
        Warning
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
      Info
    </Badge>
  );
}

function notificationIcon(n: InventoryNotification) {
  if (
    n.kind === "expired" ||
    n.kind === "expiring_soon" ||
    n.kind === "expiring_upcoming"
  ) {
    return CalendarClock;
  }
  if (n.sourceType === "purchase_request" || n.sourceType === "unit_price_purchase") {
    return ClipboardList;
  }
  if (n.sourceType === "stock_movement") return Truck;
  if (n.sourceType === "unit_price_inventory") return TrendingUp;
  if (n.kind === "request_approved") return CheckCircle2;
  if (n.kind === "request_rejected") return AlertTriangle;
  if (n.kind.startsWith("pending")) return ShieldAlert;
  return Package;
}

function NotificationRow({ n }: { n: InventoryNotification }) {
  const Icon = notificationIcon(n);

  return (
    <li className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 mt-0.5",
              n.severity === "critical" && "text-destructive",
              n.severity === "warning" && "text-amber-600",
              n.severity === "info" && "text-muted-foreground",
            )}
          />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {n.entityLabel}
            </p>
            <p className="text-sm font-medium leading-snug truncate">{n.itemName}</p>
            <p className="text-xs text-muted-foreground">{n.title}</p>
          </div>
        </div>
        <SeverityBadge severity={n.severity} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pl-6">{n.message}</p>
      <div className="flex flex-wrap gap-2 pl-6 text-[10px] text-muted-foreground">
        {n.amount != null && n.measuredBy ? (
          <span className="tabular-nums">
            {n.amount} {n.measuredBy}
          </span>
        ) : null}
        {n.voucherDisplay ? <span>· {n.voucherDisplay}</span> : null}
        {n.expireDate ? (
          <span>
            · Exp{" "}
            {new Date(n.expireDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ) : null}
      </div>
    </li>
  );
}

export type InventoryNotificationCenterProps = {
  audience: InventoryNotificationAudience;
  hotelLodging?: boolean;
  /** Hotel store: only workflow alerts for this user's submitted requests. */
  storeUserName?: string;
  className?: string;
} & InventoryNotificationInput;

function useInventoryAlerts(
  props: InventoryNotificationCenterProps,
) {
  const {
    audience,
    hotelLodging,
    storeUserName,
    items = [],
    purchaseRequests = [],
    stockMovements = [],
  } = props;

  return useMemo(() => {
    const raw = buildInventoryNotifications(
      { items, purchaseRequests, stockMovements },
      audience,
      { hotelLodging, storeUserName },
    );
    const notifications = prepareNotificationsForDisplay(raw);
    const summary = summarizeInventoryNotifications(notifications);
    return { notifications, summary };
  }, [
    items,
    purchaseRequests,
    stockMovements,
    audience,
    hotelLodging,
    storeUserName,
  ]);
}

export function InventoryNotificationCenter(
  props: InventoryNotificationCenterProps,
) {
  const { audience, className } = props;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<InventoryAlertSeverity | "all">("all");

  const { notifications, summary } = useInventoryAlerts(props);

  const visible = useMemo(
    () => filterNotificationsBySeverity(notifications, filter),
    [notifications, filter],
  );

  const badgeCount = summary.critical + summary.warning;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("relative shrink-0", className)}
          aria-label={`Inventory alerts, ${badgeCount} need attention`}
        >
          <Bell className="h-4 w-4" />
          {badgeCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : summary.info > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
      >
        <div className="border-b px-4 py-3 space-y-1">
          <p className="text-sm font-semibold">Inventory alerts</p>
          <p className="text-xs text-muted-foreground">
            {audienceLabel(audience)} · {summary.workflowCount} workflow ·{" "}
            {summary.stockExpiryCount} stock/expiry
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b bg-muted/20">
          <div className="rounded-md border border-destructive/25 bg-destructive/5 px-2 py-1.5 text-center">
            <p className="text-lg font-bold tabular-nums text-destructive">
              {summary.critical}
            </p>
            <p className="text-[10px] uppercase text-muted-foreground">Critical</p>
          </div>
          <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-2 py-1.5 text-center">
            <p className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">
              {summary.warning}
            </p>
            <p className="text-[10px] uppercase text-muted-foreground">Warning</p>
          </div>
          <div className="rounded-md border border-border/60 bg-card px-2 py-1.5 text-center">
            <p className="text-lg font-bold tabular-nums">{summary.info}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Info</p>
          </div>
        </div>
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as InventoryAlertSeverity | "all")}
          className="px-4 pt-3"
        >
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="all" className="text-xs px-1">
              All
            </TabsTrigger>
            <TabsTrigger value="critical" className="text-xs px-1">
              Critical
            </TabsTrigger>
            <TabsTrigger value="warning" className="text-xs px-1">
              Warn
            </TabsTrigger>
            <TabsTrigger value="info" className="text-xs px-1">
              Info
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <ScrollArea className="h-[min(20rem,50vh)]">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground">
                No {filter === "all" ? "" : `${filter} `}inventory alerts for this
                view.
              </p>
            </div>
          ) : (
            <ul className="space-y-2 p-4 pt-3">
              {visible.map((n) => (
                <NotificationRow key={n.id} n={n} />
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function InventoryAlertsBanner({
  className,
  maxItems = 4,
  ...props
}: InventoryNotificationCenterProps & {
  className?: string;
  maxItems?: number;
}) {
  const { notifications, summary } = useInventoryAlerts(props);
  const actionable = useMemo(
    () => notifications.filter((n) => n.severity !== "info"),
    [notifications],
  );

  if (actionable.length === 0) return null;

  const top = actionable.slice(0, maxItems);

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/30 bg-linear-to-r from-amber-500/8 via-card to-card p-4 shadow-sm",
        summary.critical > 0 && "border-destructive/35 from-destructive/8",
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-3 justify-between mb-3">
        <div className="flex items-start gap-2">
          <AlertTriangle
            className={cn(
              "h-5 w-5 shrink-0 mt-0.5",
              summary.critical > 0 ? "text-destructive" : "text-amber-600",
            )}
          />
          <div>
            <p className="text-sm font-semibold">Inventory needs attention</p>
            <p className="text-xs text-muted-foreground">
              {summary.critical} critical · {summary.warning} warning
              {summary.workflowCount > 0
                ? ` · ${summary.workflowCount} pending approval`
                : ""}
            </p>
          </div>
        </div>
        <InventoryNotificationCenter {...props} />
      </div>
      <ul className="space-y-2">
        {top.map((n) => (
          <NotificationRow key={n.id} n={n} />
        ))}
      </ul>
      {actionable.length > maxItems ? (
        <p className="text-xs text-muted-foreground mt-2 pl-1">
          +{actionable.length - maxItems} more — open alerts for full list
        </p>
      ) : null}
    </div>
  );
}
