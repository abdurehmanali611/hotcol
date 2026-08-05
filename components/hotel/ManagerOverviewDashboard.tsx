"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BedDouble,
  Coffee,
  KeyRound,
  Package,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchLodgingDashboardStats,
  type LodgingDashboardStats,
} from "@/lib/api/lodgingRooms";
import { fetchHrDashboardStats, type HrDashboardStats } from "@/lib/api/hr";
import {
  MODULE_DESCRIPTIONS,
  tenantHasModule,
} from "@/lib/subscriptionModules";
import type { ModuleOption } from "@/constants";
import type { PurchaseRequestRow } from "@/lib/api/hotelWorkflow";
import type { ItemStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type ModuleScoreCard = {
  module: ModuleOption;
  label: string;
  icon: LucideIcon;
  points: number;
  summary: string;
  metrics: { label: string; value: string | number }[];
  accent: string;
};

function clampPoints(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function pointsTone(points: number): string {
  if (points >= 75) return "text-emerald-700 dark:text-emerald-400";
  if (points >= 45) return "text-amber-700 dark:text-amber-400";
  return "text-rose-700 dark:text-rose-400";
}

const ROOM_COLORS = [
  "var(--color-vacantClean)",
  "var(--color-vacantDirty)",
  "var(--color-occupied)",
  "var(--color-maintenance)",
];

const MODULE_BAR_COLORS = [
  "hsl(199 89% 42%)",
  "hsl(262 70% 55%)",
  "hsl(221 70% 50%)",
  "hsl(24 90% 50%)",
  "hsl(168 65% 38%)",
  "hsl(142 60% 40%)",
  "hsl(215 16% 47%)",
];

export type ManagerOverviewDashboardProps = {
  modules: readonly ModuleOption[] | readonly string[];
  inventoryItemCount: number;
  pendingPurchases: number;
  pendingStock: number;
  movementHistoryCount: number;
  cafeLiveOrderCount: number;
  cafeTableCount: number;
  cafeWaiterCount: number;
  cafeMenuItemCount: number;
  credentialCount: number;
  recentPurchases: PurchaseRequestRow[];
  recentStockMovements: ItemStatus[];
};

export function ManagerOverviewDashboard({
  modules,
  inventoryItemCount,
  pendingPurchases,
  pendingStock,
  movementHistoryCount,
  cafeLiveOrderCount,
  cafeTableCount,
  cafeWaiterCount,
  cafeMenuItemCount,
  credentialCount,
  recentPurchases,
  recentStockMovements,
}: ManagerOverviewDashboardProps) {
  const hasRooms = tenantHasModule(modules as ModuleOption[], "Room Management");
  const hasCm = tenantHasModule(
    modules as ModuleOption[],
    "Cleaning and Maintenance",
  );
  const hasInventory = tenantHasModule(modules as ModuleOption[], "Inventory");
  const hasCafe = tenantHasModule(
    modules as ModuleOption[],
    "Cafe and Restaurant",
  );
  const hasCredit = tenantHasModule(
    modules as ModuleOption[],
    "Credit Management",
  );
  const hasFinance = tenantHasModule(
    modules as ModuleOption[],
    "Financial Management",
  );
  const hasCredentials = tenantHasModule(
    modules as ModuleOption[],
    "Credentials(Common)",
  );
  const hasHr = tenantHasModule(modules as ModuleOption[], "HR Module");

  const [lodgingStats, setLodgingStats] = useState<LodgingDashboardStats | null>(
    null,
  );
  const [lodgingLoading, setLodgingLoading] = useState(hasRooms || hasCm);
  const [hrStats, setHrStats] = useState<HrDashboardStats | null>(null);

  const loadLodging = useCallback(async () => {
    if (!hasRooms && !hasCm) {
      setLodgingStats(null);
      setLodgingLoading(false);
      return;
    }
    setLodgingLoading(true);
    try {
      setLodgingStats(await fetchLodgingDashboardStats());
    } catch {
      setLodgingStats(null);
    } finally {
      setLodgingLoading(false);
    }
  }, [hasRooms, hasCm]);

  const loadHr = useCallback(async () => {
    if (!hasHr) {
      setHrStats(null);
      return;
    }
    try {
      setHrStats(await fetchHrDashboardStats());
    } catch {
      setHrStats(null);
    }
  }, [hasHr]);

  useEffect(() => {
    void loadLodging();
  }, [loadLodging]);

  useEffect(() => {
    void loadHr();
  }, [loadHr]);

  const moduleCards = useMemo((): ModuleScoreCard[] => {
    const cards: ModuleScoreCard[] = [];

    if (hasRooms) {
      const s = lodgingStats;
      const totalRooms =
        (s?.vacantClean ?? 0) +
        (s?.vacantDirty ?? 0) +
        (s?.occupied ?? 0) +
        (s?.onMaintenance ?? 0);
      const sellable =
        (s?.vacantClean ?? 0) + (s?.vacantDirty ?? 0) + (s?.occupied ?? 0);
      const occupancyPct =
        sellable > 0 ? Math.round(((s?.occupied ?? 0) / sellable) * 100) : 0;
      const readyPct =
        totalRooms > 0
          ? Math.round(((s?.vacantClean ?? 0) / totalRooms) * 100)
          : 0;
      let points = 0;
      if (totalRooms === 0) {
        points = 10;
      } else {
        points = clampPoints(
          55 +
            readyPct * 0.35 -
            (s?.vacantDirty ?? 0) * 6 -
            (s?.onMaintenance ?? 0) * 4 +
            Math.min(20, (s?.activeStays ?? 0) * 2),
        );
      }
      cards.push({
        module: "Room Management",
        label: "Rooms & stays",
        icon: BedDouble,
        points,
        summary:
          totalRooms === 0
            ? "Add rooms to start tracking occupancy."
            : `${occupancyPct}% occupied · ${s?.activeStays ?? 0} active stay${(s?.activeStays ?? 0) === 1 ? "" : "s"}`,
        metrics: [
          { label: "Vacant clean", value: s?.vacantClean ?? "—" },
          { label: "Vacant dirty", value: s?.vacantDirty ?? "—" },
          { label: "Occupied", value: s?.occupied ?? "—" },
          { label: "Maintenance", value: s?.onMaintenance ?? "—" },
        ],
        accent: "from-sky-500/10 border-sky-500/20",
      });
    }

    if (hasCm) {
      const open = lodgingStats?.openCmAssignments ?? 0;
      const dirty = lodgingStats?.vacantDirty ?? 0;
      const points = lodgingStats
        ? clampPoints(100 - open * 12 - dirty * 5)
        : 40;
      cards.push({
        module: "Cleaning and Maintenance",
        label: "Housekeeping & CM",
        icon: Sparkles,
        points,
        summary:
          open === 0
            ? "No open CM assignments."
            : `${open} open assignment${open === 1 ? "" : "s"} need attention.`,
        metrics: [
          { label: "Open CM jobs", value: lodgingStats ? open : "—" },
          { label: "Dirty rooms", value: lodgingStats ? dirty : "—" },
        ],
        accent: "from-violet-500/10 border-violet-500/20",
      });
    }

    if (hasInventory) {
      const setup = inventoryItemCount > 0 ? 45 : 8;
      const purchasePts = Math.max(0, 30 - pendingPurchases * 4);
      const stockPts = Math.max(0, 25 - pendingStock * 5);
      const points = clampPoints(setup + purchasePts + stockPts);
      cards.push({
        module: "Inventory",
        label: "Inventory",
        icon: Package,
        points,
        summary:
          inventoryItemCount === 0
            ? "Register inventory items to unlock stock control."
            : `${pendingPurchases + pendingStock} open approval step${pendingPurchases + pendingStock === 1 ? "" : "s"}.`,
        metrics: [
          { label: "Active items", value: inventoryItemCount },
          { label: "Purchases pending", value: pendingPurchases },
          { label: "Stock pending", value: pendingStock },
          { label: "Movement lines", value: movementHistoryCount },
        ],
        accent: "from-primary/10 border-primary/20",
      });
    }

    if (hasCafe) {
      const setupBits =
        (cafeMenuItemCount > 0 ? 1 : 0) +
        (cafeTableCount > 0 ? 1 : 0) +
        (cafeWaiterCount > 0 ? 1 : 0);
      const setupPts = setupBits * 28;
      const activityPts = Math.min(20, cafeLiveOrderCount * 4);
      const points = clampPoints(
        setupPts + activityPts + (setupBits === 3 ? 6 : 0),
      );
      cards.push({
        module: "Cafe and Restaurant",
        label: "Café & restaurant",
        icon: Coffee,
        points,
        summary:
          setupBits < 3
            ? "Finish menu, tables, and waiters setup."
            : `${cafeLiveOrderCount} live order${cafeLiveOrderCount === 1 ? "" : "s"} on the floor.`,
        metrics: [
          { label: "Menu items", value: cafeMenuItemCount },
          { label: "Tables", value: cafeTableCount },
          { label: "Waiters", value: cafeWaiterCount },
          { label: "Live orders", value: cafeLiveOrderCount },
        ],
        accent: "from-orange-500/10 border-orange-500/20",
      });
    }

    if (hasCredit) {
      cards.push({
        module: "Credit Management",
        label: "Corporate credit",
        icon: Wallet,
        points: 70,
        summary: "Manage company deals and usage from Hotel Cashier.",
        metrics: [{ label: "Status", value: "Subscribed" }],
        accent: "from-teal-500/10 border-teal-500/20",
      });
    }

    if (hasFinance) {
      const open = pendingPurchases + pendingStock;
      const points = clampPoints(100 - open * 6);
      cards.push({
        module: "Financial Management",
        label: "Finance approvals",
        icon: ShieldCheck,
        points,
        summary:
          open === 0
            ? "No purchases or stock waiting on finance gates."
            : `${open} item${open === 1 ? "" : "s"} still in the approval pipeline.`,
        metrics: [
          { label: "Purchases in pipeline", value: pendingPurchases },
          { label: "Stock awaiting CC", value: pendingStock },
        ],
        accent: "from-emerald-500/10 border-emerald-500/20",
      });
    }

    if (hasHr) {
      const headcount = hrStats?.headcount ?? 0;
      const pendingLeave = hrStats?.pendingLeave ?? 0;
      const points = hrStats
        ? clampPoints(
            (headcount > 0 ? 55 : 15) +
              Math.min(25, headcount * 2) -
              pendingLeave * 8 +
              (hrStats.openPayrollPeriods === 0 ? 10 : 0),
          )
        : 40;
      cards.push({
        module: "HR Module",
        label: "HR workforce",
        icon: Users,
        points,
        summary: !hrStats
          ? "HR stats unavailable."
          : headcount === 0
            ? "Add employees to start workforce tracking."
            : `${headcount} active · ${pendingLeave} leave pending.`,
        metrics: [
          { label: "Headcount", value: hrStats?.headcount ?? "—" },
          { label: "On leave today", value: hrStats?.onLeaveToday ?? "—" },
          { label: "Leave pending", value: hrStats?.pendingLeave ?? "—" },
          { label: "Open payroll", value: hrStats?.openPayrollPeriods ?? "—" },
        ],
        accent: "from-rose-500/10 border-rose-500/20",
      });
    }

    if (hasCredentials) {
      const points = clampPoints(
        credentialCount === 0 ? 15 : Math.min(100, 40 + credentialCount * 8),
      );
      cards.push({
        module: "Credentials(Common)",
        label: "Staff access",
        icon: KeyRound,
        points,
        summary:
          credentialCount === 0
            ? "Grant credentials so staff can sign in."
            : `${credentialCount} staff credential${credentialCount === 1 ? "" : "s"} provisioned.`,
        metrics: [{ label: "Credentials", value: credentialCount }],
        accent: "from-slate-500/10 border-slate-500/20",
      });
    }

    return cards;
  }, [
    hasRooms,
    hasCm,
    hasInventory,
    hasCafe,
    hasCredit,
    hasFinance,
    hasCredentials,
    hasHr,
    lodgingStats,
    hrStats,
    inventoryItemCount,
    pendingPurchases,
    pendingStock,
    movementHistoryCount,
    cafeLiveOrderCount,
    cafeTableCount,
    cafeWaiterCount,
    cafeMenuItemCount,
    credentialCount,
  ]);

  const overallPoints = useMemo(() => {
    if (moduleCards.length === 0) return 0;
    const sum = moduleCards.reduce((acc, c) => acc + c.points, 0);
    return Math.round(sum / moduleCards.length);
  }, [moduleCards]);

  const subscribedLabels = useMemo(
    () => moduleCards.map((c) => c.module),
    [moduleCards],
  );

  const modulePointsChart = useMemo(
    () =>
      moduleCards.map((c) => ({
        name: c.label,
        points: c.points,
      })),
    [moduleCards],
  );

  const modulePointsConfig = useMemo(
    () =>
      ({
        points: { label: "Points", color: "hsl(221 70% 50%)" },
      }) satisfies ChartConfig,
    [],
  );

  const roomPieData = useMemo(() => {
    if (!lodgingStats) return [];
    return [
      { name: "Vacant clean", value: lodgingStats.vacantClean, key: "vacantClean" },
      { name: "Vacant dirty", value: lodgingStats.vacantDirty, key: "vacantDirty" },
      { name: "Occupied", value: lodgingStats.occupied, key: "occupied" },
      {
        name: "Maintenance",
        value: lodgingStats.onMaintenance,
        key: "maintenance",
      },
    ].filter((d) => d.value > 0);
  }, [lodgingStats]);

  const roomPieConfig = {
    vacantClean: { label: "Vacant clean", color: "hsl(142 60% 42%)" },
    vacantDirty: { label: "Vacant dirty", color: "hsl(38 92% 50%)" },
    occupied: { label: "Occupied", color: "hsl(199 89% 48%)" },
    maintenance: { label: "Maintenance", color: "hsl(0 72% 55%)" },
  } satisfies ChartConfig;

  const inventoryBarData = useMemo(
    () => [
      { name: "Active items", value: inventoryItemCount },
      { name: "Purchases pending", value: pendingPurchases },
      { name: "Stock pending", value: pendingStock },
      { name: "Movement history", value: movementHistoryCount },
    ],
    [
      inventoryItemCount,
      pendingPurchases,
      pendingStock,
      movementHistoryCount,
    ],
  );

  const inventoryBarConfig = {
    value: { label: "Count", color: "hsl(221 70% 50%)" },
  } satisfies ChartConfig;

  const cafePieData = useMemo(
    () =>
      [
        { name: "Menu", value: cafeMenuItemCount, key: "menu" },
        { name: "Tables", value: cafeTableCount, key: "tables" },
        { name: "Waiters", value: cafeWaiterCount, key: "waiters" },
        { name: "Live orders", value: cafeLiveOrderCount, key: "orders" },
      ].filter((d) => d.value > 0),
    [cafeMenuItemCount, cafeTableCount, cafeWaiterCount, cafeLiveOrderCount],
  );

  const cafePieConfig = {
    menu: { label: "Menu", color: "hsl(24 90% 50%)" },
    tables: { label: "Tables", color: "hsl(199 75% 45%)" },
    waiters: { label: "Waiters", color: "hsl(262 55% 55%)" },
    orders: { label: "Live orders", color: "hsl(142 55% 40%)" },
  } satisfies ChartConfig;

  const purchaseStatusArea = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of recentPurchases) {
      const key = String(p.status || "UNKNOWN");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([status, count]) => ({
      status: status.replace(/_/g, " "),
      count,
    }));
  }, [recentPurchases]);

  const purchaseAreaConfig = {
    count: { label: "Requests", color: "hsl(262 70% 55%)" },
  } satisfies ChartConfig;

  const stockActionArea = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of recentStockMovements) {
      const key = String(s.status || "move");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([action, count]) => ({
      action: action.replace(/_/g, " "),
      count,
    }));
  }, [recentStockMovements]);

  const stockAreaConfig = {
    count: { label: "Movements", color: "hsl(168 65% 38%)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-card via-card to-primary/8 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5 min-w-0">
              <CardTitle className="text-xl tracking-tight">
                Tenant progress overview
              </CardTitle>
              <CardDescription>
                Live scorecard for the modules this property subscribes to.
                Charts replace list tables so you can scan readiness at a glance.
              </CardDescription>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {subscribedLabels.map((m) => (
                  <Badge key={m} variant="secondary" className="font-normal">
                    {m === "Credentials(Common)" ? "Credentials" : m}
                  </Badge>
                ))}
                {subscribedLabels.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    No operational modules detected on this tenant.
                  </span>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 rounded-2xl border border-border/70 bg-background/80 px-5 py-3 text-center shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Overall points
              </p>
              <p
                className={cn(
                  "text-4xl font-semibold tabular-nums tracking-tight",
                  pointsTone(overallPoints),
                )}
              >
                {overallPoints}
              </p>
              <p className="text-xs text-muted-foreground">out of 100</p>
            </div>
          </div>
          <div className="pt-3 space-y-1.5">
            <Progress value={overallPoints} className="h-2.5" />
            <p className="text-xs text-muted-foreground">
              Average across {moduleCards.length} subscribed module
              {moduleCards.length === 1 ? "" : "s"}
              {lodgingLoading && (hasRooms || hasCm)
                ? " · refreshing room stats…"
                : ""}
            </p>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {moduleCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.module}
              className={cn(
                "overflow-hidden border shadow-md bg-linear-to-br to-card",
                card.accent,
              )}
            >
              <CardHeader className="pb-2 pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 border border-border/60">
                      <Icon className="h-4 w-4 text-foreground/80" />
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {card.label}
                      </CardTitle>
                      <CardDescription className="text-[11px] line-clamp-1">
                        {MODULE_DESCRIPTIONS[card.module]}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "text-2xl font-semibold tabular-nums leading-none",
                        pointsTone(card.points),
                      )}
                    >
                      {card.points}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      pts
                    </p>
                  </div>
                </div>
                <Progress value={card.points} className="h-1.5" />
                <p className="text-sm text-muted-foreground">{card.summary}</p>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <dl className="grid grid-cols-2 gap-2">
                  {card.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-2"
                    >
                      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {m.label}
                      </dt>
                      <dd className="text-sm font-medium tabular-nums">
                        {m.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {modulePointsChart.length > 0 ? (
        <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden">
          <CardHeader>
            <CardTitle>Module points</CardTitle>
            <CardDescription>
              Side-by-side readiness score for each subscribed module.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={modulePointsConfig}
              className="aspect-auto h-72 w-full"
            >
              <BarChart data={modulePointsChart} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={64}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                  {modulePointsChart.map((_, i) => (
                    <Cell
                      key={i}
                      fill={MODULE_BAR_COLORS[i % MODULE_BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {hasRooms ? (
          <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden">
            <CardHeader>
              <CardTitle>Room status mix</CardTitle>
              <CardDescription>
                Current occupancy distribution across the property.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roomPieData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No rooms to chart yet.
                </p>
              ) : (
                <ChartContainer
                  config={roomPieConfig}
                  className="mx-auto aspect-square max-h-72"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={roomPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={3}
                    >
                      {roomPieData.map((entry, i) => (
                        <Cell
                          key={entry.key}
                          fill={ROOM_COLORS[i % ROOM_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        ) : null}

        {hasCafe ? (
          <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden">
            <CardHeader>
              <CardTitle>Café footprint</CardTitle>
              <CardDescription>
                Menu, tables, waiters, and live floor orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cafePieData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Café setup has no counts yet.
                </p>
              ) : (
                <ChartContainer
                  config={cafePieConfig}
                  className="mx-auto aspect-square max-h-72"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={cafePieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={92}
                      paddingAngle={3}
                    >
                      {cafePieData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={`var(--color-${entry.key})`}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        ) : null}

        {hasInventory ? (
          <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden">
            <CardHeader>
              <CardTitle>Inventory pipeline</CardTitle>
              <CardDescription>
                Items on hand versus open purchase and stock steps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={inventoryBarConfig}
                className="aspect-auto h-72 w-full"
              >
                <BarChart
                  data={inventoryBarData}
                  layout="vertical"
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={118}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar
                    dataKey="value"
                    fill="var(--color-value)"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : null}

        {hasInventory && purchaseStatusArea.length > 0 ? (
          <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden">
            <CardHeader>
              <CardTitle>Recent purchase statuses</CardTitle>
              <CardDescription>
                Status mix across the latest purchase requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={purchaseAreaConfig}
                className="aspect-auto h-72 w-full"
              >
                <AreaChart data={purchaseStatusArea} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="status"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-16}
                    textAnchor="end"
                    height={56}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    fill="var(--color-count)"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : null}

        {hasInventory && stockActionArea.length > 0 ? (
          <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden lg:col-span-2">
            <CardHeader>
              <CardTitle>Stock movement activity</CardTitle>
              <CardDescription>
                Action / status breakdown from recent movement history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={stockAreaConfig}
                className="aspect-auto h-64 w-full"
              >
                <AreaChart data={stockActionArea} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="action"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                    height={52}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    fill="var(--color-count)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
