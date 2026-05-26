"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { BarChart3, CalendarIcon, Info } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Table as TableModel, Waiter } from "@/lib/actions";
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

  return (
    <Card className="mb-4 border border-emerald-500/20 bg-emerald-950/10 sm:mb-6">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              Income & performance
            </CardTitle>
            <CardDescription>
              Filter by {periodLabel}. Rank balances revenue and volume
              (distinct tables for waiters, completed payments for tables).
            </CardDescription>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-3 sm:w-[200px]">
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
        <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          New payments store a timestamp per entry. Older rows without a
          timestamp are included in &quot;All time&quot; only, not in day/week/month
          filters.
        </p>
      </CardHeader>
      <CardContent>
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
            <DataTable
              columns={waiterIncomeColumns}
              data={rankedWaiters}
              searchColumnId="name"
              searchPlaceholder="Search waiters…"
              emptyMessage="No waiters for this hotel."
            />
          </TabsContent>
          <TabsContent value="tables">
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
