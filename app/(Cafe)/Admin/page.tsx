/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback, Suspense, useRef } from "react"; // Added Suspense
import { useSearchParams, useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import GrantCredential from "@/components/GrantCredential";
import Reports from "@/components/reports";
import ItemCreationForm from "@/components/ItemCreation";
import UpdateDeleteIntro from "@/components/UpdateDeleteIntro";
import UpdateCredential from "@/components/UpdateCredential";
import WaiterAndTable from "@/components/Waiter_And_Table";
import {
  fetchItems,
  fetchCredentials,
  fetchWaiters,
  fetchTables,
  fetchOrders,
  createItem,
  deleteItem,
  createCredential,
  updateCredential,
  deleteCredential,
  updateAdminPassword,
  createWaiter,
  createTable,
  uploadImage,
  generateReport,
  prepareReportExportData,
  exportToExcel,
  fetchCashout,
  fetchItemRegistrations,
  type ItemRegistration,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import {
  FileText,
  PlusCircle,
  Edit,
  Key,
  Users,
  RefreshCw,
  LogOut,
  LayoutDashboard,
  Loader2,
  Store,
  Building2,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_SIDEBAR_ITEMS } from "@/constants";
import { filterAdminTabId } from "@/lib/subscriptionModules";
import { useTenantModules } from "@/hooks/useTenantModules";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CafeAdminCorporateCredit } from "@/components/cafe/CafeAdminCorporateCredit";
import AdminInventory from "@/components/AdminInventory";
import { StoreItemReceiptPrinting } from "@/components/hotel/StoreItemReceiptPrinting";
import { InventoryNotificationCenter } from "@/components/inventory/InventoryNotificationCenter";
import { TenantFeedbackCenter } from "@/components/feedback/TenantFeedbackCenter";
import {
  SubscriptionAlertBanner,
  SubscriptionNotificationCenter,
} from "@/components/subscription/SubscriptionNotificationCenter";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";

type AdminDatasetKey = "items" | "orders" | "waiters" | "tables" | "credentials";

const ADMIN_TAB_DATA_KEYS: Partial<Record<string, AdminDatasetKey[]>> = {
  "create-item": ["items"],
  "update-item": ["items"],
  "grant-credential": ["credentials"],
  "waiter-table": ["waiters", "tables"],
  "update-credential": ["credentials"],
};

function AdminDashboardContent() {
  useTenantRouteGuard();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const loadedRef = useRef(new Set<AdminDatasetKey>());

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
        orders: fetchOrders,
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
      if (isRefresh) {
        setRefreshing(true);
        loadedRef.current.clear();
      } else {
        setLoading(true);
      }

      try {
        const keys: AdminDatasetKey[] = isRefresh
          ? ["items", "orders", "waiters", "tables", "credentials"]
          : ["orders"];
        await ensureAdminData(keys, { refresh: isRefresh });
        try {
          const regs = await fetchItemRegistrations();
          setInventoryAlerts(
            (regs as ItemRegistration[]).filter((r) =>
              rowHotelMatchesTenantScope(r.HotelName, tenantScope),
            ),
          );
        } catch {
          /* alerts are optional */
        }
      } catch {
        toast.error("An unexpected error occurred while loading data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [ensureAdminData, tenantScope],
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
    RefreshCw,
    Store,
    Building2,
    Receipt,
  };

  const tenantModules = useTenantModules();

  const sidebarItems = ADMIN_SIDEBAR_ITEMS.filter((item) =>
    filterAdminTabId(item.id, tenantModules),
  ).map((item) => {
    const Icon = sidebarIconMap[item.icon];
    return {
      id: item.id,
      label: item.label,
      icon: <Icon className="h-4 w-4" aria-hidden />,
    };
  });

  useEffect(() => {
    if (
      sidebarItems.length > 0 &&
      !sidebarItems.some((item) => item.id === activeTab)
    ) {
      setActiveTab(sidebarItems[0]!.id);
    }
  }, [activeTab, sidebarItems]);

  const handleLogout = () => {
    router.push("/");
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
          <Reports
            orders={orders}
            hotelName={tenantScope}
            onGenerateReport={async ({
              date,
              type,
            }: {
              date: Date;
              type: "Daily" | "Monthly";
            }) => {
              try {
                const cashouts = await fetchCashout(tenantScope);
                return await generateReport(orders, cashouts, {
                  date,
                  type,
                  HotelName: tenantScope,
                });
              } catch (error: any) {
                toast.error("Failed to generate report: " + error.message);
                throw error;
              }
            }}
            onExportReport={async (
              reportData: any,
              reportType: "Daily" | "Monthly",
            ) => {
              try {
                const exportData = prepareReportExportData(
                  reportData.orders,
                  reportType,
                );
                await exportToExcel(exportData);
              } catch (error: any) {
                toast.error("Failed to export report: " + error.message);
                throw error;
              }
            }}
          />
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
      case "update-credential":
        return (
          <div className="p-3 sm:p-5 md:p-6 min-w-0 overflow-x-hidden">
          <UpdateCredential
            credentials={credentials}
            hotelName={tenantScope}
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
      case "inventory":
        return (
          <div className="space-y-3 p-3 sm:space-y-4 sm:p-5 md:p-6">
            <div className="rounded-xl border border-border/40 bg-card/30 p-3 shadow-sm backdrop-blur-sm sm:rounded-2xl sm:p-6">
              <AdminInventory hotelName={tenantScope} />
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
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
        <Sidebar collapsible="icon" className="border-r">
          <SidebarHeader className="h-16 flex items-center px-4 border-b">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-1.5 text-primary-foreground">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg truncate">Admin Pro</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="py-4">
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                    tooltip={item.label}
                    className="cursor-pointer"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <div className="mt-auto px-4 pb-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex min-h-svh flex-col overflow-x-hidden">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b bg-background/95 px-2 backdrop-blur-sm supports-backdrop-filter:bg-background/80 sm:gap-2 sm:px-3 md:h-16 md:px-6">
            <SidebarTrigger className="shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs md:text-sm">
                {headerLabel}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-0 sm:gap-0.5 md:gap-1">
              <SubscriptionNotificationCenter />
              <TenantFeedbackCenter />
              <InventoryNotificationCenter
                audience="cafe-admin"
                items={inventoryAlerts}
                hotelLodging={false}
              />
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 shrink-0${refreshing ? " animate-spin" : ""}`}
                onClick={() => loadData(true)}
                disabled={refreshing}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8 shrink-0 border shadow-sm md:h-9 md:w-9">
                <AvatarImage src={logoUrl} alt={headerLabel} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {headerLabel.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-x-hidden p-2 pb-4 sm:p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full min-w-0 max-w-6xl space-y-3 sm:space-y-4">
              <SubscriptionAlertBanner />
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
