/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import z from "zod";
import { pityCashSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "./ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { Button } from "./ui/button";
import { PendingButton } from "./ui/pending-button";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CreatePityCash,
  DeletePityCash,
  fetchPityCash,
  UpdatePityCash,
  ItemRegistration,
  fetchItemRegistrations,
  pityCash as PityCashType,
  fetchItemStatus,
  ItemStatus,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { toast } from "sonner";
import { Trash, Wallet, ArrowUpRight, BadgeCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import StoreItems from "@/app/StoreItems/page";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import Inactive from "@/app/Inactive/page";

interface AdminInventoryProps {
  hotelName: string;
  refreshSignal?: number;
}

const AdminInventory = ({ hotelName, refreshSignal = 0 }: AdminInventoryProps) => {
  const [displayName, setDisplayName] = useState(hotelName);
  const [loading, setLoading] = useState(false);
  const [resettingBalance, setResettingBalance] = useState(false);
  const [pityCashSummary, setPityCashSummary] = useState<PityCashType | null>(
    null,
  );
  const [fetchedItems, setFetchedItems] = useState<ItemRegistration[]>([]);
  const [fetchedItemStatus, setFetchedItemStatus] = useState<ItemStatus[]>([]);
  const [activeTab, setActiveTab] = useState<"Items" | "ItemsStatus">("Items");

  const form = useForm<z.infer<typeof pityCashSchema>>({
    resolver: zodResolver(pityCashSchema),
    defaultValues: {
      amount: 0,
      startDate: new Date(),
      endDate: new Date(),
      HotelName: hotelName,
    },
  });

  const loadData = async () => {
    try {
      const [cashData, itemData, itemStatusData] = await Promise.all([
        fetchPityCash(),
        fetchItemRegistrations(),
        fetchItemStatus(),
      ]);

      if (Array.isArray(cashData)) {
        const hotelPityCash = cashData.find(
          (item) => rowHotelMatchesTenantScope(item.HotelName, hotelName),
        );
        setPityCashSummary(hotelPityCash || null);
        if (hotelPityCash) {
          form.reset({
            amount: hotelPityCash.amount,
            startDate: new Date(hotelPityCash.startDate),
            endDate: new Date(hotelPityCash.endDate),
            HotelName: hotelName,
          });
        }
      }

      if (Array.isArray(itemData)) {
        setFetchedItems(
          itemData.filter((item) => rowHotelMatchesTenantScope(item.HotelName, hotelName)),
        );
      }
      if (Array.isArray(itemStatusData)) {
        setFetchedItemStatus(
          itemStatusData.filter((item) => rowHotelMatchesTenantScope(item.HotelName, hotelName)),
        );
      }
    } catch (error: any) {
      toast.error("Failed to sync inventory data.");
      console.error("Error loading data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, [hotelName, form, refreshSignal]);

  useEffect(() => {
    const d = localStorage.getItem("hotel_display_name")?.trim();
    if (d) setDisplayName(d);
  }, []);

  const onSubmit = async (values: z.infer<typeof pityCashSchema>) => {
    try {
      setLoading(true);
      if (pityCashSummary) {
        await UpdatePityCash({ ...values, id: pityCashSummary.id });
      } else {
        await CreatePityCash(values);
      }
      toast.success("Financial records synchronized");
      const response = await fetchPityCash();
      if (Array.isArray(response)) {
        const hotelPityCash = response.find(
          (item) => rowHotelMatchesTenantScope(item.HotelName, hotelName),
        );
        setPityCashSummary(hotelPityCash ?? null);
      } else {
        setPityCashSummary(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) =>
    date
      ? new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "---";

  return (
    <div className="space-y-8 p-1">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Inventory & Liquidity
        </h1>
        <p className="text-muted-foreground">
          Manage {displayName}&apos;s petty cash and supplier stock cycles.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* FORM SECTION */}
        <Card className="xl:col-span-7 border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <BadgeCheck size={20} />
              <CardTitle className="text-lg">Update Records</CardTitle>
            </div>
            <CardDescription>
              Adjust available cash and operational date ranges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 flex flex-col items-center"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <CustomFormField
                    name="startDate"
                    control={form.control}
                    fieldType={formFieldTypes.CALENDAR}
                    label="Cycle Start"
                    inputClassName="h-fit p-2 w-42"
                  />
                  <CustomFormField
                    name="endDate"
                    control={form.control}
                    fieldType={formFieldTypes.CALENDAR}
                    label="Cycle End"
                    inputClassName="h-fit p-2 w-42"
                  />
                </div>
                <CustomFormField
                  name="amount"
                  control={form.control}
                  fieldType={formFieldTypes.INPUT}
                  label="Available Amount (ETB)"
                  type="number"
                  placeholder="0.00"
                  inputClassName="h-fit p-2 w-56"
                />
                <PendingButton
                  type="submit"
                  pending={loading}
                  className="w-full md:w-auto px-8 bg-primary hover:opacity-90 shadow-lg shadow-primary/20"
                >
                  {loading
                    ? "Syncing…"
                    : pityCashSummary
                      ? "Save Changes"
                      : "Initialize Liquidity"}
                </PendingButton>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* CASH DISPLAY CARD */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-linear-to-r from-primary to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-zinc-950 rounded-2xl p-8 border border-white/10 overflow-hidden shadow-2xl min-h-70 flex flex-col justify-between">
              {/* Background Pattern */}
              <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/10 rounded-full blur-3xl" />

              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Live Liquidity
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm font-medium">
                    {displayName} Admin Card
                  </p>
                </div>
                <Wallet className="text-white/20" size={32} />
              </div>

              <div className="relative z-10 my-6">
                <span className="text-zinc-500 text-xs font-mono mb-1 block uppercase tracking-widest">
                  Total Balance
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-zinc-400 text-xl font-light">ETB</span>
                  <h2 className="text-5xl font-bold tracking-tighter text-white">
                    {pityCashSummary?.amount?.toLocaleString() ?? "0.00"}
                  </h2>
                </div>
              </div>

              <div className="relative z-10 pt-6 border-t border-white/5 flex justify-between items-end">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1">
                      Starts
                    </p>
                    <p className="text-sm font-medium text-zinc-200">
                      {formatDate(pityCashSummary?.startDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1">
                      Ends
                    </p>
                    <p className="text-sm font-medium text-zinc-200">
                      {formatDate(pityCashSummary?.endDate)}
                    </p>
                  </div>
                </div>

                {pityCashSummary && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 gap-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 md:h-8 md:w-8 md:px-0"
                      >
                        <Trash size={16} />
                        <span className="text-xs font-medium md:sr-only">
                          Reset
                        </span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This will wipe the current cash records for{" "}
                          {displayName}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-zinc-700 hover:bg-zinc-800">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 gap-2"
                          disabled={resettingBalance}
                          onClick={async (e) => {
                            e.preventDefault();
                            setResettingBalance(true);
                            try {
                              await DeletePityCash(pityCashSummary.id);
                              const response = await fetchPityCash();
                              if (Array.isArray(response)) {
                                const hotelPityCash = response.find(
                                  (item) =>
                                    rowHotelMatchesTenantScope(
                                      item.HotelName,
                                      hotelName,
                                    ),
                                );
                                setPityCashSummary(hotelPityCash ?? null);
                              } else {
                                setPityCashSummary(null);
                              }
                              form.reset({
                                amount: 0,
                                startDate: new Date(),
                                endDate: new Date(),
                                HotelName: hotelName,
                              });
                              toast.success("Petty cash balance reset");
                            } catch (error: any) {
                              toast.error(
                                error?.message || "Failed to reset balance",
                              );
                            } finally {
                              setResettingBalance(false);
                            }
                          }}
                        >
                          {resettingBalance ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Resetting…
                            </>
                          ) : (
                            "Reset Balance"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-background rounded-lg border shadow-sm">
              <ArrowUpRight size={18} className="text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Quick Report</p>
              <p className="text-muted-foreground text-xs italic">
                Last sync: Just now
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <section className="mt-12 space-y-6">
        <div className="flex items-center justify-between">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "Items" | "ItemsStatus")}
            className="w-full"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <TabsList className="bg-muted/50 p-1 h-auto">
                <TabsTrigger
                  value="Items"
                  className="px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Inventory Items
                </TabsTrigger>
                <TabsTrigger
                  value="ItemsStatus"
                  className="px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Usage Status
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <div className="h-8 w-px bg-border mx-2 hidden md:block" />
                <span className="text-xs font-medium text-muted-foreground">
                  Showing{" "}
                  {activeTab === "Items"
                    ? fetchedItems.length
                    : fetchedItemStatus.length}{" "}
                  records
                </span>
              </div>
            </div>

            <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {activeTab === "Items" ? (
                <StoreItems
                  items={fetchedItems}
                  embedded
                  tenantScope={hotelName}
                  adminEditDelete
                  aggregateInventory={false}
                />
              ) : (
                <Inactive
                  items={fetchedItemStatus}
                  admin={false}
                  hotelName={hotelName}
                />
              )}
            </div>
          </Tabs>
        </div>
      </section>
    </div>
  );
};

export default AdminInventory;
