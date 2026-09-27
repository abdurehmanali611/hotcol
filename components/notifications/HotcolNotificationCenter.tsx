"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BedDouble,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Package,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import {
  listHrStaffNotifications,
  markHrStaffNotificationRead,
  type HrStaffNotification,
} from "@/lib/hrStaffNotifications";
import {
  buildInventoryNotifications,
  prepareNotificationsForDisplay,
  type InventoryAlertSeverity,
  type InventoryNotification,
  type InventoryNotificationAudience,
  type InventoryNotificationInput,
} from "@/lib/inventoryNotifications";
import {
  buildLodgingNotifications,
  type LodgingNotification,
  type LodgingNotificationInput,
} from "@/lib/lodgingNotifications";
import {
  inventoryNotificationSeenKey,
  readSeenNotificationIds,
  writeSeenNotificationIds,
} from "@/lib/inventoryNotificationSeen";

const POLL_MS = 15000;

export type UnifiedSourceFilter = "all" | "hr" | "rooming" | "inventory";

type UnifiedItem = {
  key: string;
  source: "hr" | "rooming" | "inventory";
  title: string;
  body: string;
  meta?: string;
  severity?: InventoryAlertSeverity;
  createdAt?: string | null;
  unread: boolean;
  hr?: HrStaffNotification;
  inventory?: InventoryNotification;
  lodging?: LodgingNotification;
};

function sectionFromHref(href: string): string | null {
  try {
    const url = new URL(href, "http://local");
    const fromQuery = url.searchParams.get("section");
    if (fromQuery) return fromQuery;
  } catch {
    /* fall through */
  }
  const bare = href.trim();
  if (/^[a-z][a-z0-9-]*$/i.test(bare)) return bare;
  return null;
}

