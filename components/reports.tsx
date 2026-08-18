/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  Download,
  FileBarChart,
  Loader2,
  CheckCircle2,
  XCircle,
  Wallet,
  History,
  Hourglass,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  CreditCard,
  Utensils,
  Coffee,
  Package,
  Layers,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { CafeOrderModeChangeNotice } from "@/components/cafe/CafeOrderModeChangeNotice";
import { useCafeOrderMode } from "@/hooks/useCafeOrderMode";
import { isAnalogCafeOrderMode } from "@/lib/cafeOrderMode";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompletedOrders from "@/app/CompletedOrdersTable/page";
import CancelledOrders from "@/app/CancelledOrdersTable/page";
import FailedOrdersTable from "@/app/FailedOrdersTable/page";
import PendingPaymentOrders from "@/components/cafe/PendingPaymentOrders";
import CafeReportInProgressExpired from "@/components/cafe/CafeReportInProgressExpired";
import { Cashout, fetchCashout, fetchTables, type Order, type Table } from "@/lib/actions";
import type { CafeReportType, Item } from "@/lib/api/types";
import {
  isBankPayment,
  isCreditPayment,
} from "@/lib/api/cafeOrders";
import {
  cafeReportProfitLabel,
  filterCafeReportCashouts,
  filterCafeReportPeriodOrders,
  isCafeReportCancelledOrder,
  isCafeReportCompletedOrder,
  isCafeReportExpiredOrder,
  isCafeReportFailedOrder,
  isCafeReportInProgressOrder,
  isCafeReportOpenPendingPaymentOrder,
} from "@/lib/cafeReportFilter";
import {
  cafeBusinessHalfYear,
  cafeBusinessQuarter,
  cafeBusinessYear,
  cafeBusinessYearMonth,
} from "@/lib/cafeBusinessDay";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { cafeReportProfitMessage } from "@/lib/cafeRecipe";
import Cashouts from "@/app/CashoutTable/page";

const CAFE_REPORT_TYPE_OPTIONS: { value: CafeReportType; label: string }[] = [
  { value: "Daily", label: "Daily Report" },
  { value: "Monthly", label: "Monthly Report" },
  { value: "Quarterly", label: "Quarterly Report" },
  { value: "HalfYearly", label: "Half-Yearly Report" },
  { value: "Yearly", label: "Yearly Report" },
];

function cafeReportPeriodHint(type: CafeReportType, date: Date): string {
  const year = cafeBusinessYear(date);
  switch (type) {
    case "Daily":
      return "Includes paid sales for the selected day (Addis Ababa time).";
    case "Monthly": {
      const ym = cafeBusinessYearMonth(date);
      return ym
        ? `Includes paid sales for ${ym} (full month).`
        : "Includes paid sales for the selected month.";
    }
    case "Quarterly": {
      const q = cafeBusinessQuarter(date);
      return q > 0
        ? `Includes paid sales for Q${q} ${year}.`
        : "Includes paid sales for the selected quarter.";
    }
    case "HalfYearly": {
      const h = cafeBusinessHalfYear(date);
      return h > 0
        ? `Includes paid sales for H${h} ${year} (${h === 1 ? "Jan–Jun" : "Jul–Dec"}).`
        : "Includes paid sales for the selected half-year.";
    }
    case "Yearly":
      return year
        ? `Includes paid sales for the full year ${year}.`
        : "Includes paid sales for the selected year.";
    default:
      return "";
  }
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#a855f7",
  "#14b8a6",
];

type CategoryQty = { name: string; quantity: number };
type PaymentAccent = "cash" | "bank" | "credit";

const PAYMENT_ACCENT: Record<
  PaymentAccent,
  {
    panel: string;
    pill: string;
    iconWrap: string;
    bar: string;
  }
