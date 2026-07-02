"use client";

import Reports from "@/components/reports";
import {
  exportToExcel,
  fetchCashout,
  generateReport,
  prepareReportExportData,
  type Order,
} from "@/lib/actions";
import type { Item } from "@/lib/api/types";
import { toast } from "sonner";

export function CafeCashierReportsPanel({
  orders,
  hotelName,
  items = [],
}: {
  orders: Order[];
  hotelName: string;
  items?: Pick<Item, "name" | "recipeJson">[];
}) {
  return (
    <div className="w-full p-4 md:p-6">
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
        onExportReport={async (
          reportData: unknown,
          reportType: "Daily" | "Monthly",
        ) => {
          try {
            const data = reportData as { orders?: Order[] };
            const exportData = prepareReportExportData(
              data.orders ?? [],
              reportType,
              items,
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
    </div>
  );
}
