 
"use client";

import { Item, type Order } from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Utensils,
  Coffee,
  ArrowRight,
  ShoppingBag,
  Plus,
  Minus,
  Search,
  LayoutGrid,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import BatchOrderModal from "./BatchOrderModal";
import { cn } from "@/lib/utils";

interface OrderProps {
  items: Item[];
  hotelName: string;
  openOrders?: Order[];
  onItemSelect: (item: Item) => void;
  onGoToPayment: () => void;
  onBatchOrderSuccess?: () => void;
}

type MenuCategory = "all" | "food" | "beverage" | "others";

export default function OrderComponent({
  items,
  hotelName,
  openOrders = [],
  onItemSelect,
  onGoToPayment,
  onBatchOrderSuccess,
}: OrderProps) {
  const [searchedText, setSearchedText] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [menuCategory, setMenuCategory] = useState<MenuCategory>("all");
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>(
    {},
  );

  const tenantItems = useMemo(
    () =>
      items.filter((item) =>
        rowHotelMatchesTenantScope(item.HotelName, hotelName),
      ),
    [items, hotelName],
  );

  const uniqueTypes = useMemo(
    () => [...new Set(tenantItems.map((item) => item.type))],
    [tenantItems],
  );

  const filteredItems = useMemo(() => {
    const q = searchedText.trim().toLowerCase();
    return tenantItems.filter((item) => {
      const cat = item.category.toLowerCase();
      const categoryOk =
        menuCategory === "all" ||
        (menuCategory === "food" && cat === "food") ||
        (menuCategory === "beverage" && cat === "beverage") ||
        (menuCategory === "others" && cat === "others");
      const typeOk = selectedType === "All" || item.type === selectedType;
      const searchOk = !q || item.name.toLowerCase().includes(q);
      return categoryOk && typeOk && searchOk;
    });
  }, [tenantItems, menuCategory, selectedType, searchedText]);

  const categoryCounts = useMemo(() => {
    const counts = { all: tenantItems.length, food: 0, beverage: 0, others: 0 };
    for (const item of tenantItems) {
      const cat = item.category.toLowerCase();
      if (cat === "food") counts.food += 1;
      else if (cat === "beverage") counts.beverage += 1;
      else if (cat === "others") counts.others += 1;
    }
    return counts;
  }, [tenantItems]);

  const handleItemCheck = (item: Item, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => {
        const newItems = [...prev, item];
        if (!itemQuantities[item.id]) {
          setItemQuantities((prevQ) => ({ ...prevQ, [item.id]: 1 }));
        }
        return newItems;
      });
    } else {
      setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
      setItemQuantities((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  };

  const updateItemQuantity = (itemId: number, amount: number) => {
    setItemQuantities((prev) => {
      const current = prev[itemId] || 1;
      return { ...prev, [itemId]: Math.max(1, current + amount) };
    });
  };

  const totalSelectedQuantity = selectedItems.reduce(
    (sum, item) => sum + (itemQuantities[item.id] || 1),
    0,
  );

  const totalSelectedAmount = selectedItems.reduce(
    (sum, item) => sum + item.price * (itemQuantities[item.id] || 1),
    0,
  );

  const batchModalItems = useMemo(
    () =>
      selectedItems.map((item) => ({
        ...item,
        orderAmount: itemQuantities[item.id] || 1,
      })),
    [selectedItems, itemQuantities],
  );

  const handleBatchOrderSuccess = () => {
    setSelectedItems([]);
    setItemQuantities({});
    setShowBatchModal(false);
    onBatchOrderSuccess?.();
  };

  return (
    <div className="relative flex min-h-full flex-col bg-linear-to-b from-background to-muted/20">
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                Menu
              </h2>
              <p className="text-sm text-muted-foreground">
                Tap a card for a quick order, or select items for a batch order.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={onGoToPayment}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                Pending payments
                <ArrowRight className="h-4 w-4" />
              </Button>
              {selectedItems.length > 0 ? (
                <Button
                  onClick={() => setShowBatchModal(true)}
                  size="sm"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Order {selectedItems.length} item
                  {selectedItems.length > 1 ? "s" : ""}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:items-center">
            <div className="relative w-full max-w-sm sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search menu…"
                className="h-10 pl-9"
                value={searchedText}
                onChange={(e) => setSearchedText(e.target.value)}
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-10 w-full sm:w-44">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Item type</SelectLabel>
                  <SelectItem value="All">All types</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Tabs
            value={menuCategory}
            onValueChange={(v) => setMenuCategory(v as MenuCategory)}
            className="w-full"
          >
            <TabsList className="grid h-auto w-full grid-cols-4 gap-1 bg-muted/50 p-1">
              <TabsTrigger value="all" className="gap-1.5 px-3 py-2">
                <LayoutGrid className="h-3.5 w-3.5" />
                All
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {categoryCounts.all}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="food" className="gap-1.5 px-3 py-2">
                <Utensils className="h-3.5 w-3.5" />
                Kitchen
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {categoryCounts.food}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="beverage" className="gap-1.5 px-3 py-2">
                <Coffee className="h-3.5 w-3.5" />
                Bar
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {categoryCounts.beverage}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="others" className="gap-1.5 px-3 py-2">
                Others
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {categoryCounts.others}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 md:px-6 md:py-6">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-20 text-center">
            <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-medium">No items match</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {tenantItems.length === 0
                ? "Add menu items in Admin to get started."
                : "Try another category or clear your search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredItems.map((item) => {
              const isSelected = selectedItems.some((i) => i.id === item.id);
              const quantity = itemQuantities[item.id] || 1;
              const totalPrice = item.price * quantity;

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "group flex flex-col overflow-hidden border-border/70 shadow-sm transition-all hover:border-primary/40 hover:shadow-md",
                    isSelected && "border-primary ring-2 ring-primary/15",
                  )}
                >
                  <button
                    type="button"
                    className="relative aspect-square w-full overflow-hidden bg-muted"
                    onClick={() => onItemSelect(item)}
                  >
                    <Image
                      src={item.imageUrl || "/placeholder-food.jpg"}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 200px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 pb-2 pt-8">
                      <p className="line-clamp-2 text-left text-sm font-semibold leading-snug text-white">
                        {item.name}
                      </p>
                    </div>
                  </button>

                  <CardFooter className="flex flex-col gap-2.5 p-3">
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-base font-bold tabular-nums text-primary">
                        {item.price.toFixed(2)}{" "}
                        <span className="text-[10px] font-medium text-muted-foreground">
                          ETB
                        </span>
                      </span>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px] capitalize"
                      >
                        {item.type}
                      </Badge>
                    </div>

                    {isSelected ? (
                      <div className="flex w-full items-center justify-between rounded-lg bg-primary/5 px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateItemQuantity(item.id, -1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">
                            {quantity}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateItemQuantity(item.id, 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <span className="text-xs font-semibold tabular-nums">
                          {totalPrice.toFixed(2)} ETB
                        </span>
                      </div>
                    ) : null}

                    <div className="flex w-full items-center justify-between gap-2">
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleItemCheck(item, checked === true)
                          }
                        />
                        Batch
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs"
                        onClick={() => onItemSelect(item)}
                      >
                        Order
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {selectedItems.length > 0 ? (
        <div className="sticky bottom-0 z-20 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur md:px-6">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {selectedItems.length} selected · {totalSelectedQuantity}{" "}
                  units
                </p>
                <p className="text-xs text-muted-foreground">
                  Ready for batch order
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-lg font-bold tabular-nums text-primary">
                {totalSelectedAmount.toFixed(2)} ETB
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setShowBatchModal(true)}
              >
                Order now
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <BatchOrderModal
        items={batchModalItems}
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        hotelName={hotelName}
        openOrders={openOrders}
        onSubmitSuccess={handleBatchOrderSuccess}
      />
    </div>
  );
}
