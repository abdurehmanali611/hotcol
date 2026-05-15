/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
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
  fetchKitchenBarRollupSnapshots,
  fetchPurchaseRequests,
  fetchStockOutRequests,
  logoutAction,
  notifyApiFailure,
  syncKitchenBarRollupApi,
  updateAdminPassword,
  updateCredential,
  uploadImage,
  type CostControllerProfileRow,
  type Item,
  type ItemRegistration,
  type ItemStatus,
  type KitchenBarBeginningRow,
  type KitchenBarMonthlySnapshotRow,
} from "@/lib/actions";
import {
  displayKitchenBarStation,
  normalizeKitchenBarStationKey,
  summarizeApprovedStockOutForDay,
} from "@/lib/hotelDailyStation";
import { MANAGER_SIDEBAR_ITEMS } from "@/constants";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { lineOwedETB } from "@/lib/hotelInventoryPayment";
import { ManagerCorporateCreditTiers } from "@/components/hotel/ManagerCorporateCreditTiers";
import { HotelInventoryPaymentVatPanel } from "@/components/hotel/HotelInventoryPaymentVatPanel";
import { HotelCreditorUsageReportPanel } from "@/components/hotel/HotelCreditorUsageReportPanel";
import { HotelWorkflowGlossary } from "@/components/hotel/HotelWorkflowGlossary";
import ItemCreationForm from "@/components/ItemCreation";
import UpdateDeleteIntro from "@/components/UpdateDeleteIntro";
import {
  formatMovementType,
  formatPurchaseRejectorLine,
  formatPurchaseStatus,
  formatQtyWithUnit,
  HOTEL_INVENTORY_COPY,
} from "@/lib/hotelDisplayLabels";

type TabId = (typeof MANAGER_SIDEBAR_ITEMS)[number]["id"];

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

function normalizeItemNameForValueKey(name: string): string {
  return String(name || "").trim().toLowerCase();
}

