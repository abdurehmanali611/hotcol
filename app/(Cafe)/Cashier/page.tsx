/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  Store,
  Loader2,
  Wallet,
  Building2,
  LogOut,
  Receipt,
  ClipboardEdit,
  ArrowLeftRight,
} from "lucide-react";
import {
  Item,
  Order,
  createOrder,
  fetchItems,
  fetchLiveCafeOrders,
  CAFE_LIVE_ORDERS_POLL_MS,
  logoutAction,
  updateOrderPayment,
} from "@/lib/actions";
import { resolveCanonicalTenantKey } from "@/lib/tenantRowMatch";
import { subscribeCafeOrdersChanged } from "@/lib/cafeOrdersSync";
import OrderComponent from "@/components/Order";
import PaymentComponent from "@/components/Payment";
import OrderDetailsModal from "@/components/orderDetailsModal";
import { Button } from "@/components/ui/button";
import { CafeCashierCorporateCreditPanel } from "@/components/cafe/CafeCashierCorporateCreditPanel";
import { CafeCashierCashoutPanel } from "@/components/cafe/CafeCashierCashoutPanel";
import { CafeCashierOrderUpdatePanel } from "@/components/cafe/CafeCashierOrderUpdatePanel";
import { CafeCashierPaymentTypePanel } from "@/components/cafe/CafeCashierPaymentTypePanel";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import {
  CAFE_CASHIER_NAV_ITEMS,
  type CafeCashierNavId,
} from "@/constants";
import { filterCafeCashierNavId } from "@/lib/subscriptionModules";
import { useTenantModules } from "@/hooks/useTenantModules";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useLoadCoordinator } from "@/hooks/useLoadCoordinator";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { LiveDateTimeClock } from "@/components/LiveDateTimeClock";
import { RefreshIconButton } from "@/components/ui/refresh-icon-button";
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

const NAV_ICONS: Record<
  (typeof CAFE_CASHIER_NAV_ITEMS)[number]["icon"],
  typeof ShoppingCart
> = {
  ShoppingCart,
  Wallet,
  Building2,
  Receipt,
  ClipboardEdit,
  ArrowLeftRight,
};

