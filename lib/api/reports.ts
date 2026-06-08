/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { UseFormReturn } from "react-hook-form";
import { rowHotelMatchesTenantScope } from "../tenantRowMatch";
import {
  getOrderBankTipCashDeduction,
  getOrderBankTransferAmount,
  sumBankOrderRevenueETB,
  sumBankTipCashDeductionsETB,
  sumCashOrderRevenueETB,
  sumNetCashRevenueETB,
  cafeOrderLineTotalETB,
} from "../cafeBankPayment";
import type {
  Order,
  ReportFilter,
  ExcelExportData,
  Waiter,
  Table,
  ReportData,
  cloudinarySuccessResult,
  Cashout,
} from "./types";

function calculateTotalSales(orders: Order[]): number {
  return orders.reduce((total, order) => total + cafeOrderLineTotalETB(order), 0);
}


export async function exportToExcel(exportData: ExcelExportData) {
  try {
    const XLSX = await import("xlsx");
    const { sheetName, data, headers } = exportData;

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Add headers
    headers.map((header) => ({ v: header, t: "s" }));
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Save file
    saveAs(blob, `${sheetName}_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast.success(`${sheetName} exported successfully`);
    return true;
  } catch (error: any) {
    toast.error("Failed to export to Excel");
    throw error;
  }
}

export function prepareWaiterExportData(waiters: Waiter[]): ExcelExportData {
  const data = waiters.map((waiter) => ({
    Name: waiter.name,
    "Hotel Name": waiter.HotelName,
    Age: waiter.age,
    Sex: waiter.sex,
    Experience: waiter.experience,
    "Phone Number": waiter.phoneNumber,
    "Completed Orders": waiter.tablesServed?.length || 0,
    "Total Sales":
      waiter.price?.reduce((sum, price) => sum + (price || 0), 0) || 0,
  }));

  return {
    sheetName: "Waiters",
    data,
    headers: [
      "Name",
      "Hotel Name",
      "Age",
      "Sex",
      "Experience",
      "Phone Number",
      "Completed Orders",
      "Total Sales",
    ],
  };
}

export function prepareTableExportData(tables: Table[]): ExcelExportData {
  const data = tables.map((table) => ({
    "Table No": table.tableNo,
    Capacity: table.capacity,
    "Completed Orders": table.payment?.filter((p) => p === "Paid").length || 0,
    "Total Sales":
      table.price?.reduce((sum, price) => sum + (price || 0), 0) || 0,
  }));

  return {
    sheetName: "Tables",
    data,
    headers: ["Table No", "Capacity", "Completed Orders", "Total Sales"],
  };
}

function filterReportOrders(orders: Order[], filter: ReportFilter): Order[] {
  return orders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    const filterDate = filter.date;
    const isSameHotel = rowHotelMatchesTenantScope(
      order.HotelName,
      filter.HotelName,
    );
    const isPaid =
      String(order.payment ?? "").trim().toLowerCase() === "paid";

    if (!isSameHotel || !isPaid) return false;

    if (filter.type === "Daily") {
      return (
        orderDate.getFullYear() === filterDate.getFullYear() &&
        orderDate.getMonth() === filterDate.getMonth() &&
        orderDate.getDate() === filterDate.getDate()
      );
    } else {
      return (
        orderDate.getFullYear() === filterDate.getFullYear() &&
        orderDate.getMonth() === filterDate.getMonth()
      );
    }
  });
}

export async function generateReport(
  orders: Order[],
  cashouts: Cashout[],
  filter: { date: Date; type: "Daily" | "Monthly"; HotelName: string },
): Promise<ReportData | null> {
  const filteredOrders = filterReportOrders(orders, {
    HotelName: filter.HotelName,
    date: filter.date,
    type: filter.type,
  });

  const totalSales = calculateTotalSales(filteredOrders);
  const filterDate = filter.date;
  const filteredCashouts = cashouts.filter((cashout) => {
    const cashoutDate = new Date(cashout.createdAt);
    if (filter.type === "Daily") {
      return (
        cashoutDate.getFullYear() === filterDate.getFullYear() &&
        cashoutDate.getMonth() === filterDate.getMonth() &&
        cashoutDate.getDate() === filterDate.getDate()
      );
    } else if (filter.type === "Monthly") {
      return (
        cashoutDate.getFullYear() === filterDate.getFullYear() &&
        cashoutDate.getMonth() === filterDate.getMonth()
      );
    }
    return false;
  });

  const totalCashouts = filteredCashouts.reduce(
    (sum, cashout) => sum + (Number(cashout.totalCalc) || 0),
    0,
  );
  const netSales = totalSales - totalCashouts;
  const cashOrders = filteredOrders.filter((order) => order.withBank === false);
  const bankOrders = filteredOrders.filter((order) => order.withBank === true);
  const creditOrders = filteredOrders.filter(
    (order) => order.credit === true && order.withBank === null,
  );

  const grossCashAmount = sumCashOrderRevenueETB(cashOrders);
  const bankTipCashDeduction = sumBankTipCashDeductionsETB(filteredOrders);
  const bankTipOrderCount = bankOrders.filter(
    (order) => getOrderBankTipCashDeduction(order) > 0,
  ).length;
  const netCashAmount = sumNetCashRevenueETB(filteredOrders);
  const bankAmount = sumBankOrderRevenueETB(bankOrders);
  const creditAmount = calculateTotalSales(creditOrders);
  const totalAmount = totalSales || 1;

  return {
    orders: filteredOrders,
    totalSales,
    netSales,
    totalCashouts,
    cashPayments: {
      count: cashOrders.length,
      amount: netCashAmount,
      grossAmount: grossCashAmount,
      tipCashDeduction: bankTipCashDeduction,
      percentage: totalAmount > 0 ? (netCashAmount / totalAmount) * 100 : 0,
    },
    bankPayments: {
      count: bankOrders.length,
      amount: bankAmount,
      percentage: totalAmount > 0 ? (bankAmount / totalAmount) * 100 : 0,
    },
    bankTipCashDeductions: {
      count: bankTipOrderCount,
      amount: bankTipCashDeduction,
    },
    creditPayments: {
      count: creditOrders.length,
      amount: creditAmount,
      percentage: totalAmount > 0 ? (creditAmount / totalAmount) * 100 : 0,
    },
  };
}

export function prepareReportExportData(
  orders: Order[],
  reportType: "Daily" | "Monthly",
): ExcelExportData {
  const data = orders.map((order) => {
    let paymentMethod = "Cash";
    if (order.credit === true) paymentMethod = "Credit";
    else if (order.withBank === true) paymentMethod = "Bank";

    const lineTotal = cafeOrderLineTotalETB(order);
    const bankTransfer = getOrderBankTransferAmount(order);
    const tipCashDeduction = getOrderBankTipCashDeduction(order);
    return {
      "Item Name": order.title,
      Category: order.category,
      Price: order.price,
      "Order Amount": order.orderAmount,
      "Total Amount": lineTotal,
      "Bank Transfer": paymentMethod === "Bank" ? bankTransfer : "",
      "Tip Cash Deduction": tipCashDeduction > 0 ? tipCashDeduction : "",
      "Order Date": new Date(order.createdAt).toLocaleDateString(),
      Status: order.status || "Pending",
      Payment: order.payment,
      "Payment Method": paymentMethod,
      "Credit Customer":
        order.credit === true ? (order.credittorName ?? "") : "",
    };
  });

  return {
    sheetName: `${reportType} Report`,
    data,
    headers: [
      "Item Name",
      "Category",
      "Price",
      "Order Amount",
      "Total Amount",
      "Bank Transfer",
      "Tip Cash Deduction",
      "Order Date",
      "Status",
      "Payment",
      "Payment Method",
      "Credit Customer",
    ],
  };
}

// ==================== IMAGE UPLOAD ====================

export async function uploadImage(
  result: unknown,
  form: UseFormReturn<any>,
  setPreviewUrl: (url: string | null) => void,
  formField: string,
) {
  try {
    if (
      typeof result === "object" &&
      result !== null &&
      "event" in result &&
      result.event === "success" &&
      "info" in result &&
      typeof result.info === "object" &&
      result.info !== null &&
      "secure_url" in result.info
    ) {
      const typedResult = result as cloudinarySuccessResult;
      const secured_url = typedResult.info.secure_url;

      form.setValue(formField, secured_url, { shouldValidate: true });
      setPreviewUrl(secured_url);
    } else {
      form.setValue(formField, "");
      setPreviewUrl(null);
    }
  } catch (error: any) {
    toast.error("An unexpected error occurred during image upload processing.");
    console.error("Image processing error:", error);
  }
}

export function transformOrderDataForWaiterUpdate(
  orders: Order[],
  waiterId: number,
) {
  const paidOrders = orders.filter(
    (order) => String(order.payment ?? "").toLowerCase() === "paid",
  );
  const recordedAt = new Date().toISOString();

  return {
    id: waiterId,
    payment: paidOrders.map((order) => order.payment),
    price: paidOrders.map((order) => order.price * order.orderAmount),
    tablesServed: paidOrders.map((order) => order.tableNo || 0),
    incomeAt: paidOrders.map(() => recordedAt),
    HotelName: orders[0]?.HotelName || "",
  };
}

export function transformOrderDataForTableUpdate(
  orders: Order[],
  tableId: number,
  tableNo: number,
) {
  const paidOrders = orders.filter(
    (order) =>
      String(order.payment ?? "").toLowerCase() === "paid" &&
      order.tableNo === tableNo,
  );
  const recordedAt = new Date().toISOString();

  return {
    id: tableId,
    payment: paidOrders.map((order) => order.payment),
    price: paidOrders.map(
      (order) =>
        (Number(order.price) || 0) * (Number(order.orderAmount) || 0),
    ),
    incomeAt: paidOrders.map(() => recordedAt),
    HotelName: orders[0]?.HotelName || "",
  };
}