> = {
  cash: {
    panel: "border-blue-500/10 bg-blue-500/[0.03]",
    pill: "bg-muted/40 text-muted-foreground",
    iconWrap: "bg-muted/50 text-muted-foreground",
    bar: "bg-blue-500/35",
  },
  bank: {
    panel: "border-emerald-500/10 bg-emerald-500/[0.03]",
    pill: "bg-muted/40 text-muted-foreground",
    iconWrap: "bg-muted/50 text-muted-foreground",
    bar: "bg-emerald-500/35",
  },
  credit: {
    panel: "border-purple-500/10 bg-purple-500/[0.03]",
    pill: "bg-muted/40 text-muted-foreground",
    iconWrap: "bg-muted/50 text-muted-foreground",
    bar: "bg-purple-500/35",
  },
};

function categoryIcon(name: string) {
  const key = name.trim().toLowerCase();
  if (key.includes("food")) return Utensils;
  if (key.includes("beverage") || key.includes("drink")) return Coffee;
  if (key.includes("other")) return Package;
  return Layers;
}

function paymentChannel(order: Order): "cash" | "bank" | "credit" {
  if (isCreditPayment(order)) return "credit";
  if (isBankPayment(order)) return "bank";
  return "cash";
}

function aggregateCategoryQuantities(orders: any[]): CategoryQty[] {
  const map: Record<string, number> = {};
  for (const order of orders) {
    const cat = String(order.category ?? "").trim() || "Uncategorized";
    map[cat] = (map[cat] || 0) + (Number(order.orderAmount) || 0);
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([name, quantity]) => ({ name, quantity }));
}

