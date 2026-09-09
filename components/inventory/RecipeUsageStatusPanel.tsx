"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchItems,
  fetchRecipeStockConsumptions,
  fetchStationIngredientStocks,
  type Item,
  type RecipeStockConsumption,
  type StationIngredientStock,
} from "@/lib/actions";
import { toYmdLocal, parseYmdToDate } from "@/lib/hotelDateYmd";
import {
  matchesDailyCountStationFilter,
  normalizeKitchenBarStationKey,
} from "@/lib/hotelDailyStation";
import {
  evaluateRecipeStationAvailability,
  normalizeIngredientNameKey,
} from "@/lib/recipeStationAvailability";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecipeUsageDataTable } from "@/components/inventory/RecipeUsageDataTable";
import {
  menuItemUsageStatusColumns,
  type MenuItemUsageGroup,
} from "@/lib/dataTableColumns/recipeUsage";

type StationFilter = "ALL" | "KITCHEN" | "BAR";

type Props = {
  hotelName: string;
  refreshSignal?: number;
};

const LIVE_POLL_MS = 8_000;

function startOfYmd(ymd: string): Date {
  const d = parseYmdToDate(ymd) ?? new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfYmd(ymd: string): Date {
  const d = parseYmdToDate(ymd) ?? new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function laterDate(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
): Date | string | null {
  const ta = a ? new Date(a).getTime() : NaN;
  const tb = b ? new Date(b).getTime() : NaN;
  if (!Number.isFinite(ta) && !Number.isFinite(tb)) return null;
  if (!Number.isFinite(ta)) return b ?? null;
  if (!Number.isFinite(tb)) return a ?? null;
  return ta >= tb ? (a ?? null) : (b ?? null);
}

function buildMenuItemUsageGroups(
  consumptions: RecipeStockConsumption[],
  stocks: StationIngredientStock[],
  menuItems: Item[],
): MenuItemUsageGroup[] {
  type Acc = {
    menuItemTitle: string;
    station: string;
    orderIds: Set<number>;
    servingByOrder: Map<number, number>;
    ingredients: Map<
      string,
      { ingredientName: string; measuredBy: string; amount: number; lineCount: number }
    >;
    recentLines: RecipeStockConsumption[];
    lastUpdatedAt: Date | string | null;
  };

  const map = new Map<string, Acc>();

  for (const c of consumptions) {
    const title = String(c.menuItemTitle || "").trim();
    if (!title) continue;
    const station = normalizeKitchenBarStationKey(c.station);
    if (station !== "KITCHEN" && station !== "BAR") continue;
    const key = `${normalizeIngredientNameKey(title)}\t${station}`;
    let row = map.get(key);
    if (!row) {
      row = {
        menuItemTitle: title,
        station,
        orderIds: new Set(),
        servingByOrder: new Map(),
        ingredients: new Map(),
        recentLines: [],
        lastUpdatedAt: null,
      };
      map.set(key, row);
    }
    row.orderIds.add(c.orderId);
    const prevServings = row.servingByOrder.get(c.orderId);
    if (prevServings == null) {
      row.servingByOrder.set(
        c.orderId,
        Math.max(0, Math.floor(Number(c.orderAmount) || 0)),
      );
    }
    const ingKey = normalizeIngredientNameKey(c.ingredientName);
    const ing = row.ingredients.get(ingKey) || {
      ingredientName: String(c.ingredientName || "").trim(),
      measuredBy: String(c.measuredBy || "").trim(),
      amount: 0,
      lineCount: 0,
    };
    ing.amount =
      Math.round((ing.amount + (Number(c.amount) || 0) + Number.EPSILON) * 100) /
      100;
    ing.lineCount += 1;
    if (!ing.measuredBy && c.measuredBy) ing.measuredBy = String(c.measuredBy).trim();
    row.ingredients.set(ingKey, ing);
    row.recentLines.push(c);
    row.lastUpdatedAt = laterDate(row.lastUpdatedAt, c.createdAt);
  }

  const menuByName = new Map(
    menuItems.map((i) => [normalizeIngredientNameKey(i.name), i]),
  );

  return [...map.entries()]
    .map(([id, row]) => {
      const servingTotal = [...row.servingByOrder.values()].reduce(
        (s, n) => s + n,
        0,
      );
      const recentLines = [...row.recentLines].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const menuItem = menuByName.get(normalizeIngredientNameKey(row.menuItemTitle));
      let servingsAvailable = 0;
      if (menuItem) {
        servingsAvailable = evaluateRecipeStationAvailability({
          item: menuItem,
          stocks,
          servings: 1,
        }).servingsAvailable;
      } else {
        servingsAvailable = Number.NaN;
      }

      return {
        id,
        menuItemTitle: row.menuItemTitle,
        station: row.station,
        orderCount: row.orderIds.size,
        servingTotal,
        servingsAvailable,
        ingredientUsage: [...row.ingredients.values()].sort((a, b) =>
          a.ingredientName.localeCompare(b.ingredientName),
        ),
        recentLines: recentLines.slice(0, 40),
        lastUpdatedAt: row.lastUpdatedAt,
      } satisfies MenuItemUsageGroup;
    })
    .sort((a, b) => {
      if (a.station !== b.station) return a.station.localeCompare(b.station);
      return a.menuItemTitle.localeCompare(b.menuItemTitle);
    });
}

export function RecipeUsageStatusPanel({
  hotelName,
  refreshSignal = 0,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<StationIngredientStock[]>([]);
  const [consumptions, setConsumptions] = useState<RecipeStockConsumption[]>(
    [],
  );
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [fromYmd, setFromYmd] = useState(() => toYmdLocal(new Date()));
  const [toYmd, setToYmd] = useState(() => toYmdLocal(new Date()));
  const [station, setStation] = useState<StationFilter>("ALL");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const failToastAtRef = useRef(0);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (!silent) setLoading(true);
      try {
        const [stockRows, usageRows, items] = await Promise.all([
          fetchStationIngredientStocks(),
          fetchRecipeStockConsumptions({
            from: startOfYmd(fromYmd),
            to: endOfYmd(toYmd),
          }),
          fetchItems(),
        ]);
        setStocks(Array.isArray(stockRows) ? stockRows : []);
        setConsumptions(Array.isArray(usageRows) ? usageRows : []);
        setMenuItems(Array.isArray(items) ? items : []);
        setLastSyncedAt(new Date());
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not load usage status";
        const now = Date.now();
        if (!silent || now - failToastAtRef.current > 30_000) {
          failToastAtRef.current = now;
          toast.error(msg);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fromYmd, toYmd],
  );

  useEffect(() => {
    void load({ silent: false });
  }, [load, refreshSignal]);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void load({ silent: true });
    };
    const id = window.setInterval(tick, LIVE_POLL_MS);
    const onFocus = () => tick();
    const onVis = () => {
      if (!document.hidden) tick();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const rows = useMemo(() => {
    const groups = buildMenuItemUsageGroups(consumptions, stocks, menuItems);
    return groups.filter((row) =>
      matchesDailyCountStationFilter(row.station, station),
    );
  }, [consumptions, stocks, menuItems, station]);

  const today = toYmdLocal(new Date());
  const filtersActive =
    station !== "ALL" || fromYmd !== today || toYmd !== today;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Usage status
        </h1>
        <p className="text-sm text-muted-foreground text-pretty">
          One row per menu item.{" "}
          <span className="font-medium text-foreground">On hand</span> is how
          many servings the station can still make;{" "}
          <span className="font-medium text-foreground">Usage</span> hover shows
          ingredient detail, click opens the full sheet. Completing an order
          updates both.
          {hotelName ? ` · ${hotelName}` : ""}.
        </p>
        {lastSyncedAt ? (
          <p className="text-[11px] tabular-nums text-muted-foreground">
            Live · last sync{" "}
            {lastSyncedAt.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        ) : null}
      </header>

      <ListPanelFilterBar
        title="Filters"
        showClear={filtersActive}
        onClear={() => {
          setFromYmd(today);
          setToYmd(today);
          setStation("ALL");
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From</Label>
            <HotelDayPicker value={fromYmd} onChange={setFromYmd} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To</Label>
            <HotelDayPicker value={toYmd} onChange={setToYmd} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Station</Label>
            <Select
              value={station}
              onValueChange={(v) => setStation(v as StationFilter)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Station" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All stations</SelectItem>
                <SelectItem value="KITCHEN">Kitchen</SelectItem>
                <SelectItem value="BAR">Bar / Barista</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ListPanelFilterBar>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading usage status…</p>
        </div>
      ) : (
        <RecipeUsageDataTable
          columns={menuItemUsageStatusColumns}
          data={rows}
          searchColumnId="menuItemTitle"
          searchPlaceholder="Search menu item…"
          initialSorting={[{ id: "menuItemTitle", desc: false }]}
          emptyMessage="No menu-item usage in this range yet. Complete kitchen/barista orders with recipes — rows appear here with on-hand and usage."
        />
      )}
    </div>
  );
}

/** @deprecated Use RecipeUsageStatusPanel */
export const CafeRecipeStockUsagePanel = RecipeUsageStatusPanel;