function ManagerContent() {
  const searchParams = useSearchParams();
  const { tenantScope, displayName } = useTenantScopeAndDisplay(
    searchParams.get("hotel"),
  );
  const headerLabel = displayName || "Manager";
  const logoUrl = searchParams.get("logo") || "";

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [items, setItems] = useState<ItemRegistration[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [stockReqs, setStockReqs] = useState<any[]>([]);
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
  const [ccProfiles, setCcProfiles] = useState<CostControllerProfileRow[]>([]);
  const [newCcName, setNewCcName] = useState("");
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [ccAddPending, setCcAddPending] = useState(false);
  const [ccRemoveId, setCcRemoveId] = useState<number | null>(null);
  const [managerRollupSyncPending, setManagerRollupSyncPending] =
    useState(false);
  const [managerDailyReportDate, setManagerDailyReportDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!tenantScope) return;
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
        notifyApiFailure(e, "Could not load dashboard data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantScope],
  );

  /** Load stored monthly roll-up rows for the current From/To only when explicitly requested. */
  const fetchRollupSnapshotsForRange = useCallback(async () => {
    if (!tenantScope) return;
    try {
      const { fromYmd, toYmd } = normalizeRollupRangeYmd(
        rollupFromYmd,
        rollupToYmd,
      );
      const snaps = await fetchKitchenBarRollupSnapshots(fromYmd, toYmd);
      setMonthlySnapshots(snaps);
    } catch (e: unknown) {
      notifyApiFailure(e, "Could not load roll-up snapshots for this range");
    }
  }, [tenantScope, rollupFromYmd, rollupToYmd]);

  useEffect(() => {
    setMonthlySnapshots([]);
  }, [rollupFromYmd, rollupToYmd]);

  useEffect(() => {
    setMonthlySnapshots([]);
    if (tenantScope) {
      void loadData();
    }
  }, [tenantScope, loadData]);

  const sidebarItems = useMemo(
    () =>
      MANAGER_SIDEBAR_ITEMS.map((item) => {
        const Icon = sidebarIconMap[item.icon];
        return {
          id: item.id as TabId,
          label: item.label,
          icon: <Icon className="h-4 w-4" aria-hidden />,
        };
      }),
    [],
  );

  const pendingPurchases = purchases.filter((p) =>
    ["PENDING_CC", "PENDING_FINANCE"].includes(p.status),
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
                  <CardTitle className="text-3xl tabular-nums tracking-tight">{items.length}</CardTitle>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Store user</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.slice(0, 8).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.itemName}</TableCell>
                        <TableCell>{formatPurchaseStatus(p.status)}</TableCell>
                        <TableCell>{p.storeUserName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(p.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden">
              <CardHeader>
                <CardTitle>Recent stock-out requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockReqs.slice(0, 8).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium max-w-[220px] truncate">
                          {s.itemName?.trim()
                            ? s.itemName
                            : "Unknown item (stock line may have been removed)"}
                        </TableCell>
                        <TableCell>{formatMovementType(s.movementType)}</TableCell>
                        <TableCell>
                          {formatQtyWithUnit(s.amount, items.find((it) => it.id === s.itemRegistrationId)?.measuredBy || "units")}
                        </TableCell>
                        <TableCell>{s.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
          <div className="p-4 md:p-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Value est.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatQtyWithUnit(it.amount, it.measuredBy)}
                    </TableCell>
                    <TableCell>
                      ETB {lineOwedETB(it).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      case "reports-movements":
        return (
          <div className="p-4 md:p-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.status}</TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatQtyWithUnit(s.amount, s.measuredBy)}
                    </TableCell>
                    <TableCell>{s.statusBy}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.actionDate).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      case "reports-purchases":
        return (
          <div className="p-4 md:p-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CC by</TableHead>
                  <TableHead>Finance</TableHead>
                  <TableHead className="min-w-[140px]">Rejection / reason</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.itemName}</TableCell>
                    <TableCell>
                      {formatQtyWithUnit(p.quantity, p.measuredBy)}
                    </TableCell>
                    <TableCell>{formatPurchaseStatus(p.status)}</TableCell>
                    <TableCell>{p.ccActorName ?? "—"}</TableCell>
                    <TableCell>{p.financeActorName ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                      {p.status === "REJECTED_CC" || p.status === "REJECTED_FINANCE" ? (
                        <span className="block space-y-0.5">
                          <span className="text-foreground font-medium">
                            {formatPurchaseRejectorLine(p)}
                          </span>
                          {p.rejectionReason?.trim() ? (
                            <span className="block italic">{p.rejectionReason.trim()}</span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(p.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      case "inventory-payment-vat":
        return (
          <div className="p-4 md:p-6">
            <HotelInventoryPaymentVatPanel
              tenantLabel={displayName || headerLabel}
              inventoryItems={items}
              purchasePipeline={purchases.filter((p) =>
                rowHotelMatchesTenantScope(p.HotelName, tenantScope || ""),
              )}
              inactiveItems={statuses as ItemStatus[]}
            />
          </div>
        );

      case "creditor-usage-report":
        return (
          <div className="p-4 md:p-6">
            <HotelCreditorUsageReportPanel tenantLabel={displayName || headerLabel} />
          </div>
        );

      case "corporate-credit-tiers":
        return (
          <div className="p-4 md:p-6">
            <ManagerCorporateCreditTiers />
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
                  Totals use daily rows dated between <strong>From</strong> and{" "}
                  <strong>To</strong> (inclusive). Pick dates, then use{" "}
                  <strong>Refresh roll-ups</strong> to load stored data for that range.{" "}
                  <strong>Sync Monthly Data</strong> writes roll-ups from the daily grid
                  (requires API permission for your role — often the Cost Control account).
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
                  <Button variant="secondary" onClick={() => void fetchRollupSnapshotsForRange()}>
                    Refresh roll-ups
                  </Button>
                  <PendingButton
                    pending={managerRollupSyncPending}
                    onClick={async () => {
                      setManagerRollupSyncPending(true);
                      try {
                        normalizeRollupRangeYmd(rollupFromYmd, rollupToYmd);
                        await syncKitchenBarRollupApi(rollupFromYmd, rollupToYmd, {
                          quiet: true,
                        });
                        toast.success("Roll-up data synced for selected dates");
                        await fetchRollupSnapshotsForRange();
                        await loadData(true);
                      } catch (err: unknown) {
                        const raw =
                          err instanceof Error ? err.message : String(err ?? "");
                        if (/not authorized|unauthorized|forbidden|^403$/i.test(raw)) {
                          toast.error(
                            "Sync is not allowed for this login. Monthly roll-up sync is usually limited to the Cost Control role. Use the Cost Control terminal to run \"Sync Monthly Data\", or ask your administrator to grant Managers permission for this action.",
                          );
                        } else {
                          notifyApiFailure(
                            err,
                            "Choose valid dates or sync from Cost Control",
                          );
                        }
                      } finally {
                        setManagerRollupSyncPending(false);
                      }
                    }}
                  >
                    Sync Monthly Data
                  </PendingButton>
                </div>
                <p className="text-xs text-muted-foreground">
                  Showing stored roll-up for{" "}
                  <span className="font-medium text-foreground">{rollupRangeLabel}</span>{" "}
                  after you click <strong>Refresh roll-ups</strong>. Changing dates clears
                  the table until you refresh again.
                </p>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Station</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Σ implied movement</TableHead>
                        <TableHead className="text-right">First lights-out on-hand</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead>Synced</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlySnapshots.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No roll-up rows for {rollupRangeLabel} yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        monthlySnapshots.map((s) => {
                          const remaining =
                            Number(s.lastDayClosingOnHand) -
                            Number(s.totalImpliedSales);
                          return (
                            <TableRow key={s.id}>
                              <TableCell>{displayKitchenBarStation(s.station)}</TableCell>
                              <TableCell className="font-medium">{s.itemName}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {Number(s.totalImpliedSales).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {Number(s.lastDayClosingOnHand).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {remaining.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(s.syncedAt).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
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
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>
                          <div className="flex flex-col gap-1">
                            <span>Date</span>
                            <HotelDayPicker
                              id="manager-daily-report-day"
                              value={managerDailyReportDate}
                              onChange={setManagerDailyReportDate}
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
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleManagerDailyRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="text-center text-muted-foreground py-10 text-sm"
                          >
                            No daily rows for{" "}
                            <span className="font-medium text-foreground">
                              {managerDailyReportDate}
                            </span>
                            . Enter counts in Cost Control for this day, or pick another date.
                          </TableCell>
                        </TableRow>
                      ) : (
                        visibleManagerDailyRows.map((b) => {
                          const dayYmd = String(managerDailyReportDate || "").slice(0, 10);
                          const stationKey = normalizeKitchenBarStationKey(b.station);
                          const approvedSo = round2(
                            summarizeApprovedStockOutForDay(
                              stockOutRowsForProperty,
                              stationKey,
                              b.itemName,
                              dayYmd,
                            ),
                          );
                          const lightsOut = round2(
                            Number(b.amount || 0) +
                              approvedSo -
                              Number(b.managementTakenDay ?? 0),
                          );
                          const usage = beginningDerivedById.daySales.get(b.id);
                          const implied = beginningDerivedById.implied.get(b.id);
                          const displayDate =
                            String(b.calendarDate || "").slice(0, 10) ||
                            (b.monthPeriod ? `${b.monthPeriod}-01` : dayYmd);
                          return (
                            <TableRow key={b.id} className="hover:bg-muted/30">
                              <TableCell className="tabular-nums whitespace-nowrap">
                                {displayDate}
                              </TableCell>
                              <TableCell>{displayKitchenBarStation(b.station)}</TableCell>
                              <TableCell className="font-medium">{b.itemName}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {b.amount} {b.measuredBy}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {approvedSo.toFixed(2)}
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
                              <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                                {b.notes || "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
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
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                    tooltip={item.label}
                    size="lg"
                    className="h-10 cursor-pointer text-[13px] data-[active=true]:shadow-sm"
                  >
                    {item.icon}
                    <span>{item.label}</span>
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
                {headerLabel}
              </h1>
              <p className="text-sm md:text-base font-semibold text-foreground truncate">
                {sidebarItems.find((i) => i.id === activeTab)?.label}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className={refreshing ? "animate-spin" : ""}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8 border shadow-sm">
              <AvatarImage src={logoUrl} alt={headerLabel} />
              <AvatarFallback>{headerLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
            <div className="mx-auto max-w-6xl space-y-8 pb-10">
              <div className="rounded-2xl border border-border/70 bg-linear-to-br from-card via-card to-primary/6 p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10 md:p-8">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
                  {sidebarItems.find((i) => i.id === activeTab)?.label}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
                  {activeTab === "menu-create-item" || activeTab === "menu-update-item"
                    ? "Same POS menu as cafe admin: dishes and drinks with image, price, and category; also used in hotel cashier corporate deals."
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