function CashierContent() {
  useTenantRouteGuard({ role: "Cashier" });
  const searchParams = useSearchParams();
  const { tenantScope, displayName } = useTenantScopeAndDisplay(
    searchParams.get("hotel"),
  );
  const displayLabel = displayName || "Cafe";
  const logoUrl = searchParams.get("logo") || "";

  const [activeView, setActiveView] = useState<CafeCashierNavId>("order");
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const loadCoordinator = useLoadCoordinator();

  const tenantModules = useTenantModules();
  const navItems = useMemo(
    () =>
      CAFE_CASHIER_NAV_ITEMS.filter((item) =>
        filterCafeCashierNavId(item.id, tenantModules),
      ),
    [tenantModules],
  );

  const sectionMeta = useMemo(
    () => navItems.find((n) => n.id === activeView),
    [activeView, navItems],
  );

  useEffect(() => {
    if (
      navItems.length > 0 &&
      !navItems.some((item) => item.id === activeView)
    ) {
      setActiveView(navItems[0]!.id);
    }
  }, [activeView, navItems]);

  const loadData = useCallback(
    async (options?: { refresh?: boolean; silent?: boolean }) => {
      const isRefresh = options?.refresh ?? false;
      const silent = options?.silent ?? false;
      await loadCoordinator.run(async (isStale) => {
        if (!silent) {
          if (isRefresh) setRefreshing(true);
          else setLoading(true);
        }
        try {
          const [itemsData, ordersData] = await Promise.all([
            fetchItems(),
            fetchLiveCafeOrders(),
          ]);
          if (isStale()) return;
          setItems(itemsData);
          setOrders(ordersData);
        } catch {
          if (!isStale() && !silent) toast.error("Failed to load data");
        } finally {
          if (!isStale() && !silent) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      });
    },
    [loadCoordinator],
  );

  useEffect(() => {
    if (tenantScope) {
      void loadData();
    }
  }, [tenantScope, loadData]);

  useEffect(() => {
    if (!tenantScope) return;
    const refresh = () => void loadData({ refresh: true, silent: true });
    const unsubSync = subscribeCafeOrdersChanged(refresh);
    return () => {
      unsubSync();
    };
  }, [tenantScope, loadData]);

  useVisibleInterval(
    () => {
      if (tenantScope) void loadData({ refresh: true, silent: true });
    },
    tenantScope ? CAFE_LIVE_ORDERS_POLL_MS : null,
  );

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setShowOrderModal(true);
  };

  const handleBatchOrderSuccess = async () => {
    try {
      await loadData({ refresh: true });
      toast.success("Batch order created successfully!");
    } catch {}
  };

  const handleOrderSubmit = async (data: {
    tableNo: number;
    waiterName: string;
    orderAmount: number;
  }) => {
    if (!selectedItem) return;

    const orderData = {
      title: selectedItem.name,
      imageUrl: selectedItem.imageUrl || "",
      tableNo: data.tableNo,
      waiterName: data.waiterName,
      orderAmount: data.orderAmount,
      HotelName: resolveCanonicalTenantKey(tenantScope),
      status: "Pending",
      payment: "Unpaid",
      category: selectedItem.category,
      type: selectedItem.type,
      price: selectedItem.price,
    };

    try {
      const result = await createOrder(orderData);
      await loadData({ refresh: true });
      setShowOrderModal(false);
      setSelectedItem(null);
      return result;
    } catch (error: any) {
      throw error;
    }
  };

  const handlePayment = async (
    id: number,
    order: Order,
    sales: number,
    bank: boolean,
    options?: {
      bankTransferAmount?: number;
      bankTipCashDeduction?: number;
      silent?: boolean;
    },
  ) => {
    try {
      const paymentOptions: {
        silent?: boolean;
        bankTransferAmount?: number | null;
        bankTipCashDeduction?: number | null;
      } = { silent: options?.silent ?? false };

      if (bank) {
        if (options?.bankTransferAmount != null) {
          paymentOptions.bankTransferAmount = options.bankTransferAmount;
        }
        if (options?.bankTipCashDeduction != null) {
          paymentOptions.bankTipCashDeduction = options.bankTipCashDeduction;
        }
      } else {
        paymentOptions.bankTransferAmount = null;
        paymentOptions.bankTipCashDeduction = null;
      }

      const updated = await updateOrderPayment(id, "Paid", bank, paymentOptions);
      if (!options?.silent) {
        await loadData({ refresh: true });
        toast.success(
          `Payment processed successfully via ${bank ? "Bank" : "Cash"}`,
        );
      }
      return { ...updated, id, order, sales, bank, withBank: bank };
    } catch (error) {
      if (!options?.silent) {
        toast.error("Failed to process payment");
      }
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <header className="h-20 border-b bg-background px-6 flex items-center justify-between">
          <div className="flex gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-64 rounded-lg" />
        </header>
        <main className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </main>
      </div>
    );
  }

  const panel =
    activeView === "order" ? (
      <OrderComponent
        items={items}
        hotelName={tenantScope}
        openOrders={orders}
        onItemSelect={handleItemSelect}
        onGoToPayment={() => setActiveView("payment")}
        onBatchOrderSuccess={handleBatchOrderSuccess}
      />
    ) : activeView === "payment" ? (
      <PaymentComponent
        orders={orders}
        hotelName={tenantScope}
        onHandlePayment={handlePayment}
        onRefresh={() => loadData({ refresh: true })}
      />
    ) : activeView === "payment-type" ? (
      <CafeCashierPaymentTypePanel
        orders={orders}
        hotelName={tenantScope}
        onRefresh={() => loadData({ refresh: true })}
      />
    ) : activeView === "order-update" ? (
      <CafeCashierOrderUpdatePanel
        orders={orders}
        items={items}
        hotelName={tenantScope}
        onRefresh={() => loadData({ refresh: true })}
      />
    ) : activeView === "credit" ? (
      <CafeCashierCorporateCreditPanel />
    ) : activeView === "cashout" ? (
      <CafeCashierCashoutPanel
        tenantScope={tenantScope}
        propertyName={displayLabel}
      />
    ) : null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40 text-foreground">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
          <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border bg-sidebar-accent/25 px-4">
            <div className="flex h-full min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <Store className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Terminal
                </p>
                <span className="block truncate font-semibold leading-tight">
                  Cafe cashier
                </span>
              </div>
            </div>
          </SidebarHeader>
          <div className="shrink-0 px-3 pb-2 pt-3">
            <SidebarSeparator className="bg-sidebar-border/80" />
          </div>
          <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeView === item.id}
                      onClick={() => setActiveView(item.id)}
                      tooltip={item.label}
                      size="lg"
                      className="h-10 cursor-pointer text-[13px] data-[active=true]:shadow-sm"
                    >
                      <Icon className="opacity-80" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 pt-2">
            <Button
              variant="outline"
              className="w-full cursor-pointer justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => logoutAction()}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex min-h-svh flex-1 flex-col overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/20 md:m-2 md:ml-0 md:max-h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-border/80 md:bg-background md:shadow-lg md:ring-1 md:ring-black/5 dark:md:ring-white/10">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-2 sm:gap-3 sm:px-3 md:h-16 md:px-6">
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <SidebarTrigger className="shrink-0" />
              <h1 className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs md:text-sm">
                {displayLabel}
              </h1>
            </div>
            <LiveDateTimeClock className="min-w-0 flex-1" />
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <RefreshIconButton
                busy={refreshing}
                disabled={loading}
                onClick={() => void loadData({ refresh: true })}
              />
              <Avatar className="h-8 w-8 border shadow-sm sm:h-9 sm:w-9">
                <AvatarImage src={logoUrl} alt={displayLabel} />
                <AvatarFallback>
                  <Store className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <div
            className={
              activeView === "order"
                ? "min-h-0 flex-1 overflow-y-auto"
                : "min-h-0 flex-1 overflow-y-auto p-4 md:p-6"
            }
          >
            {activeView !== "order" && sectionMeta?.description ? (
              <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
                {sectionMeta.description}
              </p>
            ) : null}
            <div
              className={
                activeView === "order"
                  ? "min-h-full"
                  :                 activeView === "order-update" || activeView === "payment-type"
                    ? "flex min-h-0 flex-1 flex-col"
                    : "rounded-2xl border bg-background shadow-sm min-h-[min(70vh,800px)] p-2 md:p-4"
              }
            >
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {panel}
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>

      {selectedItem ? (
        <OrderDetailsModal
          item={selectedItem}
          isOpen={showOrderModal}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedItem(null);
          }}
          hotelName={tenantScope}
          openOrders={orders}
          onSubmit={handleOrderSubmit}
        />
      ) : null}
    </SidebarProvider>
  );
}

export default function Cashier() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">
            Initializing Terminal...
          </p>
        </div>
      }
    >
      <CashierContent />
    </Suspense>
  );
}
