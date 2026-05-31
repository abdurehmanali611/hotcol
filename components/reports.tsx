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
import ExpiredOrdersTable from "@/app/ExpiredOrdersTable/page";
import { Cashout, fetchCashout, fetchTables, type Table } from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import Cashouts from "@/app/CashoutTable/page";

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

function paymentChannel(order: {
  credit?: boolean | null;
  withBank?: boolean | null;
}): "cash" | "bank" | "credit" {
  if (order.credit === true) return "credit";
  if (order.withBank === true) return "bank";
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
}: any) {
  const [displayName, setDisplayName] = useState(hotelName);
  const [date, setDate] = useState<Date>(new Date());
  const [reportType, setReportType] = useState<"Daily" | "Monthly">("Daily");
  const [reportData, setReportData] = useState<any>(null);
  const [cashouts, setCashouts] = useState<Cashout[]>([]);
  const [loading, setLoading] = useState(false);
  const [cafeTables, setCafeTables] = useState<
    Pick<Table, "tableNo" | "orderCaption">[]
  >([]);

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

  const reportFilteredOrders = useMemo(() => {
    if (!reportData) return [];
    return orders.filter((order: any) => {
      if (!rowHotelMatchesTenantScope(order.HotelName, hotelName)) {
        return false;
      }
      const orderDate = new Date(order.createdAt);
      return reportType === "Daily"
        ? orderDate.toDateString() === date.toDateString()
        : orderDate.getMonth() === date.getMonth() &&
            orderDate.getFullYear() === date.getFullYear();
    });
  }, [orders, reportData, date, reportType, hotelName]);

  const livePaymentTotals = useMemo(() => {
    const paid = reportFilteredOrders.filter(
      (o: any) => String(o.payment ?? "").trim().toLowerCase() === "paid",
    );
    const sumOrders = (list: any[]) =>
      list.reduce(
        (total, order) =>
          total +
          (Number(order.price) || 0) * (Number(order.orderAmount) || 0),
        0,
      );
    const cashOrders = paid.filter((o: any) => o.withBank === false);
    const bankOrders = paid.filter((o: any) => o.withBank === true);
    const creditOrders = paid.filter(
      (o: any) => o.credit === true && o.withBank === null,
    );
    return {
      cash: { count: cashOrders.length, amount: sumOrders(cashOrders) },
      bank: { count: bankOrders.length, amount: sumOrders(bankOrders) },
      credit: { count: creditOrders.length, amount: sumOrders(creditOrders) },
    };
  }, [reportFilteredOrders]);

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
    const completed = reportFilteredOrders.filter(
      (o: any) =>
        o.payment?.toLowerCase() === "paid" &&
        o.status?.toLowerCase() === "completed",
    );

    const categoryMap: Record<string, { val: number; amt: number }> = {};
    const typeMap: Record<string, { val: number; amt: number }> = {};
    const itemMap: Record<string, { val: number; amt: number }> = {};

    completed.forEach((order: any) => {
      const orderQty = Number(order.orderAmount) || 0;
      const sales = (Number(order.price) || 0) * orderQty;

      const cat = order.category?.trim() || "Uncategorized";
      const type = order.type?.trim() || "Others";
      const title = order.title?.trim() || "Unknown Item";

      const updateMap = (map: any, key: string) => {
        if (!map[key]) map[key] = { val: 0, amt: 0 };
        map[key].val += sales;
        map[key].amt += orderQty;
      };

      updateMap(categoryMap, cat);
      updateMap(typeMap, type);
      updateMap(itemMap, title);
    });

    const formatData = (map: Record<string, { val: number; amt: number }>) =>
      Object.entries(map).map(([name, data]) => ({
        name: `${name} (${data.amt})`,
        value: data.val,
        totalAmount: data.amt,
      }));

    return {
      category: formatData(categoryMap),
      type: formatData(typeMap),
      titles: formatData(itemMap),
      items: Object.entries(itemMap)
        .map(([name, data]) => ({
          name,
          sales: data.val,
          totalAmount: data.amt,
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10),
    };
  }, [reportFilteredOrders]);

  const paymentCategoryBreakdown = useMemo(() => {
    const sold = reportFilteredOrders.filter(
      (o: any) =>
        String(o.payment ?? "").toLowerCase() === "paid" &&
        String(o.status ?? "").toLowerCase() === "completed",
    );

    const byChannel = {
      cash: [] as any[],
      bank: [] as any[],
      credit: [] as any[],
    };

    for (const order of sold) {
      byChannel[paymentChannel(order)].push(order);
    }

    return {
      cash: aggregateCategoryQuantities(byChannel.cash),
      bank: aggregateCategoryQuantities(byChannel.bank),
      credit: aggregateCategoryQuantities(byChannel.credit),
    };
  }, [reportFilteredOrders]);

  const getCompletedOrders = () =>
    reportFilteredOrders.filter(
      (o: any) =>
        o.payment?.toLowerCase() === "paid" &&
        o.status?.toLowerCase() === "completed",
    );
  const getCancelledOrders = () =>
    reportFilteredOrders.filter((o: any) => o.status?.toLowerCase() === "cancelled");
  const getExpiredOrders = () =>
    reportFilteredOrders.filter(
      (o: any) =>
        new Date(o.createdAt).toDateString() !== new Date().toDateString() &&
        (!o.status || o.status?.toLowerCase() === "pending") &&
        o.payment?.toLowerCase() !== "paid",
    );

  const filteredCashouts = cashouts.filter((c: any) => {
    if (!c.createdAt) return false;
    const d = new Date(c.createdAt);
    return reportType === "Daily"
      ? d.toDateString() === date.toDateString()
      : d.getMonth() === date.getMonth() &&
          d.getFullYear() === date.getFullYear();
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-3 text-foreground sm:space-y-6">
      <Card className="overflow-hidden border border-border/50 bg-card shadow-sm">
        <div className="h-0.5 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
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
        <CardContent className="flex flex-col gap-3 px-3 pb-4 sm:flex-row sm:flex-wrap sm:gap-4 sm:px-6 sm:pb-6">
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
            onValueChange={(v: any) => {
              setReportType(v);
              setReportData(null);
            }}
          >
            <SelectTrigger className="w-full sm:w-45">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Daily">Daily Report</SelectItem>
              <SelectItem value="Monthly">Monthly Report</SelectItem>
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
        </CardContent>
      </Card>

      {reportData && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                label: "Total Orders",
                value: reportData.orders.length,
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
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Method Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-900 bg-blue-950/10 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-2 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold sm:text-base">Cash Payments</h3>
                </div>
                <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {livePaymentTotals.cash.amount.toLocaleString()} ETB
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {livePaymentTotals.cash.count} orders
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
                  {livePaymentTotals.bank.amount.toLocaleString()} ETB
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {livePaymentTotals.bank.count} orders
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
                  {livePaymentTotals.credit.amount.toLocaleString()} ETB
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {livePaymentTotals.credit.count} orders
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
                    <Bar
                      dataKey="sales"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                      barSize={24}
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
                  <TabsTrigger value="Expired" className="py-4 px-6 gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />{" "}
                    Expired
                  </TabsTrigger>
                </TabsList>
                <div className="p-4 md:p-6">
                  <TabsContent value="completed" className="mt-0">
                    <CompletedOrders
                      orders={getCompletedOrders()}
                      tables={cafeTables}
                    />
                  </TabsContent>
                  <TabsContent value="cancelled" className="mt-0">
                    <CancelledOrders
                      orders={getCancelledOrders()}
                      tables={cafeTables}
                    />
                  </TabsContent>
                  <TabsContent value="cashout" className="mt-0">
                    <Cashouts cashout={filteredCashouts} />
                  </TabsContent>
                  <TabsContent value="Expired" className="mt-0 space-y-4">
                    <ExpiredOrdersTable
                      orders={getExpiredOrders()}
                      tables={cafeTables}
                    />
                    <div className="flex justify-end p-4 bg-muted/50 rounded-lg border">
                      <h3 className="text-lg font-bold">
                        Total Expired:{" "}
                        {getExpiredOrders()
                          .reduce((t: number, o: any) => t + o.price * o.orderAmount, 0)
                          .toLocaleString()}{" "}
                        ETB
                      </h3>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
