"use client";
import { ItemRegistrationSchema } from "@/lib/validations";
import { useForm, type Resolver } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  checkPityCashBalance,
  CreateItemRegistration,
  fetchItemRegistrations,
  fetchItemStatus,
  fetchPurchaseRequests,
  ItemRegistration,
  ItemStatus,
  logoutAction,
  uploadImage,
  type PurchaseRequestRow,
  type StockOutRequestRow,
} from "@/lib/actions";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { useLoadCoordinator } from "@/hooks/useLoadCoordinator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building,
  ClipboardList,
  Edit,
  Loader2,
  MinusCircle,
  PackagePlus,
  Receipt,
  RefreshCw,
  Send,
  ShoppingCart,
  StoreIcon,
} from "lucide-react";
import PurchaseRequestsTab from "@/components/hotel/PurchaseRequestsTab";
import StoreRequestStatusTab from "@/components/hotel/StoreRequestStatusTab";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import StoreItems from "../../StoreItems/page";
import Suppliers from "../../Suppliers/page";
import Inactive from "../../Inactive/page";
import { Separator } from "@/components/ui/separator";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import {
  computeInventoryPaidAmountETB,
} from "@/lib/hotelInventoryPayment";
import {
  effectiveTenantScopeForHotelTerminal,
  normalizeInventoryItemName,
  rowHotelMatchesTenantScope,
} from "@/lib/tenantRowMatch";
import { HOTEL_INVENTORY_COPY } from "@/lib/hotelDisplayLabels";
import { HotelInventoryPaymentVatPanel } from "@/components/hotel/HotelInventoryPaymentVatPanel";
import { INVENTORY_UNIT_SELECT_OPTIONS } from "@/lib/inventoryUnits";

type StoreView =
  | "Register"
  | "Active"
  | "Supplier"
  | "Inactive"
  | "Purchases"
  | "RequestStatus"
  | "PaymentVat";

const HOTEL_STORE_NAV: {
  id: StoreView;
  label: string;
  icon: typeof PackagePlus;
}[] = [
  { id: "Register", label: "Register", icon: PackagePlus },
  { id: "Active", label: "Inventory", icon: ShoppingCart },
  { id: "Inactive", label: "Inactive", icon: MinusCircle },
  { id: "Supplier", label: "Suppliers", icon: StoreIcon },
  { id: "Purchases", label: "Purchase pipeline", icon: Send },
  { id: "RequestStatus", label: "Request status", icon: ClipboardList },
  { id: "PaymentVat", label: "Inventory payment & tax", icon: Receipt },
];

