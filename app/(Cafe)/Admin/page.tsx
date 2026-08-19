/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback, Suspense, useRef } from "react"; // Added Suspense
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import GrantCredential from "@/components/GrantCredential";
import Reports from "@/components/reports";
import ItemCreationForm from "@/components/ItemCreation";
import UpdateDeleteIntro from "@/components/UpdateDeleteIntro";
import DeleteCredential from "@/components/DeleteCredential";
import { ChangeOwnPasswordButton } from "@/components/ChangeOwnPasswordButton";
import WaiterAndTable from "@/components/Waiter_And_Table";
import {
  fetchItems,
  fetchCredentials,
  fetchWaiters,
  fetchTables,
  fetchLiveCafeOrders,
  CAFE_LIVE_ORDERS_POLL_MS,
  createItem,
  deleteItem,
  createCredential,
  deleteCredential,
  createWaiter,
  createTable,
  uploadImage,
  generateReport,
  prepareReportExportData,
  exportToExcel,
  fetchCashout,
  fetchItemRegistrations,
  logoutAction,
  type ItemRegistration,
} from "@/lib/actions";
import { subscribeCafeOrdersChanged } from "@/lib/cafeOrdersSync";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import {
  FileText,
  PlusCircle,
  Edit,
  Key,
  Users,
  UserMinus,
  LogOut,
  LayoutDashboard,
  Loader2,
  Store,
  Building2,
  Receipt,
  ClipboardList,
  Coffee,
  CalendarDays,
  AlertTriangle,
  Ban,
  Printer,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_SIDEBAR_ITEMS, HR_WORKSPACE_TAB_IDS, isHrPayrollTab } from "@/constants";
import { filterAdminTabId, tenantHasModule } from "@/lib/subscriptionModules";
import { useTenantModules } from "@/hooks/useTenantModules";
import { useCafeOrderMode } from "@/hooks/useCafeOrderMode";
import { isAnalogCafeOrderMode } from "@/lib/cafeOrderMode";
import { HrPayrollSidebarGroup, hrPayrollViewsForCaps } from "@/components/hr/HrPayrollSidebarGroup";
import { hrCapabilities } from "@/lib/hrCapabilities";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarProvider,
  SidebarInset,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CafeAdminCorporateCredit } from "@/components/cafe/CafeAdminCorporateCredit";
import { HrDashboard, type HrSection } from "@/components/hr/HrDashboard";
import { HR_SECTION_COPY } from "@/components/hr/hrChrome";
import { ManagerCollapsibleSidebarGroup } from "@/components/hotel/ManagerCollapsibleSidebarGroup";
import AdminInventory from "@/components/AdminInventory";
import { StoreItemReceiptPrinting } from "@/components/hotel/StoreItemReceiptPrinting";
import { InventoryNotificationCenter } from "@/components/inventory/InventoryNotificationCenter";
import { TenantFeedbackCenter } from "@/components/feedback/TenantFeedbackCenter";
import {
  SubscriptionAlertBanner,
  SubscriptionNotificationCenter,
} from "@/components/subscription/SubscriptionNotificationCenter";
import { TrialBillingButton } from "@/components/subscription/TrialBillingButton";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useLoadCoordinator } from "@/hooks/useLoadCoordinator";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { CafeAdminDailyRevenueCards } from "@/components/cafe/CafeAdminDailyRevenueCards";
import { CafeAdminStationPrepQtyPanel } from "@/components/cafe/CafeAdminStationPrepQtyPanel";
import { ManagerCashierCancelPermissionCard } from "@/components/cafe/ManagerCashierCancelPermissionCard";
import PosAgentSetupCard from "@/components/cafe/PosAgentSetupCard";
import { CafeCashierOrderUpdatePanel } from "@/components/cafe/CafeCashierOrderUpdatePanel";
import { RefreshIconButton } from "@/components/ui/refresh-icon-button";

type AdminDatasetKey = "items" | "orders" | "waiters" | "tables" | "credentials";

