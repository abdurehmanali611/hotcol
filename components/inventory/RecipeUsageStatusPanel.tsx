"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchRecipeStockConsumptions,
  fetchStationIngredientStocks,
  type RecipeStockConsumption,
  type StationIngredientStock,
} from "@/lib/actions";
import { toYmdLocal, parseYmdToDate } from "@/lib/hotelDateYmd";
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
  recipeUsageColumns,
  stationOnHandColumns,
} from "@/lib/dataTableColumns/recipeUsage";

type StationFilter = "ALL" | "KITCHEN" | "BAR";
type ViewMode = "deductions" | "on-hand";

type Props = {
  hotelName: string;
  /** Bumped by Admin/Manager header refresh. */
  refreshSignal?: number;
};

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
  const [view, setView] = useState<ViewMode>("deductions");

  const load = useCallback(async () => {
    setLoading(true);
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
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not load usage status";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [fromYmd, toYmd]);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  const filteredStocks = useMemo(() => {
    return stocks.filter((row) => {
      const st = String(row.station || "").toUpperCase();
      return station === "ALL" || st === station;
    });
  }, [stocks, station]);

  const filteredUsage = useMemo(() => {
    return consumptions.filter((row) => {
      const st = String(row.station || "").toUpperCase();
      return station === "ALL" || st === station;
    });
  }, [consumptions, station]);

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
          Station on-hand after stock-outs, and recipe deductions when kitchen
          or bar completes a plated item
          {hotelName ? ` · ${hotelName}` : ""}.
        </p>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <SelectItem value="BAR">Bar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">View</Label>
            <Select
              value={view}
              onValueChange={(v) => setView(v as ViewMode)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deductions">Recipe deductions</SelectItem>
                <SelectItem value="on-hand">Station on hand</SelectItem>
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
      ) : view === "deductions" ? (
        <RecipeUsageDataTable
          columns={recipeUsageColumns}
          data={filteredUsage}
          searchColumnId="menuItemTitle"
          searchPlaceholder="Search menu item…"
          initialSorting={[{ id: "createdAt", desc: true }]}
          emptyMessage="No recipe deductions in this range. Complete a kitchen/bar order that has a recipe."
        />
      ) : (
        <RecipeUsageDataTable
          columns={stationOnHandColumns}
          data={filteredStocks}
          searchColumnId="itemName"
          searchPlaceholder="Search ingredient…"
          initialSorting={[{ id: "itemName", desc: false }]}
          emptyMessage="No station stock yet. Stock out inventory to Kitchen or Bar first."
        />
      )}
    </div>
  );
}

/** @deprecated Use RecipeUsageStatusPanel */
export const CafeRecipeStockUsagePanel = RecipeUsageStatusPanel;
