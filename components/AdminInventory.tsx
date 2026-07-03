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
import { Form, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Button } from "./ui/button";
import { PendingButton } from "./ui/pending-button";
import { Input } from "./ui/input";
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
import { Trash, Wallet, BadgeCheck } from "lucide-react";
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
import { StoreInventorySummaryRow } from "@/components/store/StoreInventorySummaryRow";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import Inactive from "@/app/Inactive/page";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import {
  HotelFormFieldStack,
  HotelFormSection,
} from "@/components/hotel/HotelTerminalInitFormLayout";
import { parseYmdToDate, toYmdLocal } from "@/lib/hotelDateYmd";

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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        <Card className="xl:col-span-7 overflow-hidden border-primary/15 bg-card/95 shadow-md h-full">
          <div className="h-1 bg-linear-to-r from-primary/80 via-cyan-500/50 to-emerald-500/40" />
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary">
              <BadgeCheck className="h-5 w-5" />
              <CardTitle className="text-lg">Petty cash settings</CardTitle>
            </div>
            <CardDescription className="text-pretty">
              Set the cash available for store stock-in and the active cycle dates.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col"
              >
                <HotelFormSection
                  title="Cycle & balance"
                  description="Store staff can only register paid stock while petty cash is active for this period."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <HotelDayPicker
                            label="Cycle start"
                            id="pity-cash-start"
                            value={
                              field.value
                                ? toYmdLocal(new Date(field.value))
                                : ""
                            }
                            onChange={(ymd) => {
                              const next = parseYmdToDate(ymd);
                              if (next) field.onChange(next);
                            }}
                            compact
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <HotelDayPicker
                            label="Cycle end"
                            id="pity-cash-end"
                            value={
                              field.value
                                ? toYmdLocal(new Date(field.value))
                                : ""
                            }
                            onChange={(ymd) => {
                              const next = parseYmdToDate(ymd);
                              if (next) field.onChange(next);
                            }}
                            compact
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <HotelFormFieldStack>
                          <FormLabel htmlFor="pity-cash-amount">
                            Available amount (ETB)
                          </FormLabel>
                          <Input
                            id="pity-cash-amount"
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            className="h-10 w-full"
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value) || 0)
                            }
                          />
                        </HotelFormFieldStack>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </HotelFormSection>

                <div className="mt-8 border-t border-border/60 pt-6 pb-6">
                  <PendingButton
                    type="submit"
                    pending={loading}
                    className="h-11 w-full text-base font-semibold shadow-md"
                  >
                    {loading
                      ? "Saving…"
                      : pityCashSummary
                        ? "Save changes"
                        : "Initialize petty cash"}
                  </PendingButton>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-5 border-amber-500/25 bg-card/95 shadow-md overflow-hidden h-full flex flex-col">
          <div className="h-1 bg-linear-to-r from-amber-500/80 to-orange-400/60" />
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Wallet className="h-5 w-5 shrink-0" />
                  <CardTitle className="text-lg">Current balance</CardTitle>
                </div>
                <CardDescription className="mt-1 text-pretty">
                  {displayName}
                </CardDescription>
              </div>
              {pityCashSummary ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Not set
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-5 pb-6">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Total balance
              </p>
              <p className="text-4xl sm:text-[2.75rem] font-bold tabular-nums tracking-tight leading-none">
                ETB {pityCashSummary?.amount?.toLocaleString() ?? "0"}
              </p>
              {!pityCashSummary ? (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  Initialize petty cash on the left to enable paid stock-in at the
                  store terminal.
                </p>
              ) : null}
            </div>

            <HotelFormSection
              title="Active cycle"
              description="Dates currently saved for this property."
              className="flex-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                  <p className="text-xs text-muted-foreground mb-1">Cycle starts</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatDate(pityCashSummary?.startDate)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                  <p className="text-xs text-muted-foreground mb-1">Cycle ends</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatDate(pityCashSummary?.endDate)}
                  </p>
                </div>
              </div>
            </HotelFormSection>

            {pityCashSummary ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full border-destructive/35 text-destructive hover:bg-destructive/10"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Reset balance
                  </Button>
                </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Reset petty cash balance?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will wipe the current cash records for{" "}
                          {displayName}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
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
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* TABLE SECTION */}
      <section className="mt-10 space-y-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Inventory snapshot</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live stock and movement history for this property.
          </p>
        </div>
        <StoreInventorySummaryRow
          items={fetchedItems}
          movementCount={fetchedItemStatus.length}
        />
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
                  showPaymentSummary={false}
                  movementCount={fetchedItemStatus.length}
                  pettyCashBalance={
                    pityCashSummary != null
                      ? Number(pityCashSummary.amount) || 0
                      : null
                  }
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
