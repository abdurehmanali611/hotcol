"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ClipboardList, Loader2, Search } from "lucide-react";
import type { Item } from "@/lib/actions";
import { updateItemStationPrepQty } from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Props = {
  items: Item[];
  hotelName: string;
  onRefresh: () => void | Promise<void>;
};

const CATEGORY_TABS = [
  { value: "all", label: "All" },
  { value: "food", label: "Food" },
  { value: "beverage", label: "Beverage" },
  { value: "others", label: "Others" },
] as const;

export function CafeAdminStationPrepQtyPanel({
  items,
  hotelName,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [category, setCategory] =
    useState<(typeof CATEGORY_TABS)[number]["value"]>("all");

  const tenantItems = useMemo(
    () =>
      items.filter((item) =>
        rowHotelMatchesTenantScope(item.HotelName, hotelName),
      ),
    [items, hotelName],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenantItems.filter((item) => {
      const cat = item.category.toLowerCase();
      const categoryOk =
        category === "all" ||
        (category === "food" && cat === "food") ||
        (category === "beverage" && cat === "beverage") ||
        (category === "others" && cat === "others");
      const searchOk =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q);
      return categoryOk && searchOk;
    });
  }, [tenantItems, category, search]);

  const enabledCount = useMemo(
    () =>
      tenantItems.filter((item) => item.showStationPrepQty !== false).length,
    [tenantItems],
  );

  const handleToggle = async (item: Item, next: boolean) => {
    setSavingId(item.id);
    try {
      await updateItemStationPrepQty(item.id, next);
      await onRefresh();
      toast.success(
        next
          ? `"${item.name}" will show totals on kitchen/bar screens.`
          : `"${item.name}" hidden from kitchen/bar totals.`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update prep quantity display";
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6 p-3 sm:p-5 md:p-6">
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="h-1 bg-linear-to-r from-primary/80 via-primary/40 to-transparent" />
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <ClipboardList className="h-4 w-4" />
            </span>
            Kitchen & bar prep totals
          </CardTitle>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Choose which menu items appear in the &quot;To prepare&quot; sidebar
            on kitchen and bar screens with their aggregated order quantities.
            Individual order cards are always shown regardless of this setting.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Badge variant="secondary" className="w-fit tabular-nums">
              {enabledCount} of {tenantItems.length} items showing totals
            </Badge>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
                className="pl-9"
              />
            </div>
          </div>

          <Tabs
            value={category}
            onValueChange={(value) =>
              setCategory(value as (typeof CATEGORY_TABS)[number]["value"])
            }
          >
            <TabsList className="grid h-10 w-full grid-cols-4 sm:max-w-lg">
              {CATEGORY_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORY_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                {filteredItems.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                    No items match your filters.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
                    {filteredItems.map((item) => {
                      const enabled = item.showStationPrepQty !== false;
                      const busy = savingId === item.id;
                      return (
                        <li
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 sm:px-4",
                            !enabled && "bg-muted/20",
                          )}
                        >
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md ring-1 ring-border/60">
                            <Image
                              src={item.imageUrl || "/placeholder-food.jpg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="44px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{item.name}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className="text-[10px] capitalize"
                              >
                                {item.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground capitalize">
                                {item.category}
                              </span>
                            </div>
                          </div>
                          <label className="flex shrink-0 items-center gap-2">
                            <span className="hidden text-xs text-muted-foreground sm:inline">
                              {enabled ? "Show total" : "Hidden"}
                            </span>
                            {busy ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : (
                              <Switch
                                checked={enabled}
                                disabled={busy}
                                onCheckedChange={(checked) =>
                                  void handleToggle(item, checked === true)
                                }
                                aria-label={`Show prep total for ${item.name}`}
                              />
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
