"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { BarChart3, CalendarIcon, Download, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/app/StoreItems/data-table";
import {
  tableIncomeColumns,
  waiterIncomeColumns,
} from "@/lib/dataTableColumns/incomeRankings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Table as TableModel, Waiter } from "@/lib/actions";
import {
  exportToExcel,
  prepareTableRankExportData,
  prepareWaiterRankExportData,
} from "@/lib/actions";
import {
  aggregateTableIncomeInRange,
  aggregateWaiterIncomeInRange,
  getIncomePeriodRange,
  rankTablesByRevenueAndVolume,
  rankWaitersByRevenueAndTables,
  type IncomePeriod,
} from "@/lib/incomeAggregation";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { formatCafeTableDisplay } from "@/lib/cafeTableOrder";

type Props = {
  waiters: Waiter[];
  tables: TableModel[];
  hotelName: string;
};

export default function AdminIncomeRankings({
  waiters,
  tables,
  hotelName,
}: Props) {
  const [period, setPeriod] = useState<IncomePeriod>("day");
  const [anchorDate, setAnchorDate] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [exportingWaiters, setExportingWaiters] = useState(false);
  const [exportingTables, setExportingTables] = useState(false);

  const range = useMemo(
    () => getIncomePeriodRange(period, anchorDate),
    [period, anchorDate],
  );

  const hotelWaiters = useMemo(
    () =>
      waiters.filter((w) =>
        rowHotelMatchesTenantScope(w.HotelName, hotelName),
      ),
    [waiters, hotelName],
  );
  const hotelTables = useMemo(
    () =>
      tables.filter((t) =>
        rowHotelMatchesTenantScope(t.HotelName, hotelName),
      ),
    [tables, hotelName],
  );

  const rankedWaiters = useMemo(() => {
    const base = hotelWaiters.map((w) => {
      const agg = aggregateWaiterIncomeInRange(
        w.payment,
        w.price,
        w.tablesServed,
        w.incomeAt,
        range,
      );
      return {
        id: w.id,
        name: w.name,
        revenue: agg.revenue,
        uniqueTables: agg.uniqueTables,
        completions: agg.completions,
      };
    });
    return rankWaitersByRevenueAndTables(base);
  }, [hotelWaiters, range]);

  const rankedTables = useMemo(() => {
    const base = hotelTables.map((t) => {
      const agg = aggregateTableIncomeInRange(
        t.payment,
        t.price,
        t.incomeAt,
        range,
      );
      return {
        id: t.id,
        tableNo: t.tableNo,
        tableLabel: formatCafeTableDisplay(t.tableNo, t.orderCaption),
        revenue: agg.revenue,
        completions: agg.completions,
      };
    });
    return rankTablesByRevenueAndVolume(base);
  }, [hotelTables, range]);

  const periodLabel =
    period === "day"
      ? "day"
      : period === "week"
        ? "week (Mon–Sun)"
        : period === "month"
          ? "calendar month"
          : "all time";

  const dateRangeLabel = useMemo(() => {
    if (!range) return "All time";
    return `${format(range.start, "yyyy-MM-dd")} – ${format(range.end, "yyyy-MM-dd")}`;
  }, [range]);

  const rankExportFilter = useMemo(
    () => ({ periodLabel, dateRangeLabel }),
    [periodLabel, dateRangeLabel],
  );

  return (
    <Card className="mb-4 overflow-hidden border-primary/15 bg-card/95 shadow-md ring-1 ring-black/3 dark:ring-white/6 sm:mb-6">
      <div className="h-0.5 bg-linear-to-r from-emerald-500/80 to-teal-400/70" />
      <CardHeader className="space-y-3 px-3 pb-2 pt-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="h-4 w-4 shrink-0 text-emerald-500 sm:h-5 sm:w-5" />
              <span className="truncate">Income & performance</span>
            </CardTitle>
            <CardDescription className="text-pretty text-xs sm:text-sm">
              Filter by {periodLabel}. Rank balances revenue and volume.
            </CardDescription>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-[200px] sm:flex-col sm:gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Period</Label>
              <Select
                value={period}
                onValueChange={(v) => setPeriod(v as IncomePeriod)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today / selected day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period !== "all" && (
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs text-muted-foreground">
                  Reference date
                </Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{format(anchorDate, "PPP")}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={anchorDate}
                      captionLayout="dropdown"
                      buttonVariant="ghost"
                      onSelect={(d) => {
                        if (d) {
                          const next = new Date(d);
                          next.setHours(12, 0, 0, 0);
                          setAnchorDate(next);
                          setCalendarOpen(false);
                        }
                      }}
                      initialFocus
                      classNames={{
                        day: "cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>
        <p className="mt-1 hidden items-start gap-2 text-xs text-muted-foreground sm:flex">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          New payments store a timestamp per entry. Older rows without a
          timestamp are included in &quot;All time&quot; only, not in day/week/month
          filters.
        </p>
      </CardHeader>
      <CardContent className="px-2 pb-4 pt-0 sm:px-6 sm:pb-6">
        <Tabs defaultValue="waiters">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2">
            <TabsTrigger value="waiters" className="text-xs sm:text-sm">
              Waiters
            </TabsTrigger>
            <TabsTrigger value="tables" className="text-xs sm:text-sm">
              Tables
            </TabsTrigger>
          </TabsList>
          <TabsContent value="waiters">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Ranking for {periodLabel}
                {period !== "all" ? ` · ${dateRangeLabel}` : ""}
              </p>
              <PendingButton
                type="button"
                variant="outline"
                size="sm"
                pending={exportingWaiters}
                className="w-full cursor-pointer gap-2 sm:w-auto"
                onClick={async () => {
                  setExportingWaiters(true);
                  try {
                    await exportToExcel(
                      prepareWaiterRankExportData(
                        rankedWaiters,
                        rankExportFilter,
                      ),
                    );
                  } catch {
                  } finally {
                    setExportingWaiters(false);
                  }
                }}
              >
                <Download className="h-4 w-4" /> Export Excel
              </PendingButton>
            </div>
            <DataTable
              columns={waiterIncomeColumns}
              data={rankedWaiters}
              searchColumnId="name"
              searchPlaceholder="Search waiters…"
              emptyMessage="No waiters for this hotel."
            />
          </TabsContent>
          <TabsContent value="tables">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Ranking for {periodLabel}
                {period !== "all" ? ` · ${dateRangeLabel}` : ""}
              </p>
              <PendingButton
                type="button"
                variant="outline"
                size="sm"
                pending={exportingTables}
                className="w-full cursor-pointer gap-2 sm:w-auto"
                onClick={async () => {
                  setExportingTables(true);
                  try {
                    await exportToExcel(
                      prepareTableRankExportData(
                        rankedTables,
                        rankExportFilter,
                      ),
                    );
                  } catch {
                  } finally {
                    setExportingTables(false);
                  }
                }}
              >
                <Download className="h-4 w-4" /> Export Excel
              </PendingButton>
            </div>
            <DataTable
              columns={tableIncomeColumns}
              data={rankedTables}
              searchColumnId="tableNo"
              searchPlaceholder="Search table #…"
              emptyMessage="No tables for this hotel."
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