const ADMIN_CAFE_TAB_IDS = new Set([
  "reports",
  "create-item",
  "update-item",
  "station-prep-qty",
  "waiter-table",
  "cancel-orders",
  "pos-printer",
  "credit-registrations",
]);
const ADMIN_INVENTORY_TAB_IDS = new Set(["inventory", "item-receipts"]);
const ADMIN_ACCESS_TAB_IDS = new Set([
  "grant-credential",
  "delete-credential",
]);
const ADMIN_HR_TAB_IDS = new Set<string>([...HR_WORKSPACE_TAB_IDS]);
const HR_TAB_TO_SECTION: Record<(typeof HR_WORKSPACE_TAB_IDS)[number], HrSection> =
  {
    "hr-overview": "dashboard",
    "hr-employees": "employees",
    "hr-leave": "leave",
    "hr-attendance": "attendance",
    "hr-payroll-generate": "payroll-generate",
    "hr-payroll-runs": "payroll-runs",
    "hr-payroll-settings": "payroll-settings",
    "hr-payroll-history": "payroll-history",
    "hr-incidents": "incidents",
    "hr-departments": "departments",
  };

const ADMIN_TAB_DATA_KEYS: Partial<Record<string, AdminDatasetKey[]>> = {
  reports: ["orders", "items"],
  "create-item": ["items"],
  "update-item": ["items"],
  "station-prep-qty": ["items"],
  "grant-credential": ["credentials"],
  "waiter-table": ["waiters", "tables"],
  "cancel-orders": ["orders", "items"],
  "delete-credential": ["credentials"],
};