export function StoreComponent({
  hotelInventory = false,
}: {
  hotelInventory?: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [requestStatusSeed, setRequestStatusSeed] = useState(0);
  const [pendingLocalStockRows, setPendingLocalStockRows] = useState<
    StockOutRequestRow[]
  >([]);
  const [pendingLocalPurchaseRows, setPendingLocalPurchaseRows] = useState<
    PurchaseRequestRow[]
  >([]);
  const { isPending, run } = useConcurrentActions();
  const loadCoordinator = useLoadCoordinator();
  const registerSubmitKey = "item-registration";
  const [activeView, setActiveView] = useState<StoreView>("Register");
  const [storeItem, setStoreItem] = useState<ItemRegistration[]>([]);
  const [itemStatus, setItemStatus] = useState<ItemStatus[]>([]);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRequestRow[]>([]);
  const searchedParams = useSearchParams();
  const { tenantScope, displayName } = useTenantScopeAndDisplay(
    searchedParams.get("hotel"),
  );
  const displayLabel = displayName || "Store Management";
  const logoUrl = searchedParams.get("logo");

  const loadData = useCallback(async () => {
    await loadCoordinator.run(async (isStale) => {
      setFetching(true);
      try {
        const tenantEff = effectiveTenantScopeForHotelTerminal(tenantScope, {
          requireHotelTerminal: hotelInventory,
        });
        const [itemData, itemStatusData, prData] = await Promise.all([
          fetchItemRegistrations(),
          fetchItemStatus(),
          hotelInventory ? fetchPurchaseRequests() : Promise.resolve([]),
        ]);
        if (isStale()) return;
        const response = itemData as ItemRegistration[];
        const statusResponse = itemStatusData as ItemStatus[];
        if (Array.isArray(response)) {
          const hotelItem = hotelInventory
            ? response.filter((item) =>
                rowHotelMatchesTenantScope(item.HotelName, tenantEff),
              )
            : response.filter((item) => item.HotelName === tenantScope);
          setStoreItem(hotelItem);
        } else {
          setStoreItem([]);
        }
        if (Array.isArray(statusResponse)) {
          const hotelItem = hotelInventory
            ? statusResponse.filter((item) =>
                rowHotelMatchesTenantScope(item.HotelName, tenantEff),
              )
            : statusResponse.filter((item) =>
                rowHotelMatchesTenantScope(item.HotelName, tenantScope),
              );
          setItemStatus(hotelItem);
        } else {
          setItemStatus([]);
        }
        if (hotelInventory && Array.isArray(prData)) {
          setPurchaseRows(
            (prData as PurchaseRequestRow[]).filter((p) =>
              rowHotelMatchesTenantScope(p.HotelName, tenantEff),
            ),
          );
        } else {
          setPurchaseRows([]);
        }
      } catch {
        if (!isStale()) toast.error("Failed to load data");
      } finally {
        if (!isStale()) setFetching(false);
      }
    });
  }, [hotelInventory, tenantScope, loadCoordinator]);

  const refreshPurchasesOnly = useCallback(async () => {
    if (!hotelInventory) return;
    await loadCoordinator.run(async (isStale) => {
      try {
        const prData = await fetchPurchaseRequests();
        if (isStale()) return;
        setPurchaseRows(
          (prData as PurchaseRequestRow[]).filter((p) =>
            rowHotelMatchesTenantScope(p.HotelName, tenantScope),
          ),
        );
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

  useEffect(() => {
    void loadData();
  }, [loadData]);

  type ItemRegForm = z.infer<typeof ItemRegistrationSchema>;
  const form = useForm<ItemRegForm>({
    resolver: zodResolver(ItemRegistrationSchema) as Resolver<ItemRegForm>,
    defaultValues: {
      name: "",
      imageUrl: "",
      category: "Food",
      amount: 0,
      measuredBy: "Litre",
      unitPrice: 0,
      registrationDate: new Date(),
      expireDate: new Date(),
      dutyFee: 0,
      supplierName: "",
      supplierPhone: "",
      Address: "",
      supplierLevel: "",
      purchaseWithVat: true,
      supplierTinNumber: "",
      paidAmount: 0,
      HotelName: tenantScope || "",
    },
  });

  useEffect(() => {
    if (tenantScope) {
      form.setValue("HotelName", tenantScope);
    }
  }, [tenantScope, form]);

  useEffect(() => {
    if (hotelInventory) {
      form.setValue("dutyFee", 0);
    }
  }, [hotelInventory, form]);

  const watchedAmount = form.watch("amount");
  const watchedUnitPrice = form.watch("unitPrice");
  const watchedPurchaseWithVat = form.watch("purchaseWithVat");
  const lastAutoPaidAmountRef = useRef<number | null>(null);

  useEffect(() => {
    const paidAmount = computeInventoryPaidAmountETB(
      watchedAmount,
      watchedUnitPrice,
      watchedPurchaseWithVat,
    );
    const currentPaidAmount = Number(form.getValues("paidAmount")) || 0;
    const paidAmountState = form.getFieldState("paidAmount");
    const canAutoSync =
      !paidAmountState.isDirty ||
      currentPaidAmount === lastAutoPaidAmountRef.current;

    if (canAutoSync) {
      form.setValue("paidAmount", paidAmount, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }

    lastAutoPaidAmountRef.current = paidAmount;
  }, [form, watchedAmount, watchedUnitPrice, watchedPurchaseWithVat]);

  const onSubmit = (values: ItemRegForm) => {
    void run(registerSubmitKey, async () => {
      try {
        const payload = hotelInventory ? { ...values, dutyFee: 0 } : values;
        const want = normalizeInventoryItemName(payload.name);
        if (want.length > 0) {
          const dup = storeItem.find(
            (it) =>
              rowHotelMatchesTenantScope(it.HotelName, tenantScope) &&
              normalizeInventoryItemName(it.name) === want,
          );
          if (dup) {
            toast.error(
              "The item already exists. You can edit it from the Inventory tab.",
            );
            return;
          }
        }
        if (!hotelInventory) {
          const totalCalc =
            computeInventoryPaidAmountETB(
              payload.amount,
              payload.unitPrice,
              payload.purchaseWithVat,
            ) + payload.dutyFee;
          const hasEnoughPityCash = await checkPityCashBalance(
            payload.HotelName,
            totalCalc,
          );
          if (!hasEnoughPityCash) {
            toast.error("Insufficient Petty Cash balance");
            return;
          }
        }
        await CreateItemRegistration(payload);
        toast.success("Item created successfully!");
        form.reset({
          ...form.getValues(),
          name: "",
          imageUrl: "",
          category: "Food",
          amount: 0,
          measuredBy: "Litre",
          unitPrice: 0,
          registrationDate: new Date(),
          expireDate: new Date(),
          dutyFee: 0,
          supplierName: "",
          supplierPhone: "",
          Address: "",
          supplierLevel: "",
          purchaseWithVat: true,
          supplierTinNumber: "",
          paidAmount: 0,
          HotelName: tenantScope || "",
        });
        setPreviewUrl(null);
        await loadData();
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : "Failed to create item";
        toast.error(`Failed to create Item: ${msg}`);
      }
    });
  };

  const storeWorkspaceIntro: Record<
    StoreView,
    { title: string; description: string; Icon: typeof PackagePlus }
  > = {
    Register: {
      title: "Register new items",
      description:
        "Create new inventory lines for this property. For hotels, duty fee is fixed to 0 to keep purchasing consistent.",
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
    RequestStatus: {
      title: "Request status",
      description:
        "Track purchase and movement requests end-to-end with the latest approval status.",
      Icon: ClipboardList,
    },
    PaymentVat: {
      title: HOTEL_INVENTORY_COPY.paymentAndTax,
      description:
        "Filter by supplier payment (credit or paid) and VAT, and download Excel for finance.",
      Icon: Receipt,
    },
  };

  const storeTerminalHeader = (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-xl shadow-sm transition-all supports-backdrop-filter:bg-background/75">
      <div className="w-full px-3 md:px-6">
        <div className="flex flex-col md:flex-row md:h-24 py-4 md:py-0 items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {hotelInventory && (
              <div className="-ml-1 mr-1 pr-3 flex items-center border-r border-border/60">
                <SidebarTrigger className="size-9 shrink-0 md:size-8" />
              </div>
            )}
            <div className="relative h-14 w-14 group">
              <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-md transition-transform group-hover:scale-105">
                <AvatarImage
                  src={logoUrl || ""}
                  alt={displayLabel}
                  className="object-cover"
                />
                <AvatarFallback className="bg-muted">
                  <Building className="text-muted-foreground h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 h-4 w-4 rounded-full border-2 border-background shadow-sm" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                <h1 className="text-2xl font-bold tracking-tight leading-tight truncate">
                  {displayLabel}
                </h1>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/20">
                  Inventory Terminal
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Register items, manage stock, and track requests
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadData()}
              disabled={fetching}
              className="rounded-full h-10 w-10 border-border hover:bg-accent"
            >
              <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin text-primary" : ""}`} />
            </Button>

            {!hotelInventory && (
              <Tabs
                value={activeView}
                onValueChange={(v) => setActiveView(v as StoreView)}
                className="w-auto"
              >
                <TabsList className="h-12 items-center bg-muted/50 p-1.5 rounded-xl border border-border">
                  <TabsTrigger value="Register" className="rounded-lg gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <PackagePlus size={16} />
                    <span className="hidden sm:inline">Register</span>
                  </TabsTrigger>
                  <TabsTrigger value="Active" className="rounded-lg gap-2 px-4 data-[state=active]:bg-background">
                    <ShoppingCart size={16} />
                    <span className="hidden sm:inline">Inventory</span>
                  </TabsTrigger>
                  <TabsTrigger value="Inactive" className="rounded-lg gap-2 px-4 data-[state=active]:bg-background">
                    <MinusCircle size={16} />
                    <span className="hidden sm:inline">Inactive</span>
                  </TabsTrigger>
                  <TabsTrigger value="Supplier" className="rounded-lg gap-2 px-4 data-[state=active]:bg-background">
                    <StoreIcon size={16} />
                    <span className="hidden sm:inline">Suppliers</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  const panels =
        activeView === "Register" ? (
          <Card className="max-w-5xl mx-auto shadow-2xl border-border bg-card overflow-hidden">
            <div className="h-1.5 bg-linear-to-r from-emerald-600 via-emerald-400 to-cyan-500" />
            <CardHeader className="pb-4 space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                  <PackagePlus className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Register New Item</CardTitle>
                  <CardDescription>Enter details to add stock to the central warehouse</CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator className="mx-6 w-auto bg-border/60" />
            <CardContent className="pt-8">
              <Form {...form}>
                <form
                  className="space-y-10"
                  onSubmit={form.handleSubmit(onSubmit)}
                >
                  <section className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <Edit className="h-3.5 w-3.5" /> Item Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <CustomFormField
                        name="name"
                        control={form.control}
                        fieldType={formFieldTypes.INPUT}
                        label="Item Name"
                        placeholder="e.g. Arabica Coffee"
                        inputClassName="h-fit p-2 w-56"
                      />
                      <CustomFormField
                        name="category"
                        control={form.control}
                        fieldType={formFieldTypes.SELECT}
                        label="Category"
                        listdisplay={[
                          { id: 1, name: "Food" },
                          { id: 2, name: "Beverage" },
                          { id: 3, name: "House Keeping" },
                          { id: 4, name: "Maintenance" },
                          { id: 5, name: "Office Supplies" },
                          { id: 6, name: "Others" },
                        ]}
                        inputClassName="h-fit p-2 w-56"
                      />
                      <CustomFormField
                        name="amount"
                        control={form.control}
                        fieldType={formFieldTypes.INPUT}
                        label="Quantity"
                        type="number"
                        inputClassName="h-fit p-2 w-56"
                      />
                      <CustomFormField
                        name="measuredBy"
                        control={form.control}
                        fieldType={formFieldTypes.SELECT}
                        label="Unit"
                        listdisplay={INVENTORY_UNIT_SELECT_OPTIONS.map((u) => ({
                          id: u.id,
                          name: u.name,
                        }))}
                        inputClassName="h-fit p-2 w-56"
                      />
                    </div>

                    <div
                      className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${hotelInventory ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
                    >
                      <CustomFormField
                        name="unitPrice"
                        control={form.control}
                        fieldType={formFieldTypes.INPUT}
                        label="Unit Price"
                        type="number"
                        inputClassName="h-fit p-2 w-56"
                      />
                      {!hotelInventory && (
                        <CustomFormField
                          name="dutyFee"
                          control={form.control}
                          fieldType={formFieldTypes.INPUT}
                          label="Duty Fee"
                          type="number"
                          inputClassName="h-fit p-2 w-56"
                        />
                      )}
                      <CustomFormField
                        name="registrationDate"
                        control={form.control}
                        fieldType={formFieldTypes.CALENDAR}
                        label="Date Received"
                        inputClassName="h-fit p-2 w-56 mx-0"
                      />
                      <CustomFormField
                        name="expireDate"
                        control={form.control}
                        fieldType={formFieldTypes.CALENDAR}
                        label="Expiry Date"
                        inputClassName="h-fit p-2 w-56 mx-0"
                      />
                    </div>
                  </section>

                  <div className="bg-muted/30 p-6 rounded-2xl border border-dashed border-border transition-colors hover:border-primary/50">
                    <CustomFormField
                      name="imageUrl"
                      control={form.control}
                      fieldType={formFieldTypes.IMAGE_UPLOADER}
                      label="Item Image"
                      previewUrl={previewUrl}
                      handleCloudinary={(result) =>
                        uploadImage(result, form, setPreviewUrl, "imageUrl")
                      }
                    />
                  </div>

                  <section className="space-y-6 pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <StoreIcon className="h-3.5 w-3.5" /> Supplier Logistics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-center">
                      <CustomFormField
                        name="supplierName"
                        control={form.control}
                        fieldType={formFieldTypes.INPUT}
                        label="Supplier Name"
                        placeholder="Company Name"
                        inputClassName="h-fit p-2 w-56"
                      />
                      <CustomFormField
                        name="supplierPhone"
                        control={form.control}
                        fieldType={formFieldTypes.PHONE_INPUT}
                        label="Phone Number"
                        inputClassName="h-fit p-2 w-64"
                      />
                      <CustomFormField
                        name="Address"
                        control={form.control}
                        fieldType={formFieldTypes.INPUT}
                        label="Address"
                        placeholder="Physical location"
                        inputClassName="h-fit p-2 w-56"
                      />
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 items-end bg-accent/30 p-6 rounded-xl border border-border">
                      <div className="flex-1 w-full space-y-4">
                        <CustomFormField
                          name="purchaseWithVat"
                          control={form.control}
                          fieldType={formFieldTypes.SWITCH}
                          label="Purchase price includes VAT"
                        />
                        <CustomFormField
                          name="supplierTinNumber"
                          control={form.control}
                          fieldType={formFieldTypes.INPUT}
                          label="Supplier TIN (tax ID)"
                          placeholder="e.g. 10-digit TIN"
                          inputClassName="h-fit p-2 w-full max-w-md"
                        />
                      </div>
                      <div className="w-full md:w-64">
                        <CustomFormField
                          name="paidAmount"
                          control={form.control}
                          fieldType={formFieldTypes.INPUT}
                          label="Amount Paid (ETB)"
                          type="number"
                          inputClassName="h-fit p-2 w-56"
                        />
                      </div>
                    </div>
                  </section>

                  <PendingButton
                    type="submit"
                    pending={isPending(registerSubmitKey)}
                    className="w-full h-14 text-base font-bold shadow-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-[0.99] disabled:opacity-70"
                  >
                    {isPending(registerSubmitKey)
                      ? "Saving Item..."
                      : "Register Item into Inventory"}
                  </PendingButton>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : activeView === "Active" ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <StoreItems
              items={storeItem}
              hotelStockApprovals={hotelInventory}
              tenantScope={tenantScope}
              showPaymentSummary={hotelInventory}
              onHotelStockRequestCreated={
                hotelInventory ? handleHotelStockRequestCreated : undefined
              }
            />
          </div>
        ) : activeView === "Purchases" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            <PurchaseRequestsTab
              tenantScope={tenantScope ?? ""}
              onCreated={handlePurchaseRequestCreated}
            />
          </div>
        ) : activeView === "RequestStatus" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <StoreRequestStatusTab
              refreshSignal={requestStatusSeed}
              injectedStockRows={
                hotelInventory ? pendingLocalStockRows : undefined
              }
              onClearInjectedStockIds={
                hotelInventory ? clearInjectedStockIds : undefined
              }
              injectedPurchaseRows={
                hotelInventory ? pendingLocalPurchaseRows : undefined
              }
              onClearInjectedPurchaseIds={
                hotelInventory ? clearInjectedPurchaseIds : undefined
              }
            />
          </div>
        ) : activeView === "PaymentVat" && hotelInventory ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 py-4">
            <HotelInventoryPaymentVatPanel
              tenantLabel={displayLabel}
              inventoryItems={storeItem}
              purchasePipeline={purchaseRows}
              inactiveItems={itemStatus}
            />
          </div>
        ) : activeView === "Inactive" ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <Inactive items={itemStatus} admin={false} hotelName={tenantScope}/>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <Suppliers items={storeItem}/>
          </div>
        );

  if (hotelInventory) {
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
                    Hotel store
                  </span>
                </div>
              </div>
            </SidebarHeader>
            <div className="shrink-0 px-3 pb-2 pt-3">
              <SidebarSeparator className="bg-sidebar-border/80" />
            </div>
            <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
              <SidebarMenu className="gap-1">
                {HOTEL_STORE_NAV.map(({ id, label, icon: Icon }) => (
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
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 md:px-6 md:py-6 scroll-smooth">
                <div className="mx-auto max-w-7xl space-y-10 pb-10">
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
                              {storeItem.length}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              Registered items for this property
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
                  {(() => {
                    const {
                      title,
                      description,
                      Icon: IntroIcon,
                    } = storeWorkspaceIntro[activeView];
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
                  {panels}
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col gap-6 pb-10">
      {storeTerminalHeader}
      <main className="p-3 md:p-6">
        <div className="mx-auto max-w-7xl w-full">
          {panels}
        </div>
      </main>
    </div>
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
