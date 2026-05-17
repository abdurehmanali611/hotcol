import type { ItemRegistration, PurchaseRequestRow, StockOutRequestRow } from "@/lib/actions";
import { creditAmountETB } from "@/lib/hotelInventoryPayment";
import { toYmdLocal } from "@/lib/hotelDateYmd";

export type PurchaseApprovalFilter =
  | "all"
  | "pending"
  | "pending_cc"
  | "pending_finance"
  | "approved"
  | "rejected";

export type StockApprovalFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected";

export type CreditAmountFilter = "all" | "under_10k" | "10k_50k" | "over_50k";

export function purchaseApprovalBucket(
  status: string,
): "pending_cc" | "pending_finance" | "approved" | "rejected" | "other" {
  if (status === "PENDING_CC") return "pending_cc";
  if (status === "PENDING_FINANCE") return "pending_finance";
  if (status === "APPROVED_CC" || status === "APPROVED_FINANCE") return "approved";
  if (status === "REJECTED_CC" || status === "REJECTED_FINANCE") return "rejected";
  return "other";
}

export function matchesPurchaseApprovalFilter(
  row: PurchaseRequestRow,
  filter: PurchaseApprovalFilter,
): boolean {
  if (filter === "all") return true;
  const bucket = purchaseApprovalBucket(row.status);
  if (filter === "pending") {
    return bucket === "pending_cc" || bucket === "pending_finance";
  }
  if (filter === "pending_cc") return bucket === "pending_cc";
  if (filter === "pending_finance") return bucket === "pending_finance";
  if (filter === "approved") return bucket === "approved";
  if (filter === "rejected") return bucket === "rejected";
  return true;
}

export function matchesStockApprovalFilter(
  row: StockOutRequestRow,
  filter: StockApprovalFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return row.status === "PENDING";
  if (filter === "approved") return row.status === "APPROVED";
  if (filter === "rejected") return row.status === "REJECTED";
  return true;
}

export function rowRegistrationYmd(
  registrationDate: Date | string | null | undefined,
): string {
  if (!registrationDate) return "";
  const d =
    registrationDate instanceof Date
      ? registrationDate
      : new Date(registrationDate);
  if (Number.isNaN(d.getTime())) return "";
  return toYmdLocal(d);
}

export function matchesRegistrationDateRange(
  registrationDate: Date | string | null | undefined,
  fromYmd: string,
  toYmd: string,
): boolean {
  const ymd = rowRegistrationYmd(registrationDate);
  if (!ymd) return !fromYmd && !toYmd;
  if (fromYmd && ymd < fromYmd) return false;
  if (toYmd && ymd > toYmd) return false;
  return true;
}

export function matchesCreditAmountFilter(
  row: ItemRegistration,
  filter: CreditAmountFilter,
  minEtb: number | null,
  maxEtb: number | null,
): boolean {
  const credit = creditAmountETB(row);
  if (minEtb != null && credit < minEtb) return false;
  if (maxEtb != null && credit > maxEtb) return false;
  if (filter === "all") return true;
  if (filter === "under_10k") return credit > 0 && credit < 10_000;
  if (filter === "10k_50k") return credit >= 10_000 && credit <= 50_000;
  if (filter === "over_50k") return credit > 50_000;
  return true;
}
