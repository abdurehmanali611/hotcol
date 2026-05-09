/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  approvePurchaseRequestCCApi,
  approveStockOutRequestApi,
  createKitchenBarBeginningApi,
  deleteKitchenBarBeginningApi,
  fetchCostControllerProfiles,
  fetchItemRegistrations,
  fetchItemStatus,
  fetchPurchaseRequests,
  fetchStockOutRequests,
  fetchKitchenBarBeginnings,
  fetchKitchenBarRollupSnapshots,
  syncKitchenBarRollupApi,
  rejectPurchaseRequestCCApi,
  rejectStockOutRequestApi,
  updateKitchenBarBeginningApi,
  logoutAction,
  type ItemRegistration,
  type ItemStatus,
  type KitchenBarBeginningRow,
  type KitchenBarMonthlySnapshotRow,
  type PurchaseRequestRow,
  type StockOutRequestRow,
  type CostControllerProfileRow,
} from "@/lib/actions";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  ClipboardList,
  LayoutGrid,
  Loader2,
  LogOut,
  MinusCircle,
  Package,
  Receipt,
  RefreshCw,
  Send,
  ShoppingCart,
  Table2,
} from "lucide-react";
import { HotelWorkflowGlossary } from "@/components/hotel/HotelWorkflowGlossary";
import {
  HOTEL_DAILY_COUNT_STATIONS,
  displayKitchenBarStation,
  normalizeKitchenBarStationKey,
  summarizeApprovedStockOutForDay,
} from "@/lib/hotelDailyStation";
import {
  formatMovementType,
  formatPurchaseStatus,
  formatQtyWithUnit,
  formatStockOutRequestStatus,
} from "@/lib/hotelDisplayLabels";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HotelFormFieldStack,
  HotelFormSection,
} from "@/components/hotel/HotelTerminalInitFormLayout";
import StoreItems from "@/app/StoreItems/page";
import Inactive from "@/app/Inactive/page";
import { HotelInventoryPaymentVatPanel } from "@/components/hotel/HotelInventoryPaymentVatPanel";
import { HotelCreditorUsageReportPanel } from "@/components/hotel/HotelCreditorUsageReportPanel";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HOTEL_INVENTORY_COPY } from "@/lib/hotelDisplayLabels";
import { INVENTORY_UNIT_NAMES } from "@/lib/inventoryUnits";
import { normalizeRollupRangeYmd } from "@/lib/kitchenBarMonthlyRange";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

