import type {
  ItemRegistration,
  ItemStatus,
  PurchaseRequestRow,
  StockOutRequestRow,
  FreshBazaarRow,
} from "@/lib/actions";
import {
  buildPurchaseRequestReceiptBundleForStatus,
  buildRegistrationReceiptBundleForStatus,
  buildStockMovementReceiptBundleForStatus,
  bundleItemsToPrint,
  type ReceiptBundle,
} from "@/lib/receiptGrouping";
import { accountabilityGroupKey } from "@/lib/departments";
import {
  canPrintItemRegistrationFromStatus,
  canPrintPurchaseRequestFromStatus,
  canPrintStockMovementFromStatus,
} from "@/lib/hotelApproval";

function voucherKey(
  row: { voucherNumber?: number | null; voucherDisplay?: string | null },
): string {
  const n = Math.floor(Number(row.voucherNumber) || 0);
  const d = String(row.voucherDisplay ?? "").trim();
  if (n > 0) return `n:${n}`;
  if (d) return `d:${d}`;
  return "";
}

function purchaseOrStockPrintKey(row: {
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
  requestedByDepartment?: string | null;
  requestedByLeaderName?: string | null;
}): string {
  const voucher = voucherKey(row);
  if (!voucher) return "";
  return `${voucher}|${accountabilityGroupKey(
    row.requestedByDepartment,
    row.requestedByLeaderName,
  )}`;
}

function registrationPrintKey(row: {
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
  receivedByDepartment?: string | null;
  receivedByLeaderName?: string | null;
}): string {
  const voucher = voucherKey(row);
  if (!voucher) return "";
  return `${voucher}|${accountabilityGroupKey(
    row.receivedByDepartment,
    row.receivedByLeaderName,
  )}`;
}

export function registrationPrintBundlesFromFiltered(
  filtered: readonly ItemRegistration[],
  pool: readonly ItemRegistration[],
  purchaseRequests: readonly PurchaseRequestRow[],
): ReceiptBundle[] {
  const seen = new Set<string>();
  const bundles: ReceiptBundle[] = [];
  for (const row of filtered) {
    if (!canPrintItemRegistrationFromStatus(row.approvalStatus)) continue;
    const key = registrationPrintKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const bundle = buildRegistrationReceiptBundleForStatus(
      row,
      [...pool],
      [...purchaseRequests],
    );
    if (bundle) bundles.push(bundleItemsToPrint(bundle));
  }
  return bundles;
}

export function purchasePrintBundlesFromFiltered(
  filtered: readonly PurchaseRequestRow[],
  pool: readonly PurchaseRequestRow[],
): ReceiptBundle[] {
  const seen = new Set<string>();
  const bundles: ReceiptBundle[] = [];
  for (const row of filtered) {
    if (!canPrintPurchaseRequestFromStatus(row.status)) continue;
    const key = purchaseOrStockPrintKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const bundle = buildPurchaseRequestReceiptBundleForStatus(row, [...pool]);
    if (bundle) bundles.push(bundleItemsToPrint(bundle));
  }
  return bundles;
}

export function stockPrintBundlesFromFiltered(
  filtered: readonly StockOutRequestRow[],
  pool: readonly StockOutRequestRow[],
  linkedInventory: readonly ItemRegistration[],
  itemStatusHistory: readonly ItemStatus[] = [],
  freshBazaarArchives: readonly FreshBazaarRow[] = [],
): ReceiptBundle[] {
  const seen = new Set<string>();
  const bundles: ReceiptBundle[] = [];
  for (const row of filtered) {
    if (!canPrintStockMovementFromStatus(row.status)) continue;
    const key = purchaseOrStockPrintKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const bundle = buildStockMovementReceiptBundleForStatus(
      row,
      [...pool],
      [...linkedInventory],
      [...itemStatusHistory],
      [...freshBazaarArchives],
    );
    if (bundle) bundles.push(bundleItemsToPrint(bundle));
  }
  return bundles;
}
