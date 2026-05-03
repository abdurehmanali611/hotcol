/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { ItemRegistrationSchema } from "@/lib/validations";
import { useForm } from "react-hook-form";
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
import { Suspense, useEffect, useState } from "react";
import {
  checkPityCashBalance,
  CreateItemRegistration,
  fetchItemRegistrations,
  fetchItemStatus,
  ItemRegistration,
  ItemStatus,
  uploadImage,
} from "@/lib/actions";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building,
  Edit,
  Loader2,
  MinusCircle,
  PackagePlus,
  RefreshCw,
  ShoppingCart,
  StoreIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import StoreItems from "../../StoreItems/page";
import Suppliers from "../../Suppliers/page";
import Inactive from "../../Inactive/page";
import { Separator } from "@/components/ui/separator";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";

function StoreComponent() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<
    "Register" | "Active" | "Supplier" | "Inactive"
  >("Register");
  const [storeItem, setStoreItem] = useState<ItemRegistration[]>([]);
  const [itemStatus, setItemStatus] = useState<ItemStatus[]>([]);
  const searchedParams = useSearchParams();
  const { tenantScope, displayName } = useTenantScopeAndDisplay(
    searchedParams.get("hotel"),
  );
  const displayLabel = displayName || "Store Management";
  const logoUrl = searchedParams.get("logo");

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemData, itemStatusData] = await Promise.all([
        fetchItemRegistrations(),
        fetchItemStatus()
      ]);
       const response = itemData as ItemRegistration[];
       const statusResponse = itemStatusData as ItemStatus[];
      if (Array.isArray(response)) {
        const hotelItem = response.filter(
          (item) => item.HotelName === tenantScope,
        );
        setStoreItem(hotelItem);
      } else {
        setStoreItem([]);
      }
      if (Array.isArray(statusResponse)) {
        const hotelItem = statusResponse.filter((item) =>
          rowHotelMatchesTenantScope(item.HotelName, tenantScope),
        );
        setItemStatus(hotelItem);
      } else {
        setItemStatus([]);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantScope]);

  const form = useForm<z.infer<typeof ItemRegistrationSchema>>({
    resolver: zodResolver(ItemRegistrationSchema),
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
      supplierLevel: "Bronze",
      paidAmount: 0,
      HotelName: tenantScope || "",
    },
  });

  useEffect(() => {
    if (tenantScope) {
      form.setValue("HotelName", tenantScope);
    }
  }, [tenantScope, form]);

  const onSubmit = async (values: z.infer<typeof ItemRegistrationSchema>) => {
    try {
      setLoading(true)
      const hasEnoughPityCash = await checkPityCashBalance(
        values.HotelName,
        values.amount * values.unitPrice + values.dutyFee,
      );
      if (!hasEnoughPityCash) {
        toast.error("Insufficient Petty Cash balance");
        return;
      }
      await CreateItemRegistration(values);
      toast.success("Item created successfully!");
      form.reset();
      setPreviewUrl(null);
      loadData();
    } catch (error: any) {
      toast.error(`Failed to create Item: ${error.message}`);
    } finally {
      setLoading(false)
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col gap-6 pb-10">
      {/* Header with glassmorphism optimized for dark mode */}
      <header className="bg-background/60 backdrop-blur-xl border-b border-border sticky top-0 z-30 transition-all">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row md:h-24 py-4 md:py-0 items-center justify-between gap-6">
            <div className="flex items-center gap-5">
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
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold tracking-tight leading-tight">
                  {displayLabel}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/20">
                    Inventory Terminal
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadData()}
                disabled={loading}
                className="rounded-full h-10 w-10 border-border hover:bg-accent"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
              </Button>
              
              <Tabs
                value={activeView}
                onValueChange={(v) =>
                  setActiveView(v as "Register" | "Active" | "Supplier" | "Inactive")
                }
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
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 w-full">
        {activeView === "Register" ? (
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
                        listdisplay={[
                          { id: 1, name: "Litre" },
                          { id: 2, name: "Kilogram" },
                          { id: 3, name: "Piece" },
                          { id: 4, name: "Packet" },
                          { id: 5, name: "Dozen" },
                          { id: 6, name: "Other" },
                        ]}
                        inputClassName="h-fit p-2 w-56"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <CustomFormField
                        name="unitPrice"
                        control={form.control}
                        fieldType={formFieldTypes.INPUT}
                        label="Unit Price"
                        type="number"
                        inputClassName="h-fit p-2 w-56"
                      />
                      <CustomFormField
                        name="dutyFee"
                        control={form.control}
                        fieldType={formFieldTypes.INPUT}
                        label="Duty Fee"
                        type="number"
                        inputClassName="h-fit p-2 w-56"
                      />
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
                      <div className="flex-1 w-full">
                        <CustomFormField
                          name="supplierLevel"
                          control={form.control}
                          fieldType={formFieldTypes.RADIO_BUTTON}
                          label="Supplier Tier"
                          listdisplay={["Bronze", "Silver", "Gold"]}
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

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 text-base font-bold shadow-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-[0.99] disabled:opacity-70"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin h-5 w-5" />
                        <span>Saving Item...</span>
                      </div>
                    ) : (
                      "Register Item into Inventory"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : activeView === "Active" ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <StoreItems items={storeItem} />
          </div>
        ) : activeView === "Inactive" ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <Inactive items={itemStatus} admin={false} hotelName={tenantScope}/>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <Suppliers items={storeItem}/>
          </div>
        )}
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
        <StoreComponent />
      </Suspense>
    );
}