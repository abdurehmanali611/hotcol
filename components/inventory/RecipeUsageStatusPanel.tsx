"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchRecipeStockConsumptions,
  fetchStationIngredientStocks,
  type RecipeStockConsumption,
  type StationIngredientStock,
} from "@/lib/actions";
import { toYmdLocal, parseYmdToDate } from "@/lib/hotelDateYmd";
import {
  matchesDailyCountStationFilter,
  normalizeKitchenBarStationKey,
} from "@/lib/hotelDailyStation";
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
  recipeUsageStatusColumns,
  type RecipeUsageStatusRow,
} from "@/lib/dataTableColumns/recipeUsage";

type StationFilter = "ALL" | "KITCHEN" | "BAR";

type Props = {
  hotelName: string;
  /** Bumped by Admin/Manager header refresh. */
  refreshSignal?: number;
};

/** Refresh on-hand + usage together after kitchen/barista completes orders. */
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

function nameKey(name: string): string {
  return String(name || "")
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function stockLookupKey(station: string, ingredient: string): string {
  return `${normalizeKitchenBarStationKey(station)}\t${nameKey(ingredient)}`;
}

/** Map live station on-hand onto each usage-status (deduction) row. */
function withLiveOnHand(
  consumptions: RecipeStockConsumption[],
  stocks: StationIngredientStock[],
): RecipeUsageStatusRow[] {
  const onHandByKey = new Map<string, number>();
  for (const s of stocks) {
    const key = stockLookupKey(s.station, s.itemName);
    const prev = onHandByKey.get(key) || 0;
    onHandByKey.set(
      key,
      Math.round((prev + (Number(s.amount) || 0) + Number.EPSILON) * 100) / 100,
    );
  }

  return consumptions.map((c) => ({
    ...c,
    onHand: onHandByKey.get(stockLookupKey(c.station, c.ingredientName)) || 0,
  }));
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
        const [stockRows, usageRows] = await Promise.all([
          fetchStationIngredientStocks(),
          fetchRecipeStockConsumptions({
            from: startOfYmd(fromYmd),
            to: endOfYmd(toYmd),
          }),
        ]);
        setStocks(Array.isArray(stockRows) ? stockRows : []);
        setConsumptions(Array.isArray(usageRows) ? usageRows : []);
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

  // Same table continuously updates: usage rows appear, on-hand column drops.
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
    const withStock = withLiveOnHand(consumptions, stocks);
    return withStock.filter((row) =>
      matchesDailyCountStationFilter(row.station, station),
    );
  }, [consumptions, stocks, station]);

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
          Recipe deductions with live{" "}
          <span className="font-medium text-foreground">On hand</span> and{" "}
          <span className="font-medium text-foreground">Usage</span> columns.
          When an order is completed, usage is added and on-hand is deducted in
          this same table.
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
          columns={recipeUsageStatusColumns}
          data={rows}
          searchColumnId="menuItemTitle"
          searchPlaceholder="Search menu item…"
          initialSorting={[{ id: "createdAt", desc: true }]}
          emptyMessage="No recipe deductions in this range. Complete a kitchen/barista order that has a recipe — On hand and Usage will update in this table."
        />
      )}
    </div>
  );
}

/** @deprecated Use RecipeUsageStatusPanel */
export const CafeRecipeStockUsagePanel = RecipeUsageStatusPanel;
