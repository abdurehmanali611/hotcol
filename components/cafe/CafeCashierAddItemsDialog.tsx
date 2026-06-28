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
  Utensils,
} from "lucide-react";
import {
  createBatchOrders,
  updateLiveOrder,
  type Item,
  type Order,
  type OrderCreationData,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import {
  findOpenOrderLineForTableItem,
  formatCafeTableDisplayFromRegistry,
  normalizeOrderTableNo,
  orderStationLabel,
} from "@/lib/cafeTableOrder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  /** Today's open lines on this table — used to bump qty on existing tickets. */
  existingOrders?: Order[];
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
  existingOrders = [],
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [search, setSearch] = useState("");
  const [menuTab, setMenuTab] = useState<MenuTab>("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const menuItems = useMemo(
    () =>
      items.filter((item) =>
        rowHotelMatchesTenantScope(item.HotelName, hotelName),
      ),
    [items, hotelName],
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

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Add at least one menu item");
      return;
    }
    setSubmitting(true);
    try {
      const tableKey = normalizeOrderTableNo({ tableNo });
      const toCreate: OrderCreationData[] = [];
      let mergedCount = 0;

      for (const line of cart) {
        const existing = findOpenOrderLineForTableItem(
          existingOrders,
          hotelName,
          tableKey,
          line.name,
        );
        if (existing) {
          const nextQty =
            Math.max(1, Number(existing.orderAmount) || 1) + line.orderAmount;
          await updateLiveOrder(
            {
              id: existing.id,
              tableNo: tableKey,
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
            tableNo: tableKey,
            waiterName,
            HotelName: hotelName,
            status: "Pending",
            payment: "Unpaid",
          });
        }
      }

      if (toCreate.length > 0) {
        await createBatchOrders(toCreate);
      }

      if (mergedCount > 0 && toCreate.length === 0) {
        toast.success(
          mergedCount === 1
            ? "Existing ticket updated — kitchen/bar will see the new quantity"
            : `${mergedCount} existing tickets updated`,
        );
      }
      setCart([]);
      setSearch("");
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
      setCart([]);
      setSearch("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[min(92dvh,820px)] max-h-[92dvh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 space-y-3 border-b bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-xl">
                Add items ·{" "}
                {formatCafeTableDisplayFromRegistry(
                  tableNo,
                  tables,
                  tableCaption,
                )}
              </DialogTitle>
              <DialogDescription>
                Waiter{" "}
                <span className="font-medium text-foreground">{waiterName}</span>
                . Items already on this table update the same ticket; new items
                create a kitchen/bar ticket.
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <ShoppingBag className="h-3.5 w-3.5" />
              {cartPieces} in cart
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-rows-1 md:grid-cols-2">
          <div className="flex min-h-0 flex-col overflow-hidden border-b md:border-b-0 md:border-r">
            <div className="shrink-0 space-y-3 border-b p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search menu…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Tabs
                value={menuTab}
                onValueChange={(v) => setMenuTab(v as MenuTab)}
              >
                <TabsList className="grid h-9 w-full grid-cols-4">
                  <TabsTrigger value="all" className="text-xs">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="food" className="text-xs">
                    Food
                  </TabsTrigger>
                  <TabsTrigger value="beverage" className="text-xs">
                    Drinks
                  </TabsTrigger>
                  <TabsTrigger value="others" className="text-xs">
                    Other
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
              <div className="space-y-2 p-3 sm:p-4">
                {filteredMenu.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-10 text-center">
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

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={suspended}
                        aria-disabled={suspended}
                        onClick={() => {
                          if (!suspended) addToCart(item);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                          suspended
                            ? "cursor-not-allowed border-dashed bg-muted/30 opacity-70"
                            : inCart > 0
                              ? "border-primary/40 bg-primary/5 shadow-sm"
                              : "bg-card hover:border-muted-foreground/30 hover:bg-muted/40",
                        )}
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-border/60">
                          <Image
                            src={item.imageUrl || "/placeholder-food.jpg"}
                            alt={item.name}
                            fill
                            className={cn(
                              "object-cover",
                              suspended && "grayscale",
                            )}
                            sizes="48px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.price.toFixed(2)} ETB
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <Badge
                              variant="outline"
                              className="h-5 gap-1 px-1.5 text-[10px]"
                            >
                              <StationIcon type={item.type} />
                              {station}
                            </Badge>
                            {suspended ? (
                              <Badge
                                variant="secondary"
                                className="h-5 px-1.5 text-[10px] font-semibold uppercase tracking-wide"
                              >
                                Temporarily Unavailable
                              </Badge>
                            ) : inCart > 0 ? (
                              <Badge className="h-5 px-1.5 text-[10px]">
                                ×{inCart} in cart
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            suspended
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

          <div className="flex min-h-0 flex-col overflow-hidden bg-muted/10">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ticket preview
              </p>
              {cart.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={clearCart}
                >
                  Clear all
                </Button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
              <div className="space-y-2 p-3 sm:p-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-background/60 px-4 py-14 text-center">
                    <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium">Cart is empty</p>
                    <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">
                      Tap items on the left to build the order for this table.
                    </p>
                  </div>
                ) : (
                  cart.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center gap-2 rounded-xl border bg-card p-3 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {line.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {orderStationLabel(line)} ·{" "}
                          {(line.price * line.orderAmount).toFixed(2)} ETB
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => adjustCart(line.id, -1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-7 text-center text-sm font-bold tabular-nums">
                          {line.orderAmount}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
            <div className="shrink-0 border-t bg-card px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {cart.length} line{cart.length === 1 ? "" : "s"} ·{" "}
                  {cartPieces} piece{cartPieces === 1 ? "" : "s"}
                </span>
                <span className="text-lg font-bold text-primary tabular-nums">
                  {cartTotal.toFixed(2)} ETB
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-muted/20 px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || cart.length === 0}
            className="min-w-[140px] gap-2"
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Utensils className="h-4 w-4" />
                Send to kitchen/bar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