function SourceChip({ source }: { source: UnifiedItem["source"] }) {
  const label =
    source === "hr" ? "HR" : source === "rooming" ? "Rooming" : "Inventory";
  const tone =
    source === "hr"
      ? "border-violet-500/30 bg-violet-500/15 text-violet-800 dark:text-violet-200"
      : source === "rooming"
        ? "border-sky-500/30 bg-sky-500/15 text-sky-800 dark:text-sky-200"
        : "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-200";
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function ItemIcon({
  item,
  className,
}: {
  item: UnifiedItem;
  className?: string;
}) {
  if (item.source === "hr") {
    return <Bell className={className} />;
  }
  if (item.lodging) {
    const k = item.lodging.kind;
    if (k === "overstay" || k === "checkout_blocker") {
      return <AlertTriangle className={className} />;
    }
    if (k === "reservation_due" || k === "business_day_open") {
      return <CalendarClock className={className} />;
    }
    if (k === "inspected_ready") return <CheckCircle2 className={className} />;
    if (k === "cm_backlog") return <Sparkles className={className} />;
    return <BedDouble className={className} />;
  }
  const n = item.inventory;
  if (!n) return <Package className={className} />;
  if (
    n.kind === "expired" ||
    n.kind === "expiring_soon" ||
    n.kind === "expiring_upcoming"
  ) {
    return <CalendarClock className={className} />;
  }
  if (
    n.sourceType === "purchase_request" ||
    n.sourceType === "unit_price_purchase"
  ) {
    return <ClipboardList className={className} />;
  }
  if (n.sourceType === "stock_movement") return <Truck className={className} />;
  if (n.sourceType === "unit_price_inventory") {
    return <TrendingUp className={className} />;
  }
  if (n.kind === "request_approved") return <CheckCircle2 className={className} />;
  if (n.kind === "request_rejected") return <AlertTriangle className={className} />;
  if (n.kind.startsWith("pending")) return <ShieldAlert className={className} />;
  return <Package className={className} />;
}

export type HotcolNotificationCenterProps = {
  audience: InventoryNotificationAudience;
  hotelLodging?: boolean;
  storeUserName?: string;
  lodging?: LodgingNotificationInput;
  /** Include HR notifications when tenant has HR Module. */
  includeHr?: boolean;
  onNavigateHrSection?: (section: string) => void;
  className?: string;
} & InventoryNotificationInput;

export function HotcolNotificationCenter(props: HotcolNotificationCenterProps) {
  const {
    audience,
    hotelLodging,
    storeUserName,
    lodging,
    includeHr = false,
    onNavigateHrSection,
    className,
    items = [],
    purchaseRequests = [],
    stockMovements = [],
  } = props;

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<UnifiedSourceFilter>("all");
  const [hrRows, setHrRows] = useState<HrStaffNotification[]>([]);

  const storageKey = useMemo(
    () => inventoryNotificationSeenKey(audience, storeUserName),
    [audience, storeUserName],
  );
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSeenIds(readSeenNotificationIds(storageKey));
  }, [storageKey]);

  const markOpsSeen = useCallback(
    (id: string) => {
      setSeenIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        writeSeenNotificationIds(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const loadHr = useCallback(async () => {
    if (!includeHr) {
      setHrRows([]);
      return;
    }
    try {
      setHrRows(await listHrStaffNotifications());
    } catch {
      /* keep prior */
    }
  }, [includeHr]);

  useEffect(() => {
    void loadHr();
  }, [loadHr]);

  useVisibleInterval(() => {
    void loadHr();
  }, POLL_MS);

  const opsItems = useMemo(() => {
    const raw = buildInventoryNotifications(
      { items, purchaseRequests, stockMovements },
      audience,
      { hotelLodging, storeUserName },
    );
    const inventory = prepareNotificationsForDisplay(raw);
    const roomAlerts = lodging ? buildLodgingNotifications(lodging) : [];
    const list: UnifiedItem[] = [
      ...inventory.map((n) => ({
        key: `inv-${n.id}`,
        source: "inventory" as const,
        title: n.itemName || n.title,
        body: n.message,
        meta: n.title,
        severity: n.severity,
        unread: !seenIds.has(n.id),
        inventory: n,
      })),
      ...roomAlerts.map((n) => ({
        key: `room-${n.id}`,
        source: "rooming" as const,
        title: n.title,
        body: n.body,
        severity: n.severity,
        unread: !seenIds.has(n.id),
        lodging: n,
      })),
    ];
    return list;
  }, [
    items,
    purchaseRequests,
    stockMovements,
    audience,
    hotelLodging,
    storeUserName,
    lodging,
    seenIds,
  ]);

  const hrItems = useMemo(
    (): UnifiedItem[] =>
      hrRows.map((row) => ({
        key: `hr-${row.id}`,
        source: "hr" as const,
        title: row.title,
        body: row.body || "",
        meta: row.kind.replace(/_/g, " "),
        createdAt: row.createdAt,
        unread: !row.readAt,
        hr: row,
      })),
    [hrRows],
  );

  const merged = useMemo(() => {
    const all = [...hrItems, ...opsItems];
    all.sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (ta || tb) return tb - ta;
      const sa = a.severity === "critical" ? 0 : a.severity === "warning" ? 1 : 2;
      const sb = b.severity === "critical" ? 0 : b.severity === "warning" ? 1 : 2;
      return sa - sb;
    });
    return all;
  }, [hrItems, opsItems]);

  const visible = useMemo(() => {
    if (filter === "all") return merged;
    return merged.filter((n) => n.source === filter);
  }, [merged, filter]);

  const hrUnread = hrItems.filter((n) => n.unread).length;
  const opsAttention = opsItems.filter(
    (n) =>
      n.unread && (n.severity === "critical" || n.severity === "warning"),
  ).length;
  const badgeCount = hrUnread + opsAttention;

  const openHr = async (row: HrStaffNotification) => {
    try {
      if (!row.readAt) await markHrStaffNotificationRead(row.id);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not mark notification read",
      );
    }
    const href = String(row.href || "").trim();
    const section = href ? sectionFromHref(href) : null;
    setOpen(false);
    if (section && onNavigateHrSection) {
      onNavigateHrSection(section);
    } else if (href) {
      router.push(href);
    }
    await loadHr();
  };

  const onActivate = (item: UnifiedItem) => {
    if (item.hr) {
      void openHr(item.hr);
      return;
    }
    const opsId = item.inventory?.id || item.lodging?.id;
    if (opsId) markOpsSeen(opsId);
  };

  const filters: { id: UnifiedSourceFilter; label: string }[] = [
    { id: "all", label: "All" },
    ...(includeHr ? [{ id: "hr" as const, label: "HR" }] : []),
    ...(lodging ? [{ id: "rooming" as const, label: "Rooming" }] : []),
    { id: "inventory", label: "Inventory" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("relative h-9 w-9 shrink-0", className)}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {badgeCount > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-1.5 -top-1.5 h-5 min-w-5 px-1 text-[10px]"
            >
              {badgeCount > 99 ? "99+" : badgeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
      >
        <div className="border-b px-3 py-2.5 space-y-2">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              HR, rooming, and inventory in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                  filter === f.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <ScrollArea className="h-[min(22rem,55vh)]">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground">
                No {filter === "all" ? "" : `${filter} `}notifications.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5 p-3">
              {visible.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 text-left transition hover:bg-muted/50",
                      !item.unread && "opacity-65",
                    )}
                    onClick={() => onActivate(item)}
                  >
                    <div className="flex items-start gap-2">
                      <ItemIcon
                        item={item}
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          item.severity === "critical" && "text-destructive",
                          item.severity === "warning" && "text-amber-600",
                        )}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <SourceChip source={item.source} />
                          {item.unread ? (
                            <span className="size-1.5 rounded-full bg-primary" />
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Check className="size-3" />
                              Seen
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-snug">
                          {item.title}
                        </p>
                        {item.body ? (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {item.body}
                          </p>
                        ) : null}
                        {item.meta ? (
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {item.meta}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
