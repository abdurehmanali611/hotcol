"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BedDouble,
  LayoutGrid,
  Minus,
  Plus,
  Search,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notifyApiFailure } from "@/lib/actions";
import {
  addLodgingBillLineApi,
  registerLodgingServiceChargeApi,
  type LodgingServiceItem,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import type { Item } from "@/lib/api/types";
import { toast } from "sonner";

export type ReceptionServiceCatalogItem = {
  key: string;
  source: "cafe" | "lodging";
  sourceId: number;
  name: string;
  price: number;
  unitLabel: string;
  imageUrl?: string | null;
  category?: string;
  type?: string;
};

function formatMoney(n: number) {
  return `ETB ${Number(n || 0).toLocaleString()}`;
}

export function cafeItemsToCatalog(items: Item[]): ReceptionServiceCatalogItem[] {
  return items
    .filter((i) => !i.isSuspended)
    .map((i) => ({
      key: `cafe:${i.id}`,
      source: "cafe" as const,
      sourceId: i.id,
      name: i.name,
      price: Number(i.price) || 0,
      unitLabel: "portion",
      imageUrl: i.imageUrl,
      category: i.category,
      type: i.type,
    }));
}

export function lodgingItemsToCatalog(
  items: LodgingServiceItem[],
): ReceptionServiceCatalogItem[] {
  return items
    .filter((i) => i.isActive !== false)
    .map((i) => ({
      key: `lodging:${i.id}`,
      source: "lodging" as const,
      sourceId: i.id,
      name: i.name,
      price: Number(i.unitPriceETB) || 0,
      unitLabel: i.unitLabel || "unit",
      imageUrl: i.imageUrl || null,
      category: i.kind === "laundry" ? "laundry" : "others",
      type: i.kind,
    }));
}

function stayRoomLabel(stay: LodgingStay): string {
  const rooms = stay.rooms
    .map((r) => r.room?.roomNumber)
    .filter(Boolean)
    .join(", ");
  const guest = stay.guest
    ? `${stay.guest.firstName} ${stay.guest.lastName}`.trim()
    : "Guest";
  return rooms
    ? `Rm ${rooms} · ${guest} · ${stay.voucherCode}`
    : `${guest} · ${stay.voucherCode}`;
}

type MenuCategory = "all" | "food" | "beverage" | "others" | "laundry";

export function ReceptionLodgingServiceOrderPanel({
  mode,
  stays,
  catalog,
  onCompleted,
}: {
  mode: "food_drink" | "laundry";
  stays: LodgingStay[];
  catalog: ReceptionServiceCatalogItem[];
  onCompleted: () => void | Promise<void>;
}) {
  const [stayId, setStayId] = useState("");
  const [searchedText, setSearchedText] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [menuCategory, setMenuCategory] = useState<MenuCategory>("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);

  const selectedStay = useMemo(
    () => stays.find((s) => String(s.id) === stayId) ?? null,
    [stays, stayId],
  );

  const roomNumber = useMemo(() => {
    if (!selectedStay) return "";
    return (
      selectedStay.rooms
        .map((r) => r.room?.roomNumber)
        .filter(Boolean)
        .join(", ") || ""
    );
  }, [selectedStay]);

  const uniqueTypes = useMemo(
    () =>
      [...new Set(catalog.map((i) => i.type).filter(Boolean) as string[])].sort(),
    [catalog],
  );

  const filteredItems = useMemo(() => {
    const q = searchedText.trim().toLowerCase();
    return catalog.filter((item) => {
      const cat = String(item.category || "").toLowerCase();
      const categoryOk =
        menuCategory === "all" ||
        (menuCategory === "laundry" && cat === "laundry") ||
        (menuCategory === "food" && cat === "food") ||
        (menuCategory === "beverage" && cat === "beverage") ||
        (menuCategory === "others" &&
          cat !== "food" &&
          cat !== "beverage" &&
          cat !== "laundry");
      const typeOk = selectedType === "All" || item.type === selectedType;
      const searchOk = !q || item.name.toLowerCase().includes(q);
      return categoryOk && typeOk && searchOk;
    });
  }, [catalog, menuCategory, selectedType, searchedText]);

  const categoryCounts = useMemo(() => {
    const counts = {
      all: catalog.length,
      food: 0,
      beverage: 0,
      others: 0,
      laundry: 0,
    };
    for (const item of catalog) {
      const cat = String(item.category || "").toLowerCase();
      if (cat === "food") counts.food += 1;
      else if (cat === "beverage") counts.beverage += 1;
      else if (cat === "laundry") counts.laundry += 1;
      else counts.others += 1;
    }
    return counts;
  }, [catalog]);

  const selectedItems = useMemo(
    () => catalog.filter((i) => selectedKeys.includes(i.key)),
    [catalog, selectedKeys],
  );

  const totalQty = selectedItems.reduce(
    (sum, item) => sum + (quantities[item.key] || 1),
    0,
  );
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.price * (quantities[item.key] || 1),
    0,
  );

  const toggleItem = (item: ReceptionServiceCatalogItem, checked: boolean) => {
    if (checked) {
      setSelectedKeys((prev) => [...prev, item.key]);
      setQuantities((prev) => ({ ...prev, [item.key]: prev[item.key] || 1 }));
    } else {
      setSelectedKeys((prev) => prev.filter((k) => k !== item.key));
      setQuantities((prev) => {
        const next = { ...prev };
        delete next[item.key];
        return next;
      });
    }
  };

  const bumpQty = (key: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [key]: Math.max(1, (prev[key] || 1) + delta),
    }));
  };

  const chargeItems = async (items: ReceptionServiceCatalogItem[]) => {
    if (!selectedStay) {
      toast.error("Select a room / stay first");
      return;
    }
    if (items.length === 0) {
      toast.error("Select at least one item");
      return;
    }
    setPending(true);
    let ok = 0;
    try {
      for (const item of items) {
        const qty = quantities[item.key] || 1;
        if (item.source === "lodging") {
          await registerLodgingServiceChargeApi({
            stayId: selectedStay.id,
            serviceItemId: item.sourceId,
            quantity: qty,
            roomNumber: roomNumber || undefined,
          });
        } else {
          await addLodgingBillLineApi({
            stayId: selectedStay.id,
            kind: mode,
            description: item.name,
            quantity: qty,
            unitPriceETB: item.price,
            roomNumber: roomNumber || undefined,
          });
        }
        ok += 1;
      }
      toast.success(
        `Charged ${ok} item${ok === 1 ? "" : "s"} to ${roomNumber ? `Rm ${roomNumber}` : "stay"}`,
      );
      setSelectedKeys([]);
      setQuantities({});
      await onCompleted();
    } catch (e) {
      notifyApiFailure(
        e,
        ok > 0 ? `Charged ${ok}, then failed` : "Could not place order",
      );
      if (ok > 0) await onCompleted();
    } finally {
      setPending(false);
    }
  };

  const submitOrder = async () => {
    await chargeItems(selectedItems);
  };

  return (
    <div className="relative flex min-h-full flex-col bg-linear-to-b from-background to-muted/20 rounded-xl border border-border/70 overflow-hidden">
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="space-y-4 px-4 py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3 min-w-0 flex-1 max-w-md">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {mode === "laundry" ? "Laundry items" : "Menu"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select a room, then tap cards or batch-select items.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="inline-flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                  Room / stay
                </Label>
                <Select value={stayId || undefined} onValueChange={setStayId}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select occupied room" />
                  </SelectTrigger>
                  <SelectContent>
                    {stays.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No active stays
                      </SelectItem>
                    ) : (
                      stays.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {stayRoomLabel(s)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedItems.length > 0 ? (
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <p className="text-xs text-muted-foreground tabular-nums">
                  {selectedItems.length} item
                  {selectedItems.length === 1 ? "" : "s"} · {totalQty} qty ·{" "}
                  <span className="font-medium text-foreground">
                    {formatMoney(totalAmount)}
                  </span>
                </p>
                <PendingButton
                  type="button"
                  className="h-10 gap-2 bg-emerald-600 hover:bg-emerald-700"
                  pending={pending}
                  disabled={!stayId}
                  onClick={() => void submitOrder()}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Charge {selectedItems.length} item
                  {selectedItems.length === 1 ? "" : "s"}
                </PendingButton>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <div className="relative w-full max-w-sm sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={
                  mode === "laundry" ? "Search laundry…" : "Search menu…"
                }
                className="h-10 pl-9"
                value={searchedText}
                onChange={(e) => setSearchedText(e.target.value)}
              />
            </div>
            {mode === "food_drink" ? (
              <Tabs
                value={menuCategory}
                onValueChange={(v) => setMenuCategory(v as MenuCategory)}
              >
                <TabsList>
                  <TabsTrigger value="all" className="gap-1.5">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    All ({categoryCounts.all})
                  </TabsTrigger>
                  <TabsTrigger value="food">
                    Food ({categoryCounts.food})
                  </TabsTrigger>
                  <TabsTrigger value="beverage">
                    Drinks ({categoryCounts.beverage})
                  </TabsTrigger>
                  <TabsTrigger value="others">
                    Other ({categoryCounts.others})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            ) : null}
          </div>

          {mode === "food_drink" && uniqueTypes.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={selectedType === "All" ? "default" : "outline"}
                onClick={() => setSelectedType("All")}
              >
                All types
              </Button>
              {uniqueTypes.map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={selectedType === t ? "default" : "outline"}
                  onClick={() => setSelectedType(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 md:px-6">
        {catalog.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">No items yet</CardTitle>
              <CardDescription>
                {mode === "laundry"
                  ? "Ask the manager to add laundry catalog items under Rooms → Laundry."
                  : "Ask the manager to add food & drink menu items."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No items match your filters.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const checked = selectedKeys.includes(item.key);
              const qty = quantities[item.key] || 1;
              return (
                <Card
                  key={item.key}
                  className={cn(
                    "overflow-hidden border-border/80 transition-shadow",
                    checked && "ring-2 ring-primary/40 shadow-md",
                  )}
                >
                  <div className="relative aspect-4/3 bg-muted/40">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                        {mode === "laundry" ? "Laundry" : "No image"}
                      </div>
                    )}
                    <div className="absolute left-2 top-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleItem(item, Boolean(v))}
                        className="bg-background/90"
                      />
                    </div>
                  </div>
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-snug">
                        {item.name}
                      </p>
                      <Badge variant="outline" className="shrink-0 font-normal">
                        {formatMoney(item.price)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      per {item.unitLabel}
                    </p>
                    {checked ? (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="size-8"
                            onClick={() => bumpQty(item.key, -1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm tabular-nums">
                            {qty}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="size-8"
                            onClick={() => bumpQty(item.key, 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!stayId || pending}
                          onClick={() => {
                            setQuantities((p) => ({ ...p, [item.key]: qty }));
                            void chargeItems([item]);
                          }}
                        >
                          Charge only
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={!stayId}
                        onClick={() => {
                          setSelectedKeys([item.key]);
                          setQuantities((p) => ({ ...p, [item.key]: 1 }));
                        }}
                      >
                        Select
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
