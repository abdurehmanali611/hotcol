/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Toaster } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import GrantCredential from "@/components/GrantCredential";
import UpdateCredential from "@/components/UpdateCredential";
import {
  createCredential,
  createCostControllerProfileApi,
  createItem,
  deleteCostControllerProfileApi,
  deleteCredential,
  deleteItem,
  fetchCostControllerProfiles,
  fetchCredentials,
  fetchItemRegistrations,
  fetchItemStatus,
  fetchItems,
  fetchKitchenBarBeginnings,
  fetchPurchaseRequests,
  fetchStockOutRequests,
  logoutAction,
  notifyApiFailure,
  updateAdminPassword,
  updateCredential,
  uploadImage,
  type CostControllerProfileRow,
  type Item,
  type ItemRegistration,
  type ItemStatus,
  type KitchenBarBeginningRow,
  type KitchenBarMonthlySnapshotRow,
  type PurchaseRequestRow,
  type StockOutRequestRow,
} from "@/lib/actions";
import {
  displayKitchenBarStation,
  normalizeKitchenBarStationKey,
  summarizeApprovedStockOutForDay,
} from "@/lib/hotelDailyStation";
import { MANAGER_SIDEBAR_ITEMS } from "@/constants";
import { filterManagerTabId } from "@/lib/subscriptionModules";
import { useTenantModules } from "@/hooks/useTenantModules";
import { InventoryNotificationCenter } from "@/components/inventory/InventoryNotificationCenter";
import { TenantFeedbackCenter } from "@/components/feedback/TenantFeedbackCenter";
import {
  SubscriptionAlertBanner,
  SubscriptionNotificationCenter,
} from "@/components/subscription/SubscriptionNotificationCenter";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useLoadCoordinator } from "@/hooks/useLoadCoordinator";
import { RefreshIconButton } from "@/components/ui/refresh-icon-button";
import {
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Key,
  Package,
  ArrowRightLeft,
  ShoppingCart,
  ClipboardList,
  UserCheck,
  Loader2,
  BadgePercent,
  PlusCircle,
  Edit,
  Receipt,
  Table2,
  Building2,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { Input } from "@/components/ui/input";
import { normalizeRollupRangeYmd } from "@/lib/kitchenBarMonthlyRange";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { DataTable } from "@/app/StoreItems/data-table";
import { VOUCHER_TABLE_SORT } from "@/lib/voucherSort";
import { buildPurchaseRequestDashboardColumns } from "@/lib/dataTableColumns/purchaseRequests";
import { buildStockMovementDashboardColumns } from "@/lib/dataTableColumns/stockMovement";
import { buildItemStatusColumns } from "@/lib/dataTableColumns/itemStatus";
import {
  buildKitchenBarDailyColumns,
  buildKitchenBarRollupColumns,
} from "@/lib/dataTableColumns/kitchenBar";
import { filterInventoryListRegistrations } from "@/lib/hotelApproval";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { ManagerCorporateCreditTiers } from "@/components/hotel/ManagerCorporateCreditTiers";
import StoreItems from "@/app/StoreItems/page";
import { HotelInventoryPaymentCategoryPanel } from "@/components/hotel/HotelInventoryPaymentCategoryPanel";
import { HotelInventoryPaymentSidebarGroup } from "@/components/hotel/HotelInventoryPaymentSidebarGroup";
import type { PaymentCategoryMode } from "@/components/hotel/HotelInventoryPaymentCategoryPanel";
import { HotelItemReceiptsSection } from "@/components/hotel/HotelItemReceiptsSection";
import {
  HotelPurchaseManagerQueue,
  HotelRegistrationApprovalsBlock,
  HotelStockWorkflowQueue,
} from "@/components/hotel/HotelWorkflowApprovalQueues";
import { HotelManagerCompanyApprovals } from "@/components/hotel/HotelManagerCompanyApprovals";
import {
  isPaymentCategorySection,
  paymentModeFromSection,
} from "@/constants/hotelInventoryNav";
import { PAYMENT_CATEGORY_NAV } from "@/constants/hotelInventoryNav";
import { HotelCreditorUsageReportPanel } from "@/components/hotel/HotelCreditorUsageReportPanel";
import { HotelWorkflowGlossary } from "@/components/hotel/HotelWorkflowGlossary";
import ItemCreationForm from "@/components/ItemCreation";
import UpdateDeleteIntro from "@/components/UpdateDeleteIntro";
import { HOTEL_INVENTORY_COPY } from "@/lib/hotelDisplayLabels";
import { PurchaseRequestStatusPanel } from "@/components/hotel/PurchaseRequestStatusPanel";

type PaymentTabId = (typeof PAYMENT_CATEGORY_NAV)[number]["id"];
type TabId =
  | Exclude<(typeof MANAGER_SIDEBAR_ITEMS)[number]["id"], "inventory-payment-vat">
  | PaymentTabId;

const sidebarIconMap: Record<
  (typeof MANAGER_SIDEBAR_ITEMS)[number]["icon"],
  LucideIcon
> = {
  LayoutDashboard,
  PlusCircle,
  Edit,
  UserCheck,
  Package,
  ArrowRightLeft,
  ShoppingCart,
  Building2,
  ClipboardList,
  Receipt,
  Table2,
  BadgePercent,
  Key,
  RefreshCw,
};

function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** Marks rows computed in the browser from daily counts (not server roll-up sync). */
const CLIENT_ROLLUP_SYNCED_AT = "__CLIENT_ROLLUP__";

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function* eachYmdInclusive(fromYmd: string, toYmd: string): Generator<string> {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const cur = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  while (cur <= end) {
    yield formatLocalYmd(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

function* eachYmdDescendingInclusive(fromYmd: string, toYmd: string): Generator<string> {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const cur = new Date(ty, tm - 1, td);
  const start = new Date(fy, fm - 1, fd);
  while (cur >= start) {
    yield formatLocalYmd(cur);
    cur.setDate(cur.getDate() - 1);
  }
}

function beginningRowCalendarYmd(b: KitchenBarBeginningRow): string {
  const d = String(b.calendarDate || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const mp = String(b.monthPeriod || "").trim();
  if (/^\d{4}-\d{2}$/.test(mp)) return `${mp}-01`;
  return "";
}

function rollupStableIdFromKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 33 + key.charCodeAt(i)) | 0;
  const n = Math.abs(h) % 1_000_000_000;
  return n === 0 ? -910000001 : -(910000000 + n);
}

function normalizeItemNameForValueKey(name: string): string {
  return String(name || "").trim().toLowerCase();
}

function ManagerContent() {
  useTenantRouteGuard();
  const searchParams = useSearchParams();
  const { tenantScope, displayName } = useTenantScopeAndDisplay(
    searchParams.get("hotel"),
  );
  const headerLabel = displayName || "Manager";
  const logoUrl = searchParams.get("logo") || "";

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadCoordinator = useLoadCoordinator();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [items, setItems] = useState<ItemRegistration[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [stockReqs, setStockReqs] = useState<any[]>([]);
  const [beginnings, setBeginnings] = useState<KitchenBarBeginningRow[]>([]);
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
  const [ccProfiles, setCcProfiles] = useState<CostControllerProfileRow[]>([]);
  const [propertyTin, setPropertyTin] = useState<string | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem("tin_number");
      setPropertyTin(t?.trim() || null);
    } catch {
      setPropertyTin(null);
    }
  }, []);
  const [newCcName, setNewCcName] = useState("");
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [ccAddPending, setCcAddPending] = useState(false);
  const [ccRemoveId, setCcRemoveId] = useState<number | null>(null);
  const [managerDailyReportDate, setManagerDailyReportDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!tenantScope) return;
      await loadCoordinator.run(async (isStale) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
          const [
            creds,
            regs,
            stat,
            pr,
            so,
            kb,
            ccp,
            rawMenu,
          ] = await Promise.all([
            fetchCredentials(),
            fetchItemRegistrations(),
            fetchItemStatus(),
            fetchPurchaseRequests(),
            fetchStockOutRequests(),
            fetchKitchenBarBeginnings(),
            fetchCostControllerProfiles(),
            fetchItems(),
          ]);
          if (isStale()) return;
          setCredentials(creds);
          setItems(
            (regs as ItemRegistration[]).filter((r) =>
              rowHotelMatchesTenantScope(r.HotelName, tenantScope),
            ),
          );
          setStatuses(
            (stat as any[]).filter((r) =>
              rowHotelMatchesTenantScope(r.HotelName, tenantScope),
            ),
          );
          setPurchases(pr);
          setStockReqs(so);
          setBeginnings(kb);
          setCcProfiles(ccp);
          setMenuItems(
            Array.isArray(rawMenu)
              ? (rawMenu as Item[]).filter((i) =>
                  rowHotelMatchesTenantScope(i.HotelName, tenantScope),
                )
              : [],
          );
        } catch (e: unknown) {
          if (!isStale()) notifyApiFailure(e, "Could not load dashboard data");
        } finally {
          if (!isStale()) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      });
    },
    [tenantScope, loadCoordinator],
  );

  useEffect(() => {
    if (tenantScope) {
      void loadData();
    }
  }, [tenantScope, loadData]);

  const tenantModules = useTenantModules();

  const sidebarItems = useMemo(
    () =>
      MANAGER_SIDEBAR_ITEMS.filter((item) =>
        filterManagerTabId(item.id, tenantModules),
      ).map((item) => {
        const Icon = sidebarIconMap[item.icon];
        return {
          id: item.id as TabId,
          label: item.label,
          icon: <Icon className="h-4 w-4" aria-hidden />,
        };
      }),
    [tenantModules],
  );

  useEffect(() => {
    if (
      sidebarItems.length > 0 &&
      !sidebarItems.some((item) => item.id === activeTab)
    ) {
      setActiveTab(sidebarItems[0]!.id);
    }
  }, [activeTab, sidebarItems]);

  const activeInventoryRows = useMemo(
    () => filterInventoryListRegistrations(items),
    [items],
  );

  const scopedPurchases = useMemo(
    () =>
      purchases.filter((p) =>
        rowHotelMatchesTenantScope(p.HotelName, tenantScope || ""),
      ),
    [purchases, tenantScope],
  );

  const pendingPurchases = scopedPurchases.filter((p) =>
    ["PENDING_CC", "PENDING_FINANCE", "PENDING_MANAGER"].includes(p.status),
  ).length;
  const pendingStock = stockReqs.filter((s) => s.status === "PENDING").length;
  const beginningsScoped = useMemo(() => {
    const t = String(tenantScope ?? "").trim();
    if (!t) return [];
    return beginnings.filter((b) => rowHotelMatchesTenantScope(b.HotelName, t));
  }, [beginnings, tenantScope]);

  const beginningDerivedById = useMemo(() => {
    const implied = new Map<number, number | null>();
    const daySales = new Map<number, number | null>();
    const groups = new Map<string, KitchenBarBeginningRow[]>();
    for (const b of beginningsScoped) {
      const k = `${normalizeKitchenBarStationKey(b.station)}\t${String(b.itemName || "")
        .trim()
        .toLowerCase()}`;
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
  }, [beginningsScoped]);

  const visibleManagerDailyRows = useMemo(() => {
    const day = String(managerDailyReportDate || "").slice(0, 10);
    if (!day) return [];
    const dayRows = beginningsScoped.filter((b) => {
      const cd =
        String(b.calendarDate || "").slice(0, 10) ||
        (b.monthPeriod ? `${b.monthPeriod}-01` : "");
      return cd === day;
    });
    const map = new Map<string, KitchenBarBeginningRow>();
    for (const b of dayRows) {
      const key = `${normalizeKitchenBarStationKey(b.station)}\t${String(b.itemName || "")
        .trim()
        .toLowerCase()}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, b);
        continue;
      }
      const prevT = new Date(existing.createdAt || 0).getTime();
      const curT = new Date(b.createdAt || 0).getTime();
      if (curT >= prevT) map.set(key, b);
    }
    return [...map.values()].sort((a, b) =>
      String(a.itemName || "").localeCompare(String(b.itemName || ""), undefined, {
        sensitivity: "base",
      }),
    );
  }, [beginningsScoped, managerDailyReportDate]);

  const stockOutRowsForProperty = useMemo(
    () =>
      stockReqs.filter(
        (r) =>
          rowHotelMatchesTenantScope(r.HotelName, tenantScope || "") &&
          r.status === "APPROVED" &&
          r.movementType === "STOCK_OUT",
      ),
    [stockReqs, tenantScope],
  );

  const unitPriceByItemName = useMemo(() => {
    const byName = new Map<string, number>();
    for (const row of items) {
      const key = normalizeItemNameForValueKey(row.name);
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, Number(row.unitPrice) || 0);
    }
    return byName;
  }, [items]);

  const managerDailySealedValueEtb = useMemo(() => {
    return visibleManagerDailyRows.reduce((sum, row) => {
      const sealed = beginningDerivedById.implied.get(row.id);
      if (sealed == null) return sum;
      const key = normalizeItemNameForValueKey(row.itemName);
      const price = unitPriceByItemName.get(key) || 0;
      return sum + (Number(sealed) || 0) * price;
    }, 0);
  }, [visibleManagerDailyRows, unitPriceByItemName, beginningDerivedById]);

  /** Range roll-up from loaded daily rows (no server sync). Updates when From/To or daily data change. */
  const managerRollupFromDailyRows = useMemo((): KitchenBarMonthlySnapshotRow[] => {
    try {
      const { fromYmd, toYmd } = normalizeRollupRangeYmd(
        rollupFromYmd,
        rollupToYmd,
      );
      const hotel = String(tenantScope ?? "").trim();
      if (!hotel) return [];

      const rowsByKey = new Map<string, KitchenBarBeginningRow[]>();
      for (const b of beginningsScoped) {
        const key = `${normalizeKitchenBarStationKey(b.station)}\t${normalizeItemNameForValueKey(b.itemName)}`;
        if (!rowsByKey.has(key)) rowsByKey.set(key, []);
        rowsByKey.get(key)!.push(b);
      }

      const pickForDay = (
        rows: KitchenBarBeginningRow[],
        dayYmd: string,
      ): KitchenBarBeginningRow | null => {
        const dayRows = rows.filter((r) => beginningRowCalendarYmd(r) === dayYmd);
        if (!dayRows.length) return null;
        return dayRows.reduce((a, c) =>
          new Date(c.createdAt || 0).getTime() >= new Date(a.createdAt || 0).getTime()
            ? c
            : a,
        );
      };

      const lightsOutFor = (row: KitchenBarBeginningRow, dayYmd: string): number => {
        const sk = normalizeKitchenBarStationKey(row.station);
        const approvedSo = round2(
          summarizeApprovedStockOutForDay(
            stockOutRowsForProperty,
            sk,
            row.itemName,
            dayYmd,
          ),
        );
        return round2(
          Number(row.amount || 0) +
            approvedSo -
            Number(row.managementTakenDay ?? 0),
        );
      };

      const out: KitchenBarMonthlySnapshotRow[] = [];

      for (const [key, rows] of rowsByKey) {
        let hasInRange = false;
        for (const d of eachYmdInclusive(fromYmd, toYmd)) {
          if (pickForDay(rows, d)) {
            hasInRange = true;
            break;
          }
        }
        if (!hasInRange) continue;

        let totalImplied = 0;
        for (const d of eachYmdInclusive(fromYmd, toYmd)) {
          const row = pickForDay(rows, d);
          if (!row) continue;
          const imp = beginningDerivedById.implied.get(row.id);
          if (imp != null) totalImplied += Number(imp) || 0;
        }
        totalImplied = round2(totalImplied);

        let lastClosing = 0;
        const lastRowOnTo = pickForDay(rows, toYmd);
        if (lastRowOnTo) {
          lastClosing = lightsOutFor(lastRowOnTo, toYmd);
        } else {
          for (const d of eachYmdDescendingInclusive(fromYmd, toYmd)) {
            const r = pickForDay(rows, d);
            if (r) {
              lastClosing = lightsOutFor(r, d);
              break;
            }
          }
        }

        const sample =
          pickForDay(rows, fromYmd) ||
          pickForDay(rows, toYmd) ||
          rows[0];
        out.push({
          id: rollupStableIdFromKey(key),
          HotelName: hotel,
          station: sample.station,
          itemName: sample.itemName,
          monthPeriod: fromYmd.slice(0, 7),
          periodFrom: fromYmd,
          periodTo: toYmd,
          totalImpliedSales: totalImplied,
          lastDayClosingOnHand: lastClosing,
          syncedAt: CLIENT_ROLLUP_SYNCED_AT,
        });
      }

      out.sort((a, b) => {
        const sa = displayKitchenBarStation(a.station).localeCompare(
          displayKitchenBarStation(b.station),
          undefined,
          { sensitivity: "base" },
        );
        if (sa !== 0) return sa;
        return String(a.itemName || "").localeCompare(String(b.itemName || ""), undefined, {
          sensitivity: "base",
        });
      });
      return out;
    } catch {
      return [];
    }
  }, [
    beginningsScoped,
    rollupFromYmd,
    rollupToYmd,
    tenantScope,
    beginningDerivedById,
    stockOutRowsForProperty,
  ]);

  const managerRollupTotalEtb = useMemo(() => {
    return managerRollupFromDailyRows.reduce((sum, row) => {
      const key = normalizeItemNameForValueKey(row.itemName);
      const price = unitPriceByItemName.get(key) || 0;
      const impliedSum = Number(row.totalImpliedSales) || 0;
      return sum + impliedSum * price;
    }, 0);
  }, [managerRollupFromDailyRows, unitPriceByItemName]);

  const recentPurchaseColumns = useMemo(
    () => buildPurchaseRequestDashboardColumns(),
    [],
  );
  const recentStockColumns = useMemo(
    () =>
      buildStockMovementDashboardColumns(
        (id) => items.find((it) => it.id === id)?.measuredBy || "units",
      ),
    [items],
  );
  const itemStatusColumns = useMemo(() => buildItemStatusColumns(), []);
  const managerRollupColumns = useMemo(
    () =>
      buildKitchenBarRollupColumns({
        syncedHeader: "Source",
        formatSyncedAt: (s) =>
          s.syncedAt === CLIENT_ROLLUP_SYNCED_AT
            ? "Live (daily rows)"
            : new Date(s.syncedAt).toLocaleString(),
      }),
    [],
  );
  const managerDailyColumns = useMemo(
    () =>
      buildKitchenBarDailyColumns({
        mode: "manager",
        selectedDayYmd: managerDailyReportDate,
        derived: beginningDerivedById,
        stockOutRowsForProperty,
      }),
    [managerDailyReportDate, beginningDerivedById, stockOutRowsForProperty],
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading reports…</p>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-primary/15 bg-linear-to-br from-card to-primary/5 shadow-md overflow-hidden">
                <CardHeader className="pb-2 pt-4">
                  <CardDescription>{HOTEL_INVENTORY_COPY.inventoryItems}</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">
                    {activeInventoryRows.length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-violet-500/20 bg-linear-to-br from-card to-violet-500/5 shadow-md overflow-hidden">
                <CardHeader className="pb-2 pt-4">
                  <CardDescription>Open purchase steps</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">{pendingPurchases}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-amber-500/20 bg-linear-to-br from-card to-amber-500/5 shadow-md overflow-hidden">
                <CardHeader className="pb-2 pt-4">
                  <CardDescription>Stock movements pending CC</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">{pendingStock}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-emerald-500/20 bg-linear-to-br from-card to-emerald-500/5 shadow-md overflow-hidden">
                <CardHeader className="pb-2 pt-4">
                  <CardDescription>Movement lines (history)</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">{statuses.length}</CardTitle>
                </CardHeader>
              </Card>
            </div>
            <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden">
              <CardHeader>
                <CardTitle>Recent purchase requests</CardTitle>
                <CardDescription>Latest 8 rows</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={recentPurchaseColumns}
                  data={purchases.slice(0, 8)}
                  getRowId={(row) => String(row.id)}
                  initialSorting={VOUCHER_TABLE_SORT}
                  emptyMessage="No purchase requests yet."
                />
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden">
              <CardHeader>
                <CardTitle>Recent stock-out requests</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={recentStockColumns}
                  data={stockReqs.slice(0, 8)}
                  getRowId={(row) => String(row.id)}
                  initialSorting={VOUCHER_TABLE_SORT}
                  emptyMessage="No stock-out requests yet."
                />
              </CardContent>
            </Card>
          </div>
        );

      case "cc-profiles":
        return (
          <div className="p-4 md:p-6 space-y-6 max-w-3xl">
            <Card className="border-border/80 shadow-sm bg-card/95 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg md:text-xl">Cost controller identities</CardTitle>
                <CardDescription>
                  Shared login selects one of these names when approving (audit for the manager).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form
                  className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newCcName.trim()) return;
                    setCcAddPending(true);
                    try {
                      await createCostControllerProfileApi(newCcName.trim());
                      setNewCcName("");
                      loadData(true);
                    } catch (err: unknown) {
                      notifyApiFailure(err, "Could not add cost controller identity");
                    } finally {
                      setCcAddPending(false);
                    }
                  }}
                >
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Input
                      placeholder="Full name on duty"
                      value={newCcName}
                      onChange={(e) => setNewCcName(e.target.value)}
                      className="h-10 w-full border-border/70 bg-background"
                      disabled={ccAddPending}
                    />
                    <PendingButton
                      type="submit"
                      className="h-10 px-5 sm:min-w-28"
                      pending={ccAddPending}
                    >
                      Add identity
                    </PendingButton>
                  </div>
                </form>
                <ul className="divide-y rounded-xl border border-border/70 bg-background/70">
                  {ccProfiles.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{p.displayName}</span>
                      <PendingButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        pending={ccRemoveId === p.id}
                        onClick={async () => {
                          setCcRemoveId(p.id);
                          try {
                            await deleteCostControllerProfileApi(p.id);
                            loadData(true);
                          } catch (err: unknown) {
                            notifyApiFailure(err, "Could not remove identity");
                          } finally {
                            setCcRemoveId(null);
                          }
                        }}
                      >
                        Remove
                      </PendingButton>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case "menu-create-item":
        return (
          <div className="p-4 md:p-8">
            <ItemCreationForm
              hotelName={tenantScope || ""}
              onSubmit={async (data) => {
                try {
                  await createItem({
                    name: data.name,
                    price: data.price,
                    category: data.category,
                    type: data.type,
                    imageUrl: data.imageUrl,
                  });
                  loadData(true);
                } catch (err: unknown) {
                  notifyApiFailure(err, "Could not create menu item");
                }
              }}
              onImageUpload={uploadImage}
            />
          </div>
        );

      case "menu-update-item":
        return (
          <div className="p-4 md:p-8">
            <UpdateDeleteIntro
              items={menuItems}
              hotelName={tenantScope || ""}
              onUpdate={() => loadData(true)}
              onDelete={async (id: number) => {
                try {
                  await deleteItem(id);
                  loadData(true);
                } catch (err: unknown) {
                  notifyApiFailure(err, "Could not delete menu item");
                }
              }}
            />
          </div>
        );

      case "reports-inventory":
        return (
          <div className="p-4 md:p-6">
            <StoreItems
              items={activeInventoryRows}
              hotelStockApprovals
              tenantScope={tenantScope}
              embedded
              showPaymentSummary
              aggregateInventory
            />
          </div>
        );

      case "reports-movements":
        return (
          <div className="p-4 md:p-6 overflow-x-auto">
            <DataTable
              columns={itemStatusColumns}
              data={statuses as ItemStatus[]}
              getRowId={(row) => String(row.id)}
              initialSorting={VOUCHER_TABLE_SORT}
              emptyMessage="No movement lines for this period."
            />
          </div>
        );

      case "reports-purchases":
        return (
          <div className="p-4 md:p-6">
            <PurchaseRequestStatusPanel
              rows={scopedPurchases}
              showStoreUser
              unitPriceRole="Manager"
              onRefresh={() => void loadData(true)}
              title="Purchase pipeline"
              description={`${scopedPurchases.length} purchase requests for this property.`}
            />
          </div>
        );

      case "creditor-usage-report":
        return (
          <div className="p-4 md:p-6">
            <HotelCreditorUsageReportPanel tenantLabel={displayName || headerLabel} />
          </div>
        );

      case "authorize-purchases":
        return (
          <div className="p-4 md:p-6 space-y-6">
            <HotelPurchaseManagerQueue
              purchases={scopedPurchases}
              onPatch={(id, status) =>
                setPurchases((prev) =>
                  prev.map((p) => (p.id === id ? { ...p, status } : p)),
                )
              }
              onRefresh={() => void loadData(true)}
            />
          </div>
        );

      case "authorize-stock":
        return (
          <div className="p-4 md:p-6">
            <HotelStockWorkflowQueue
              role="Manager"
              stocks={stockReqs}
              profiles={ccProfiles}
              onPatch={(id, status) =>
                setStockReqs((prev) =>
                  prev.map((s) => (s.id === id ? { ...s, status } : s)),
                )
              }
              onRefresh={() => void loadData(true)}
            />
          </div>
        );

      case "authorize-companies":
        return (
          <div className="p-4 md:p-6">
            <HotelManagerCompanyApprovals
              tenantScope={tenantScope || ""}
              propertyName={displayName || headerLabel}
              propertyLogo={logoUrl}
              propertyTin={propertyTin}
            />
          </div>
        );

      case "authorize-item-registrations":
        return (
          <div className="p-4 md:p-6">
            <HotelRegistrationApprovalsBlock
              role="Manager"
              items={items}
              propertyName={displayName || headerLabel}
              propertyTin={propertyTin}
              logoUrl={logoUrl}
              onRefresh={() => void loadData(true)}
            />
          </div>
        );

      case "item-receipts":
        return (
          <div className="p-4 md:p-6">
            <HotelItemReceiptsSection
              items={items}
              purchaseRequests={purchases}
              stockMovements={stockReqs}
              propertyName={displayName || headerLabel}
              propertyTin={propertyTin}
              logoUrl={logoUrl}
            />
          </div>
        );

      case "corporate-credit-tiers":
        return (
          <div className="p-4 md:p-6">
            <ManagerCorporateCreditTiers variant="hotel" />
          </div>
        );

      case "reports-beginnings":
        return (
          <div className="p-4 md:p-6 space-y-6">
            <p className="text-sm text-muted-foreground mb-4">
              Read-only view of Cost Control daily rows for your property. Pick a calendar
              day in the grid: one row per station and item for that day. Approved stock-out
              is summed from approved store stock-outs (same UTC day rule as Cost Control);
              day usage and sealed movement use the same consecutive-day math as the cost
              controller terminal.
            </p>
            <Card>
              <CardHeader>
                <CardTitle>Date range roll-up from daily counts</CardTitle>
                <CardDescription>
                  Pick <strong>From</strong> and <strong>To</strong> (inclusive). The table
                  recomputes automatically from daily station counts already loaded for your
                  property (same sealed movement and lights-out rules as below). Use{" "}
                  <strong>Reload data</strong> if Cost Control entered new days after you
                  opened this page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <HotelDayPicker
                    label="From"
                    id="manager-rollup-from"
                    value={rollupFromYmd}
                    onChange={setRollupFromYmd}
                    className="min-w-[200px]"
                  />
                  <HotelDayPicker
                    label="To"
                    id="manager-rollup-to"
                    value={rollupToYmd}
                    onChange={setRollupToYmd}
                    className="min-w-[200px]"
                  />
                  <Button
                    variant="secondary"
                    disabled={refreshing}
                    onClick={() => void loadData(true)}
                  >
                    {refreshing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Reloading…
                      </>
                    ) : (
                      "Reload data"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Showing computed roll-up for{" "}
                  <span className="font-medium text-foreground">{rollupRangeLabel}</span> from
                  daily rows (no server sync on this screen).
                </p>
                {managerRollupFromDailyRows.length > 0 ? (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total implied movement value — {rollupRangeLabel}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Σ (unit price × Σ implied movement) per row below
                    </p>
                    <p className="text-xl font-semibold tabular-nums mt-1">
                      {managerRollupTotalEtb.toLocaleString()}{" "}
                      <span className="text-sm font-medium text-muted-foreground">ETB</span>
                    </p>
                  </div>
                ) : null}
                <DataTable
                  columns={managerRollupColumns}
                  data={managerRollupFromDailyRows}
                  getRowId={(row) => String(row.id)}
                  emptyMessage={`No daily rows in range ${rollupRangeLabel} yet. Enter counts in Cost Control for those days, adjust the dates, or click Reload data.`}
                />
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <CardHeader>
                <CardTitle className="text-lg">Daily station counts (selected day)</CardTitle>
                <CardDescription>
                  Rows and numbers match <strong className="text-foreground">Cost Control</strong>{" "}
                  → <strong className="text-foreground">Daily chef &amp; bar counts</strong>. The first
                  column is always the calendar day you select; each other column is computed for that
                  day only (inventory unit prices value sealed movement in ETB below).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-xl border border-border/80 bg-card/95 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6 mb-4">
                  <div className="border-b border-border/60 bg-muted/25 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total sealed movement value (selected day)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Σ (unit price × sealed movement) for rows on this day; first-in-series rows have no sealed movement yet
                    </p>
                    <p className="text-lg font-semibold tabular-nums mt-1">
                      {managerDailySealedValueEtb.toLocaleString()}{" "}
                      <span className="text-sm font-medium text-muted-foreground">ETB</span>
                    </p>
                  </div>
                  <div className="px-4 py-3 border-b border-border/60">
                    <HotelDayPicker
                      label="Date"
                      id="manager-daily-report-day"
                      value={managerDailyReportDate}
                      onChange={setManagerDailyReportDate}
                      className="min-w-[200px]"
                    />
                  </div>
                  <div className="p-4">
                    <DataTable
                      columns={managerDailyColumns}
                      data={visibleManagerDailyRows}
                      getRowId={(row) => String(row.id)}
                      emptyMessage={`No daily rows for ${managerDailyReportDate}. Enter counts in Cost Control for this day, or pick another date.`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "grant-credential":
        return (
          <div className="p-4 md:p-6">
            <GrantCredential
              hotelName={tenantScope || ""}
              logoUrl={logoUrl}
              variant="hotel"
              onSubmit={async (data: any) => {
                await createCredential(data);
                loadData(true);
              }}
            />
          </div>
        );

      case "update-credential":
        return (
          <div className="p-4 md:p-6">
            <UpdateCredential
              credentials={credentials}
              hotelName={tenantScope || ""}
              variant="hotel"
              onUpdateCredential={async (data: any) => {
                await updateCredential(data);
                loadData(true);
              }}
              onUpdateAdminPassword={updateAdminPassword}
              onDeleteCredential={async (userName: string) => {
                await deleteCredential(userName);
                loadData(true);
              }}
            />
          </div>
        );

      default:
        if (isPaymentCategorySection(activeTab)) {
          const mode = paymentModeFromSection(activeTab);
          if (!mode) return null;
          return (
            <div className="p-4 md:p-6">
              <HotelInventoryPaymentCategoryPanel
                mode={mode as PaymentCategoryMode}
                tenantLabel={displayName || headerLabel}
                inventoryItems={activeInventoryRows}
              />
            </div>
          );
        }
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40 text-foreground">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
          <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border bg-sidebar-accent/25 px-4">
            <div className="flex h-full min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/20">
                <LayoutDashboard className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Terminal
                </p>
                <span className="block truncate font-semibold leading-tight">
                  Manager
                </span>
              </div>
            </div>
          </SidebarHeader>
          <div className="shrink-0 px-3 pb-2 pt-3">
            <SidebarSeparator className="bg-sidebar-border/80" />
          </div>
          <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
            <SidebarMenu className="gap-1">
              {sidebarItems
                .filter((item) => item.id !== "inventory-payment-vat")
                .map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => setActiveTab(item.id as TabId)}
                    tooltip={item.label}
                    size="lg"
                    className="h-10 cursor-pointer text-[13px] data-[active=true]:shadow-sm"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <HotelInventoryPaymentSidebarGroup
                activeSection={activeTab}
                onSelect={(id) => setActiveTab(id as TabId)}
              />
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
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground md:text-sm">
                {headerLabel}
              </h1>
            </div>
            <SubscriptionNotificationCenter />
            <TenantFeedbackCenter />
            <InventoryNotificationCenter
              audience="hotel-manager"
              items={items}
              purchaseRequests={purchases as PurchaseRequestRow[]}
              stockMovements={stockReqs as StockOutRequestRow[]}
              hotelLodging
            />
            <RefreshIconButton
              busy={refreshing}
              disabled={loading}
              onClick={() => void loadData(true)}
            />
            <Avatar className="h-8 w-8 border shadow-sm">
              <AvatarImage src={logoUrl} alt={headerLabel} />
              <AvatarFallback>{headerLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
            <div className="mx-auto max-w-6xl space-y-8 pb-10">
              <SubscriptionAlertBanner />
              <div className="rounded-2xl border border-border/70 bg-linear-to-br from-card via-card to-primary/6 p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10 md:p-8">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
                  {sidebarItems.find((i) => i.id === activeTab)?.label}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
                  {activeTab === "menu-create-item" || activeTab === "menu-update-item"
                    ? "POS menu for café service and corporate credit: add dishes and drinks for cashier, orders, and company deals."
                    : activeTab === "corporate-credit-tiers"
                      ? "Cashiers attach these tiers to companies. Credit limits and periods are managed centrally from this terminal."
                      : "Unified manager cockpit for approvals, stock visibility, station daily counts, and creditor usage oversight."}
                </p>
              </div>
              <HotelWorkflowGlossary variant="manager" />
              {renderContent()}
            </div>
          </main>
        </SidebarInset>
      </div>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}

export default function ManagerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <ManagerContent />
    </Suspense>
  );
}
