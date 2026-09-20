"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BedDouble,
  CalendarClock,
  Check,
  ClipboardCheck,
  Info,
  Sparkles,
} from "lucide-react";
import {
  buildLodgingNotifications,
  summarizeLodgingNotifications,
  type LodgingAlertSeverity,
  type LodgingNotification,
  type LodgingNotificationInput,
} from "@/lib/lodgingNotifications";
import {
  inventoryNotificationSeenKey,
  readSeenNotificationIds,
  writeSeenNotificationIds,
} from "@/lib/inventoryNotificationSeen";
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

function SeverityBadge({ severity }: { severity: LodgingAlertSeverity }) {
  if (severity === "critical") {
    return (
      <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
        Critical
      </Badge>
    );
  }
  if (severity === "warning") {
    return (
      <Badge className="border-amber-500/30 bg-amber-500/15 text-[10px] uppercase tracking-wide text-amber-800 dark:text-amber-200">
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

function KindIcon({
  n,
  className,
}: {
  n: LodgingNotification;
  className?: string;
}) {
  if (n.kind === "overstay" || n.kind === "checkout_blocker") {
    return <AlertTriangle className={className} />;
  }
  if (n.kind === "reservation_due" || n.kind === "business_day_open") {
    return <CalendarClock className={className} />;
  }
  if (n.kind === "inspected_ready") {
    return <ClipboardCheck className={className} />;
  }
  if (n.kind === "cm_backlog") {
    return <Sparkles className={className} />;
  }
  return <BedDouble className={className} />;
}

const SEEN_SCOPE = "lodging-alerts";

export function LodgingNotificationCenter({
  input,
  className,
}: {
  input: LodgingNotificationInput;
  className?: string;
}) {
  const notifications = useMemo(
    () => buildLodgingNotifications(input),
    [input],
  );
  const summary = useMemo(
    () => summarizeLodgingNotifications(notifications),
    [notifications],
  );
  const seenKey = inventoryNotificationSeenKey(SEEN_SCOPE);
  const [seen, setSeen] = useState(() => readSeenNotificationIds(seenKey));
  const [filter, setFilter] = useState<"all" | LodgingAlertSeverity>("all");
  const [open, setOpen] = useState(false);

  const visible = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.severity === filter);
  }, [notifications, filter]);

  const unseenCount = notifications.filter((n) => !seen.has(n.id)).length;

  const markAllSeen = useCallback(() => {
    const next = new Set(seen);
    for (const n of notifications) next.add(n.id);
    setSeen(next);
    writeSeenNotificationIds(seenKey, next);
  }, [notifications, seen, seenKey]);

  if (notifications.length === 0) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn("relative h-10 w-10 rounded-xl", className)}
        disabled
        title="No lodging alerts"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) markAllSeen();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "relative h-10 w-10 rounded-xl border-primary/20 bg-background/90 shadow-sm",
            className,
          )}
          aria-label="Lodging notifications"
        >
          <Bell className="h-4 w-4" />
          {unseenCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(100vw-2rem,22rem)] p-0 shadow-xl"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Lodging alerts</p>
            <p className="text-xs text-muted-foreground">
              {summary.critical} critical · {summary.warning} warning ·{" "}
              {summary.info} info
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={markAllSeen}
          >
            <Check className="h-3.5 w-3.5" />
            Seen
          </Button>
        </div>
        <Tabs
          value={filter}
          onValueChange={(v) =>
            setFilter(v as "all" | LodgingAlertSeverity)
          }
          className="px-3 pt-2"
        >
          <TabsList className="grid h-9 w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="critical" className="text-xs">
              Crit
            </TabsTrigger>
            <TabsTrigger value="warning" className="text-xs">
              Warn
            </TabsTrigger>
            <TabsTrigger value="info" className="text-xs">
              Info
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <ScrollArea className="h-[min(50vh,20rem)]">
          <ul className="space-y-2 p-3">
            {visible.length === 0 ? (
              <li className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Info className="h-5 w-5" />
                Nothing in this filter.
              </li>
            ) : (
              visible.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "rounded-xl border p-3 shadow-sm",
                    !seen.has(n.id) && "border-primary/30 bg-primary/5",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <KindIcon n={n} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium leading-snug">
                          {n.title}
                        </p>
                        <SeverityBadge severity={n.severity} />
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {n.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
