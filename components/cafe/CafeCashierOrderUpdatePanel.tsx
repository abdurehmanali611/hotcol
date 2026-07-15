"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  cancelLiveOrder,
  fetchTables,
  fetchWaiters,
  updateLiveOrder,
  type Item,
  type Order,
  type Table,
  type Waiter,
} from "@/lib/actions";
import {
  updateLiveOrderSchema,
  type UpdateLiveOrderFormValues,
} from "@/lib/validations";
import {
  buildEditTableSelectOptions,
  formatCafeTableDisplayFromRegistry,
  groupCafeOrderUpdateTables,
  isLiveOrderEditable,
  isOpenCafeOrder,
  normalizeOrderTableNo,
  occupiedTableNumbersFromOrders,
  orderStationLabel,
  orderToLiveEditFormValues,
  sumOpenTableOrdersETB,
  sumOrderLinesETB,
  tableCaptionForNo,
} from "@/lib/cafeTableOrder";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { CafeCashierAddItemsDialog } from "@/components/cafe/CafeCashierAddItemsDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardEdit,
  Clock,
  Coffee,
  Loader2,
  MousePointerClick,
  Plus,
  Search,
  Trash2,
  User,
  Utensils,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isRoomServiceTableNo } from "@/lib/lodgingRoomService";

interface Props {
  orders: Order[];
  items: Item[];
  hotelName: string;
  onRefresh: () => void | Promise<void>;
  /** After creating a line, select it once it appears in `orders`. */
  focusOrderId?: number | null;
  /** When set, only show / edit lines for this table (Payment portal embed). */
  restrictTableNo?: number;
  /** Compact layout without page-level search chrome. */
  embedded?: boolean;
  /** When set, only these table numbers (e.g. room-service stay tables). */
  restrictTableNos?: number[];
  /** Captions preferred over café table registry (e.g. "Rm 12 · Guest"). */
  tableCaptionOverrides?: Record<number, string>;
  /** Labeling for room-service lodging UI. */
  groupingNoun?: "table" | "room";
  /** Replaces café Add-items dialog (e.g. Reception room order section). */
  customAddItems?: ReactNode;
  /**
   * When set, treat lines as lodging bill rows (ids = bill line ids):
   * updates/removes go through these handlers instead of café live-order APIs.
   */
  lodgingLineHandlers?: {
    onUpdate: (input: {
      id: number;
      orderAmount: number;
      title: string;
    }) => Promise<void>;
    onRemove: (id: number) => Promise<void>;
  };
}

type AddItemsTarget = { tableNo: number; waiterName: string };

