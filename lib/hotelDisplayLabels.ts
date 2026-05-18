/** User-facing labels for hotel inventory workflow codes */

import type { PurchaseRequestRow, StockOutRequestRow } from "@/lib/actions";

/** Show quantity together with the unit of measure (e.g. stock movements, purchases). */
export function formatQtyWithUnit(qty: number, measuredBy: string): string {
  const u = String(measuredBy ?? "").trim() || "units";
  const q = Number(qty);
  const n = Number.isFinite(q) ? q : 0;
  return `${n} ${u}`;
}

/** Consistent, beginner-friendly names for the same concepts across hotel terminals. */
export const HOTEL_INVENTORY_COPY = {
  inventoryItems: "Inventory items",
  purchasePipeline: "Purchase pipeline",
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
      return "Awaiting cost control check";
    case "PENDING_FINANCE":
      return "Awaiting finance approval";
    case "PENDING_MANAGER":
      return "Awaiting manager authorization";
    case "AUTHORIZED":
    case "APPROVED_FINANCE":
      return "Authorized — store may receive goods";
    case "APPROVED_CC":
    case "CHECKED_CC":
      return "Checked by cost control";
    case "REJECTED_CC":
      return "Rejected at cost control";
    case "REJECTED_FINANCE":
      return "Rejected by finance";
    case "REJECTED_MANAGER":
      return "Rejected by manager";
    default:
      return status;
  }
}

export function formatStockOutRequestStatus(status: string): string {
  switch (status) {
    case "PENDING":
    case "PENDING_CC":
      return "Awaiting cost control check";
    case "PENDING_FINANCE":
      return "Awaiting finance approval";
    case "PENDING_MANAGER":
      return "Awaiting manager authorization";
    case "APPROVED":
      return "Applied to inventory";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

export function formatItemRegistrationStatus(status: string): string {
  switch (status) {
    case "PENDING_CC":
      return "Awaiting cost control check";
    case "PENDING_FINANCE":
      return "Awaiting finance approval";
    case "PENDING_MANAGER":
      return "Awaiting manager authorization";
    case "AUTHORIZED":
      return "Authorized — in inventory";
    case "VOID":
      return "Void (finance rejected)";
    case "REJECTED_CC":
      return "Rejected at cost control";
    case "REJECTED_FINANCE":
      return "Rejected by finance";
    case "REJECTED_MANAGER":
      return "Rejected by manager";
    default:
      return status || "Authorized";
  }
}

export function formatCompanyApprovalStatus(status: string): string {
  switch (status) {
    case "PENDING_MANAGER":
      return "Awaiting manager authorization";
    case "AUTHORIZED":
      return "Authorized";
    case "REJECTED":
      return "Rejected";
    default:
      return status || "Authorized";
  }
}

/** Who rejected a purchase (CC vs finance), for audit rows. */
export function formatPurchaseRejectorLine(r: PurchaseRequestRow): string {
  if (r.status === "REJECTED_CC") {
    const name = String(r.ccActorName ?? "").trim();
    return name ? `Cost control: ${name}` : "Cost control";
  }
  if (r.status === "REJECTED_FINANCE") {
    const name = String(r.financeActorName ?? "").trim();
    return name ? `Finance: ${name}` : "Finance";
  }
  if (r.status === "REJECTED_MANAGER") {
    const name = String(r.managerActorName ?? "").trim();
    return name ? `Manager: ${name}` : "Manager";
  }
  return "";
}

/** Who rejected a stock movement. */
export function formatStockMovementRejectorLine(r: StockOutRequestRow): string {
  if (r.status !== "REJECTED") return "";
  const name = String(r.ccActorName ?? r.financeActorName ?? r.managerActorName ?? "").trim();
  return name ? `Rejected by: ${name}` : "Rejected";
}
