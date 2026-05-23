/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  CreditCard,
  Store,
  RefreshCw,
  Loader2,
  FileText,
  Wallet,
  UserPlus,
  LogOut,
} from "lucide-react";
import {
  Item,
  Order,
  createOrder,
  fetchItems,
  fetchOrders,
  logoutAction,
  updateOrderPayment,
} from "@/lib/actions";
import OrderComponent from "@/components/Order";
import PaymentComponent from "@/components/Payment";
import OrderDetailsModal from "@/components/orderDetailsModal";
import { Button } from "@/components/ui/button";
import CreditRegistrationForm from "../../../components/CreditRegistration";
import CashoutForm from "@/components/CashoutForm";
import { CafeCashierReportsPanel } from "@/components/cafe/CafeCashierReportsPanel";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import {
  CAFE_CASHIER_NAV_ITEMS,
  type CafeCashierNavId,
} from "@/constants";
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
  CreditCard,
  UserPlus,
  FileText,
};

function CashierContent() {
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
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const sectionMeta = useMemo(
    () => CAFE_CASHIER_NAV_ITEMS.find((n) => n.id === activeView),
    [activeView],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, ordersData] = await Promise.all([
        fetchItems(),
        fetchOrders(),
      ]);
      setItems(itemsData);
      setOrders(ordersData);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantScope) {
      void loadData();
    }
  }, [tenantScope]);

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setShowOrderModal(true);
  };

  const handleBatchOrderSuccess = async () => {
    try {
      await loadData();
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
      HotelName: tenantScope,
      status: "Pending",
      payment: "Unpaid",
      category: selectedItem.category,
      type: selectedItem.type,
      price: selectedItem.price,
    };

    try {
      const result = await createOrder(orderData);
      toast.success("Order created successfully!");
      await loadData();
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
  ) => {
    try {
      await updateOrderPayment(id, "Paid", bank);
      await loadData();
      toast.success(
        `Payment processed successfully via ${bank ? "Bank" : "Cash"}`,
      );
      return { id, order, sales, bank };
    } catch (error) {
      toast.error("Failed to process payment");
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
        onItemSelect={handleItemSelect}
        onGoToPayment={() => setActiveView("payment")}
        onBatchOrderSuccess={handleBatchOrderSuccess}
      />
    ) : activeView === "payment" ? (
      <PaymentComponent
        orders={orders}
        hotelName={tenantScope}
        onHandlePayment={handlePayment}
        onRefresh={loadData}
      />
    ) : activeView === "credit" ? (
      <CreditRegistrationForm
        hotelName={tenantScope}
        businessDisplayName={displayLabel}
      />
    ) : activeView === "reports" ? (
      <CafeCashierReportsPanel orders={orders} hotelName={tenantScope} />
    ) : (
      <CashoutForm hotelName={tenantScope} />
    );

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
              {CAFE_CASHIER_NAV_ITEMS.map((item) => {
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
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:h-16 md:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground md:text-sm">
                {displayLabel}
              </h1>
              <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                {sectionMeta?.label ?? "Cashier"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadData()}
              disabled={loading}
              className={loading ? "animate-spin" : ""}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8 border shadow-sm">
              <AvatarImage src={logoUrl} alt={displayLabel} />
              <AvatarFallback>
                <Store className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            {sectionMeta?.description ? (
              <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
                {sectionMeta.description}
              </p>
            ) : null}
            <div className="rounded-2xl border bg-background shadow-sm min-h-[min(70vh,800px)] p-2 md:p-4">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {panel}
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>

      <OrderDetailsModal
        item={selectedItem}
        isOpen={showOrderModal}
        onClose={() => {
          setShowOrderModal(false);
          setSelectedItem(null);
        }}
        hotelName={tenantScope}
        onSubmit={handleOrderSubmit}
      />
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
