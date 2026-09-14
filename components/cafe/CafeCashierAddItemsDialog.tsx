"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Coffee,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  SplitSquareVertical,
  Utensils,
} from "lucide-react";
import {
  createBatchOrders,
  updateLiveOrder,
  type Item,
  type Order,
  type OrderCreationData,
  type Waiter,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import {
  allocateNextCafeTableSplit,
  cafePhysicalTableNo,
  decodeCafeTableSplit,
  findOpenOrderLineForTableItem,
  formatCafeTableDisplayFromRegistry,
  isCafeTableSplitCode,
  listOpenCafeTableSplitNos,
  normalizeOrderTableNo,
  orderStationLabel,
  tableCaptionForNo,
} from "@/lib/cafeTableOrder";
import { isRoomServiceTableNo } from "@/lib/lodgingRoomService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { submitAnalogPrintedOrders } from "@/lib/analogCafeOrder";
import { useRecipeStockBlockedIds } from "@/hooks/useRecipeStockBlockedIds";
import { cn } from "@/lib/utils";

type CartLine = Item & { orderAmount: number };
type MenuTab = "all" | "food" | "beverage" | "others";

interface Props {
  items: Item[];
  hotelName: string;
  tableNo: number;
  tableCaption?: string | null;
  tables?: Pick<import("@/lib/actions").Table, "tableNo" | "orderCaption">[];
  waiterName: string;
  waiters?: Waiter[];
  /** Today's open lines — used for merge + allocating next split. */
  existingOrders?: Order[];
  analogPrint?: boolean;
  /**
   * Only for the original physical table: allow creating a new split.
   * Split tabs always add to themselves — leave this false.
   */
  allowTableSplit?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

function StationIcon({ type }: { type: string }) {
  const isBar = String(type).trim().toLowerCase() === "bar";
  return isBar ? (
    <Coffee className="h-3.5 w-3.5" />
  ) : (
    <Utensils className="h-3.5 w-3.5" />
  );
}

export function CafeCashierAddItemsDialog({
  items,
  hotelName,
  tableNo,
  tableCaption,
  tables = [],
  waiterName,
  waiters = [],
  existingOrders = [],
  analogPrint = false,
  allowTableSplit = false,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const contextTableNo = normalizeOrderTableNo({ tableNo });
  const parentTableNo = cafePhysicalTableNo(contextTableNo);
  const onSplitSeat = isCafeTableSplitCode(contextTableNo);
  const canCreateSplit =
    allowTableSplit &&
    !onSplitSeat &&
    !isRoomServiceTableNo(parentTableNo) &&
    parentTableNo >= 0 &&
    parentTableNo <= 999;

  const [search, setSearch] = useState("");
  const [menuTab, setMenuTab] = useState<MenuTab>("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createSplitChecked, setCreateSplitChecked] = useState(false);
  const [newSplitWaiter, setNewSplitWaiter] = useState("");

  const menuItems = useMemo(
    () =>
      items.filter((item) =>
        rowHotelMatchesTenantScope(item.HotelName, hotelName),
      ),
    [items, hotelName],
  );
  const { blockedIds: recipeStockBlockedIds } =
    useRecipeStockBlockedIds(menuItems);

  const parentCaptionResolved = useMemo(() => {
    const caption = String(tableCaption ?? "").trim();
    if (caption) return caption;
    return tableCaptionForNo(tables, parentTableNo);
  }, [tableCaption, tables, parentTableNo]);

  const contextLabel = formatCafeTableDisplayFromRegistry(
    contextTableNo,
    tables,
    tableCaption || parentCaptionResolved,
  );
  const parentLabel = formatCafeTableDisplayFromRegistry(
    parentTableNo,
    tables,
    parentCaptionResolved,
  );

  const cartQtyById = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of cart) map.set(line.id, line.orderAmount);
    return map;
  }, [cart]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      const cat = item.category.toLowerCase();
      const tabOk =
        menuTab === "all" ||
        (menuTab === "food" && cat === "food") ||
        (menuTab === "beverage" && cat === "beverage") ||
        (menuTab === "others" && cat === "others");
      const searchOk =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q);
      return tabOk && searchOk;
    });
  }, [menuItems, menuTab, search]);

  const cartTotal = useMemo(
    () => cart.reduce((s, line) => s + line.price * line.orderAmount, 0),
    [cart],
  );

  const cartPieces = useMemo(
    () => cart.reduce((s, line) => s + line.orderAmount, 0),
    [cart],
  );

  const addToCart = (item: Item) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.id === item.id
            ? { ...l, orderAmount: l.orderAmount + 1 }
            : l,
        );
      }
      return [...prev, { ...item, orderAmount: 1 }];
    });
  };

  const adjustCart = (itemId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.id === itemId
            ? { ...l, orderAmount: Math.max(0, l.orderAmount + delta) }
            : l,
        )
        .filter((l) => l.orderAmount > 0),
    );
  };

  const clearCart = () => setCart([]);

  const resetLocalState = () => {
    setCart([]);
    setSearch("");
    setCreateSplitChecked(false);
    setNewSplitWaiter("");
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Add at least one menu item");
      return;
    }
    if (createSplitChecked && !String(newSplitWaiter).trim()) {
      toast.error("Select a waiter for the new table split");
      return;
    }

    if (createSplitChecked) {
      const existingSplits = listOpenCafeTableSplitNos(
        existingOrders,
        hotelName,
        parentTableNo,
      );
      const last = existingSplits[existingSplits.length - 1];
      if (last && decodeCafeTableSplit(last)?.splitIndex === 99) {
        toast.error("Maximum table splits reached for this table");
        return;
      }
    }

    setSubmitting(true);
    try {
      const targetTableNo = createSplitChecked
        ? allocateNextCafeTableSplit(existingOrders, hotelName, parentTableNo)
        : contextTableNo;
      const targetWaiter = createSplitChecked
        ? String(newSplitWaiter).trim()
        : waiterName;

      const toCreate: OrderCreationData[] = [];
      let mergedCount = 0;

      if (analogPrint) {
        for (const line of cart) {
          toCreate.push({
            title: line.name,
            price: line.price,
            imageUrl: line.imageUrl || "",
            category: line.category,
            type: line.type,
            orderAmount: line.orderAmount,
            tableNo: targetTableNo,
            waiterName: targetWaiter,
            HotelName: hotelName,
            status: "Pending",
            payment: "Unpaid",
          });
        }
        await submitAnalogPrintedOrders(toCreate, {
          isUpdate: true,
          hotelName,
        });
        toast.success(
          createSplitChecked
            ? `Update printed · created ${formatCafeTableDisplayFromRegistry(targetTableNo, tables, parentCaptionResolved)}`
            : "Update ticket printed — approve payment when the guest pays",
        );
      } else {
        for (const line of cart) {
          const existing =
            createSplitChecked
              ? undefined
              : findOpenOrderLineForTableItem(
                  existingOrders,
                  hotelName,
                  targetTableNo,
                  line.name,
                );
          if (existing) {
            const nextQty =
              Math.max(1, Number(existing.orderAmount) || 1) + line.orderAmount;
            await updateLiveOrder(
              {
                id: existing.id,
                tableNo: targetTableNo,
                waiterName: existing.waiterName,
                orderAmount: nextQty,
                title: existing.title,
              },
              { silent: true },
            );
            mergedCount += 1;
          } else {
            toCreate.push({
              title: line.name,
              price: line.price,
              imageUrl: line.imageUrl || "",
              category: line.category,
              type: line.type,
              orderAmount: line.orderAmount,
              tableNo: targetTableNo,
              waiterName: targetWaiter,
              HotelName: hotelName,
              status: "Pending",
              payment: "Unpaid",
            });
          }
        }

        if (toCreate.length > 0) {
          await createBatchOrders(toCreate);
        }

        if (createSplitChecked) {
          toast.success(
            `Created ${formatCafeTableDisplayFromRegistry(targetTableNo, tables, parentCaptionResolved)} and sent items to kitchen/bar`,
          );
        } else if (mergedCount > 0 && toCreate.length === 0) {
          toast.success(
            mergedCount === 1
              ? "Existing ticket updated — kitchen/bar will see the new quantity"
              : `${mergedCount} existing tickets updated`,
          );
        } else if (toCreate.length > 0) {
          toast.success("New items sent to kitchen/bar");
        }
      }
      resetLocalState();
      await onSuccess();
      onClose();
    } catch {
      /* toasts in action */
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetLocalState();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[min(92dvh,880px)] max-h-[92dvh] w-[min(96vw,1080px)] max-w-270 flex-col gap-0 overflow-hidden p-0 sm:max-w-270">
        <DialogHeader className="shrink-0 space-y-0 border-b px-5 py-3.5 text-left sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-lg sm:text-xl">
                Add items · {contextLabel}
              </DialogTitle>
              <DialogDescription className="text-left text-xs sm:text-sm">
                Waiter{" "}
                <span className="font-medium text-foreground">{waiterName}</span>
                {createSplitChecked
                  ? " · creating a new split seat"
                  : onSplitSeat
                    ? ` · adding to ${contextLabel}`
                    : ` · adding to ${parentLabel}`}
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="shrink-0 gap-1.5 px-2.5 py-1">
              <ShoppingBag className="h-3.5 w-3.5" />
              {cartPieces}
            </Badge>
          </div>

          {canCreateSplit ? (
            <div
              className={cn(
                "mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2",
                createSplitChecked
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/80 bg-muted/20",
              )}
            >
              <label
                htmlFor="table-split"
                className="flex cursor-pointer items-center gap-2 text-sm font-medium"
              >
                <Checkbox
                  id="table-split"
                  checked={createSplitChecked}
                  onCheckedChange={(checked) =>
                    setCreateSplitChecked(checked === true)
                  }
                />
                <SplitSquareVertical className="h-3.5 w-3.5 text-primary" />
                Create table split
              </label>

              {createSplitChecked ? (
                <Select
                  value={newSplitWaiter || undefined}
                  onValueChange={setNewSplitWaiter}
                >
                  <SelectTrigger className="h-8 w-full max-w-48 text-xs sm:ml-auto">
                    <SelectValue placeholder="Split waiter…" />
                  </SelectTrigger>
                  <SelectContent>
                    {waiters.map((w) => (
                      <SelectItem key={w.id} value={w.name}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground sm:ml-auto">
                  Optional — only when seating another group
                </span>
              )}
            </div>
          ) : null}
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-rows-1 md:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="flex min-h-0 flex-col overflow-hidden border-b md:border-b-0 md:border-r">
            <div className="shrink-0 border-b px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search menu…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
                <Tabs
                  value={menuTab}
                  onValueChange={(v) => setMenuTab(v as MenuTab)}
                  className="gap-0 shrink-0"
                >
                  <TabsList className="h-9 w-fit justify-start gap-0.5 rounded-md bg-muted/70 p-0.5">
                    <TabsTrigger
                      value="all"
                      className="h-8 flex-none rounded-sm px-3 text-xs"
                    >
                      All
                    </TabsTrigger>
                    <TabsTrigger
                      value="food"
                      className="h-8 flex-none rounded-sm px-3 text-xs"
                    >
                      Food
                    </TabsTrigger>
                    <TabsTrigger
                      value="beverage"
                      className="h-8 flex-none rounded-sm px-3 text-xs"
                    >
                      Drinks
                    </TabsTrigger>
                    <TabsTrigger
                      value="others"
                      className="h-8 flex-none rounded-sm px-3 text-xs"
                    >
                      Other
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
              <div className="space-y-1.5 p-3">
                {filteredMenu.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-10 text-center">
                    <p className="text-sm font-medium">No items found</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Try another category or search term.
                    </p>
                  </div>
                ) : (
                  filteredMenu.map((item) => {
                    const inCart = cartQtyById.get(item.id) ?? 0;
                    const station = orderStationLabel(item);
                    const suspended = !!item.isSuspended;
                    const stockBlocked = recipeStockBlockedIds.has(item.id);
                    const unavailable = suspended || stockBlocked;
                    const unavailableLabel = suspended
                      ? "Suspended"
                      : "Out of station stock";

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={unavailable}
                        aria-disabled={unavailable}
                        onClick={() => {
                          if (!unavailable) addToCart(item);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors",
                          unavailable
                            ? "cursor-not-allowed border-dashed bg-muted/30 opacity-70"
                            : inCart > 0
                              ? "border-primary/35 bg-primary/5"
                              : "border-transparent bg-card hover:border-border hover:bg-muted/40",
                        )}
                      >
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md ring-1 ring-border/50">
                          <Image
                            src={item.imageUrl || "/placeholder-food.jpg"}
                            alt={item.name}
                            fill
                            className={cn(
                              "object-cover",
                              unavailable && "grayscale",
                            )}
                            sizes="44px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-medium">
                              {item.name}
                            </p>
                            <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {item.price.toFixed(2)}
                            </p>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <Badge
                              variant="outline"
                              className="h-5 gap-1 px-1.5 text-[10px] font-normal"
                            >
                              <StationIcon type={item.type} />
                              {station}
                            </Badge>
                            {unavailable ? (
                              <Badge
                                variant="secondary"
                                className="h-5 px-1.5 text-[10px] font-semibold uppercase tracking-wide"
                              >
                                {unavailableLabel}
                              </Badge>
                            ) : inCart > 0 ? (
                              <Badge className="h-5 px-1.5 text-[10px]">
                                ×{inCart}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            unavailable
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          <Plus className="h-4 w-4" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden bg-muted/15">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {createSplitChecked ? "New split ticket" : "Ticket preview"}
              </p>
              {cart.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={clearCart}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
              <div className="space-y-1.5 p-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                    <ShoppingBag className="mb-3 h-9 w-9 text-muted-foreground/35" />
                    <p className="text-sm font-medium">Cart is empty</p>
                    <p className="mt-1 max-w-44 text-xs leading-relaxed text-muted-foreground">
                      Tap menu items to build the ticket for{" "}
                      {createSplitChecked ? "the new split" : contextLabel}.
                    </p>
                  </div>
                ) : (
                  cart.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {line.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {orderStationLabel(line)} ·{" "}
                          {(line.price * line.orderAmount).toFixed(2)} ETB
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 rounded-md border bg-muted/25 p-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => adjustCart(line.id, -1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">
                          {line.orderAmount}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => adjustCart(line.id, 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="shrink-0 border-t bg-card/80 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {cart.length} line{cart.length === 1 ? "" : "s"} · {cartPieces}{" "}
                  pc
                </span>
                <span className="text-base font-bold tabular-nums text-primary">
                  {cartTotal.toFixed(2)} ETB
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-5 py-3 sm:justify-between sm:px-6">
          <p className="hidden text-xs text-muted-foreground sm:block">
            {createSplitChecked
              ? "Split is created only when you send this ticket"
              : `Sending to ${contextLabel}`}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                submitting ||
                cart.length === 0 ||
                (createSplitChecked && !String(newSplitWaiter).trim())
              }
              className="min-w-36 flex-1 gap-2 sm:flex-none"
              onClick={() => void handleSubmit()}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : createSplitChecked ? (
                <>
                  <SplitSquareVertical className="h-4 w-4" />
                  Create split & send
                </>
              ) : (
                <>
                  <Utensils className="h-4 w-4" />
                  Send to kitchen/bar
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
