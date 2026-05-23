"use client";

import Reports from "@/components/reports";
import {
  exportToExcel,
  fetchCashout,
  generateReport,
  prepareReportExportData,
  type Order,
} from "@/lib/actions";
import { toast } from "sonner";

export function CafeCashierReportsPanel({
  orders,
  hotelName,
}: {
  orders: Order[];
  hotelName: string;
}) {
  return (
    <Reports
      orders={orders}
      hotelName={hotelName}
      onGenerateReport={async ({
        date,
        type,
      }: {
        date: Date;
        type: "Daily" | "Monthly";
      }) => {
        try {
          const cashouts = await fetchCashout(hotelName);
          return await generateReport(orders, cashouts, {
            date,
            type,
            HotelName: hotelName,
          });
        } catch (error: unknown) {
          const msg =
            error instanceof Error ? error.message : "Report failed";
          toast.error("Failed to generate report: " + msg);
          throw error;
        }
      }}
      onExportReport={async (reportData: unknown, reportType: "Daily" | "Monthly") => {
        try {
          const data = reportData as { orders?: Order[] };
          const exportData = prepareReportExportData(
            data.orders ?? [],
            reportType,
          );
          await exportToExcel(exportData);
        } catch (error: unknown) {
          const msg =
            error instanceof Error ? error.message : "Export failed";
          toast.error("Failed to export report: " + msg);
          throw error;
        }
      }}
    />
  );
}
