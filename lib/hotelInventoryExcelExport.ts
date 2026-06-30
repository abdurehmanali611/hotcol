import { toast } from "sonner";
import type { ItemRegistration, ItemStatus, PurchaseRequestRow } from "@/lib/actions";
import {
  creditAmountETB,
  itemPaymentBucket,
  itemPaymentLabel,
  lineOwedETB,
  registeredAmountOf,
} from "@/lib/hotelInventoryPayment";
import {
  formatPurchaseStatus,
  formatQtyWithUnit,
} from "@/lib/hotelDisplayLabels";

function vatLabel(v: boolean | undefined): string {
  return v === true ? "With VAT" : "Without VAT";
}

async function loadExcelLibs() {
  const [xlsxModule, fileSaverModule] = await Promise.all([
    import("xlsx"),
    import("file-saver"),
  ]);
  const XLSX = xlsxModule.default ?? xlsxModule;
  const saveAs = fileSaverModule.saveAs;
  return { XLSX, saveAs };
}

/** One workbook, multiple sheets: inventory, pipeline, inactive, supplier payment detail. */
export async function exportHotelInventoryWorkbook(
  fileBase: string,
  data: {
    inventoryItems: ItemRegistration[];
    purchasePipeline: PurchaseRequestRow[];
    inactiveItems: ItemStatus[];
  },
): Promise<void> {
  try {
    const { XLSX, saveAs } = await loadExcelLibs();
    const wb = XLSX.utils.book_new();

    const invRows = data.inventoryItems.map((r) => ({
      id: r.id,
      item_name: r.name,
      category: r.category,
      quantity_with_unit: formatQtyWithUnit(r.amount, r.measuredBy),
      unit_price_etb: r.unitPrice,
      line_value_etb: lineOwedETB(r),
      supplier_name: r.supplierName,
      supplier_phone: r.supplierPhone,
      supplier_address: r.Address,
      supplier_tin: r.supplierTinNumber ?? "",
      purchase_includes_vat: vatLabel(r.purchaseWithVat),
      paid_etb: r.paidAmount,
      credit_amount_etb: creditAmountETB(r),
      payment_status: itemPaymentLabel(itemPaymentBucket(r)),
      registered_on: r.registrationDate
        ? new Date(r.registrationDate).toISOString().slice(0, 10)
        : "",
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(invRows),
      "Inventory_items",
    );

    const prRows = data.purchasePipeline.map((r) => ({
      id: r.id,
      item_name: r.itemName,
      quantity_with_unit: formatQtyWithUnit(r.quantity, r.measuredBy),
      estimated_unit_price: r.estimatedUnitPrice,
      line_estimate_etb: (r.estimatedUnitPrice || 0) * (r.quantity || 0),
      supplier_name: r.supplierName,
      supplier_phone: r.supplierPhone,
      category: r.category,
      status: formatPurchaseStatus(r.status),
      store_user: r.storeUserName,
      entrance_date: (r.entranceDate ?? r.createdAt)
        ? new Date(r.entranceDate ?? r.createdAt).toISOString().slice(0, 10)
        : "",
      created: r.createdAt,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(prRows),
      "Purchase_pipeline",
    );

    const inRows = data.inactiveItems.map((r) => ({
      id: r.id,
      item_name: r.name,
      movement: r.status,
      quantity_with_unit: formatQtyWithUnit(r.amount, r.measuredBy),
      unit_price_etb: r.unitPrice,
      supplier_name: r.supplierName,
      supplier_phone: r.supplierPhone,
      supplier_address: r.Address,
      supplier_tin: r.supplierTinNumber ?? "",
      purchase_includes_vat: vatLabel(r.purchaseWithVat),
      recorded_by: r.statusBy,
      action_date: r.actionDate
        ? new Date(r.actionDate).toISOString().slice(0, 10)
        : "",
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(inRows),
      "Inactive_movements",
    );

    const payRows = data.inventoryItems.map((r) => ({
      id: r.id,
      item_name: r.name,
      quantity_with_unit: formatQtyWithUnit(registeredAmountOf(r), r.measuredBy),
      line_value_etb: lineOwedETB(r),
      paid_etb: r.paidAmount,
      credit_amount_etb: creditAmountETB(r),
      payment_status: itemPaymentLabel(itemPaymentBucket(r)),
      supplier_name: r.supplierName,
      supplier_phone: r.supplierPhone,
      supplier_address: r.Address,
      supplier_tin: r.supplierTinNumber ?? "",
      purchase_includes_vat: vatLabel(r.purchaseWithVat),
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(payRows),
      "Supplier_payment_VAT",
    );

    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const safe = fileBase.replace(/[^\w\-]+/g, "_").slice(0, 80);
    saveAs(
      new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${safe}_inventory_export.xlsx`,
    );
  } catch (error) {
    console.error("Hotel inventory workbook export failed:", error);
    toast.error("Failed to export to Excel");
  }
}

/** Single-sheet export (e.g. current on-screen filter). */
export async function exportRowsExcel(
  fileBase: string,
  sheetName: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  try {
    const { XLSX, saveAs } = await loadExcelLibs();
    const wb = XLSX.utils.book_new();
    const sn = sheetName.replace(/[[\]:*?/\\]/g, "_").slice(0, 31) || "Sheet1";
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sn);
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const safe = fileBase.replace(/[^\w\-]+/g, "_").slice(0, 80);
    saveAs(
      new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${safe}.xlsx`,
    );
  } catch (error) {
    console.error("Hotel inventory Excel export failed:", error);
    toast.error("Failed to export to Excel");
  }
}
