"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  ClipboardList,
  Coffee,
  Loader2,
  Search,
  Utensils,
  Layers,
} from "lucide-react";
import type { Item } from "@/lib/actions";
import { updateItemStationPrepQty } from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  { value: "all", label: "All", icon: Layers },
  { value: "food", label: "Food", icon: Utensils },
  { value: "beverage", label: "Beverage", icon: Coffee },
  { value: "others", label: "Others", icon: ClipboardList },
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
    <div className="p-3 sm:p-5 md:p-6">
      <Card className="overflow-hidden border-primary/15 bg-card/95 shadow-lg ring-1 ring-black/3 dark:ring-white/6">
        <div className="h-1 bg-linear-to-r from-violet-500 via-primary/70 to-cyan-400/80" />
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
            <ClipboardList className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Kitchen & bar prep totals
          </CardTitle>
          <CardDescription className="max-w-2xl text-pretty leading-relaxed">
            Choose which menu items appear in the &quot;To prepare&quot; sidebar
            on kitchen and bar screens with aggregated order quantities. Individual
            order cards are always shown regardless of this setting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="tabular-nums font-normal">
                {enabledCount} of {tenantItems.length} showing totals
              </Badge>
              <span className="text-xs text-muted-foreground">
                Toggle per item below
              </span>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu items…"
                className="h-10 bg-background pl-9"
              />
            </div>
          </div>

          <Tabs
            value={category}
            onValueChange={(value) =>
              setCategory(value as (typeof CATEGORY_TABS)[number]["value"])
            }
          >
            <TabsList className="grid h-10 w-full grid-cols-4 sm:max-w-xl">
              {CATEGORY_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="gap-1.5 text-xs sm:text-sm"
                  >
                    <Icon className="hidden h-3.5 w-3.5 sm:inline" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {CATEGORY_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                {filteredItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-12 text-center">
                    <Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No items match</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try another category or search term.
                    </p>
                  </div>
                ) : (
                  <ul className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                    {filteredItems.map((item, index) => {
                      const enabled = item.showStationPrepQty !== false;
                      const busy = savingId === item.id;
                      return (
                        <li
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 transition-colors sm:px-4",
                            index > 0 && "border-t border-border/50",
                            !enabled && "bg-muted/15",
                            "hover:bg-muted/25",
                          )}
                        >
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-border/60">
                            <Image
                              src={item.imageUrl || "/placeholder-food.jpg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="44px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium leading-tight">
                              {item.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-normal capitalize"
                              >
                                {item.type}
                              </Badge>
                              <span className="text-xs capitalize text-muted-foreground">
                                {item.category}
                              </span>
                            </div>
                          </div>
                          <label className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-2 py-1 hover:border-border/60">
                            <span className="hidden text-xs text-muted-foreground sm:inline">
                              {enabled ? "Visible" : "Hidden"}
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
