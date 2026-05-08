/** User-facing labels for hotel inventory workflow codes */

/** Show quantity together with the unit of measure (e.g. stock movements, purchases). */
export function formatQtyWithUnit(qty: number, measuredBy: string): string {
  const u = String(measuredBy ?? "").trim() || "units";
  const q = Number(qty);
  const n = Number.isFinite(q) ? q : 0;
  return `${n} ${u}`;
}

/** Consistent, beginner-friendly names for the same concepts across hotel terminals. */
export const HOTEL_INVENTORY_COPY = {
  /** Rows in master inventory (what was labeled “SKU” in some dashboards). */
  inventoryItems: "Inventory items",
  /** Purchase requests not yet fully received / closed. */
  purchasePipeline: "Purchase pipeline",
  /** Payment & VAT overview sidebar section. */
  paymentAndTax: "Inventory payment & tax",
} as const;

export function formatMovementType(code: string): string {
  switch (code) {
    case "STOCK_OUT":
      return "Stock out";
    case "WASTAGE":
      return "Wastage";
    case "RETURN_SUPPLIER":
      return "Return to supplier";
    default:
      return code;
  }
}

export function formatPurchaseStatus(status: string): string {
  switch (status) {
    case "PENDING_CC":
      return "Awaiting cost control";
    case "PENDING_FINANCE":
      return "Awaiting finance";
    case "APPROVED_CC":
      return "Approved by cost control";
    case "APPROVED_FINANCE":
      return "Approved by finance (awaiting store receipt)";
    case "REJECTED_CC":
      return "Rejected by cost control";
    case "REJECTED_FINANCE":
      return "Rejected by finance";
    default:
      return status;
  }
}

export function formatStockOutRequestStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "Awaiting cost control";
    case "APPROVED":
      return "Applied to inventory";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}