function parseYmdToDate(ymd: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function normalizeItemNameForValueKey(name: string): string {
  return String(name || "").trim().toLowerCase();
}

function CostControlInner() {
  const searchParams = useSearchParams();
  const { displayName, tenantScope } = useTenantScopeAndDisplay(searchParams.get("hotel"));
  const logoUrl = searchParams.get("logo") || "";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<CostControllerProfileRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [stocks, setStocks] = useState<StockOutRequestRow[]>([]);
  const [beginnings, setBeginnings] = useState<KitchenBarBeginningRow[]>([]);
  const [monthlySnapshots, setMonthlySnapshots] = useState<
    KitchenBarMonthlySnapshotRow[]
  >([]);
  const [rollupFromYmd, setRollupFromYmd] = useState(() => {
    const to = new Date().toISOString().slice(0, 10);
    return `${to.slice(0, 7)}-01`;
  });
  const [rollupToYmd, setRollupToYmd] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const rollupRangeLabel = useMemo(() => {
    try {
      const { fromYmd, toYmd } = normalizeRollupRangeYmd(
        rollupFromYmd,
        rollupToYmd,
      );
      return `${fromYmd} → ${toYmd}`;
    } catch {
      return `${rollupFromYmd} → ${rollupToYmd}`;
    }
  }, [rollupFromYmd, rollupToYmd]);
  const [ccPick, setCcPick] = useState<Record<number, string>>({});
  const [beginForm, setBeginForm] = useState({
    station: "KITCHEN",
    itemName: "",
    amount: 0,
    managementTakenDay: 0,
    measuredBy: "Piece",
    monthPeriod: new Date().toISOString().slice(0, 7),
    calendarDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [selectedDailyDate, setSelectedDailyDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inventoryRows, setInventoryRows] = useState<ItemRegistration[]>([]);
  const [statusRows, setStatusRows] = useState<ItemStatus[]>([]);
  type CostSection =
    | "purchases"
    | "inventory"
    | "inactive"
    | "stock"
    | "request-status"
    | "beginnings"
    | "payment-vat"
    | "creditor-usage";
  const [activeSection, setActiveSection] = useState<CostSection>("purchases");

  const inventoryItemOptions = useMemo(() => {
    return inventoryRows
      .filter((r) => Number(r.amount) > 0)
      .map((r) => ({
        name: r.name,
        measuredBy: r.measuredBy,
      }));
  }, [inventoryRows]);

  const dailyUnitOptions = useMemo(() => {
    const current = String(beginForm.measuredBy || "").trim();
    if (!current) return [...INVENTORY_UNIT_NAMES];
    if ((INVENTORY_UNIT_NAMES as readonly string[]).includes(current)) {
      return [...INVENTORY_UNIT_NAMES];
    }
    return [current, ...INVENTORY_UNIT_NAMES];
  }, [beginForm.measuredBy]);

  const beginningDerivedById = useMemo(() => {
    const implied = new Map<number, number | null>();
    const daySales = new Map<number, number | null>();
    const t = String(tenantScope ?? "").trim();
    const scoped = t
      ? beginnings.filter((b) => rowHotelMatchesTenantScope(b.HotelName, t))
      : beginnings;
    const groups = new Map<string, KitchenBarBeginningRow[]>();
    for (const b of scoped) {
      const k = `${normalizeKitchenBarStationKey(b.station)}\t${b.itemName.trim().toLowerCase()}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(b);
    }
    for (const [, list] of groups) {
      list.sort((a, b) =>
        String(a.calendarDate || "").localeCompare(String(b.calendarDate || "")),
      );
      for (let i = 0; i < list.length; i++) {
        if (i === 0) {
          implied.set(list[i].id, null);
          daySales.set(list[i].id, null);
        } else {
          const prev = list[i - 1];
          const prevLights =
            Number(prev.closingOnHand) > 0
              ? Number(prev.closingOnHand)
              : Number(prev.amount);
          implied.set(
            list[i].id,
            round2(
              Number(prev.amount) +
                Number(prev.stockOutDay) -
                Number(list[i].amount),
            ),
          );
          daySales.set(list[i].id, round2(Number(list[i].amount) - prevLights));
        }
      }
    }
    return { implied, daySales };
  }, [beginnings, tenantScope]);

  const dailyFormPreview = useMemo(() => {
    const stationKey = normalizeKitchenBarStationKey(beginForm.station);
    const item = beginForm.itemName.trim();
    const cal = selectedDailyDate;
    const t = String(tenantScope ?? "").trim();
    const scopedBeg = t
      ? beginnings.filter((b) => rowHotelMatchesTenantScope(b.HotelName, t))
      : beginnings;
    let prev: KitchenBarBeginningRow | null = null;
    if (item) {
      const candidates = scopedBeg.filter((b) => {
        if (b.itemName.trim().toLowerCase() !== item.toLowerCase()) {
          return false;
        }
        if (normalizeKitchenBarStationKey(b.station) !== stationKey) {
          return false;
        }
        if (String(b.calendarDate || "").slice(0, 10) >= cal) return false;
        if (editingId != null && b.id === editingId) return false;
        return true;
      });
      candidates.sort((a, b) =>
        String(b.calendarDate || "").localeCompare(String(a.calendarDate || "")),
      );
      prev = candidates[0] ?? null;
    }
    const stockOut =
      item === ""
        ? 0
        : round2(summarizeApprovedStockOutForDay(stocks, stationKey, item, cal));
    const opening = round2(Number(beginForm.amount));
    const prevLights =
      prev != null
        ? Number(prev.closingOnHand) > 0
          ? Number(prev.closingOnHand)
          : Number(prev.amount)
        : null;
    const usageDay = prevLights != null ? round2(opening - prevLights) : null;
    const managementTaken = round2(Number(beginForm.managementTakenDay) || 0);
    // Lights-out = opening + approved stock-out - movement issued to management from station.
    const lightsOut = round2(opening + stockOut - managementTaken);
    return { stockOut, lightsOut, usageDay, managementTaken };
  }, [beginForm, stocks, beginnings, tenantScope, editingId, selectedDailyDate]);

  const visibleBeginnings = useMemo(() => {
    const day = String(selectedDailyDate || "").slice(0, 10);
    if (!day) return beginnings;
    return beginnings.filter((b) => String(b.calendarDate || "").slice(0, 10) === day);
  }, [beginnings, selectedDailyDate]);

  const unitPriceByItemName = useMemo(() => {
    const byName = new Map<string, number>();
    for (const row of inventoryRows) {
      const key = normalizeItemNameForValueKey(row.name);
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, Number(row.unitPrice) || 0);
    }
    return byName;
  }, [inventoryRows]);

  /** Sum over visible daily rows: unit price × sealed movement (implied); first row in a series has no sealed movement yet. */
  const selectedDayTotalCountedEtb = useMemo(() => {
    return visibleBeginnings.reduce((sum, row) => {
      const sealed = beginningDerivedById.implied.get(row.id);
      if (sealed == null) return sum;
      const key = normalizeItemNameForValueKey(row.itemName);
      const price = unitPriceByItemName.get(key) || 0;
      return sum + (Number(sealed) || 0) * price;
    }, 0);
  }, [visibleBeginnings, unitPriceByItemName, beginningDerivedById]);

  /** Sum over monthly snapshot rows: unit price × Σ implied movement for that station/item in the month. */
  const monthlyTotalEtb = useMemo(() => {
    return monthlySnapshots.reduce((sum, row) => {
      const key = normalizeItemNameForValueKey(row.itemName);
      const price = unitPriceByItemName.get(key) || 0;
      const impliedSum = Number(row.totalImpliedSales) || 0;
      return sum + impliedSum * price;
    }, 0);
  }, [monthlySnapshots, unitPriceByItemName]);

  useEffect(() => {
    const day = String(selectedDailyDate || "").slice(0, 10);
    if (!day) return;
    setBeginForm((f) => ({
      ...f,
      calendarDate: day,
      monthPeriod: day.slice(0, 7),
    }));
  }, [selectedDailyDate]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      let snapPromise: Promise<KitchenBarMonthlySnapshotRow[]> = Promise.resolve(
        [],
      );
      try {
        const { fromYmd, toYmd } = normalizeRollupRangeYmd(
          rollupFromYmd,
          rollupToYmd,
        );
        snapPromise = fetchKitchenBarRollupSnapshots(fromYmd, toYmd);
      } catch {
        snapPromise = Promise.resolve([]);
      }
      const [p, pr, so, kb, snaps, regs, stats] = await Promise.all([
        fetchCostControllerProfiles(),
        fetchPurchaseRequests(),
        fetchStockOutRequests(),
        fetchKitchenBarBeginnings(),
        snapPromise,
        fetchItemRegistrations(),
        fetchItemStatus(),
      ]);
      setProfiles(p);
      setPurchases(pr);
      setStocks(so);
      setBeginnings(kb);
      setMonthlySnapshots(snaps);
      const t = String(tenantScope ?? "").trim();
      const regList = regs as ItemRegistration[];
      const statList = stats as ItemStatus[];
      const inv = t
        ? regList.filter((it) => rowHotelMatchesTenantScope(it.HotelName, t))
        : regList;
      const st = t
        ? statList.filter((it) => rowHotelMatchesTenantScope(it.HotelName, t))
        : statList;
      setInventoryRows(inv);
      setStatusRows(st);
    } catch (e: any) {
      toast.error(e?.message || "Load failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantScope, rollupFromYmd, rollupToYmd]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-linear-to-b from-background via-muted/15 to-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading cost control…</span>
      </div>
    );
  }

  const pendingPr = purchases.filter((x) => x.status === "PENDING_CC");
  const pendingSo = stocks.filter((x) => x.status === "PENDING");

  const costNavItems = [
    { section: "purchases" as const, label: "Purchase requests", icon: Send },
    { section: "inventory" as const, label: "Inventory", icon: ShoppingCart },
    { section: "inactive" as const, label: "Inactive", icon: MinusCircle },
    {
      section: "stock" as const,
      label: "Stock / wastage / returns",
      icon: Package,
    },
    {
      section: "beginnings" as const,
      label: "Daily chef & bar counts",
      icon: LayoutGrid,
    },
    {
      section: "request-status" as const,
      label: "Request status",
      icon: ClipboardList,
    },
    {
      section: "payment-vat" as const,
      label: HOTEL_INVENTORY_COPY.paymentAndTax,
      icon: Receipt,
    },
    {
      section: "creditor-usage" as const,
      label: "Creditor staff usage report",
      icon: Table2,
    },
  ];

  const workspaceIntro: Record<
    CostSection,
    { title: string; description: string; Icon: typeof Send }
  > = {
    purchases: {
      title: "Purchase requests",
      description:
        "Review store requests and approve with your registered identity so finance and managers can audit who cleared each line.",
      Icon: Send,
    },
    inventory: {
      title: HOTEL_INVENTORY_COPY.inventoryItems,
      description:
        "Live quantities for this property — same list as the hotel store “Inventory” screen.",
      Icon: ShoppingCart,
    },
    inactive: {
      title: "Inactive items",
      description:
        "Depleted or written-off rows and history for this property, matching the store inactive audit view.",
      Icon: MinusCircle,
    },
    stock: {
      title: "Stock / wastage / returns",
      description:
        "Approve stock-out, wastage, and return movements before they hit on-hand balances.",
      Icon: Package,
    },
    beginnings: {
      title: "Daily chef & bar counts",
      description:
        "Opening pulse, documented stock-out, and lights-out snapshot per day — then sync a monthly roll-up.",
      Icon: LayoutGrid,
    },
    "request-status": {
      title: "Request status",
      description:
        "Full purchase and stock-movement history with current status across cost control and finance.",
      Icon: ClipboardList,
    },
    "payment-vat": {
      title: HOTEL_INVENTORY_COPY.paymentAndTax,
      description:
        "Filter inventory by supplier payment (credit vs paid) and VAT, and export Excel for finance.",
      Icon: Receipt,
    },
    "creditor-usage": {
      title: "Creditor staff usage report",
      description:
        "Live corporate-credit staff usage rows with Excel export for audit and finance handoff.",
      Icon: Table2,
    },
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40 text-foreground">
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border shadow-sm"
        >
          <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border bg-sidebar-accent/25 px-4">
            <div className="flex h-full min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/20">
                <LayoutGrid className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Terminal
                </p>
                <span className="block truncate font-semibold leading-tight">
                  Cost control
                </span>
              </div>
            </div>
          </SidebarHeader>
          <div className="shrink-0 px-3 pb-2 pt-3">
            <SidebarSeparator className="bg-sidebar-border/80" />
          </div>
          <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
            <SidebarMenu className="gap-1">
              {costNavItems.map(({ section, label, icon: Icon }) => (
                <SidebarMenuItem key={section}>
                  <SidebarMenuButton
                    isActive={activeSection === section}
                    onClick={() => setActiveSection(section)}
                    tooltip={label}
                    size="lg"
                    className="h-10 cursor-pointer text-[13px] data-[active=true]:shadow-sm"
                  >
                    <Icon className="opacity-80" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              onClick={() => logoutAction()}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex min-h-svh flex-1 flex-col overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/20 md:m-2 md:ml-0 md:max-h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-border/80 md:bg-background md:shadow-lg md:ring-1 md:ring-black/5 dark:md:ring-white/10">
          <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center gap-2 border-b bg-background px-3 md:px-6">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <h1 className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider truncate">
                {displayName || "Property"}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => load(true)}
              disabled={refreshing}
              className={refreshing ? "animate-spin" : ""}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8 border shadow-sm">
              <AvatarImage src={logoUrl} alt={displayName || "Property"} />
              <AvatarFallback>
                {(displayName || "P").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/60 bg-muted/20 p-4">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 md:px-6 md:py-6 scroll-smooth">
              <div className="mx-auto max-w-6xl space-y-10 pb-10">
        <HotelWorkflowGlossary variant="costControl" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-emerald-500/20 bg-linear-to-br from-card to-emerald-500/4 shadow-md overflow-hidden">
            <div className="h-0.5 bg-linear-to-r from-emerald-500/80 to-teal-400/60" />
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                  <Send className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 space-y-1">
                  <CardDescription>Purchase requests for you</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">
                    {pendingPr.length}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Awaiting your sign-off before finance
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card className="border-amber-500/20 bg-linear-to-br from-card to-amber-500/5 shadow-md overflow-hidden">
            <div className="h-0.5 bg-linear-to-r from-amber-500/80 to-orange-400/60" />
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5">
                  <Package className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                </div>
                <div className="min-w-0 space-y-1">
                  <CardDescription>Stock movements for you</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">
                    {pendingSo.length}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Wastage, returns, and transfers pending approval
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {(() => {
          const {
            title,
            description,
            Icon: IntroIcon,
          } = workspaceIntro[activeSection];
          return (
            <Card className="border-primary/15 bg-card/95 shadow-lg backdrop-blur-sm overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="h-1 bg-linear-to-r from-primary/60 via-violet-500/50 to-cyan-500/40" />
              <CardHeader className="pb-3 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-fit shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 p-2.5">
                    <IntroIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-xl tracking-tight sm:text-2xl">
                      {title}
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-pretty leading-relaxed">
                      {description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })()}

        {activeSection === "purchases" && (
          <div className="space-y-4">
            {profiles.length === 0 && pendingPr.length > 0 && (
              <p className="text-sm rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
                Your manager has not added any cost-controller names yet. Ask
                them to add identities under Manager → Cost control IDs.
              </p>
            )}
            {pendingPr.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-14 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/80">
                  <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Queue is clear
                </p>
                <p className="mx-auto max-w-md text-pretty text-sm text-muted-foreground">
                  No purchase requests waiting for cost control right now.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPr.map((r) => (
                  <Card
                    key={r.id}
                    className="border-border/80 shadow-md bg-card/95 backdrop-blur-sm overflow-hidden ring-1 ring-black/3 dark:ring-white/6"
                  >
                    <div className="h-0.5 bg-linear-to-r from-primary/50 to-transparent" />
                    <CardHeader className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg leading-snug">
                          {r.itemName}{" "}
                          <span className="text-muted-foreground font-normal">
                            × {r.quantity} {r.measuredBy}
                          </span>
                        </CardTitle>
                        <Badge variant="outline" className="shrink-0">
                          From store
                        </Badge>
                      </div>
                      <CardDescription className="space-y-1">
                        <span>
                          Requested by <strong>{r.storeUserName}</strong>
                        </span>
                        <span className="block">
                          Est. {r.estimatedUnitPrice} ETB / unit · Notes:{" "}
                          {r.notes || "—"}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end pb-5">
                      <div className="flex-1 w-full space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Who is approving? (your registered name)
                        </Label>
                        <Select
                          value={ccPick[r.id] ?? ""}
                          onValueChange={(v) =>
                            setCcPick((m) => ({ ...m, [r.id]: v }))
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select your name" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="shadow-sm"
                          onClick={async () => {
                            const pid = Number(ccPick[r.id]);
                            if (!pid) {
                              toast.error("Select your cost controller identity");
                              return;
                            }
                            await approvePurchaseRequestCCApi(r.id, pid);
                            load();
                          }}
                        >
                          Approve → finance
                        </Button>
                        <Button
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={async () => {
                            await rejectPurchaseRequestCCApi(
                              r.id,
                              "Rejected by cost control",
                            );
                            load();
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          )}
          {activeSection === "inventory" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-pretty max-w-3xl">
              Same live inventory as the store terminal: quantities, pricing context, and
              stock-out flows for <span className="text-foreground font-medium">{displayName || "your property"}</span>.
            </p>
            <Card className="border-primary/20 bg-linear-to-br from-card to-primary/4 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="h-0.5 bg-linear-to-r from-primary/80 via-cyan-500/50 to-teal-400/40" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/15">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl">Active inventory</CardTitle>
                    <CardDescription>
                      Filter by arrival date, edit lines, and approve stock movements — aligned with hotel store inventory.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6 px-3 sm:px-6">
                <StoreItems
                  items={inventoryRows}
                  hotelStockApprovals
                  tenantScope={tenantScope}
                  embedded
                  showPaymentSummary
                />
              </CardContent>
            </Card>
          </div>
          )}

          {activeSection === "inactive" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-pretty max-w-3xl">
              Depleted, written off, or otherwise inactive stock rows for this property — same audit view as Store → Inactive.
            </p>
            <Card className="border-slate-500/20 bg-linear-to-br from-card to-slate-500/5 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="h-0.5 bg-linear-to-r from-slate-500/70 to-rose-400/40" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20">
                    <MinusCircle className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl">Inactive items</CardTitle>
                    <CardDescription>
                      Historical movements and status changes for {displayName || "this property"}.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6 px-3 sm:px-6">
                <Inactive
                  items={statusRows}
                  admin={false}
                  hotelName={tenantScope}
                  embedded
                />
              </CardContent>
            </Card>
          </div>
          )}

          {activeSection === "stock" && (
          <div className="space-y-4">
            {pendingSo.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center">
                No stock movements waiting for approval.
              </p>
            ) : (
              pendingSo.map((r) => (
                <Card
                  key={r.id}
                  className="border-border/80 shadow-md bg-card/95 backdrop-blur-sm overflow-hidden ring-1 ring-black/3 dark:ring-white/6"
                >
                  <div className="h-0.5 bg-linear-to-r from-amber-500/50 to-transparent" />
                  <CardHeader className="py-4">
                    <CardTitle className="text-base sm:text-lg leading-snug">
                      <span className="block text-foreground">
                        {r.itemName?.trim()
                          ? r.itemName
                          : `Item #${r.itemRegistrationId}`}
                      </span>
                      <span className="block text-sm font-normal text-muted-foreground mt-1">
                        {formatMovementType(r.movementType)}
                      </span>
                    </CardTitle>
                    <CardDescription className="space-y-1">
                      <span className="block">
                        Inventory row{" "}
                        <strong className="text-foreground tabular-nums">
                          #{r.itemRegistrationId}
                        </strong>{" "}
                        — quantity <strong>{r.amount}</strong>
                      </span>
                      <span className="block">
                        Detail: {r.stakeHolderOrReason} · Requested by{" "}
                        <strong>{r.requestedByUserName}</strong>
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end pb-5">
                    <div className="flex-1 w-full space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Who is approving? (your registered name)
                      </Label>
                      <Select
                        value={ccPick[-r.id] ?? ""}
                        onValueChange={(v) =>
                          setCcPick((m) => ({ ...m, [-r.id]: v }))
                        }
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select your name" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="shadow-sm"
                        onClick={async () => {
                          const pid = Number(ccPick[-r.id]);
                          if (!pid) {
                            toast.error("Select your cost controller identity");
                            return;
                          }
                          await approveStockOutRequestApi(r.id, pid);
                          load();
                        }}
                      >
                        Approve & update stock
                      </Button>
                      <Button
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={async () => {
                          await rejectStockOutRequestApi(
                            r.id,
                            "Rejected by cost control",
                          );
                          load();
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          )}

          {activeSection === "request-status" && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground text-pretty max-w-3xl">
              Every purchase and stock movement for your property, with current
              status — including items already past cost control or finance.
            </p>
            <Card className="border-border/80 shadow-md overflow-hidden">
              <CardHeader className="border-b bg-muted/30 py-3">
                <CardTitle className="text-lg">All purchase requests</CardTitle>
                <CardDescription>{purchases.length} total</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {purchases.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-6 text-center">
                    No purchase requests yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>CC reviewer</TableHead>
                        <TableHead>Finance</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...purchases]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {r.itemName}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.storeUserName}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.status === "REJECTED_CC" ||
                                  r.status === "REJECTED_FINANCE"
                                    ? "destructive"
                                    : r.status === "APPROVED_FINANCE"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {formatPurchaseStatus(r.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm max-w-[120px] truncate">
                              {r.ccActorName ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm max-w-[120px] truncate">
                              {r.financeActorName ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(r.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-md overflow-hidden">
              <CardHeader className="border-b bg-muted/30 py-3">
                <CardTitle className="text-lg">All stock movement requests</CardTitle>
                <CardDescription>{stocks.length} total</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {stocks.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-6 text-center">
                    No movement requests yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested by</TableHead>
                        <TableHead>CC reviewer</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...stocks]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {r.itemName?.trim()
                                ? r.itemName
                                : "Unknown item (stock line may have been removed)"}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {formatMovementType(r.movementType)}
                            </TableCell>
                            <TableCell className="tabular-nums whitespace-nowrap">
                              {formatQtyWithUnit(
                                r.amount,
                                inventoryRows.find((it) => it.id === r.itemRegistrationId)
                                  ?.measuredBy || "units",
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.status === "REJECTED"
                                    ? "destructive"
                                    : r.status === "APPROVED"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {formatStockOutRequestStatus(r.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.requestedByUserName}
                            </TableCell>
                            <TableCell className="text-sm max-w-[120px] truncate">
                              {r.ccActorName ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(r.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
          )}

          {activeSection === "payment-vat" && (
            <div className="space-y-6">
              <HotelInventoryPaymentVatPanel
                tenantLabel={displayName || "Property"}
                inventoryItems={inventoryRows}
                purchasePipeline={purchases.filter((p) =>
                  rowHotelMatchesTenantScope(p.HotelName, tenantScope || ""),
                )}
                inactiveItems={statusRows}
              />
            </div>
          )}

          {activeSection === "creditor-usage" && (
            <div className="space-y-6">
              <HotelCreditorUsageReportPanel tenantLabel={displayName || "Property"} />
            </div>
          )}

          {activeSection === "beginnings" && (
          <div className="space-y-6">
            <Card className="border-primary/15 shadow-lg bg-card/90 backdrop-blur-sm overflow-hidden">
              <div className="h-1 bg-linear-to-r from-violet-500/50 via-primary/40 to-cyan-500/40" />
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle>Date range roll-up from daily counts</CardTitle>
                  <CardDescription className="text-pretty max-w-2xl">
                    Totals use only daily rows with calendar dates between{" "}
                    <strong className="text-foreground">From</strong> and{" "}
                    <strong className="text-foreground">To</strong> (inclusive)—not whole
                    calendar months. Run{" "}
                    <strong className="text-foreground">Sync Monthly Data</strong> to
                    stamp this range from implied movement and first lights-out on-hand.
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
                  <HotelFormFieldStack className="min-w-[200px]">
                    <HotelDayPicker
                      label="From"
                      id="rollup-from"
                      value={rollupFromYmd}
                      onChange={setRollupFromYmd}
                    />
                  </HotelFormFieldStack>
                  <HotelFormFieldStack className="min-w-[200px]">
                    <HotelDayPicker
                      label="To"
                      id="rollup-to"
                      value={rollupToYmd}
                      onChange={setRollupToYmd}
                    />
                  </HotelFormFieldStack>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shadow-sm"
                    onClick={() => load(true)}
                  >
                    Refresh roll-ups
                  </Button>
                  <Button
                    type="button"
                    className="shadow-sm"
                    onClick={async () => {
                      try {
                        normalizeRollupRangeYmd(rollupFromYmd, rollupToYmd);
                        await syncKitchenBarRollupApi(rollupFromYmd, rollupToYmd, {
                          quiet: true,
                        });
                        toast.success("Roll-up data synced for selected dates");
                        await load(true);
                      } catch (e: any) {
                        toast.error(
                          e?.message ||
                            "Choose valid from and to dates (YYYY-MM-DD)",
                        );
                      }
                    }}
                  >
                    Sync Monthly Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6 px-5 sm:px-6">
                {monthlySnapshots.length > 0 ? (
                  <>
                    <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Total implied movement value — {rollupRangeLabel}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Σ (unit price × Σ implied movement) per item row below
                      </p>
                      <p className="text-xl font-semibold tabular-nums mt-1">
                        {monthlyTotalEtb.toLocaleString()}{" "}
                        <span className="text-sm font-medium text-muted-foreground">
                          ETB
                        </span>
                      </p>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Stored roll-ups — {rollupRangeLabel}
                    </p>
                    <div className="rounded-lg border border-border/70 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead>Station</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Σ implied movement</TableHead>
                            <TableHead className="text-right">First lights-out on-hand</TableHead>
                            <TableHead className="text-right">Remaining</TableHead>
                            <TableHead>Synced</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthlySnapshots.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>
                                {displayKitchenBarStation(s.station)}
                              </TableCell>
                              <TableCell className="font-medium">{s.itemName}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {Number(s.totalImpliedSales).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {Number(s.lastDayClosingOnHand).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {(
                                  Number(s.lastDayClosingOnHand) -
                                  Number(s.totalImpliedSales)
                                ).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(s.syncedAt).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center text-pretty max-w-lg mx-auto">
                    No stored roll-ups for{" "}
                    <span className="font-medium text-foreground">{rollupRangeLabel}</span>.
                    Adjust <strong className="text-foreground">From</strong> /{" "}
                    <strong className="text-foreground">To</strong> or run{" "}
                    <strong className="text-foreground">Sync Monthly Data</strong>.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <CardHeader>
                <CardTitle className="text-lg">Register a day</CardTitle>
                <CardDescription>
                  <strong className="text-foreground">Opening pulse</strong> is the
                  count when the day starts at the station.{" "}
                  <strong className="text-foreground">Stock out</strong> is summed from{" "}
                  <em>approved</em> store requests to that station for the same calendar day (you do not type it).{" "}
                  <strong className="text-foreground">Issued to management</strong> is entered here when station stock is taken by management.{" "}
                  <strong className="text-foreground">Lights-out</strong> is calculated from opening, that stock-out, and
                  management issue, plus usage since the prior day (opening today minus prior lights-out when a prior row exists).{" "}
                  <em>Sealed movement</em> still compares consecutive openings when the next day is recorded.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-1 pb-8 px-5 sm:px-6">
                <HotelFormSection
                  title="Station & calendar day"
                  description="One row per station and item on the selected calendar day. Date is selected from the first Date cell in the grid below."
                >
                  <div className="grid gap-4 sm:grid-cols-1">
                    <HotelFormFieldStack>
                      <Label htmlFor="kb-station">Station</Label>
                      <Select
                        value={beginForm.station}
                        onValueChange={(v) =>
                          setBeginForm((f) => ({ ...f, station: v }))
                        }
                      >
                        <SelectTrigger
                          id="kb-station"
                          className="h-10 w-full border-border/80 shadow-sm"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOTEL_DAILY_COUNT_STATIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HotelFormFieldStack>
                  </div>
                </HotelFormSection>

                <HotelFormSection
                  title="Item & counts"
                  description="Select an item from active inventory. Daily rows cannot be created for out-of-stock items."
                >
                  <HotelFormFieldStack>
                    <Label htmlFor="kb-item">Item or ingredient</Label>
                    <Select
                      value={beginForm.itemName}
                      onValueChange={(v) => {
                        const hit = inventoryItemOptions.find((x) => x.name === v);
                        setBeginForm((f) => ({
                          ...f,
                          itemName: v,
                          measuredBy: hit?.measuredBy || f.measuredBy,
                        }));
                      }}
                    >
                      <SelectTrigger id="kb-item" className="h-10 w-full border-border/80 shadow-sm">
                        <SelectValue placeholder="Select item from inventory" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItemOptions.map((it) => (
                          <SelectItem key={it.name} value={it.name}>
                            {it.name} ({it.measuredBy})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </HotelFormFieldStack>
                  <div className="grid gap-4 sm:grid-cols-4 pt-2">
                    <HotelFormFieldStack>
                      <Label htmlFor="kb-opening">Opening pulse</Label>
                      <Input
                        id="kb-opening"
                        type="number"
                        min={0}
                        step={0.01}
                        value={beginForm.amount}
                        onChange={(e) =>
                          setBeginForm((f) => ({
                            ...f,
                            amount: Number.isFinite(Number(e.target.value))
                              ? Number(e.target.value)
                              : 0,
                          }))
                        }
                        onBlur={() =>
                          setBeginForm((f) => ({
                            ...f,
                            amount: round2(Number(f.amount) || 0),
                          }))
                        }
                        className="h-10 tabular-nums border-border/80 shadow-sm"
                      />
                    </HotelFormFieldStack>
                    <HotelFormFieldStack>
                      <Label>Approved stock-out (today)</Label>
                      <div className="h-10 flex items-center rounded-md border border-border/80 bg-muted/40 px-3 text-sm tabular-nums">
                        {dailyFormPreview.stockOut.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        From store requests you approved for this station, item, and date.
                      </p>
                    </HotelFormFieldStack>
                    <HotelFormFieldStack>
                      <Label>Computed lights-out</Label>
                      <div className="h-10 flex items-center rounded-md border border-border/80 bg-muted/40 px-3 text-sm tabular-nums">
                        {dailyFormPreview.lightsOut.toFixed(2)}
                      </div>
                      {dailyFormPreview.usageDay != null && (
                        <p className="text-xs text-muted-foreground">
                          Day usage (opening − prior lights-out):{" "}
                          {dailyFormPreview.usageDay.toFixed(2)}
                        </p>
                      )}
                    </HotelFormFieldStack>
                    <HotelFormFieldStack>
                      <Label htmlFor="kb-management-taken">Issued to management</Label>
                      <Input
                        id="kb-management-taken"
                        type="number"
                        min={0}
                        step={0.01}
                        value={beginForm.managementTakenDay}
                        onChange={(e) =>
                          setBeginForm((f) => ({
                            ...f,
                            managementTakenDay: Number.isFinite(Number(e.target.value))
                              ? Number(e.target.value)
                              : 0,
                          }))
                        }
                        className="h-10 tabular-nums border-border/80 shadow-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Units issued from station stock to management.
                      </p>
                    </HotelFormFieldStack>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-1 pt-2 max-w-xs">
                    <HotelFormFieldStack>
                      <Label>Unit</Label>
                      <Select
                        value={beginForm.measuredBy}
                        onValueChange={(v) =>
                          setBeginForm((f) => ({ ...f, measuredBy: v }))
                        }
                      >
                        <SelectTrigger className="h-10 w-full border-border/80 shadow-sm">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {dailyUnitOptions.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HotelFormFieldStack>
                  </div>
                </HotelFormSection>

                <HotelFormSection
                  title="Notes"
                  description="Optional — batch references or who counted."
                >
                  <HotelFormFieldStack>
                    <Label htmlFor="kb-notes">Notes</Label>
                    <Textarea
                      id="kb-notes"
                      value={beginForm.notes}
                      onChange={(e) =>
                        setBeginForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      rows={3}
                      placeholder="Optional detail"
                      className="min-h-22 resize-y border-border/80 shadow-sm"
                    />
                  </HotelFormFieldStack>
                </HotelFormSection>

                <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                  <Button
                    type="button"
                    className="shadow-sm"
                    onClick={async () => {
                      try {
                        if (editingId) {
                          await updateKitchenBarBeginningApi({
                            id: editingId,
                            ...beginForm,
                            amount: round2(Number(beginForm.amount) || 0),
                            managementTakenDay: round2(
                              Number(beginForm.managementTakenDay) || 0,
                            ),
                          });
                          setEditingId(null);
                        } else {
                          await createKitchenBarBeginningApi({
                            ...beginForm,
                            amount: round2(Number(beginForm.amount) || 0),
                            managementTakenDay: round2(
                              Number(beginForm.managementTakenDay) || 0,
                            ),
                          });
                        }
                        const day = selectedDailyDate || new Date().toISOString().slice(0, 10);
                        setBeginForm({
                          station: "KITCHEN",
                          itemName: "",
                          amount: 0,
                          managementTakenDay: 0,
                          measuredBy: "Piece",
                          monthPeriod: day.slice(0, 7),
                          calendarDate: day,
                          notes: "",
                        });
                        load();
                      } catch (e: any) {
                        toast.error(e?.message || "Save failed");
                      }
                    }}
                  >
                    {editingId ? "Save changes" : "Add daily row"}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        const day = selectedDailyDate || new Date().toISOString().slice(0, 10);
                        setBeginForm({
                          station: "KITCHEN",
                          itemName: "",
                          amount: 0,
                          managementTakenDay: 0,
                          measuredBy: "Piece",
                          monthPeriod: day.slice(0, 7),
                          calendarDate: day,
                          notes: "",
                        });
                      }}
                    >
                      Cancel edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="rounded-xl border border-border/80 bg-card/95 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="border-b border-border/60 bg-muted/25 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total sealed movement value (selected day)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Σ (unit price × sealed movement) per row; rows without sealed movement yet are excluded
                </p>
                <p className="text-lg font-semibold tabular-nums mt-1">
                  {selectedDayTotalCountedEtb.toLocaleString()}{" "}
                  <span className="text-sm font-medium text-muted-foreground">
                    ETB
                  </span>
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>
                      <div className="flex flex-col gap-1">
                        <span>Date</span>
                        <HotelDayPicker
                          id="kb-grid-day"
                          value={selectedDailyDate}
                          onChange={setSelectedDailyDate}
                          buttonClassName="h-8 w-[170px] px-2 text-xs font-normal"
                        />
                      </div>
                    </TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Opening pulse</TableHead>
                    <TableHead className="text-right">Approved stock-out</TableHead>
                    <TableHead className="text-right">Issued to management</TableHead>
                    <TableHead className="text-right">Lights-out</TableHead>
                    <TableHead className="text-right">Day usage</TableHead>
                    <TableHead className="text-right">Sealed movement</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleBeginnings.map((b) => {
                    const implied = beginningDerivedById.implied.get(b.id);
                    const usage = beginningDerivedById.daySales.get(b.id);
                    const lightsOut = round2(
                      Number(b.amount || 0) +
                        Number(b.stockOutDay ?? 0) -
                        Number(b.managementTakenDay ?? 0),
                    );
                    return (
                    <TableRow key={b.id} className="hover:bg-muted/30">
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {b.calendarDate || `${b.monthPeriod}-01`}
                      </TableCell>
                      <TableCell>{displayKitchenBarStation(b.station)}</TableCell>
                      <TableCell className="font-medium">{b.itemName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {b.amount} {b.measuredBy}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(b.stockOutDay ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(b.managementTakenDay ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {lightsOut.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {usage == null ? "—" : usage.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {implied == null ? "—" : implied.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(b.id);
                            const cd =
                              b.calendarDate && b.calendarDate.length >= 10
                                ? b.calendarDate.slice(0, 10)
                                : `${b.monthPeriod}-01`;
                            setSelectedDailyDate(cd);
                            setBeginForm({
                              station: normalizeKitchenBarStationKey(b.station),
                              itemName: b.itemName,
                              amount: b.amount,
                              managementTakenDay: Number(
                                b.managementTakenDay ?? 0,
                              ),
                              measuredBy: b.measuredBy,
                              monthPeriod: b.monthPeriod,
                              calendarDate: cd,
                              notes: b.notes,
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            await deleteKitchenBarBeginningApi(b.id);
                            load();
                          }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
          )}
            </div>
          </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function CostControlPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-muted/30">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <CostControlInner />
    </Suspense>
  );
}