function formatOrderTime(createdAt: Date | string): string {
  return new Date(createdAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StationBadge({ order }: { order: Order }) {
  const station = orderStationLabel(order);
  const isBar = station === "Bar";
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 gap-1 px-1.5 text-[10px] font-medium",
        isBar
          ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
      )}
    >
      {isBar ? (
        <Coffee className="h-3 w-3" />
      ) : (
        <Utensils className="h-3 w-3" />
      )}
      {station}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isCompleted = status.toLowerCase() === "completed";
  return (
    <Badge
      className={cn(
        "h-5 gap-1 px-1.5 text-[10px]",
        isCompleted
          ? "bg-green-100 text-green-800 hover:bg-green-100"
          : "bg-amber-100 text-amber-900 hover:bg-amber-100",
      )}
    >
      {isCompleted ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {status}
    </Badge>
  );
}

export function CafeCashierOrderUpdatePanel({
  orders,
  items,
  hotelName,
  onRefresh,
  focusOrderId = null,
  restrictTableNo,
  embedded = false,
  restrictTableNos,
  tableCaptionOverrides,
  groupingNoun = "table",
  customAddItems,
  lodgingLineHandlers,
}: Props) {
  const isRoomScope = groupingNoun === "room";
  const useLodgingHandlers = Boolean(lodgingLineHandlers);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addItemsTarget, setAddItemsTarget] = useState<AddItemsTarget | null>(
    null,
  );
  const [sideTab, setSideTab] = useState<"edit" | "add">("edit");

  const editableOrders = useMemo(
    () =>
      [...orders]
        .filter((o) =>
          useLodgingHandlers
            ? rowHotelMatchesTenantScope(o.HotelName, hotelName) &&
              String(o.payment || "").toLowerCase() !== "paid" &&
              String(o.status || "").toLowerCase() !== "cancelled"
            : isLiveOrderEditable(o, hotelName),
        )
        .filter(
          (o) =>
            restrictTableNo == null ||
            normalizeOrderTableNo(o) === restrictTableNo,
        )
        .filter((o) => {
          if (restrictTableNos == null) return true;
          if (restrictTableNos.length === 0) return false;
          return restrictTableNos.includes(normalizeOrderTableNo(o));
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [
      orders,
      hotelName,
      restrictTableNo,
      restrictTableNos,
      useLodgingHandlers,
    ],
  );

  const openTableGroups = useMemo(() => {
    if (useLodgingHandlers) {
      const byTable = new Map<number, Order[]>();
      for (const o of editableOrders) {
        const key = normalizeOrderTableNo(o);
        const list = byTable.get(key);
        if (list) list.push(o);
        else byTable.set(key, [o]);
      }
      let groups = [...byTable.entries()]
        .sort(([a], [b]) => a - b)
        .map(([tableNo, tableOrders]) => {
          const sorted = [...tableOrders].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          return {
            tableNo,
            pendingOrders: sorted,
            waiterName:
              String(sorted[0]?.waiterName ?? "").trim() || "Reception",
            serviceCaption:
              sorted.find((o) => String(o.serviceCaption ?? "").trim())
                ?.serviceCaption ?? null,
          };
        });
      if (restrictTableNo != null) {
        groups = groups.filter((g) => g.tableNo === restrictTableNo);
      }
      if (restrictTableNos != null) {
        if (restrictTableNos.length === 0) return [];
        const allowed = new Set(restrictTableNos);
        groups = groups.filter((g) => allowed.has(g.tableNo));
      }
      return groups;
    }
    let groups = groupCafeOrderUpdateTables(orders, hotelName);
    if (restrictTableNo != null) {
      groups = groups.filter((g) => g.tableNo === restrictTableNo);
    }
    if (restrictTableNos != null) {
      if (restrictTableNos.length === 0) return [];
      const allowed = new Set(restrictTableNos);
      groups = groups.filter((g) => allowed.has(g.tableNo));
    }
    return groups;
  }, [
    orders,
    hotelName,
    restrictTableNo,
    restrictTableNos,
    useLodgingHandlers,
    editableOrders,
  ]);

  const resolveTableDisplay = (
    tableNo: number,
    serviceCaption?: string | null,
  ) => {
    const override = tableCaptionOverrides?.[Math.floor(Number(tableNo))];
    if (override) return override;
    return formatCafeTableDisplayFromRegistry(
      tableNo,
      tables,
      serviceCaption,
    );
  };

  const filteredTableGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return openTableGroups;
    return openTableGroups.filter((group) => {
      const tableLabel = resolveTableDisplay(
        group.tableNo,
        group.serviceCaption,
      );
      const openOnTable = useLodgingHandlers
        ? editableOrders.filter(
            (o) => normalizeOrderTableNo(o) === group.tableNo,
          )
        : orders.filter(
            (o) =>
              isOpenCafeOrder(o, hotelName) &&
              normalizeOrderTableNo(o) === group.tableNo,
          );
      const haystack = [
        tableLabel,
        group.waiterName,
        String(group.tableNo),
        group.serviceCaption,
        ...openOnTable.flatMap((order) => [
          order.title,
          order.waiterName,
          order.serviceCaption,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    openTableGroups,
    searchQuery,
    tables,
    orders,
    hotelName,
    tableCaptionOverrides,
    useLodgingHandlers,
    editableOrders,
  ]);

  const openTotal = useMemo(
    () =>
      useLodgingHandlers
        ? sumOrderLinesETB(editableOrders)
        : sumOrderLinesETB(
            orders.filter((o) => isOpenCafeOrder(o, hotelName)),
          ),
    [orders, hotelName, useLodgingHandlers, editableOrders],
  );

  const selectedOrder =
    editableOrders.find((o) => o.id === selectedId) ?? null;

  useEffect(() => {
    if (focusOrderId == null) return;
    const match = editableOrders.find((o) => o.id === focusOrderId);
    if (match) setSelectedId(focusOrderId);
  }, [focusOrderId, editableOrders]);

  const addContext: AddItemsTarget | null = useMemo(() => {
    if (selectedOrder) {
      return {
        tableNo: selectedOrder.tableNo,
        waiterName: selectedOrder.waiterName,
      };
    }
    return null;
  }, [selectedOrder]);

  const form = useForm<UpdateLiveOrderFormValues>({
    resolver: zodResolver(
      updateLiveOrderSchema,
    ) as Resolver<UpdateLiveOrderFormValues>,
  });

  useEffect(() => {
    if (!selectedOrder) return;
    form.reset(orderToLiveEditFormValues(selectedOrder));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-seed when the selected line changes
  }, [selectedOrder?.id, form]);

  useEffect(() => {
    if (customAddItems && openTableGroups.length === 0) {
      setSideTab("add");
    }
  }, [customAddItems, openTableGroups.length]);

  useEffect(() => {
    if (!hotelName) return;
    if (useLodgingHandlers) return;
    Promise.all([fetchTables(), fetchWaiters()])
      .then(([t, w]) => {
        setTables(
          t.filter((x) => rowHotelMatchesTenantScope(x.HotelName, hotelName)),
        );
        setWaiters(
          w.filter((x) => rowHotelMatchesTenantScope(x.HotelName, hotelName)),
        );
      })
      .catch(() => toast.error("Failed to load tables or waiters"));
  }, [hotelName, useLodgingHandlers]);

  useEffect(() => {
    if (
      selectedId != null &&
      !editableOrders.some((o) => o.id === selectedId)
    ) {
      setSelectedId(null);
    }
  }, [editableOrders, selectedId]);

  const occupied = useMemo(
    () =>
      occupiedTableNumbersFromOrders(orders, hotelName, selectedId ?? undefined),
    [orders, hotelName, selectedId],
  );

  const selectedTableNo = selectedOrder
    ? normalizeOrderTableNo(selectedOrder)
    : null;

  const tableOptions = useMemo(() => {
    if (selectedTableNo == null) return [];
    if (isRoomScope) {
      const nos =
        restrictTableNos && restrictTableNos.length > 0
          ? restrictTableNos
          : [selectedTableNo];
      return nos.map((n) => ({
        id: n,
        name:
          tableCaptionOverrides?.[n] ||
          (isRoomServiceTableNo(n)
            ? `Room service · stay ${n - 900_000}`
            : `Table ${n}`),
        realValue: n,
      }));
    }
    return buildEditTableSelectOptions(tables, occupied, selectedTableNo);
  }, [
    tables,
    occupied,
    selectedTableNo,
    isRoomScope,
    restrictTableNos,
    tableCaptionOverrides,
  ]);

  const waiterOptions = useMemo(() => {
    const base = waiters.map((w) => ({ id: w.id, name: w.name }));
    if (!selectedOrder) return base;
    const current = String(selectedOrder.waiterName ?? "").trim();
    if (!current || base.some((w) => w.name === current)) return base;
    return [{ id: -1, name: current }, ...base];
  }, [waiters, selectedOrder]);

  const selectOrder = (orderId: number) => {
    const order = editableOrders.find((o) => o.id === orderId);
    if (order) {
      form.reset(orderToLiveEditFormValues(order));
    }
    setSelectedId(orderId);
    setSideTab("edit");
  };

  const openAddItems = (tableNo: number, waiterName: string) => {
    if (customAddItems) {
      setSideTab("add");
      return;
    }
    setAddItemsTarget({ tableNo, waiterName });
  };

  const onInvalid = (errors: FieldErrors<UpdateLiveOrderFormValues>) => {
    const first = Object.values(errors)[0];
    toast.error(
      (first?.message as string) || "Please fix the highlighted fields",
    );
  };

  const onSubmit = async (values: UpdateLiveOrderFormValues) => {
    if (!selectedOrder) {
      toast.error("Select an order line to update");
      return;
    }
    setSaving(true);
    try {
      const prevQty = Math.max(1, Number(selectedOrder.orderAmount) || 1);
      if (lodgingLineHandlers) {
        await lodgingLineHandlers.onUpdate({
          id: values.id,
          orderAmount: values.orderAmount,
          title: values.title,
        });
        toast.success(
          values.orderAmount !== prevQty
            ? "Line updated"
            : "Order updated successfully",
        );
      } else {
        await updateLiveOrder(
          {
            id: values.id,
            tableNo: values.tableNo,
            waiterName: values.waiterName,
            orderAmount: values.orderAmount,
            title: values.title,
          },
          {
            successMessage:
              values.orderAmount !== prevQty
                ? "Order updated — kitchen/bar will see the new quantity"
                : "Order updated successfully",
          },
        );
      }
      await onRefresh();
    } catch (e) {
      if (lodgingLineHandlers) {
        toast.error(
          e instanceof Error ? e.message : "Could not update line",
        );
      }
      /* café update toasts in action */
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (orderId: number) => {
    setRemovingId(orderId);
    try {
      if (lodgingLineHandlers) {
        await lodgingLineHandlers.onRemove(orderId);
        toast.success("Line removed");
      } else {
        await cancelLiveOrder(orderId);
      }
      if (selectedId === orderId) setSelectedId(null);
      await onRefresh();
    } catch (e) {
      if (lodgingLineHandlers) {
        toast.error(
          e instanceof Error ? e.message : "Could not remove line",
        );
      }
      /* café cancel toasts in action */
    } finally {
      setRemovingId(null);
    }
  };

  if (openTableGroups.length === 0 && !customAddItems) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed bg-muted/30 text-center",
          embedded ? "px-4 py-8" : "py-14",
        )}
      >
        <ClipboardEdit className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h3 className="mb-1 text-base font-semibold">
          {restrictTableNo != null
            ? "No pending tickets"
            : isRoomScope
              ? "No open room orders"
              : "No open tables"}
        </h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {restrictTableNo != null
            ? isRoomScope
              ? "This room stay has no pending lines to edit."
              : "This table is ready. Use By order or By amount to take payment."
            : isRoomScope
              ? "Pending room service lines on active stays will show up here."
              : "Unpaid tables with pending tickets will show up here."}
        </p>
      </div>
    );
  }

  const tableScoped = restrictTableNo != null;
  const embeddedGroup = embedded && tableScoped ? openTableGroups[0] : null;
  const embeddedPending = embeddedGroup?.pendingOrders ?? [];
  const embeddedWaiter = embeddedGroup?.waiterName ?? "Self-Service";
  const embeddedTableTotal =
    embedded && restrictTableNo != null
      ? sumOpenTableOrdersETB(orders, hotelName, restrictTableNo)
      : 0;
  const embeddedDisplay =
    embedded && restrictTableNo != null
      ? resolveTableDisplay(
          restrictTableNo,
          embeddedGroup?.serviceCaption,
        )
      : "";

  if (embedded && restrictTableNo != null && embeddedGroup) {
    const allReady = embeddedPending.length === 0;

    return (
      <>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
            <div>
              <p className="text-lg font-semibold tracking-tight">
                {embeddedDisplay}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Waiter:{" "}
                <span className="font-medium text-foreground">
                  {embeddedWaiter}
                </span>
                {" · "}
                {allReady
                  ? "All ready"
                  : `${embeddedPending.length} pending`}
              </p>
            </div>
            <p className="text-xl font-bold tabular-nums">
              {embeddedTableTotal.toFixed(2)}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                ETB
              </span>
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold">Items</p>

              {allReady ? (
                <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
                  <p className="text-sm font-medium">Kitchen and bar finished</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add more items, or switch tab to pay.
                  </p>
                </div>
              ) : (
                <div className="max-h-[min(48vh,420px)] space-y-2 overflow-y-auto">
                  {embeddedPending.map((order) => {
                    const isSelected = selectedId === order.id;
                    return (
                      <div
                        key={order.id}
                        className={cn(
                          "flex items-stretch gap-2 rounded-lg border bg-card",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/40",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => selectOrder(order.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                            <Image
                              src={order.imageUrl || "/placeholder-food.jpg"}
                              alt={order.title}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold">
                              {order.title}
                            </p>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              Qty {order.orderAmount} ·{" "}
                              <span className="font-semibold tabular-nums text-foreground">
                                {(order.price * order.orderAmount).toFixed(2)}{" "}
                                ETB
                              </span>
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <StatusBadge
                                status={String(order.status || "Pending")}
                              />
                              <StationBadge order={order} />
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center border-l px-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-muted-foreground hover:text-destructive"
                                disabled={removingId === order.id}
                                aria-label={`Remove ${order.title}`}
                              >
                                {removingId === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Remove this item?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  &ldquo;{order.title}&rdquo; will be cancelled.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => void handleRemove(order.id)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 text-base"
                onClick={() => openAddItems(restrictTableNo, embeddedWaiter)}
              >
                <Plus className="h-4 w-4" />
                Add items
              </Button>
            </div>

            <div className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <p className="text-base font-semibold">
                  {selectedOrder ? "Edit item" : "Edit / Add"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder
                    ? selectedOrder.title
                    : "Select an item on the left"}
                </p>
              </div>

              <Tabs
                value={sideTab}
                onValueChange={(v) => setSideTab(v as "edit" | "add")}
                className="gap-0"
              >
                <div className="border-b px-4 py-3">
                  <TabsList className="grid h-11 w-full grid-cols-2">
                    <TabsTrigger value="edit" className="text-sm">
                      Edit
                    </TabsTrigger>
                    <TabsTrigger value="add" className="text-sm">
                      Add
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="edit" className="mt-0 px-4 py-4">
                  {!selectedOrder ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Tap an item to edit quantity, waiter, or table.
                    </p>
                  ) : (
                    <Form {...form} key={`edit-form-${selectedOrder.id}`}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
                        className="space-y-4"
                      >
                        <input type="hidden" {...form.register("id")} />
                        <CustomFormField
                          control={form.control}
                          name="title"
                          fieldType={formFieldTypes.INPUT}
                          label="Item name"
                          placeholder="Item name"
                          formItemClassName="w-full"
                          inputClassName="h-11 w-full text-base"
                        />
                        <CustomFormField
                          control={form.control}
                          name="orderAmount"
                          fieldType={formFieldTypes.INPUT}
                          type="number"
                          label="Quantity"
                          formItemClassName="w-full"
                          inputClassName="h-11 w-full text-base"
                        />
                        <CustomFormField
                          control={form.control}
                          name="waiterName"
                          fieldType={formFieldTypes.SELECT}
                          label="Waiter"
                          placeholder="Select waiter"
                          listdisplay={waiterOptions}
                          formItemClassName="w-full"
                          inputClassName="h-fit w-full text-base"
                        />
                        <CustomFormField
                          control={form.control}
                          name="tableNo"
                          fieldType={formFieldTypes.SELECT}
                          label="Table"
                          placeholder="Select table"
                          listdisplay={tableOptions}
                          isNumeric
                          formItemClassName="w-full"
                          inputClassName="h-fit w-full text-base"
                        />
                        <Button
                          type="submit"
                          className="h-11 w-full text-base"
                          disabled={saving || !selectedOrder}
                        >
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            "Save changes"
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}
                </TabsContent>

                <TabsContent value="add" className="mt-0 px-4 py-4">
                  <div className="space-y-3 py-2 text-center">
                    <p className="text-sm text-muted-foreground">
                      Add menu items to {embeddedDisplay}
                    </p>
                    <Button
                      type="button"
                      className="h-11 w-full gap-2 text-base"
                      onClick={() =>
                        openAddItems(restrictTableNo, embeddedWaiter)
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Open menu
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {addItemsTarget ? (
          <CafeCashierAddItemsDialog
            items={items}
            hotelName={hotelName}
            tableNo={addItemsTarget.tableNo}
            tableCaption={tableCaptionForNo(tables, addItemsTarget.tableNo)}
            tables={tables}
            waiterName={addItemsTarget.waiterName}
            existingOrders={editableOrders}
            isOpen
            onClose={() => setAddItemsTarget(null)}
            onSuccess={onRefresh}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className={cn("space-y-5", embedded && "space-y-3")}>
        {!embedded ? (
          <>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 shadow-sm">
              <ClipboardEdit className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Order update
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Correct sent tickets before payment
              </p>
            </div>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                isRoomScope
                  ? "Search room, item, waiter…"
                  : "Search table, item, waiter…"
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border bg-card px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Pending lines
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              {editableOrders.length}
            </p>
          </div>
          <div className="rounded-xl border bg-card px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {isRoomScope ? "Rooms" : "Tables"}
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              {openTableGroups.length}
            </p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wider text-primary/80">
              Open total
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-primary">
              {openTotal.toFixed(2)}{" "}
              <span className="text-xs font-medium">ETB</span>
            </p>
          </div>
        </div>

        <p className="rounded-lg border border-dashed bg-muted/25 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Expand a {isRoomScope ? "room" : "table"} to edit pending lines or add
          new items. Completed tickets stay hidden here
          {isRoomScope
            ? " — checkout the stay when everything is ready."
            : " — use Payment when the table is ready to pay."}
        </p>
          </>
        ) : null}

        {customAddItems ? (
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={sideTab}
              onValueChange={(v) => setSideTab(v as "edit" | "add")}
            >
              <TabsList className="h-10">
                <TabsTrigger value="edit" className="px-4 text-sm">
                  Update lines
                </TabsTrigger>
                <TabsTrigger value="add" className="px-4 text-sm">
                  Add items
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        ) : null}

        {customAddItems && sideTab === "add" ? (
          <div className="min-h-[420px] rounded-xl border bg-card p-3 shadow-sm sm:p-4">
            {customAddItems}
          </div>
        ) : (
        <div className="grid h-[min(calc(100dvh-14rem),700px)] min-h-[420px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,440px)]">
          <div className="min-h-0 overflow-y-auto overscroll-y-contain rounded-xl border bg-muted/15 p-2 pr-1">
            <div className="space-y-3 pb-1">
              {filteredTableGroups.length === 0 ? (
                <Card className="border-dashed py-10 text-center">
                  <p className="text-sm font-medium">
                    {searchQuery
                      ? "No matches"
                      : isRoomScope
                        ? "No open room lines"
                        : "No open tables"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {searchQuery
                      ? "Try a different search term."
                      : customAddItems
                        ? "Use Add items above to place the first charge."
                        : "Pending tickets will show up here."}
                  </p>
                  {searchQuery ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear search
                    </Button>
                  ) : null}
                </Card>
              ) : (
                filteredTableGroups.map(({ tableNo, pendingOrders, waiterName, serviceCaption }) => {
                  const tableDisplay = resolveTableDisplay(
                    tableNo,
                    serviceCaption,
                  );
                  const tableTotal = sumOpenTableOrdersETB(
                    orders,
                    hotelName,
                    tableNo,
                  );
                  const lineCount = pendingOrders.length;
                  const allReady = lineCount === 0;

                  return (
                    <Collapsible
                      key={tableNo}
                      defaultOpen={tableScoped || embedded}
                      className="group/table-update"
                    >
                      <Card className="overflow-hidden border-l-4 border-l-primary/80 shadow-sm transition-shadow hover:shadow-md">
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto w-full cursor-pointer rounded-none px-0 py-0 hover:bg-muted/50"
                          >
                            <CardHeader className="w-full space-y-0 bg-linear-to-r from-muted/40 to-transparent py-3.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-sm font-semibold"
                                  >
                                    {tableDisplay}
                                  </Badge>
                                  {allReady ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">
                                      All ready · add more
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px]">
                                      {lineCount} pending
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <div className="hidden text-right sm:block">
                                    <p className="text-sm font-bold tabular-nums">
                                      {tableTotal.toFixed(2)} ETB
                                    </p>
                                    <p className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      {waiterName}
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="tabular-nums">
                                    {lineCount}
                                  </Badge>
                                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/table-update:rotate-180" />
                                </div>
                              </div>
                            </CardHeader>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=open]:animate-in">
                          <CardContent className="space-y-2 border-t bg-muted/10 px-3 pb-3 pt-2">
                            <div className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-2 text-sm sm:hidden">
                              <span className="text-muted-foreground">
                                {waiterName}
                              </span>
                              <span className="font-semibold tabular-nums">
                                {tableTotal.toFixed(2)} ETB
                              </span>
                            </div>
                            {allReady ? (
                              <p className="rounded-lg border border-dashed bg-background/80 px-3 py-3 text-center text-xs leading-relaxed text-muted-foreground">
                                Kitchen and bar marked every item ready. Add new
                                orders below — existing completed lines are not
                                shown here.
                              </p>
                            ) : null}
                            {pendingOrders.map((order) => {
                              const status = String(order.status || "Pending");
                              const isSelected = selectedId === order.id;

                              return (
                                <div
                                  key={order.id}
                                  className={cn(
                                    "flex gap-1.5 rounded-xl border bg-card transition-all",
                                    isSelected
                                      ? "border-primary shadow-sm ring-2 ring-primary/20"
                                      : "hover:border-muted-foreground/25 hover:shadow-sm",
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() => selectOrder(order.id)}
                                    className={cn(
                                      "flex min-w-0 flex-1 gap-3 p-3 text-left",
                                      isSelected &&
                                        "border-l-4 border-l-primary pl-2.5",
                                    )}
                                  >
                                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-border/50">
                                      <Image
                                        src={
                                          order.imageUrl ||
                                          "/placeholder-food.jpg"
                                        }
                                        alt={order.title}
                                        fill
                                        className="object-cover"
                                        sizes="56px"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-semibold leading-tight">
                                        {order.title}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        Qty{" "}
                                        <span className="font-medium text-foreground">
                                          {order.orderAmount}
                                        </span>
                                        {" · "}
                                        <span className="font-medium text-foreground tabular-nums">
                                          {(
                                            order.price * order.orderAmount
                                          ).toFixed(2)}{" "}
                                          ETB
                                        </span>
                                        {" · "}
                                        {formatOrderTime(order.createdAt)}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        <StatusBadge status={status} />
                                        <StationBadge order={order} />
                                      </div>
                                    </div>
                                  </button>
                                  <div className="flex shrink-0 flex-col justify-center pr-2">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                          disabled={removingId === order.id}
                                          aria-label={`Remove ${order.title}`}
                                        >
                                          {removingId === order.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Remove this item?
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            &ldquo;{order.title}&rdquo; will be
                                            cancelled and won&apos;t appear at
                                            payment. Alert kitchen or bar if
                                            preparation already started.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Keep item
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={() =>
                                              void handleRemove(order.id)
                                            }
                                          >
                                            Remove item
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              );
                            })}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="mt-1 w-full gap-2 shadow-sm"
                              onClick={() =>
                                openAddItems(tableNo, waiterName)
                              }
                            >
                              <Plus className="h-4 w-4" />
                              Add items to {tableDisplay}
                            </Button>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })
              )}
            </div>
          </div>

          <Card className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-primary/10 shadow-md lg:min-w-[280px]">
            <CardHeader className="shrink-0 space-y-1 border-b bg-muted/20 px-4 py-3">
              <CardTitle className="text-base font-semibold">
                {selectedOrder ? "Edit line" : "Actions"}
              </CardTitle>
              {selectedOrder ? (
                <p className="truncate text-xs text-muted-foreground">
                  {selectedOrder.title} ·{" "}
                  {resolveTableDisplay(
                    normalizeOrderTableNo(selectedOrder),
                    selectedOrder.serviceCaption,
                  )}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Select a ticket or add menu items
                </p>
              )}
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-0 p-0">
              <Tabs
                value={customAddItems ? "edit" : sideTab}
                onValueChange={(v) => setSideTab(v as "edit" | "add")}
                className="flex min-h-0 flex-1 flex-col gap-0"
              >
                <div className="shrink-0 border-b bg-background px-4 py-3">
                  <TabsList
                    className={cn(
                      "grid h-10 w-full",
                      customAddItems ? "grid-cols-1" : "grid-cols-2",
                    )}
                  >
                    <TabsTrigger value="edit" className="text-xs sm:text-sm">
                      Edit line
                    </TabsTrigger>
                    {!customAddItems ? (
                      <TabsTrigger value="add" className="text-xs sm:text-sm">
                        Add items
                      </TabsTrigger>
                    ) : null}
                  </TabsList>
                </div>

                <div className="relative min-h-0 flex-1">
                  <TabsContent
                    value="edit"
                    className="absolute inset-0 mt-0 w-full overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-4 data-[state=inactive]:hidden"
                  >
                    <div className="w-full min-w-0 space-y-4 pb-2">
                    {!selectedOrder ? (
                      <div className="flex flex-col items-center rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center">
                        <MousePointerClick className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium">Select a line</p>
                        <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                          Expand a {isRoomScope ? "room" : "table"} on the left
                          and tap an order to edit
                          {useLodgingHandlers
                            ? " quantity."
                            : " table, waiter, quantity, or name."}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="w-full overflow-hidden rounded-xl border bg-linear-to-br from-muted/50 to-background p-3.5">
                          <div className="flex w-full gap-3">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg sm:h-16 sm:w-16">
                              <Image
                                src={
                                  selectedOrder.imageUrl ||
                                  "/placeholder-food.jpg"
                                }
                                alt={selectedOrder.title}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold leading-tight">
                                {selectedOrder.title}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {resolveTableDisplay(
                                  normalizeOrderTableNo(selectedOrder),
                                  selectedOrder.serviceCaption,
                                )}{" "}
                                · {selectedOrder.waiterName}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <StatusBadge
                                  status={
                                    selectedOrder.status || "Pending"
                                  }
                                />
                                {!useLodgingHandlers ? (
                                  <StationBadge order={selectedOrder} />
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <p className="mt-3 border-t pt-2 text-right text-sm font-bold tabular-nums text-primary">
                            {(
                              selectedOrder.price * selectedOrder.orderAmount
                            ).toFixed(2)}{" "}
                            ETB
                          </p>
                        </div>
                        <Form {...form} key={`edit-form-${selectedOrder.id}`}>
                          <form
                            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
                            className="w-full space-y-4"
                          >
                            <input
                              type="hidden"
                              {...form.register("id")}
                            />
                            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                              <CustomFormField
                                control={form.control}
                                name="title"
                                fieldType={formFieldTypes.INPUT}
                                label="Item name"
                                placeholder="Item name"
                                formItemClassName="w-full min-w-0"
                                inputClassName="h-12 w-full text-base"
                              />
                              <CustomFormField
                                control={form.control}
                                name="orderAmount"
                                fieldType={formFieldTypes.INPUT}
                                type="number"
                                label="Quantity"
                                formItemClassName="w-full min-w-0"
                                inputClassName="h-12 w-full text-base"
                              />
                            </div>
                            {!useLodgingHandlers ? (
                              <>
                                <CustomFormField
                                  control={form.control}
                                  name="tableNo"
                                  fieldType={formFieldTypes.SELECT}
                                  label={isRoomScope ? "Room" : "Table"}
                                  placeholder={
                                    isRoomScope
                                      ? "Select room"
                                      : "Select table"
                                  }
                                  listdisplay={tableOptions}
                                  isNumeric
                                  formItemClassName="w-full"
                                  inputClassName="h-fit w-full min-w-0 text-base"
                                />
                                <CustomFormField
                                  control={form.control}
                                  name="waiterName"
                                  fieldType={formFieldTypes.SELECT}
                                  label="Waiter"
                                  placeholder="Select waiter"
                                  listdisplay={waiterOptions}
                                  formItemClassName="w-full"
                                  inputClassName="h-fit w-full min-w-0 text-base"
                                />
                              </>
                            ) : null}
                            <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-0 pt-3 backdrop-blur-sm">
                              <Button
                                type="submit"
                                disabled={saving || !selectedOrder}
                                className="w-full gap-2 shadow-sm"
                              >
                                {saving ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving…
                                  </>
                                ) : (
                                  "Save changes"
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                        <Separator className="my-2" />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                              disabled={removingId === selectedOrder.id}
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove this line
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove this item?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Cancels &ldquo;{selectedOrder.title}&rdquo; on
                                this {isRoomScope ? "room" : "table"}.
                                {!useLodgingHandlers
                                  ? " Tell kitchen or bar if already in preparation."
                                  : ""}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep item</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() =>
                                  void handleRemove(selectedOrder.id)
                                }
                              >
                                Remove item
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="add"
                    className="absolute inset-0 mt-0 overflow-y-auto overscroll-y-contain px-4 py-4 data-[state=inactive]:hidden"
                  >
                    <div className="space-y-4 pb-2">
                    {customAddItems ? (
                      customAddItems
                    ) : addContext ? (
                      <>
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-primary/90">
                            Target {isRoomScope ? "room" : "table"}
                          </p>
                          <p className="mt-1 text-2xl font-bold tabular-nums">
                            {resolveTableDisplay(
                              addContext.tableNo,
                              selectedOrder?.serviceCaption,
                            )}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            {addContext.waiterName}
                          </p>
                          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                            New menu picks are sent as separate pending tickets
                            to kitchen or bar on this{" "}
                            {isRoomScope ? "room" : "table"}.
                          </p>
                        </div>
                        <Button
                          type="button"
                          className="w-full gap-2 shadow-sm"
                          onClick={() =>
                            openAddItems(
                              addContext.tableNo,
                              addContext.waiterName,
                            )
                          }
                        >
                          <Plus className="h-4 w-4" />
                          Open menu
                        </Button>
                        {!selectedOrder ? (
                          <p className="text-center text-xs text-muted-foreground">
                            Or expand any {isRoomScope ? "room" : "table"} and
                            use &ldquo;Add items to{" "}
                            {isRoomScope ? "room" : "table"}
                            &rdquo; below its lines.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex flex-col items-center rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center">
                        <Plus className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium">
                          Add to a {isRoomScope ? "room" : "table"}
                        </p>
                        <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                          Select a line first, or expand a{" "}
                          {isRoomScope ? "room" : "table"} and use the add
                          button under its orders.
                        </p>
                      </div>
                    )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        )}
      </div>

      {addItemsTarget && !customAddItems ? (
        <CafeCashierAddItemsDialog
          items={items}
          hotelName={hotelName}
          tableNo={addItemsTarget.tableNo}
          tableCaption={tableCaptionForNo(tables, addItemsTarget.tableNo)}
          tables={tables}
          waiterName={addItemsTarget.waiterName}
          existingOrders={editableOrders}
          isOpen
          onClose={() => setAddItemsTarget(null)}
          onSuccess={onRefresh}
        />
      ) : null}
    </>
  );
}
