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
  fetchPityCash,
  ItemRegistration,
  ItemStatus,
  logoutAction,
  notifyApiFailure,
  type PurchaseRequestRow,
  type StockOutRequestRow,
} from "@/lib/actions";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLoadCoordinator } from "@/hooks/useLoadCoordinator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  MinusCircle,
  PackagePlus,
  Printer,
  Receipt,
  Send,
  ShoppingCart,
  StoreIcon,
} from "lucide-react";
import PurchaseRequestsTab from "@/components/hotel/PurchaseRequestsTab";
import { PurchaseRequestStatusPanel } from "@/components/hotel/PurchaseRequestStatusPanel";
import { StockMovementStatusPanel } from "@/components/hotel/StockMovementStatusPanel";
import { ItemRegistrationStatusPanel } from "@/components/hotel/ItemRegistrationStatusPanel";
import { StoreItemReceiptPrinting } from "@/components/hotel/StoreItemReceiptPrinting";
import { HotelInventoryPaymentCategoryPanel } from "@/components/hotel/HotelInventoryPaymentCategoryPanel";
import { useStoreRequestStatusData } from "@/components/hotel/useStoreRequestStatusData";
import { StoreRequestReviewPanel } from "@/components/hotel/StoreRequestReviewPanel";
import { BatchItemRegistrationForm } from "@/components/store/BatchItemRegistrationForm";
import { StoreInventoryOverview } from "@/components/store/StoreInventoryOverview";
import { InventoryNotificationCenter } from "@/components/inventory/InventoryNotificationCenter";
import { RefreshIconButton } from "@/components/ui/refresh-icon-button";
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
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { filterInventoryListRegistrations } from "@/lib/hotelApproval";
import {
  effectiveTenantScopeForHotelTerminal,
  rowHotelMatchesTenantScope,
  findRowByTenantScope,
} from "@/lib/tenantRowMatch";
import { HOTEL_INVENTORY_COPY } from "@/lib/hotelDisplayLabels";
import { HOTEL_STORE_FINANCE_VIEWS, tenantHasModule } from "@/lib/subscriptionModules";
import { useTenantModules } from "@/hooks/useTenantModules";
import {
  filterItemStatusForInventoryChannel,
  isLodgingStoreSession,
} from "@/lib/lodgingStoreContext";
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
  | "ReviewBeforeSend"
  | "Purchases"
  | "ReceiptPrinting"
  | "PurchaseRequestStatus"
  | "StockMovementStatus"
  | "ItemRegistrationStatus"
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
  { id: "ReviewBeforeSend", label: "Review before send", icon: ClipboardCheck },
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
  "ItemRegistrationStatus",
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
  useTenantRouteGuard({ role: "Store" });
  const router = useRouter();
  const [fetching, setFetching] = useState(false);
  const [requestStatusSeed, setRequestStatusSeed] = useState(0);
  const [reviewSeed, setReviewSeed] = useState(0);
  const [draftReviewCount, setDraftReviewCount] = useState(0);
  const [pendingLocalStockRows, setPendingLocalStockRows] = useState<
    StockOutRequestRow[]
  >([]);
  const [pendingLocalPurchaseRows, setPendingLocalPurchaseRows] = useState<
    PurchaseRequestRow[]
  >([]);
  const loadCoordinator = useLoadCoordinator();
  const [activeView, setActiveView] = useState<StoreView>("Register");
  const requestStatusActive = REQUEST_STATUS_VIEWS.includes(activeView);
  const paymentVatActive = PAYMENT_VAT_VIEWS.includes(activeView);
  const [storeItem, setStoreItem] = useState<ItemRegistration[]>([]);
  const [itemStatus, setItemStatus] = useState<ItemStatus[]>([]);
  const [pettyCashBalance, setPettyCashBalance] = useState<number | null>(null);
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

  useEffect(() => {
    const lodging = isLodgingStoreSession();
    const query = searchedParams.toString();
    const suffix = query ? `?${query}` : "";
    if (hotelInventory && !lodging) {
      toast.error("Hotel store is only for hotel, resort, and pension accounts.");
      router.replace(`/Store${suffix}`);
      return;
    }
    if (!hotelInventory && lodging) {
      toast.message("Opening hotel store terminal for your property.");
      router.replace(`/HotelStore${suffix}`);
    }
  }, [hotelInventory, router, searchedParams]);

  const scopedItemStatus = useMemo(
    () =>
      filterItemStatusForInventoryChannel(
        itemStatus,
        hotelInventory ? "lodging" : "cafe",
      ),
    [itemStatus, hotelInventory],
  );

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
            const scoped = Array.isArray(response)
              ? response.filter((item) =>
                  rowHotelMatchesTenantScope(item.HotelName, tenantEff),
                )
              : [];
            setStoreItem(filterInventoryListRegistrations(scoped));
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

        const [itemData, itemStatusData, cashData] = await Promise.all([
          fetchItemRegistrations(),
          fetchItemStatus(),
          fetchPityCash(),
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
        if (Array.isArray(cashData)) {
          const row = findRowByTenantScope(cashData, inventoryTenantKey || "");
          setPettyCashBalance(row ? Number(row.amount) || 0 : null);
        } else {
          setPettyCashBalance(null);
        }
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
        effectiveTenantScopeForHotelTerminal(tenantScope, {
          requireHotelTerminal: hotelInventory,
        });
        await fetchPurchaseRequests();
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

  const bumpReviewQueue = useCallback(() => {
    setReviewSeed((n) => n + 1);
  }, []);

  const goToReviewBeforeSend = useCallback(() => {
    setActiveView("ReviewBeforeSend");
    bumpReviewQueue();
  }, [bumpReviewQueue]);

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

  const statusDataEnabled =
    hotelInventory &&
    (REQUEST_STATUS_VIEWS.includes(activeView) ||
      activeView === "ReceiptPrinting");

  const requestStatusData = useStoreRequestStatusData({
    enabled: statusDataEnabled,
    tenantScope: inventoryTenantKey,
    refreshSignal: requestStatusSeed,
    injectedStockRows: hotelInventory ? pendingLocalStockRows : undefined,
    onClearInjectedStockIds: hotelInventory ? clearInjectedStockIds : undefined,
    injectedPurchaseRows: hotelInventory ? pendingLocalPurchaseRows : undefined,
    onClearInjectedPurchaseIds: hotelInventory
      ? clearInjectedPurchaseIds
      : undefined,
  });

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
    ReviewBeforeSend: {
      title: "Review before send",
      description:
        "Check purchase requests, stock movements, and registrations you submitted. Edit or delete mistakes, then send to cost control when correct.",
      Icon: ClipboardCheck,
    },
    Purchases: {
      title: HOTEL_INVENTORY_COPY.purchasePipeline,
      description:
        "Create purchase requests — they go to Review before send first, then to Cost Control after you confirm.",
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
    ItemRegistrationStatus: {
      title: "Item registration status",
      description:
        "Track item registrations you submitted through the approval pipeline.",
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

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!hotelInventory || requestStatusSeed === 0) return;
    void loadData();
  }, [hotelInventory, requestStatusSeed, loadData]);

  const handleItemsRegistered = useCallback(() => {
    void loadData();
    if (hotelInventory) {
      setRequestStatusSeed((n) => n + 1);
    }
  }, [loadData, hotelInventory]);

  const activeIntro = storeWorkspaceIntro[activeView];

  const tenantModules = useTenantModules();
  const hotelHasFinance = tenantHasModule(
    tenantModules,
    "Financial Management",
  );

  const storeNavTop = useMemo(() => {
    const base = hotelInventory ? HOTEL_STORE_NAV_TOP : CAFE_STORE_NAV_TOP;
    if (!hotelInventory || hotelHasFinance) return base;
    return base.filter((n) => !HOTEL_STORE_FINANCE_VIEWS.has(n.id));
  }, [hotelInventory, hotelHasFinance]);

  useEffect(() => {
    if (
      hotelInventory &&
      !hotelHasFinance &&
      HOTEL_STORE_FINANCE_VIEWS.has(activeView)
    ) {
      setActiveView("Register");
    }
  }, [activeView, hotelHasFinance, hotelInventory]);

  const panels =
        activeView === "Register" ? (
          <BatchItemRegistrationForm
            hotelName={inventoryTenantKey || tenantScope}
            hotelInventory={hotelInventory}
            onRegistered={handleItemsRegistered}
            onSubmittedForReview={
              hotelInventory ? goToReviewBeforeSend : undefined
            }
          />
        ) : activeView === "ReviewBeforeSend" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            <StoreRequestReviewPanel
              refreshSignal={reviewSeed}
              onDraftCountChange={setDraftReviewCount}
              tenantScope={inventoryTenantKey}
              injectedPurchaseRows={pendingLocalPurchaseRows}
              injectedStockRows={pendingLocalStockRows}
              onSubmitted={() => {
                setPendingLocalPurchaseRows([]);
                setPendingLocalStockRows([]);
                if (statusDataEnabled) {
                  setRequestStatusSeed((n) => n + 1);
                }
              }}
            />
          </div>
        ) : activeView === "Active" ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <StoreItems
              items={storeItem}
              hotelStockApprovals={hotelInventory}
              tenantScope={inventoryTenantKey}
              embedded
              showPaymentSummary={false}
              aggregateInventory={false}
              onExternalRefresh={handleItemsRegistered}
              onHotelStockRequestCreated={
                hotelInventory
                  ? (row) => {
                      handleHotelStockRequestCreated(row);
                      goToReviewBeforeSend();
                    }
                  : undefined
              }
            />
          </div>
        ) : activeView === "Purchases" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            <PurchaseRequestsTab
              tenantScope={inventoryTenantKey}
              onCreated={handlePurchaseRequestCreated}
              onSubmittedForReview={goToReviewBeforeSend}
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
              itemStatusHistory={hotelInventory ? itemStatus : undefined}
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
                propertyName={displayLabel}
                logoUrl={logoUrl}
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
              <StockMovementStatusPanel
                rows={requestStatusData.myStocks}
                propertyName={displayLabel}
                logoUrl={logoUrl}
                linkedInventory={storeItem}
                itemStatusHistory={itemStatus}
              />
            )}
          </div>
        ) : activeView === "ItemRegistrationStatus" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            {requestStatusData.initialLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-9 w-9 animate-spin text-primary" />
              </div>
            ) : (
              <ItemRegistrationStatusPanel
                rows={requestStatusData.myRegistrations}
                purchaseRequests={requestStatusData.myPurchases}
                showRegisteredBy
                propertyName={displayLabel}
                logoUrl={logoUrl}
              />
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
              items={scopedItemStatus}
              admin={false}
              hotelName={hotelInventory ? inventoryTenantKey : tenantScope}
              inventoryChannel={hotelInventory ? "lodging" : "cafe"}
              logoUrl={logoUrl}
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
                      <span className="flex-1 truncate">{label}</span>
                      {id === "ReviewBeforeSend" && draftReviewCount > 0 ? (
                        <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-amber-950 tabular-nums">
                          {draftReviewCount}
                        </span>
                      ) : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {hotelInventory && hotelHasFinance ? (
                <Collapsible
                  key={requestStatusActive ? "request-active" : "request-idle"}
                  defaultOpen={requestStatusActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Request status"
                        size="lg"
                        className="h-10 cursor-pointer text-[13px]"
                        isActive={requestStatusActive}
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
                            asChild
                            isActive={activeView === "PurchaseRequestStatus"}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveView("PurchaseRequestStatus")}
                              className="w-full"
                            >
                              Purchase requests
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={activeView === "StockMovementStatus"}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveView("StockMovementStatus")}
                              className="w-full"
                            >
                              Stock movements
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={activeView === "ItemRegistrationStatus"}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setActiveView("ItemRegistrationStatus")
                              }
                              className="w-full"
                            >
                              Item registrations
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
                ) : null}

                {hotelInventory && hotelHasFinance ? (
                <Collapsible
                  key={paymentVatActive ? "payment-active" : "payment-idle"}
                  defaultOpen={paymentVatActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={HOTEL_INVENTORY_COPY.paymentAndTax}
                        size="lg"
                        className="h-10 cursor-pointer text-[13px]"
                        isActive={paymentVatActive}
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
                            asChild
                            isActive={activeView === "PaymentCredit"}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveView("PaymentCredit")}
                              className="w-full"
                            >
                              Credit vouchers
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={activeView === "PaymentPaid"}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveView("PaymentPaid")}
                              className="w-full"
                            >
                              Paid receiving
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={activeView === "PaymentWithVat"}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveView("PaymentWithVat")}
                              className="w-full"
                            >
                              With VAT
                            </button>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={activeView === "PaymentWithoutVat"}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveView("PaymentWithoutVat")}
                              className="w-full"
                            >
                              Without VAT
                            </button>
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
              <RefreshIconButton
                busy={fetching}
                onClick={() => void loadData()}
              />
              <Avatar className="h-8 w-8 border shadow-sm">
                <AvatarImage src={logoUrl || ""} alt={displayLabel} />
                <AvatarFallback>{displayLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </header>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/60 bg-muted/20">
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto px-2 py-5 sm:px-3 md:px-5 lg:px-6 md:py-6 scroll-smooth [scrollbar-gutter:stable]">
                <div className="mx-auto w-full max-w-none min-w-0 space-y-10 pb-10 xl:max-w-400 2xl:max-w-448">
                  <StoreInventoryOverview
                    items={storeItem}
                    movementCount={scopedItemStatus.length}
                    pettyCashBalance={hotelInventory ? null : pettyCashBalance}
                    showPaymentBreakdown
                  />
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