function CategorySoldBreakdown({
  items,
  accent,
}: {
  items: CategoryQty[];
  accent: PaymentAccent;
}) {
  const theme = PAYMENT_ACCENT[accent];

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "mt-5 rounded-xl border border-dashed p-4 text-center",
          theme.panel,
        )}
      >
        <p className="text-xs text-muted-foreground">
          No category sales in this channel yet.
        </p>
      </div>
    );
  }

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const maxQty = Math.max(...items.map((item) => item.quantity), 1);

  return (
    <div className={cn("mt-5 rounded-lg border p-3", theme.panel)}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Items by category
        </p>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums",
            theme.pill,
          )}
        >
          {totalUnits.toLocaleString()} sold
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const Icon = categoryIcon(item.name);
          const widthPct = Math.max(6, (item.quantity / maxQty) * 100);

          return (
            <div key={item.name} className="px-0.5 py-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                      theme.iconWrap,
                    )}
                  >
                    <Icon className="h-3 w-3 opacity-70" aria-hidden />
                  </span>
                  <span className="truncate text-sm font-medium capitalize text-foreground/90">
                    {item.name}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {item.quantity.toLocaleString()}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn("h-full rounded-full", theme.bar)}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    const displayValue = data.value ?? data.sales ?? 0;
    const displayAmount = data.totalAmount ?? 0;
    const displayProfit = data.profit ?? 0;

    return (
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-xl">
        <p className="text-sm font-semibold text-slate-100 mb-2 border-b border-slate-800 pb-1">
          {label || data.name}
        </p>
        <div className="space-y-1">
          <p className="text-xs text-slate-400 flex justify-between gap-4">
            Quantity:{" "}
            <span className="text-slate-100 font-medium">
              {displayAmount} items
            </span>
          </p>
          <p className="text-sm font-bold text-emerald-400 flex justify-between gap-4">
            Revenue: <span>{displayValue.toLocaleString()} ETB</span>
          </p>
          <p className="text-sm font-bold text-sky-400 flex justify-between gap-4">
            Profit: <span>{displayProfit.toLocaleString()} ETB</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function Reports({
  onGenerateReport,
  onExportReport,
  orders,
  hotelName,
  items = [],
}: {
  onGenerateReport: (opts: { date: Date; type: CafeReportType }) => Promise<any>;
  onExportReport: (reportData: any, reportType: CafeReportType) => Promise<void>;
  orders: Order[];
  hotelName: string;
  items?: Pick<Item, "name" | "recipeJson">[];
}) {
  const [displayName, setDisplayName] = useState(hotelName);
  const [date, setDate] = useState<Date>(new Date());
  const [reportType, setReportType] = useState<CafeReportType>("Daily");
  const [reportData, setReportData] = useState<any>(null);
  const [cashouts, setCashouts] = useState<Cashout[]>([]);
  const [loading, setLoading] = useState(false);
  const [cafeTables, setCafeTables] = useState<
    Pick<Table, "tableNo" | "orderCaption">[]
  >([]);
  const analog = isAnalogCafeOrderMode(useCafeOrderMode());

  useEffect(() => {
    const d = localStorage.getItem("hotel_display_name")?.trim();
    if (d) setDisplayName(d);
  }, []);

  useEffect(() => {
    const loadCashouts = async () => {
      try {
        if (hotelName) {
          const [fetchData, tables] = await Promise.all([
            fetchCashout(hotelName),
            fetchTables(),
          ]);
          setCashouts(fetchData);
          setCafeTables(
            tables.filter((t) =>
              rowHotelMatchesTenantScope(t.HotelName, hotelName),
            ),
          );
        }
      } catch (error) {
        console.error("Failed to fetch cashouts:", error);
      }
    };
    loadCashouts();
  }, [hotelName]);

  const reportRevenueOrders = useMemo(() => {
    if (!reportData?.orders) return [];
    return reportData.orders;
  }, [reportData]);

  const reportPeriodOrders = useMemo(() => {
    if (!reportData) return [];
    return filterCafeReportPeriodOrders(orders, {
      HotelName: hotelName,
      date,
      type: reportType,
    });
  }, [orders, reportData, date, reportType, hotelName]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await onGenerateReport({ date, type: reportType });
      setReportData(data);
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setLoading(false);
    }
  };

  const analyticsData = useMemo(() => {
    const empty = {
      category: [] as { name: string; value: number; totalAmount: number; profit: number }[],
      type: [] as { name: string; value: number; totalAmount: number; profit: number }[],
      titles: [] as { name: string; value: number; totalAmount: number; profit: number }[],
      items: [] as {
        name: string;
        sales: number;
        totalAmount: number;
        profit: number;
      }[],
      totalProfit: 0,
      profitIncludedLines: 0,
      profitExcludedLines: 0,
      totalOrderUnits: 0,
      paidLineCount: 0,
    };
    if (!reportData?.analytics) return empty;
    return reportData.analytics;
  }, [reportData]);

  const profitMessage = useMemo(
    () => cafeReportProfitMessage(analyticsData),
    [analyticsData],
  );

  const paymentCategoryBreakdown = useMemo(() => {
    const byChannel = {
      cash: [] as any[],
      bank: [] as any[],
      credit: [] as any[],
    };

    for (const order of reportRevenueOrders) {
      byChannel[paymentChannel(order)].push(order);
    }

    return {
      cash: aggregateCategoryQuantities(byChannel.cash),
      bank: aggregateCategoryQuantities(byChannel.bank),
      credit: aggregateCategoryQuantities(byChannel.credit),
    };
  }, [reportRevenueOrders]);

  const getCompletedOrders = () =>
    reportPeriodOrders.filter((o: any) => isCafeReportCompletedOrder(o));
  const getCancelledOrders = () =>
    reportPeriodOrders.filter((o: any) => isCafeReportCancelledOrder(o));
  const getInProgressOrders = () =>
    reportPeriodOrders.filter((o: any) =>
      isCafeReportInProgressOrder(o, analog),
    );
  const getExpiredOrders = () =>
    reportPeriodOrders.filter((o: any) =>
      isCafeReportExpiredOrder(o, analog),
    );
  const getPendingPaymentOrders = () =>
    reportPeriodOrders.filter((o: any) =>
      isCafeReportOpenPendingPaymentOrder(o),
    );
  const getFailedOrders = () =>
    reportPeriodOrders.filter((o: any) => isCafeReportFailedOrder(o));

  const filteredCashouts = filterCafeReportCashouts(cashouts, {
    date,
    type: reportType,
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-3 text-foreground sm:space-y-6">
      <Card className="overflow-hidden border border-border/50 bg-card shadow-sm">
        <div className="h-0.5 bg-linear-to-r from-primary/40 via-primary/20 to-transparent" />
        <CardHeader className="px-3 pb-2 pt-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <FileBarChart className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base font-bold tracking-tight sm:text-xl">
                Financial Reports
              </CardTitle>
              <CardDescription className="text-pretty text-xs sm:text-sm">
                Generate and export sales data for {displayName}.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-3 pb-4 sm:px-6 sm:pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-60 justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Select
            value={reportType}
            onValueChange={(v: CafeReportType) => {
              setReportType(v);
              setReportData(null);
            }}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              {CAFE_REPORT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full sm:w-auto px-8"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileBarChart className="mr-2 h-4 w-4" />
            )}{" "}
            Generate
          </Button>
          {reportData && (
            <Button
              variant="secondary"
              onClick={() => onExportReport(reportData, reportType)}
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          )}
          </div>
          <p className="text-xs text-muted-foreground">
            {cafeReportPeriodHint(reportType, date)}
          </p>
        </CardContent>
      </Card>

      {reportData && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <CafeOrderModeChangeNotice />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              { label: "Total Sales", value: reportData.totalSales },
              {
                label: "Total Cashouts",
                value: reportData.totalCashouts,
                color: "text-destructive",
              },
              {
                label: "Net Sales",
                value: reportData.netSales,
                color: "text-emerald-500",
              },
              {
                label: cafeReportProfitLabel(reportType),
                value: reportData.totalProfit ?? analyticsData.totalProfit,
                color: "text-sky-500",
                hint:
                  analyticsData.paidLineCount > 0
                    ? `From ${analyticsData.profitIncludedLines} of ${analyticsData.paidLineCount} paid lines`
                    : undefined,
              },
              ...(reportData.bankTipCashDeductions?.amount > 0
                ? [
                    {
                      label: "Bank tip cash deducted",
                      value: reportData.bankTipCashDeductions.amount,
                      color: "text-amber-600",
                    },
                  ]
                : []),
              {
                label: "Paid Order Lines",
                value: analyticsData.paidLineCount,
                isUnit: false,
              },
            ].map((stat: any, i) => (
              <Card key={i} className="bg-card">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
                      {stat.label}
                    </p>
                    {stat.icon && (
                      <stat.icon className={cn("h-4 w-4", stat.color)} />
                    )}
                  </div>
                  <p className={cn("mt-1.5 text-xl font-bold tabular-nums sm:mt-2 sm:text-2xl", stat.color)}>
                    {stat.isUnit === false
                      ? stat.value
                      : `${stat.value.toLocaleString()} ETB`}
                  </p>
                  {stat.hint ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {stat.hint}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
          <p
            className={cn(
              "text-xs",
              analyticsData.profitExcludedLines > 0
                ? "text-amber-700 dark:text-amber-500"
                : "text-muted-foreground",
            )}
          >
            {profitMessage}
          </p>

          {/* Payment Method Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-900 bg-blue-950/10 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-2 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold sm:text-base">Cash Payments</h3>
                </div>
                <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {reportData.cashPayments.amount.toLocaleString()} ETB
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {reportData.cashPayments.count} orders
                  {reportData.cashPayments.tipCashDeduction > 0
                    ? ` · ${reportData.cashPayments.tipCashDeduction.toLocaleString()} ETB tip cash deducted`
                    : ""}
                </p>
                <CategorySoldBreakdown
                  items={paymentCategoryBreakdown.cash}
                  accent="cash"
                />
              </CardContent>
            </Card>
            <Card className="border-green-900 bg-green-950/10 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-2 flex items-center gap-2">
                  <History className="h-4 w-4 text-green-500" />
                  <h3 className="text-sm font-semibold sm:text-base">Bank Payments</h3>
                </div>
                <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {reportData.bankPayments.amount.toLocaleString()} ETB
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {reportData.bankPayments.count} orders
                </p>
                <CategorySoldBreakdown
                  items={paymentCategoryBreakdown.bank}
                  accent="bank"
                />
              </CardContent>
            </Card>
            <Card className="border-purple-900 bg-purple-950/10 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-500" />
                  <h3 className="text-sm font-semibold sm:text-base">Credit Payments</h3>
                </div>
                <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {reportData.creditPayments.amount.toLocaleString()} ETB
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {reportData.creditPayments.count} orders
                </p>
                <CategorySoldBreakdown
                  items={paymentCategoryBreakdown.credit}
                  accent="credit"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <PieChartIcon className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Sales Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="h-112.5">
                <Tabs defaultValue="category" className="h-full">
                  <TabsList className="mb-4 grid h-auto w-full grid-cols-3">
                    <TabsTrigger value="category" className="px-1 text-[11px] sm:text-sm">
                      Category
                    </TabsTrigger>
                    <TabsTrigger value="type" className="px-1 text-[11px] sm:text-sm">
                      Type
                    </TabsTrigger>
                    <TabsTrigger value="item" className="px-1 text-[11px] sm:text-sm">
                      Item
                    </TabsTrigger>
                  </TabsList>

                  {["category", "type", "titles"].map((key) => (
                    <TabsContent
                      key={key}
                      value={key === "titles" ? "item" : key}
                      className="h-80"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={(analyticsData as any)[key]}
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={4}
                            dataKey="value"
                            nameKey="name"
                          >
                            {(analyticsData as any)[key].map(
                              (_: any, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                  stroke="transparent"
                                />
                              ),
                            )}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            wrapperStyle={{
                              fontSize: "11px",
                              paddingTop: "10px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            <Card className="bg-card border">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-base font-semibold">
                  Top Performing Items 
                </CardTitle>
              </CardHeader>
              <CardContent className="h-100">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData.items}
                    layout="vertical"
                    margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
                    barCategoryGap={10}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={true}
                      vertical={false}
                      stroke="#1e293b"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      style={{ fontSize: "11px", fill: "#94a3b8" }}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "#ffffff10" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar
                      dataKey="sales"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                      barSize={14}
                      name="Sales"
                    />
                    <Bar
                      dataKey="profit"
                      fill="#38bdf8"
                      radius={[0, 4, 4, 0]}
                      barSize={14}
                      name="Profit"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tables Section */}
          <Card className="bg-card border shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle>Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="completed" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 overflow-x-auto scrollbar-hide">
                  <TabsTrigger value="completed" className="py-4 px-6 gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />{" "}
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="cancelled" className="py-4 px-6 gap-2">
                    <XCircle className="h-4 w-4 text-destructive" /> Cancelled
                  </TabsTrigger>
                  <TabsTrigger value="cashout" className="py-4 px-6 gap-2">
                    <Wallet className="h-4 w-4 text-orange-500" /> Cashouts
                  </TabsTrigger>
                  <TabsTrigger value="in-progress-expired" className="py-4 px-6 gap-2">
                    <Hourglass className="h-4 w-4 text-amber-500" /> In progress /
                    Expired
                  </TabsTrigger>
                  {analog ? (
                    <TabsTrigger value="failed" className="py-4 px-6 gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" /> Failed
                    </TabsTrigger>
                  ) : (
                    <TabsTrigger value="pending-payment" className="py-4 px-6 gap-2">
                      <Hourglass className="h-4 w-4 text-amber-500" /> Pending
                      payment
                    </TabsTrigger>
                  )}
                </TabsList>
                <div className="p-4 md:p-6">
                  <TabsContent value="completed" className="mt-0">
                    <CompletedOrders
                      orders={getCompletedOrders()}
                      tables={cafeTables}
                      items={items}
                    />
                  </TabsContent>
                  <TabsContent value="cancelled" className="mt-0">
                    <CancelledOrders
                      analog={analog}
                      orders={getCancelledOrders()}
                      tables={cafeTables}
                    />
                  </TabsContent>
                  <TabsContent value="cashout" className="mt-0">
                    <Cashouts cashout={filteredCashouts} />
                  </TabsContent>
                  <TabsContent value="in-progress-expired" className="mt-0">
                    <CafeReportInProgressExpired
                      analog={analog}
                      inProgress={getInProgressOrders()}
                      expired={getExpiredOrders()}
                      tables={cafeTables}
                    />
                  </TabsContent>
                  {analog ? (
                    <TabsContent value="failed" className="mt-0">
                      <FailedOrdersTable
                        orders={getFailedOrders()}
                        tables={cafeTables}
                      />
                    </TabsContent>
                  ) : (
                    <TabsContent value="pending-payment" className="mt-0">
                      <PendingPaymentOrders
                        orders={getPendingPaymentOrders()}
                        tables={cafeTables}
                        items={items}
                      />
                    </TabsContent>
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
