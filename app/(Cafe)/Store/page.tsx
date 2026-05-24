"use client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchItemRegistrations,
  fetchItemStatus,
  fetchPurchaseRequests,
  ItemRegistration,
  ItemStatus,
  logoutAction,
  notifyApiFailure,
  type PurchaseRequestRow,
  type StockOutRequestRow,
} from "@/lib/actions";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLoadCoordinator } from "@/hooks/useLoadCoordinator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronRight,
  ClipboardList,
  Loader2,
  MinusCircle,
  PackagePlus,
  Printer,
  Receipt,
  RefreshCw,
  Send,
  ShoppingCart,
  StoreIcon,
} from "lucide-react";
import PurchaseRequestsTab from "@/components/hotel/PurchaseRequestsTab";
import { PurchaseRequestStatusPanel } from "@/components/hotel/PurchaseRequestStatusPanel";
import { StockMovementStatusPanel } from "@/components/hotel/StockMovementStatusPanel";
import { StoreItemReceiptPrinting } from "@/components/hotel/StoreItemReceiptPrinting";
import { HotelInventoryPaymentCategoryPanel } from "@/components/hotel/HotelInventoryPaymentCategoryPanel";
import { useStoreRequestStatusData } from "@/components/hotel/useStoreRequestStatusData";
import { BatchItemRegistrationForm } from "@/components/store/BatchItemRegistrationForm";
import { InventoryNotificationCenter } from "@/components/inventory/InventoryNotificationCenter";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import StoreItems from "../../StoreItems/page";
import Suppliers from "../../Suppliers/page";
import Inactive from "../../Inactive/page";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import {
  effectiveTenantScopeForHotelTerminal,
  rowHotelMatchesTenantScope,
} from "@/lib/tenantRowMatch";
import { countUniqueInventoryNames } from "@/lib/inventoryAggregation";
import { HOTEL_INVENTORY_COPY } from "@/lib/hotelDisplayLabels";
import type { LucideIcon } from "lucide-react";

