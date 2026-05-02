/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Table as TableModel, Waiter } from "@/lib/actions";
import {
  aggregateTableIncomeInRange,
  aggregateWaiterIncomeInRange,
  getIncomePeriodRange,
  rankTablesByRevenueAndVolume,
  rankWaitersByRevenueAndTables,
  type IncomePeriod,
} from "@/lib/incomeAggregation";
import { BarChart3, Info } from "lucide-react";

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
  const [anchorStr, setAnchorStr] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const anchorDate = useMemo(() => {
    const d = new Date(anchorStr + "T12:00:00");
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [anchorStr]);

  const range = useMemo(
    () => getIncomePeriodRange(period, anchorDate),
    [period, anchorDate],
  );

  const hotelWaiters = useMemo(
    () => waiters.filter((w) => w.HotelName === hotelName),
    [waiters, hotelName],
  );
  const hotelTables = useMemo(
    () => tables.filter((t) => t.HotelName === hotelName),
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
    <Card className="mx-4 mb-6 border border-emerald-500/20 bg-emerald-950/10">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Period</Label>
              <Select
                value={period}
                onValueChange={(v) => setPeriod(v as IncomePeriod)}
              >
                <SelectTrigger className="w-[180px]">
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
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Reference date
                </Label>
                <input
                  type="date"
                  className="flex h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={anchorStr}
                  onChange={(e) => setAnchorStr(e.target.value)}
                />
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
          <TabsList className="mb-4">
            <TabsTrigger value="waiters">Waiters</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
          </TabsList>
          <TabsContent value="waiters">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Rank</TableHead>
                  <TableHead>Waiter</TableHead>
                  <TableHead className="text-right">Revenue (ETB)</TableHead>
                  <TableHead className="text-right">Distinct tables</TableHead>
                  <TableHead className="text-right">Paid entries</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedWaiters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm">
                      No waiters for this hotel.
                    </TableCell>
                  </TableRow>
                ) : (
                  rankedWaiters.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.rank}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right">
                        {row.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.uniqueTables}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.completions}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.composite.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="tables">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Rank</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Revenue (ETB)</TableHead>
                  <TableHead className="text-right">Paid entries</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedTables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm">
                      No tables for this hotel.
                    </TableCell>
                  </TableRow>
                ) : (
                  rankedTables.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.rank}</TableCell>
                      <TableCell>#{row.tableNo}</TableCell>
                      <TableCell className="text-right">
                        {row.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.completions}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.composite.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