function AdminDashboardContent() {
  useTenantRouteGuard({ role: "Admin" });
  const searchParams = useSearchParams();
  const { tenantScope, displayName } = useTenantScopeAndDisplay(
    searchParams.get("hotel"),
  );
  const headerLabel = displayName || "Admin";
  const logoUrl = searchParams.get("logo") || "";
  const [propertyTin, setPropertyTin] = useState<string | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem("tin_number");
      setPropertyTin(t?.trim() || null);
    } catch {
      setPropertyTin(null);
    }
  }, []);

  const [activeTab, setActiveTab] = useState("reports");
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<ItemRegistration[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const loadedRef = useRef(new Set<AdminDatasetKey>());
  const loadCoordinator = useLoadCoordinator();

  const applyDataset = useCallback((key: AdminDatasetKey, value: unknown) => {
    loadedRef.current.add(key);
    switch (key) {
      case "items":
        setItems(Array.isArray(value) ? value : []);
        break;
      case "orders":
        setOrders(Array.isArray(value) ? value : []);
        break;
      case "waiters":
        setWaiters(Array.isArray(value) ? value : []);
        break;
      case "tables":
        setTables(Array.isArray(value) ? value : []);
        break;
      case "credentials":
        setCredentials(Array.isArray(value) ? value : []);
        break;
    }
  }, []);

  const ensureAdminData = useCallback(
    async (keys: AdminDatasetKey[], options?: { refresh?: boolean }) => {
      const needed = keys.filter(
        (k) => options?.refresh || !loadedRef.current.has(k),
      );
      if (!needed.length) return;

      const fetchers: Record<
        (typeof needed)[number],
        () => Promise<unknown>
      > = {
        items: fetchItems,
        orders: fetchLiveCafeOrders,
        waiters: fetchWaiters,
        tables: fetchTables,
        credentials: fetchCredentials,
      };

      const results = await Promise.allSettled(
        needed.map((key) => fetchers[key]()),
      );

      const labels: Record<(typeof needed)[number], string> = {
        items: "Items",
        orders: "Orders",
        waiters: "Waiters",
        tables: "Tables",
        credentials: "Credentials",
      };

      results.forEach((result, index) => {
        const key = needed[index];
        if (result.status === "fulfilled") {
          applyDataset(key, result.value);
        } else {
          toast.error(`Could not load ${labels[key]}`);
        }
      });
    },
    [applyDataset],
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      await loadCoordinator.run(async (isStale) => {
        if (isRefresh) {
          setRefreshing(true);
          loadedRef.current.clear();
          setInventoryRefreshKey((n) => n + 1);
        } else {
          setLoading(true);
        }

        try {
          const keys: AdminDatasetKey[] = isRefresh
            ? ["items", "orders", "waiters", "tables", "credentials"]
            : ["orders", "items"];
          await ensureAdminData(keys, { refresh: isRefresh });
          if (isStale()) return;
          try {
            const regs = await fetchItemRegistrations();
            if (isStale()) return;
            setInventoryAlerts(
              (regs as ItemRegistration[]).filter((r) =>
                rowHotelMatchesTenantScope(r.HotelName, tenantScope),
              ),
            );
          } catch {
            /* alerts are optional */
          }
        } catch {
          if (!isStale()) {
            toast.error("An unexpected error occurred while loading data.");
          }
        } finally {
          if (!isStale()) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      });
    },
    [ensureAdminData, tenantScope, loadCoordinator],
  );

  const refreshOrdersLive = useCallback(async () => {
    if (!tenantScope) return;
    await loadCoordinator.run(async (isStale) => {
      try {
        const ordersData = await fetchLiveCafeOrders();
        if (isStale()) return;
        applyDataset("orders", ordersData);
      } catch {
        /* silent background refresh */
      }
    });
  }, [tenantScope, applyDataset, loadCoordinator]);

  useEffect(() => {
    if (!tenantScope) return;
    const refresh = () => void refreshOrdersLive();
    const unsubSync = subscribeCafeOrdersChanged(refresh);
    return () => {
      unsubSync();
    };
  }, [tenantScope, refreshOrdersLive]);

  useVisibleInterval(
    () => {
      if (tenantScope) void refreshOrdersLive();
    },
    tenantScope ? CAFE_LIVE_ORDERS_POLL_MS : null,
  );

  useEffect(() => {
    if (!tenantScope || loading) return;
    const keys = ADMIN_TAB_DATA_KEYS[activeTab];
    if (keys?.length) {
      void ensureAdminData(keys);
    }
  }, [activeTab, tenantScope, loading, ensureAdminData]);

  useEffect(() => {
    if (tenantScope) {
      void loadData();
    }
  }, [tenantScope, loadData]);

  const sidebarIconMap: Record<
    (typeof ADMIN_SIDEBAR_ITEMS)[number]["icon"],
    LucideIcon
  > = {
    FileText,
    PlusCircle,
    Edit,
    Users,
    Key,
    UserMinus,
    Store,
    Building2,
    Receipt,
    ClipboardList,
    LayoutDashboard,
    CalendarDays,
    AlertTriangle,
    Ban,
    Printer,
  };

  const tenantModules = useTenantModules();
  const analog = isAnalogCafeOrderMode(useCafeOrderMode());

  const sidebarItems = ADMIN_SIDEBAR_ITEMS.filter((item) =>
    filterAdminTabId(item.id, tenantModules),
  )
    .filter((item) => !(analog && item.id === "station-prep-qty"))
    .filter((item) => analog || item.id !== "cancel-orders")
    .filter((item) => analog || item.id !== "pos-printer")
    .map((item) => {
    const Icon = sidebarIconMap[item.icon];
    return {
      id: item.id,
      label: item.label,
      icon: <Icon className="h-4 w-4" aria-hidden />,
    };
  });

  const cafeSidebarItems = sidebarItems.filter((item) =>
    ADMIN_CAFE_TAB_IDS.has(item.id),
  );
  const inventorySidebarItems = sidebarItems.filter((item) =>
    ADMIN_INVENTORY_TAB_IDS.has(item.id),
  );
  const accessSidebarItems = sidebarItems.filter((item) =>
    ADMIN_ACCESS_TAB_IDS.has(item.id),
  );
  const hrSidebarItems = sidebarItems.filter((item) =>
    ADMIN_HR_TAB_IDS.has(item.id),
  );

  useEffect(() => {
    if (activeTab === "hr-workforce") {
      setActiveTab("hr-overview");
      return;
    }
    if (activeTab === "hr-payroll") {
      setActiveTab("hr-payroll-generate");
      return;
    }
    if (
      sidebarItems.length > 0 &&
      !sidebarItems.some((item) => item.id === activeTab) &&
      !isHrPayrollTab(activeTab)
    ) {
      setActiveTab(sidebarItems[0]!.id);
    }
  }, [activeTab, sidebarItems]);

  const handleLogout = () => {
    logoutAction();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">
            Syncing dashboard data...
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "reports":
        return (
          <div className="flex flex-col gap-6 p-3 sm:gap-8 sm:p-5 md:p-6">
            <CafeAdminDailyRevenueCards
              orders={orders}
              hotelName={tenantScope}
              loading={loading}
            />

            <div className="relative">
              <div
                className="absolute inset-x-0 -top-3 hidden h-px bg-linear-to-r from-transparent via-border to-transparent sm:block"
                aria-hidden
              />
              <p className="mb-3 hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 sm:block">
                Detailed reports
              </p>
            </div>

            <Reports
              orders={orders}
              hotelName={tenantScope}
              items={items}
              onGenerateReport={async ({
              date,
              type,
            }) => {
              try {
                const cashouts = await fetchCashout(tenantScope);
                return await generateReport(orders, cashouts, {
                  date,
                  type,
                  HotelName: tenantScope,
                }, items);
              } catch (error: any) {
                toast.error("Failed to generate report: " + error.message);
                throw error;
              }
            }}
            onExportReport={async (
              reportData: any,
              reportType,
            ) => {
              try {
                const exportData = prepareReportExportData(
                  reportData.orders,
                  reportType,
                  items,
                );
                await exportToExcel(exportData);
              } catch (error: any) {
                toast.error("Failed to export report: " + error.message);
                throw error;
              }
            }}
            />
          </div>
        );
      case "create-item":
        return (
          <div className="p-3 sm:p-5 md:p-6">
          <ItemCreationForm
            hotelName={tenantScope}
            onSubmit={async (data) => {
              await createItem(data);
              loadData(true);
            }}
            onImageUpload={uploadImage}
          />
          </div>
        );
      case "update-item":
        return (
          <div className="p-3 sm:p-5 md:p-6">
          <UpdateDeleteIntro
            items={items}
            hotelName={tenantScope}
            onUpdate={() => loadData(true)}
            onDelete={async (id: number) => {
              try {
                await deleteItem(id);
                loadData(true);
              } catch (err: any) {
                toast.error(`Failed to delete: ${err.message}`);
              }
            }}
            onImageUpload={uploadImage}
          />
          </div>
        );
      case "station-prep-qty":
        return (
          <CafeAdminStationPrepQtyPanel
            items={items}
            hotelName={tenantScope}
            onRefresh={() => loadData(true)}
          />
        );
      case "grant-credential":
        return (
          <div className="p-3 sm:p-5 md:p-6">
          <GrantCredential
            hotelName={tenantScope}
            logoUrl={logoUrl}
            onSubmit={async (data) => {
              await createCredential(data);
              loadData(true);
            }}
          />
          {analog ? (
            <div className="mt-6">
              <ManagerCashierCancelPermissionCard />
            </div>
          ) : null}
          </div>
        );
      case "waiter-table":
        return (
          <div className="p-2 sm:p-4 md:p-5 min-w-0">
          <WaiterAndTable
            waiters={waiters}
            tables={tables}
            hotelName={tenantScope}
            onAddWaiter={async (data: any) => {
              await createWaiter({ ...data, HotelName: tenantScope });
              loadData(true);
            }}
            onAddTable={async (data: any) => {
              await createTable({ ...data, HotelName: tenantScope });
              loadData(true);
            }}
          />
          </div>
        );
      case "pos-printer":
        return analog ? (
          <div className="p-3 sm:p-5 md:p-6">
            <PosAgentSetupCard />
          </div>
        ) : null;
      case "cancel-orders":
        return analog ? (
          <div className="flex flex-col gap-6 p-3 sm:p-5 md:p-6">
            <ManagerCashierCancelPermissionCard />
            <CafeCashierOrderUpdatePanel
              orders={orders}
              items={items}
              hotelName={tenantScope}
              onRefresh={() => loadData(true)}
              analogAddOnly
              allowCancel
            />
          </div>
        ) : null;
      case "delete-credential":
        return (
          <div className="p-3 sm:p-5 md:p-6 min-w-0 overflow-x-hidden">
            <DeleteCredential
              credentials={credentials}
              onDeleteCredential={async (userName: string) => {
                await deleteCredential(userName);
                loadData(true);
              }}
            />
          </div>
        );
      case "inventory":
        return (
          <div className="space-y-3 p-3 sm:space-y-4 sm:p-5 md:p-6">
            <div className="rounded-xl border border-border/40 bg-card/30 p-3 shadow-sm backdrop-blur-sm sm:rounded-2xl sm:p-6">
              <AdminInventory
                hotelName={tenantScope}
                refreshSignal={inventoryRefreshKey}
              />
            </div>
          </div>
        );
      case "item-receipts":
        return (
          <div className="rounded-xl border border-border/40 bg-card/30 p-3 shadow-sm backdrop-blur-sm sm:rounded-2xl sm:p-6">
            <StoreItemReceiptPrinting
              items={inventoryAlerts}
              propertyName={displayName || tenantScope}
              propertyTin={propertyTin}
              logoUrl={logoUrl || null}
              variant="cafe-store"
            />
          </div>
        );
      case "credit-registrations":
        return (
          <div className="min-w-0 overflow-x-hidden rounded-xl border border-border/40 bg-card/30 p-3 shadow-sm backdrop-blur-sm sm:rounded-2xl sm:p-6">
            <CafeAdminCorporateCredit
              tenantScope={tenantScope}
              propertyName={displayName || tenantScope}
              propertyLogo={logoUrl || null}
              propertyTin={propertyTin}
            />
          </div>
        );
      case "hr-overview":
      case "hr-employees":
      case "hr-leave":
      case "hr-attendance":
      case "hr-payroll-generate":
      case "hr-payroll-runs":
      case "hr-payroll-settings":
      case "hr-payroll-history":
      case "hr-incidents":
      case "hr-departments":
        return (
          <HrDashboard
            embedded
            section={
              HR_TAB_TO_SECTION[
                activeTab as (typeof HR_WORKSPACE_TAB_IDS)[number]
              ]
            }
          />
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
                <LayoutDashboard className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Terminal
                </p>
                <span className="block truncate font-semibold leading-tight">
                  Admin
                </span>
              </div>
            </div>
          </SidebarHeader>
          <div className="shrink-0 px-3 pb-2 pt-3">
            <SidebarSeparator className="bg-sidebar-border/80" />
          </div>
          <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
            <SidebarMenu className="gap-1">
              {cafeSidebarItems.length > 0 ? (
                <ManagerCollapsibleSidebarGroup
                  label={
                    tenantHasModule(tenantModules, "Credit Management")
                      ? "Cafe and Restaurant/Credit"
                      : "Cafe and Restaurant"
                  }
                  icon={Coffee}
                  items={cafeSidebarItems}
                  activeSection={activeTab}
                  isGroupActive={ADMIN_CAFE_TAB_IDS.has(activeTab)}
                  onSelect={setActiveTab}
                  layout="flat"
                />
              ) : null}
              {inventorySidebarItems.length > 0 ? (
                <ManagerCollapsibleSidebarGroup
                  label="Inventory"
                  icon={Store}
                  items={inventorySidebarItems}
                  activeSection={activeTab}
                  isGroupActive={ADMIN_INVENTORY_TAB_IDS.has(activeTab)}
                  onSelect={setActiveTab}
                  layout="flat"
                />
              ) : null}
              {hrSidebarItems.length > 0 ||
              tenantHasModule(tenantModules, "HR Module") ? (
                <ManagerCollapsibleSidebarGroup
                  label="HR"
                  icon={Users}
                  items={hrSidebarItems}
                  activeSection={activeTab}
                  isGroupActive={ADMIN_HR_TAB_IDS.has(activeTab)}
                  onSelect={setActiveTab}
                  layout="flat"
                >
                  <HrPayrollSidebarGroup
                    activeSection={activeTab}
                    onSelect={setActiveTab}
                    visibleViews={hrPayrollViewsForCaps(hrCapabilities("Admin"))}
                  />
                </ManagerCollapsibleSidebarGroup>
              ) : null}
              {accessSidebarItems.length > 0 ? (
                <ManagerCollapsibleSidebarGroup
                  label="Access"
                  icon={Key}
                  items={accessSidebarItems}
                  activeSection={activeTab}
                  isGroupActive={ADMIN_ACCESS_TAB_IDS.has(activeTab)}
                  onSelect={setActiveTab}
                  layout="flat"
                />
              ) : null}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 pt-2">
            <Button
              variant="outline"
              className="w-full cursor-pointer justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex min-h-svh flex-1 flex-col overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/20 md:m-2 md:ml-0 md:max-h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-border/80 md:bg-background md:shadow-lg md:ring-1 md:ring-black/5 dark:md:ring-white/10">
          <header className="app-chrome-header sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b px-2 sm:gap-2 sm:px-3 md:h-16 md:px-6">
            <SidebarTrigger className="shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs md:text-sm">
                {headerLabel}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-0 sm:gap-0.5 md:gap-1">
              <TrialBillingButton />
              <SubscriptionNotificationCenter />
              <TenantFeedbackCenter />
              <InventoryNotificationCenter
                audience="cafe-admin"
                items={inventoryAlerts}
                hotelLodging={false}
              />
              <RefreshIconButton
                busy={refreshing}
                disabled={loading}
                onClick={() => void loadData(true)}
              />
              <ChangeOwnPasswordButton />
              <Link
                href="/TenantProfile"
                className="rounded-full outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Open tenant profile"
              >
                <Avatar className="h-8 w-8 shrink-0 border shadow-sm md:h-9 md:w-9">
                  <AvatarImage src={logoUrl} alt={headerLabel} />
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                    {headerLabel.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-2 pb-4 sm:p-4 md:p-6 lg:p-8 [scrollbar-gutter:stable]">
            <div className="mx-auto w-full min-w-0 max-w-6xl space-y-3 sm:space-y-4">
              <SubscriptionAlertBanner />
              {ADMIN_HR_TAB_IDS.has(activeTab) ? (
                <>
                  <div className="space-y-1.5 rounded-2xl border border-border/70 bg-linear-to-br from-card via-card to-primary/6 p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 md:p-6">
                    <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                      {
                        HR_SECTION_COPY[
                          HR_TAB_TO_SECTION[
                            activeTab as (typeof HR_WORKSPACE_TAB_IDS)[number]
                          ]
                        ]?.title
                      }
                    </h2>
                    <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
                      {
                        HR_SECTION_COPY[
                          HR_TAB_TO_SECTION[
                            activeTab as (typeof HR_WORKSPACE_TAB_IDS)[number]
                          ]
                        ]?.description
                      }
                    </p>
                  </div>
                  {renderContent()}
                </>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-2 px-0.5">
                    <h2 className="min-w-0 truncate text-base font-bold tracking-tight text-foreground sm:text-xl md:text-2xl">
                      {sidebarItems.find((i) => i.id === activeTab)?.label}
                    </h2>
                  </div>
                  <Card className="min-w-0 overflow-hidden border border-border/40 bg-card shadow-sm sm:border-none sm:shadow-xl">
                    <CardContent className="min-w-0 p-0">
                      {renderContent()}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}

// 2. Export wrapped in Suspense
export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
