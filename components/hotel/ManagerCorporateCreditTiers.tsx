"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { toast } from "sonner";
import { formatCreditCycle } from "@/lib/creditCycleLabel";
import {
  createHotelCorporateCreditTierApi,
  deleteHotelCorporateCreditTierApi,
  fetchHotelCorporateCreditTiers,
  updateHotelCorporateCreditTierApi,
  type HotelCorporateCreditTierRow,
} from "@/lib/actions";
import {
  CAFE_CORPORATE_CREDIT_TIER_SORT_ORDER,
  CAFE_CREDIT_LEVELS,
  CAFE_CREDIT_TIMEFRAMES,
  cafeCorporateCreditTierFormSchema,
  HOTEL_CORPORATE_CREDIT_TIER_LEVELS,
  HOTEL_CORPORATE_CREDIT_TIER_SORT_ORDER,
  hotelCorporateCreditTierFormSchema,
  type CafeCreditLevel,
  type HotelCorporateCreditTierLevelName,
} from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  Coins,
  CreditCard,
  Edit,
  Loader2,
  Plus,
  Trash,
} from "lucide-react";

export function ManagerCorporateCreditTiers({
  variant = "hotel",
}: {
  /** Café admin: Bronze / Silver / Gold only (no Platinum). */
  variant?: "hotel" | "cafe";
}) {
  const isCafe = variant === "cafe";
  const tierLevels = isCafe
    ? CAFE_CREDIT_LEVELS
    : HOTEL_CORPORATE_CREDIT_TIER_LEVELS;
  const tierSortOrder = isCafe
    ? CAFE_CORPORATE_CREDIT_TIER_SORT_ORDER
    : HOTEL_CORPORATE_CREDIT_TIER_SORT_ORDER;
  const formSchema = isCafe
    ? cafeCorporateCreditTierFormSchema
    : hotelCorporateCreditTierFormSchema;
  type TierFormValues = z.infer<typeof formSchema>;

  const tierLevelSelectOptions = useMemo(
    () => tierLevels.map((level, idx) => ({ id: idx + 1, name: level })),
    [tierLevels],
  );

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HotelCorporateCreditTierRow[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingTierId, setDeletingTierId] = useState<number | null>(null);

  const form = useForm<TierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "Bronze",
      creditCeiling: 0,
      timeInterval: 0,
      timeFrame: "Daily",
      sortOrder: tierSortOrder.Bronze,
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHotelCorporateCreditTiers();
      setRows(data);
      return data;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not load tiers");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(
    () => (isCafe ? rows.filter((r) => r.name !== "Platinum") : rows),
    [rows, isCafe],
  );

  const resetToDefaults = useCallback(() => {
    setEditingId(null);
    form.reset({
      name: "Bronze",
      creditCeiling: 0,
      timeInterval: 0,
      timeFrame: "Daily",
      sortOrder: tierSortOrder.Bronze,
    });
  }, [form, tierSortOrder]);

  const onSubmit = async (values: TierFormValues) => {
    try {
      setSubmitting(true);
      if (!editingId && visibleRows.some((row) => row.name === values.name)) {
        toast.error("This credit level already exists");
        setSubmitting(false);
        return;
      }
      const sortOrder =
        tierSortOrder[values.name as keyof typeof tierSortOrder];
      if (editingId) {
        await updateHotelCorporateCreditTierApi({
          id: editingId,
          ...values,
          sortOrder,
        });
      } else {
        await createHotelCorporateCreditTierApi({ ...values, sortOrder });
      }
      const data = await fetchHotelCorporateCreditTiers();
      setRows(data);
      resetToDefaults();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (r: HotelCorporateCreditTierRow) => {
    setEditingId(r.id);
    const levelOk = (tierLevels as readonly string[]).includes(r.name);
    const tfOk = (CAFE_CREDIT_TIMEFRAMES as readonly string[]).includes(
      r.timeFrame,
    );
    form.reset({
      name: levelOk
        ? (r.name as TierFormValues["name"])
        : "Bronze",
      creditCeiling: r.creditCeiling,
      timeInterval: r.timeInterval,
      timeFrame: tfOk
        ? (r.timeFrame as TierFormValues["timeFrame"])
        : "Daily",
      sortOrder: levelOk
        ? tierSortOrder[r.name as keyof typeof tierSortOrder]
        : r.sortOrder,
    } satisfies TierFormValues);
  };

  const handleCancelEdit = () => {
    resetToDefaults();
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteHotelCorporateCreditTierApi(id);
      const data = await fetchHotelCorporateCreditTiers();
      setRows(data);
      if (editingId === id) resetToDefaults();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const timeframeOptions = CAFE_CREDIT_TIMEFRAMES.map((tf, idx) => ({
    id: idx + 1,
    name: tf,
  }));

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Platinum":
        return "text-cyan-600 border-cyan-500/20 bg-cyan-500/5";
      case "Gold":
        return "text-amber-500 border-amber-500/20 bg-amber-500/5";
      case "Silver":
        return "text-slate-400 border-slate-400/20 bg-slate-400/5";
      case "Bronze":
        return "text-orange-700 border-orange-700/20 bg-orange-700/5";
      default:
        return "text-primary border-primary/20 bg-primary/5";
    }
  };

  const sortedRows = useMemo(
    () =>
      [...visibleRows].sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [visibleRows],
  );

  return (
    <div className="space-y-8 p-1">
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Corporate credit tiers
              </CardTitle>
              <CardDescription>
                {isCafe
                  ? "Café only: Bronze, Silver, and Gold — Platinum is not used on café properties."
                  : "Hotel: Platinum, Gold, Silver, and Bronze corporate deal ceilings and reset cycles."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="mx-auto w-fit max-w-4xl rounded-xl border border-border/50 bg-muted/30 p-6">
            <h2 className="mb-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Plus className="h-4 w-4" />
              {editingId ? "Modify Tier" : "New Tier Configuration"}
            </h2>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                  <CustomFormField
                    name="name"
                    control={form.control}
                    fieldType={formFieldTypes.SELECT}
                    label="Tier Level"
                    listdisplay={tierLevelSelectOptions}
                    inputClassName="h-fit w-56 p-2"
                  />
                  <CustomFormField
                    name="creditCeiling"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Required Amount (ETB)"
                    type="number"
                    inputClassName="h-fit w-56 p-2"
                  />
                  <CustomFormField
                    name="timeInterval"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Time Interval"
                    type="number"
                    inputClassName="h-fit w-56 p-2"
                  />
                  <CustomFormField
                    name="timeFrame"
                    control={form.control}
                    fieldType={formFieldTypes.SELECT}
                    label="Time Frame"
                    listdisplay={timeframeOptions}
                    inputClassName="h-fit w-56 p-2"
                  />
                </div>

                <div className="flex flex-row-reverse flex-wrap justify-center gap-3 pt-2">
                  <PendingButton
                    type="submit"
                    className="flex-1 font-medium shadow-sm transition-all active:scale-95 md:w-48 md:flex-none"
                    pending={submitting}
                  >
                    {editingId ? "Save Changes" : "Create Level"}
                  </PendingButton>
                  {editingId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="flex-1 md:w-40 md:flex-none"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>

          <Separator className="opacity-50" />

          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold">Active Credit Tiers</h3>
              <p className="text-sm text-muted-foreground">
                {isCafe
                  ? "Bronze, Silver, and Gold only (no Platinum)"
                  : "Platinum, Gold, Silver, and Bronze for hotel cashier company deals"}
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-pulse text-muted-foreground">
                  Syncing tiers...
                </div>
              </div>
            ) : sortedRows.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed bg-muted/20 py-12 text-center">
                <p className="text-muted-foreground">
                  No credit tiers defined yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sortedRows.map((r) => (
                  <Card
                    key={r.id}
                    className={`group relative overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 ${getLevelColor(r.name).split(" ")[1]}`}
                  >
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-background"
                        type="button"
                        onClick={() => handleEdit(r)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            type="button"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete {r.name} Tier?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the credit requirements for this
                              level. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex justify-end gap-3 pt-4">
                            <AlertDialogCancel disabled={deletingTierId === r.id}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deletingTierId === r.id}
                              onClick={(e) => {
                                e.preventDefault();
                                void (async () => {
                                  setDeletingTierId(r.id);
                                  try {
                                    await handleDelete(r.id);
                                  } finally {
                                    setDeletingTierId(null);
                                  }
                                })();
                              }}
                            >
                              {deletingTierId === r.id ? (
                                <>
                                  <Loader2 className="size-4 animate-spin" />
                                  Deleting…
                                </>
                              ) : (
                                "Confirm Delete"
                              )}
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    <CardContent className="pt-8">
                      <div
                        className={`mb-4 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${getLevelColor(r.name)}`}
                      >
                        {r.name.toUpperCase()}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Coins className="h-4 w-4" />
                            Requirement
                          </div>
                          <span className="text-lg font-bold">
                            {Number(r.creditCeiling).toLocaleString()}{" "}
                            <small className="text-[10px] text-muted-foreground">
                              ETB
                            </small>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Cycle
                          </div>
                          <span className="font-medium">
                            {formatCreditCycle(r.timeInterval, r.timeFrame)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
