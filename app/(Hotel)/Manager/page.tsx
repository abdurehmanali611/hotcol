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
  fetchKitchenBarMonthlySnapshots,
  fetchPurchaseRequests,
  fetchStockOutRequests,
  logoutAction,
  syncKitchenBarMonthlyApi,
  updateAdminPassword,
  updateCredential,
  uploadImage,
  type CostControllerProfileRow,
  type Item,
  type ItemRegistration,
  type ItemStatus,
  type KitchenBarMonthlySnapshotRow,
} from "@/lib/actions";
import { displayKitchenBarStation } from "@/lib/hotelDailyStation";
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
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { monthPeriodsBetweenInclusive } from "@/lib/kitchenBarMonthlyRange";
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
  const [beginnings, setBeginnings] = useState<any[]>([]);
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
  const rollupViewMonth = useMemo(
    () =>
      String(rollupToYmd || "")
        .trim()
        .slice(0, 7) || new Date().toISOString().slice(0, 7),
    [rollupToYmd],
  );
  const [ccProfiles, setCcProfiles] = useState<CostControllerProfileRow[]>([]);
  const [newCcName, setNewCcName] = useState("");
  const [menuItems, setMenuItems] = useState<Item[]>([]);

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
          snaps,
          ccp,
          rawMenu,
        ] = await Promise.all([
          fetchCredentials(),
          fetchItemRegistrations(),
          fetchItemStatus(),
          fetchPurchaseRequests(),
          fetchStockOutRequests(),
          fetchKitchenBarBeginnings(),
          fetchKitchenBarMonthlySnapshots(rollupViewMonth),
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
        setMonthlySnapshots(snaps);
        setCcProfiles(ccp);
        setMenuItems(
          Array.isArray(rawMenu)
            ? (rawMenu as Item[]).filter((i) =>
                rowHotelMatchesTenantScope(i.HotelName, tenantScope),
              )
            : [],
        );
      } catch {
        toast.error("Could not load dashboard data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantScope, rollupViewMonth],
  );

  useEffect(() => {
    if (tenantScope) loadData();
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
  const beginningsUnique = useMemo(() => {
    const map = new Map<string, any>();
    for (const b of beginnings) {
      const day = String(b.calendarDate || "").slice(0, 10) || "";
      const fallbackDay = b.monthPeriod ? `${b.monthPeriod}-01` : "";
      const calendarDay = day || fallbackDay;
      const key = `${String(b.station || "")
        .trim()
        .toUpperCase()}\t${String(b.itemName || "")
        .trim()
        .toLowerCase()}\t${calendarDay}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, b);
        continue;
      }
      // Prefer the most recently created duplicate (older rows may exist from pre-policy data).
      const prevT = new Date(existing.createdAt || 0).getTime();
      const curT = new Date(b.createdAt || 0).getTime();
      if (curT >= prevT) map.set(key, b);
    }
    return [...map.values()].sort((a, b) =>
      String(a.calendarDate || "").localeCompare(String(b.calendarDate || "")),
    );
  }, [beginnings]);

  const beginningDerivedById = useMemo(() => {
    const implied = new Map<number, number | null>();
    const dayUsage = new Map<number, number | null>();
    const groups = new Map<string, any[]>();
    for (const b of beginningsUnique) {
      const k = `${String(b.station || "").trim().toUpperCase()}\t${String(b.itemName || "")
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
          dayUsage.set(list[i].id, null);
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
          dayUsage.set(list[i].id, round2(Number(list[i].amount) - prevLights));
        }
      }
    }
    return { implied, dayUsage };
  }, [beginningsUnique]);

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
                    await createCostControllerProfileApi(newCcName.trim());
                    setNewCcName("");
                    loadData(true);
                  }}
                >
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Input
                      placeholder="Full name on duty"
                      value={newCcName}
                      onChange={(e) => setNewCcName(e.target.value)}
                      className="h-10 w-full border-border/70 bg-background"
                    />
                    <Button type="submit" className="h-10 px-5 sm:min-w-28">
                      Add identity
                    </Button>
                  </div>
                </form>
                <ul className="divide-y rounded-xl border border-border/70 bg-background/70">
                  {ccProfiles.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{p.displayName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={async () => {
                          await deleteCostControllerProfileApi(p.id);
                          loadData(true);
                        }}
                      >
                        Remove
                      </Button>
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
                await createItem({
                  name: data.name,
                  price: data.price,
                  category: data.category,
                  type: data.type,
                  imageUrl: data.imageUrl,
                });
                loadData(true);
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
                } catch (err: any) {
                  toast.error(`Failed to delete: ${err.message}`);
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
              Daily station counts from Cost Control. Stock-out is approved store outflow; lights-out and day usage are derived with the same rules as Cost Control.
            </p>
            <Card>
              <CardHeader>
                <CardTitle>Monthly roll-up from daily counts</CardTitle>
                <CardDescription>
                  Pick a from–to range and run <strong>Sync data</strong> to stamp each
                  calendar month in that range from daily rows. The table shows the month
                  of the <strong>To</strong> date.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5 min-w-[160px]">
                    <Label htmlFor="manager-rollup-from" className="text-xs text-muted-foreground">
                      From
                    </Label>
                    <Input
                      id="manager-rollup-from"
                      type="date"
                      value={rollupFromYmd}
                      onChange={(e) => setRollupFromYmd(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-[160px]">
                    <Label htmlFor="manager-rollup-to" className="text-xs text-muted-foreground">
                      To
                    </Label>
                    <Input
                      id="manager-rollup-to"
                      type="date"
                      value={rollupToYmd}
                      onChange={(e) => setRollupToYmd(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <Button variant="secondary" onClick={() => loadData(true)}>
                    Refresh roll-ups
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const months = monthPeriodsBetweenInclusive(
                          rollupFromYmd,
                          rollupToYmd,
                        );
                        if (!months.length) {
                          toast.error("Choose a valid from and to date");
                          return;
                        }
                        for (const mp of months) {
                          await syncKitchenBarMonthlyApi(mp, { quiet: true });
                        }
                        toast.success(
                          months.length === 1
                            ? "Sync data completed"
                            : `Sync data completed (${months.length} months)`,
                        );
                        await loadData(true);
                      } catch (err: any) {
                        toast.error(err?.message || "Sync failed");
                      }
                    }}
                  >
                    Sync data
                  </Button>
                </div>
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
                            No monthly rows for {rollupViewMonth} yet.
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

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Opening pulse</TableHead>
                    <TableHead>Approved stock-out</TableHead>
                    <TableHead>Lights-out</TableHead>
                    <TableHead>Day usage</TableHead>
                    <TableHead>Sealed movement</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beginningsUnique.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {b.calendarDate || `${b.monthPeriod}-01`}
                      </TableCell>
                      <TableCell>{displayKitchenBarStation(b.station)}</TableCell>
                      <TableCell>{b.itemName}</TableCell>
                      <TableCell>
                        {b.amount} {b.measuredBy}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {Number(b.stockOutDay ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {Number(b.closingOnHand ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {beginningDerivedById.dayUsage.get(b.id) == null
                          ? "—"
                          : Number(beginningDerivedById.dayUsage.get(b.id)).toFixed(2)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {beginningDerivedById.implied.get(b.id) == null
                          ? "—"
                          : Number(beginningDerivedById.implied.get(b.id)).toFixed(2)}
                      </TableCell>
                      <TableCell>{b.monthPeriod}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {b.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