function StoreWorkspaceIntro({
  title,
  description,
  Icon,
}: {
  title: string;
  description: string;
  Icon: LucideIcon;
}) {
  return (
    <Card className="border-primary/15 bg-card/95 shadow-lg backdrop-blur-sm overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
      <div className="h-1 bg-linear-to-r from-primary/60 via-violet-500/50 to-cyan-500/40" />
      <CardHeader className="pb-3 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex h-fit shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
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
}

type StoreView =
  | "Register"
  | "Active"
  | "Supplier"
  | "Inactive"
  | "Purchases"
  | "ReceiptPrinting"
  | "PurchaseRequestStatus"
  | "StockMovementStatus"
  | "PaymentCredit"
  | "PaymentPaid"
  | "PaymentWithVat"
  | "PaymentWithoutVat";

const HOTEL_STORE_NAV_TOP: {
  id: StoreView;
  label: string;
  icon: typeof PackagePlus;
}[] = [
  { id: "Register", label: "Register", icon: PackagePlus },
  { id: "Active", label: "Inventory", icon: ShoppingCart },
  { id: "Inactive", label: "Inactive", icon: MinusCircle },
  { id: "Supplier", label: "Suppliers", icon: StoreIcon },
  { id: "Purchases", label: "Purchase pipeline", icon: Send },
  { id: "ReceiptPrinting", label: "Item receipts", icon: Printer },
];

const CAFE_STORE_NAV_TOP: {
  id: StoreView;
  label: string;
  icon: typeof PackagePlus;
}[] = [
  { id: "Register", label: "Register", icon: PackagePlus },
  { id: "Active", label: "Inventory", icon: ShoppingCart },
  { id: "Inactive", label: "Inactive", icon: MinusCircle },
  { id: "Supplier", label: "Suppliers", icon: StoreIcon },
  { id: "ReceiptPrinting", label: "Item receipts", icon: Printer },
];

const REQUEST_STATUS_VIEWS: StoreView[] = [
  "PurchaseRequestStatus",
  "StockMovementStatus",
];

const PAYMENT_VAT_VIEWS: StoreView[] = [
  "PaymentCredit",
  "PaymentPaid",
  "PaymentWithVat",
  "PaymentWithoutVat",
];

export function StoreComponent({
  hotelInventory = false,
}: {
  hotelInventory?: boolean;
}) {
  const [fetching, setFetching] = useState(false);
  const [requestStatusSeed, setRequestStatusSeed] = useState(0);
  const [pendingLocalStockRows, setPendingLocalStockRows] = useState<
    StockOutRequestRow[]
  >([]);
  const [pendingLocalPurchaseRows, setPendingLocalPurchaseRows] = useState<
    PurchaseRequestRow[]
  >([]);
  const loadCoordinator = useLoadCoordinator();
  const [activeView, setActiveView] = useState<StoreView>("Register");
  const [storeItem, setStoreItem] = useState<ItemRegistration[]>([]);
  const [itemStatus, setItemStatus] = useState<ItemStatus[]>([]);
  const searchedParams = useSearchParams();
  const { tenantScope, displayName } = useTenantScopeAndDisplay(
    searchedParams.get("hotel"),
  );
  const inventoryTenantKey = useMemo(
    () =>
      effectiveTenantScopeForHotelTerminal(tenantScope, {
        requireHotelTerminal: hotelInventory,
      }),
    [tenantScope, hotelInventory],
  );
  const displayLabel = displayName || "Store Management";
  const logoUrl = searchedParams.get("logo");

  const loadData = useCallback(async () => {
    await loadCoordinator.run(async (isStale) => {
      setFetching(true);
      const tenantEff = effectiveTenantScopeForHotelTerminal(tenantScope, {
        requireHotelTerminal: hotelInventory,
      });
      try {
        if (hotelInventory) {
          const [itemResult, statusResult, prResult] = await Promise.allSettled([
            fetchItemRegistrations(),
            fetchItemStatus(),
            fetchPurchaseRequests(),
          ]);
          if (isStale()) return;

          if (itemResult.status === "fulfilled") {
            const response = itemResult.value as ItemRegistration[];
            setStoreItem(
              Array.isArray(response)
                ? response.filter((item) =>
                    rowHotelMatchesTenantScope(item.HotelName, tenantEff),
                  )
                : [],
            );
          } else {
            setStoreItem([]);
            notifyApiFailure(
              itemResult.reason,
              "Could not load inventory",
            );
          }

          if (statusResult.status === "fulfilled") {
            const statusResponse = statusResult.value as ItemStatus[];
            setItemStatus(
              Array.isArray(statusResponse)
                ? statusResponse.filter((item) =>
                    rowHotelMatchesTenantScope(item.HotelName, tenantEff),
                  )
                : [],
            );
          } else {
            setItemStatus([]);
            notifyApiFailure(
              statusResult.reason,
              "Could not load movement history",
            );
          }

          if (prResult.status === "rejected") {
            notifyApiFailure(
              prResult.reason,
              "Could not load purchase requests",
            );
          }
          return;
        }

        const [itemData, itemStatusData] = await Promise.all([
          fetchItemRegistrations(),
          fetchItemStatus(),
        ]);
        if (isStale()) return;
        const response = itemData as ItemRegistration[];
        const statusResponse = itemStatusData as ItemStatus[];
        setStoreItem(
          Array.isArray(response)
            ? response.filter((item) =>
                rowHotelMatchesTenantScope(item.HotelName, inventoryTenantKey),
              )
            : [],
        );
        setItemStatus(
          Array.isArray(statusResponse)
            ? statusResponse.filter((item) =>
                rowHotelMatchesTenantScope(item.HotelName, inventoryTenantKey),
              )
            : [],
        );
      } catch (e: unknown) {
        if (!isStale()) notifyApiFailure(e, "Failed to load data");
      } finally {
        setFetching(false);
      }
    });
  }, [hotelInventory, tenantScope, inventoryTenantKey, loadCoordinator]);

  const refreshPurchasesOnly = useCallback(async () => {
    if (!hotelInventory) return;
    await loadCoordinator.run(async (isStale) => {
      try {
        const tenantEff = effectiveTenantScopeForHotelTerminal(tenantScope, {
          requireHotelTerminal: hotelInventory,
        });
        const prData = await fetchPurchaseRequests();
        if (isStale()) return;
        setRequestStatusSeed((n) => n + 1);
      } catch {
        if (!isStale()) toast.error("Failed to refresh purchase pipeline");
      }
    });
  }, [hotelInventory, tenantScope, loadCoordinator]);

  const handleHotelStockRequestCreated = useCallback(
    (row: StockOutRequestRow) => {
      setPendingLocalStockRows((prev) => {
        if (prev.some((r) => r.id === row.id)) return prev;
        return [row, ...prev];
      });
      setRequestStatusSeed((n) => n + 1);
    },
    [],
  );

  const clearInjectedStockIds = useCallback((ids: number[]) => {
    setPendingLocalStockRows((prev) =>
      prev.filter((r) => !ids.includes(r.id)),
    );
  }, []);

  const clearInjectedPurchaseIds = useCallback((ids: number[]) => {
    setPendingLocalPurchaseRows((prev) =>
      prev.filter((r) => !ids.includes(r.id)),
    );
  }, []);

  const handlePurchaseRequestCreated = useCallback(
    (row: PurchaseRequestRow) => {
      setPendingLocalPurchaseRows((prev) => {
        if (prev.some((r) => r.id === row.id)) return prev;
        return [row, ...prev];
      });
      void refreshPurchasesOnly();
    },
    [refreshPurchasesOnly],
  );

  const requestStatusData = useStoreRequestStatusData({
    refreshSignal: requestStatusSeed,
    injectedStockRows: hotelInventory ? pendingLocalStockRows : undefined,
    onClearInjectedStockIds: hotelInventory ? clearInjectedStockIds : undefined,
    injectedPurchaseRows: hotelInventory ? pendingLocalPurchaseRows : undefined,
    onClearInjectedPurchaseIds: hotelInventory
      ? clearInjectedPurchaseIds
      : undefined,
  });

  const uniqueInventoryCount = useMemo(
    () => countUniqueInventoryNames(storeItem),
    [storeItem],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleItemsRegistered = useCallback(() => {
    void loadData();
  }, [loadData]);

  const storeWorkspaceIntro = useMemo<
    Record<StoreView, { title: string; description: string; Icon: LucideIcon }>
  >(
    () => ({
    Register: {
      title: "Register new items",
      description:
        "Add one or more items under a shared supplier — each line has its own quantity, price, dates, and image.",
      Icon: PackagePlus,
    },
    Active: {
      title: HOTEL_INVENTORY_COPY.inventoryItems,
      description:
        "Live quantities for this property — filter, edit, and approve movements where applicable.",
      Icon: ShoppingCart,
    },
    Inactive: {
      title: "Inactive items",
      description:
        "Depleted or written-off lines and movement history for auditing and review.",
      Icon: MinusCircle,
    },
    Supplier: {
      title: "Suppliers",
      description:
        "Supplier records linked to registered inventory for quick purchasing follow-ups.",
      Icon: StoreIcon,
    },
    Purchases: {
      title: HOTEL_INVENTORY_COPY.purchasePipeline,
      description:
        "Create purchase requests for Cost Control and Finance approval, then register stock when goods arrive.",
      Icon: Send,
    },
    ReceiptPrinting: {
      title: hotelInventory ? "Item receipt printing" : "Item receipts",
      description: hotelInventory
        ? "Print new registration, purchase request, and stock movement receipts."
        : "Print goods receiving vouchers for all authorized store registrations, including newly registered items and petty-cash stock-in.",
      Icon: Printer,
    },
    PurchaseRequestStatus: {
      title: "Purchase request status",
      description:
        "Track purchase requests you opened through Cost Control and Finance approval.",
      Icon: Send,
    },
    StockMovementStatus: {
      title: "Stock movement status",
      description:
        "Track stock out, wastage, and return-to-supplier requests you submitted.",
      Icon: PackagePlus,
    },
    PaymentCredit: {
      title: "Credit receiving vouchers",
      description:
        "Inventory received on supplier credit (full or partial payment recorded).",
      Icon: Receipt,
    },
    PaymentPaid: {
      title: "Paid receiving items",
      description: "Inventory lines fully paid to the supplier at registration.",
      Icon: Receipt,
    },
    PaymentWithVat: {
      title: "Items purchased with VAT",
      description: "Registrations where purchase price includes VAT.",
      Icon: Receipt,
    },
    PaymentWithoutVat: {
      title: "Items purchased without VAT",
      description: "Registrations recorded without VAT on the unit price.",
      Icon: Receipt,
    },
    }),
    [hotelInventory],
  );

  const activeIntro = storeWorkspaceIntro[activeView];

  const storeNavTop = hotelInventory ? HOTEL_STORE_NAV_TOP : CAFE_STORE_NAV_TOP;

  const panels =
        activeView === "Register" ? (
          <BatchItemRegistrationForm
            hotelName={inventoryTenantKey || tenantScope}
            hotelInventory={hotelInventory}
            onRegistered={handleItemsRegistered}
          />
        ) : activeView === "Active" ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <StoreItems
              items={storeItem}
              hotelStockApprovals={hotelInventory}
              tenantScope={inventoryTenantKey}
              embedded
              showPaymentSummary={hotelInventory}
              onHotelStockRequestCreated={
                hotelInventory ? handleHotelStockRequestCreated : undefined
              }
            />
          </div>
        ) : activeView === "Purchases" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            <PurchaseRequestsTab
              tenantScope={inventoryTenantKey}
              onCreated={handlePurchaseRequestCreated}
            />
          </div>
        ) : activeView === "ReceiptPrinting" ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            <StoreItemReceiptPrinting
              items={storeItem}
              purchaseRequests={
                hotelInventory ? requestStatusData.myPurchases : undefined
              }
              stockMovements={
                hotelInventory ? requestStatusData.myStocks : undefined
              }
              propertyName={displayLabel}
              logoUrl={logoUrl}
              variant={hotelInventory ? "hotel" : "cafe-store"}
            />
          </div>
        ) : activeView === "PurchaseRequestStatus" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            {requestStatusData.initialLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-9 w-9 animate-spin text-primary" />
              </div>
            ) : (
              <PurchaseRequestStatusPanel
                rows={requestStatusData.myPurchases}
                unitPriceRole="Store"
                onRefresh={() => void requestStatusData.reload()}
              />
            )}
          </div>
        ) : activeView === "StockMovementStatus" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            {requestStatusData.initialLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-9 w-9 animate-spin text-primary" />
              </div>
            ) : (
              <StockMovementStatusPanel rows={requestStatusData.myStocks} />
            )}
          </div>
        ) : activeView === "PaymentCredit" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            <HotelInventoryPaymentCategoryPanel
              mode="credit"
              tenantLabel={displayLabel}
              inventoryItems={storeItem}
            />
          </div>
        ) : activeView === "PaymentPaid" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            <HotelInventoryPaymentCategoryPanel
              mode="paid"
              tenantLabel={displayLabel}
              inventoryItems={storeItem}
            />
          </div>
        ) : activeView === "PaymentWithVat" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            <HotelInventoryPaymentCategoryPanel
              mode="with-vat"
              tenantLabel={displayLabel}
              inventoryItems={storeItem}
            />
          </div>
        ) : activeView === "PaymentWithoutVat" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            <HotelInventoryPaymentCategoryPanel
              mode="without-vat"
              tenantLabel={displayLabel}
              inventoryItems={storeItem}
            />
          </div>
        ) : activeView === "Inactive" ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <Inactive
              items={itemStatus}
              admin={false}
              hotelName={hotelInventory ? inventoryTenantKey : tenantScope}
            />
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <Suppliers items={storeItem}/>
          </div>
        );

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
                  <StoreIcon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                    Terminal
                  </p>
                  <span className="block truncate font-semibold leading-tight">
                    {hotelInventory ? "Hotel store" : "Cafe store"}
                  </span>
                </div>
              </div>
            </SidebarHeader>
            <div className="shrink-0 px-3 pb-2 pt-3">
              <SidebarSeparator className="bg-sidebar-border/80" />
            </div>
            <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
              <SidebarMenu className="gap-1">
                {storeNavTop.map(({ id, label, icon: Icon }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      isActive={activeView === id}
                      onClick={() => setActiveView(id)}
                      tooltip={label}
                      size="lg"
                      className="h-10 cursor-pointer text-[13px] data-[active=true]:shadow-sm"
                    >
                      <Icon className="opacity-80" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {hotelInventory ? (
                <Collapsible
                  defaultOpen={REQUEST_STATUS_VIEWS.includes(activeView)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Request status"
                        size="lg"
                        className="h-10 cursor-pointer text-[13px]"
                        isActive={REQUEST_STATUS_VIEWS.includes(activeView)}
                      >
                        <ClipboardList className="opacity-80" />
                        <span>Request status</span>
                        <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={activeView === "PurchaseRequestStatus"}
                            onClick={() => setActiveView("PurchaseRequestStatus")}
                            className="cursor-pointer"
                          >
                            Purchase requests
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={activeView === "StockMovementStatus"}
                            onClick={() => setActiveView("StockMovementStatus")}
                            className="cursor-pointer"
                          >
                            Stock movements
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
                ) : null}

                {hotelInventory ? (
                <Collapsible
                  defaultOpen={PAYMENT_VAT_VIEWS.includes(activeView)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={HOTEL_INVENTORY_COPY.paymentAndTax}
                        size="lg"
                        className="h-10 cursor-pointer text-[13px]"
                        isActive={PAYMENT_VAT_VIEWS.includes(activeView)}
                      >
                        <Receipt className="opacity-80" />
                        <span className="truncate">Payment &amp; tax</span>
                        <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={activeView === "PaymentCredit"}
                            onClick={() => setActiveView("PaymentCredit")}
                            className="cursor-pointer"
                          >
                            Credit vouchers
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={activeView === "PaymentPaid"}
                            onClick={() => setActiveView("PaymentPaid")}
                            className="cursor-pointer"
                          >
                            Paid receiving
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={activeView === "PaymentWithVat"}
                            onClick={() => setActiveView("PaymentWithVat")}
                            className="cursor-pointer"
                          >
                            With VAT
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={activeView === "PaymentWithoutVat"}
                            onClick={() => setActiveView("PaymentWithoutVat")}
                            className="cursor-pointer"
                          >
                            Without VAT
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
                ) : null}
              </SidebarMenu>
            </SidebarContent>
          <SidebarFooter className="p-4 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              onClick={() => logoutAction()}
            >
              <span>Sign out</span>
            </Button>
          </SidebarFooter>
          </Sidebar>
          <SidebarInset className="flex min-h-svh flex-1 flex-col overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/20 md:m-2 md:ml-0 md:max-h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-border/80 md:bg-background md:shadow-lg md:ring-1 md:ring-black/5 dark:md:ring-white/10 py-4">
            <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center gap-2 border-b bg-background px-3 md:px-6">
              <SidebarTrigger />
              <div className="flex-1 min-w-0">
                <h1 className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider truncate">
                  {displayLabel}
                </h1>
              </div>
              <InventoryNotificationCenter
                audience={hotelInventory ? "hotel-store" : "cafe-store"}
                items={storeItem}
                purchaseRequests={
                  hotelInventory ? requestStatusData.myPurchases : undefined
                }
                stockMovements={
                  hotelInventory ? requestStatusData.myStocks : undefined
                }
                storeUserName={
                  hotelInventory ? requestStatusData.userName : undefined
                }
                hotelLodging={hotelInventory}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => loadData()}
                disabled={fetching}
                className={fetching ? "animate-spin" : ""}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8 border shadow-sm">
                <AvatarImage src={logoUrl || ""} alt={displayLabel} />
                <AvatarFallback>{displayLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </header>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/60 bg-muted/20">
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto px-2 py-5 sm:px-3 md:px-5 lg:px-6 md:py-6 scroll-smooth [scrollbar-gutter:stable]">
                <div className="mx-auto w-full max-w-none min-w-0 space-y-10 pb-10 xl:max-w-400 2xl:max-w-448">
                  {hotelInventory ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Card className="border-emerald-500/20 bg-linear-to-br from-card to-emerald-500/4 shadow-md overflow-hidden">
                      <div className="h-0.5 bg-linear-to-r from-emerald-500/80 to-teal-400/60" />
                      <CardHeader className="pb-2 pt-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                            <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <CardDescription>{HOTEL_INVENTORY_COPY.inventoryItems}</CardDescription>
                            <CardTitle className="text-3xl tabular-nums tracking-tight">
                              {uniqueInventoryCount}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              Unique items ({storeItem.length} registration lines)
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                    <Card className="border-violet-500/20 bg-linear-to-br from-card to-violet-500/5 shadow-md overflow-hidden">
                      <div className="h-0.5 bg-linear-to-r from-violet-500/70 to-indigo-400/50" />
                      <CardHeader className="pb-2 pt-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5">
                            <MinusCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <CardDescription>Status / inactive rows</CardDescription>
                            <CardTitle className="text-3xl tabular-nums tracking-tight">
                              {itemStatus.length}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              Tracked movements & inactive lines
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                  ) : null}
                  <StoreWorkspaceIntro
                    title={activeIntro.title}
                    description={activeIntro.description}
                    Icon={activeIntro.Icon}
                  />
                  {panels}
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
  );
}
export default function Store() {
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
      <StoreComponent hotelInventory={false} />
    </Suspense>
  );
}
