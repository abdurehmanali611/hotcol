"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
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
  formatCafeTableDisplay,
  groupEditableOrdersByTable,
  isLiveOrderEditable,
  normalizeOrderTableNo,
  occupiedTableNumbersFromOrders,
  orderStationLabel,
  orderToLiveEditFormValues,
  sumOrderLinesETB,
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

interface Props {
  orders: Order[];
  items: Item[];
  hotelName: string;
  onRefresh: () => void | Promise<void>;
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
}: Props) {
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
        .filter((o) => isLiveOrderEditable(o, hotelName))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [orders, hotelName],
  );

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return editableOrders;
    return editableOrders.filter((order) => {
      const haystack = [
        order.title,
        order.waiterName,
        String(order.tableNo),
        order.serviceCaption,
        orderStationLabel(order),
        order.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [editableOrders, searchQuery]);

  const tableGroups = useMemo(
    () => groupEditableOrdersByTable(filteredOrders),
    [filteredOrders],
  );

  const allTableGroups = useMemo(
    () => groupEditableOrdersByTable(editableOrders),
    [editableOrders],
  );

  const openTotal = useMemo(
    () => sumOrderLinesETB(editableOrders),
    [editableOrders],
  );

  const selectedOrder =
    editableOrders.find((o) => o.id === selectedId) ?? null;

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
    resolver: zodResolver(updateLiveOrderSchema),
  });

  useEffect(() => {
    if (!selectedOrder) return;
    form.reset(orderToLiveEditFormValues(selectedOrder));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-seed when the selected line changes
  }, [selectedOrder?.id, form]);

  useEffect(() => {
    if (!hotelName) return;
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
  }, [hotelName]);

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
    return buildEditTableSelectOptions(tables, occupied, selectedTableNo);
  }, [tables, occupied, selectedTableNo]);

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
    setAddItemsTarget({ tableNo, waiterName });
  };

  const onSubmit = async (values: UpdateLiveOrderFormValues) => {
    setSaving(true);
    try {
      await updateLiveOrder({
        id: values.id,
        tableNo: values.tableNo,
        waiterName: values.waiterName,
        orderAmount: values.orderAmount,
        title: values.title,
      });
      await onRefresh();
    } catch {
      /* toast in action */
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (orderId: number) => {
    setRemovingId(orderId);
    try {
      await cancelLiveOrder(orderId);
      if (selectedId === orderId) setSelectedId(null);
      await onRefresh();
    } catch {
      /* toast in action */
    } finally {
      setRemovingId(null);
    }
  };

  if (editableOrders.length === 0) {
    return (
      <Card className="border-dashed py-14 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <ClipboardEdit className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">No live orders to update</h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Today&apos;s unpaid tickets still at kitchen or bar show up here.
          You can edit a line, add menu items to a table, or remove a mistake.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-5">
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
              placeholder="Search table, item, waiter…"
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
              Open lines
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              {editableOrders.length}
            </p>
          </div>
          <div className="rounded-xl border bg-card px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Tables
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              {allTableGroups.length}
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
          Expand a table to view lines. Select a line to edit, use{" "}
          <span className="font-medium text-foreground">Add items</span> for new
          menu tickets, or remove a line if it was sent by mistake (tell kitchen
          or bar if already preparing).
        </p>

        <div className="grid h-[min(calc(100dvh-14rem),700px)] min-h-[420px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,440px)]">
          <div className="min-h-0 overflow-y-auto overscroll-y-contain rounded-xl border bg-muted/15 p-2 pr-1">
            <div className="space-y-3 pb-1">
              {tableGroups.length === 0 ? (
                <Card className="border-dashed py-10 text-center">
                  <p className="text-sm font-medium">No matches</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different search term.
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
                tableGroups.map(({ tableNo, orders: tableOrders }) => {
                  const waiterName =
                    tableOrders[0]?.waiterName || "Self-Service";
                  const serviceCaption = String(
                    tableOrders.find((o) => o.serviceCaption)?.serviceCaption ??
                      "",
                  ).trim();
                  const tableDisplay = formatCafeTableDisplay(
                    tableNo,
                    serviceCaption,
                  );
                  const tableTotal = sumOrderLinesETB(tableOrders);
                  const pendingCount = tableOrders.filter(
                    (o) =>
                      String(o.status || "").toLowerCase() !== "completed",
                  ).length;

                  return (
                    <Collapsible
                      key={tableNo}
                      defaultOpen={false}
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
                                  {pendingCount > 0 ? (
                                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px]">
                                      {pendingCount} pending
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">
                                      All ready
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
                                    {tableOrders.length}
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
                            {tableOrders.map((order) => {
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
                  {formatCafeTableDisplay(
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
                value={sideTab}
                onValueChange={(v) => setSideTab(v as "edit" | "add")}
                className="flex min-h-0 flex-1 flex-col gap-0"
              >
                <div className="shrink-0 border-b bg-background px-4 py-3">
                  <TabsList className="grid h-10 w-full grid-cols-2">
                    <TabsTrigger value="edit" className="text-xs sm:text-sm">
                      Edit line
                    </TabsTrigger>
                    <TabsTrigger value="add" className="text-xs sm:text-sm">
                      Add items
                    </TabsTrigger>
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
                          Expand a table on the left and tap an order to edit
                          table, waiter, quantity, or name.
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
                                {formatCafeTableDisplay(
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
                                <StationBadge order={selectedOrder} />
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
                            id="edit-live-order-form"
                            onSubmit={form.handleSubmit(onSubmit)}
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
                            <CustomFormField
                              control={form.control}
                              name="tableNo"
                              fieldType={formFieldTypes.SELECT}
                              label="Table"
                              placeholder="Select table"
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
                          </form>
                        </Form>
                        <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur-sm">
                          <Button
                            type="submit"
                            form="edit-live-order-form"
                            disabled={saving}
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
                                this table. Tell kitchen or bar if already in
                                preparation.
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
                    {addContext ? (
                      <>
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-primary/90">
                            Target table
                          </p>
                          <p className="mt-1 text-2xl font-bold tabular-nums">
                            {formatCafeTableDisplay(
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
                            to kitchen or bar on this table.
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
                            Or expand any table and use &ldquo;Add items to
                            table&rdquo; below its lines.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex flex-col items-center rounded-xl border border-dashed bg-muted/20 px-4 py-12 text-center">
                        <Plus className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium">Add to a table</p>
                        <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                          Select a line first, or expand a table and use the
                          add button under its orders.
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
      </div>

      {addItemsTarget ? (
        <CafeCashierAddItemsDialog
          items={items}
          hotelName={hotelName}
          tableNo={addItemsTarget.tableNo}
          tableCaption={
            editableOrders.find(
              (o) => normalizeOrderTableNo(o) === addItemsTarget.tableNo,
            )?.serviceCaption
          }
          waiterName={addItemsTarget.waiterName}
          isOpen
          onClose={() => setAddItemsTarget(null)}
          onSuccess={onRefresh}
        />
      ) : null}
    </>
  );
}
