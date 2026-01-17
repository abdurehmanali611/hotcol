/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download, FileBarChart, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Reports({ onGenerateReport, onExportReport, orders, hotelName }: any) {
  const [date, setDate] = useState<Date>(new Date());
  const [reportType, setReportType] = useState<"Daily" | "Monthly">("Daily");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const data = await onGenerateReport({ date, type: reportType });
    setReportData(data);
    setLoading(false);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Financial Reports</CardTitle>
          <CardDescription className="text-sm">Generate and export sales data by date or month.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-60 justify-start text-left font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
            </PopoverContent>
          </Popover>

          <Select value={reportType} onValueChange={(v: any) => {
            setReportType(v);
            setReportData(null); 
          }}>
            <SelectTrigger className="w-full sm:w-45">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Daily">Daily Report</SelectItem>
              <SelectItem value="Monthly">Monthly Report</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleGenerate} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileBarChart className="mr-2 h-4 w-4" />}
            Generate
          </Button>

          {reportData && (
            <Button variant="outline" onClick={() => onExportReport(reportData, reportType)} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          )}
        </CardContent>
      </Card>

      {reportData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Summary for {format(date, reportType === "Daily" ? "PP" : "MMMM yyyy")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{reportData.totalSales.toFixed(2)} ETB</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Cashouts</p>
                  <p className="text-2xl font-bold text-red-600">{reportData.totalCashouts.toFixed(2)} ETB</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Net Sales</p>
                  <p className="text-2xl font-bold text-green-600">{reportData.netSales.toFixed(2)} ETB</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{reportData.orders.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <h3 className="font-semibold mb-2">Cash Payments</h3>
                  <p className="text-3xl font-bold">{reportData.cashPayments.amount.toFixed(2)} ETB</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reportData.cashPayments.count} orders ({reportData.cashPayments.percentage.toFixed(1)}%)
                  </p>
                </div>
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <h3 className="font-semibold mb-2">Bank Payments</h3>
                  <p className="text-3xl font-bold">{reportData.bankPayments.amount.toFixed(2)} ETB</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reportData.bankPayments.count} orders ({reportData.bankPayments.percentage.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Waiter</TableHead>
                      <TableHead>Table No</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No orders found for this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.title}</TableCell>
                          <TableCell>{order.waiterName}</TableCell>
                          <TableCell>{order.tableNo}</TableCell>
                          <TableCell>{order.price.toFixed(2)} ETB</TableCell>
                          <TableCell>{order.orderAmount}</TableCell>
                          <TableCell className="text-right font-bold">
                            {(order.price * order.orderAmount).toFixed(2)} ETB
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}