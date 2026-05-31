import type { PurchaseRequestRow } from "@/lib/api/hotelWorkflow";
import { formatPurchaseStatus } from "@/lib/hotelDisplayLabels";
import { isPurchaseAuthorized } from "@/lib/hotelApproval";
import { formatVoucherRange, parseVoucherNumberInput } from "@/lib/voucherFormat";
import {
  compareFifo,
  sortRowsByFifo,
  type FifoRow,
} from "@/lib/requestOrdering";
import {
  matchesVoucherNumberRange,
  matchesVoucherOrItemSearch,
  rowsOnSameVoucher,
  type VoucherSearchRow,
} from "@/lib/requestStatusFilters";

export type PurchaseVoucherGroup<T extends VoucherSearchRow & { id: number }> = {
  key: string;
  label: string;
  rows: T[];
};

function voucherGroupKey(row: VoucherSearchRow & { id: number }): string {
  const n = Math.floor(Number(row.voucherNumber) || 0);
  if (n > 0) return `n:${n}`;
  const d = String(row.voucherDisplay ?? "").trim();
  if (d) return `d:${d}`;
  return `orphan:${row.id}`;
}

/** Match voucher number (exact, partial, or range like 10-20) and item name. */
export function rowMatchesPurchaseVoucherSearch(
  row: VoucherSearchRow,
  query: string,
): boolean {
  const q = query.trim();
  if (!q) return false;

  const rangeParts = q.match(/^(\d[\d\s]*)\s*[-–]\s*(\d[\d\s]*)$/);
  if (rangeParts) {
    return matchesVoucherNumberRange(row, rangeParts[1], rangeParts[2]);
  }

  const compact = q.replace(/\s/g, "");
  if (/^\d+$/.test(compact)) {
    const n = parseVoucherNumberInput(compact);
    if (n > 0 && matchesVoucherNumberRange(row, String(n), String(n))) {
      return true;
    }
  }

  return matchesVoucherOrItemSearch(row, q);
}

/** Include every line on the same voucher as any matched row (full receipt). */
export function expandPurchaseRowsToVoucherReceipts<
  T extends VoucherSearchRow & FifoRow & { id: number },
>(matched: readonly T[], pool: readonly T[]): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const anchor of sortRowsByFifo([...matched])) {
    for (const row of rowsOnSameVoucher(anchor, pool)) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }
  return sortRowsByFifo(out);
}

export function groupPurchaseRequestsByVoucher<
  T extends VoucherSearchRow & FifoRow & { id: number },
>(rows: readonly T[]): PurchaseVoucherGroup<T>[] {
  const sorted = sortRowsByFifo([...rows]);
  const map = new Map<string, T[]>();
  for (const row of sorted) {
    const key = voucherGroupKey(row);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  const groups: PurchaseVoucherGroup<T>[] = [];
  for (const [key, list] of map) {
    const bucket = sortRowsByFifo(list);
    groups.push({
      key,
      label: formatVoucherRange(bucket),
      rows: bucket,
    });
  }

  groups.sort((a, b) => compareFifo(a.rows[0], b.rows[0]));

  return groups;
}

export function filterPurchaseRowsByVoucherSearch<
  T extends VoucherSearchRow & FifoRow & { id: number },
>(pool: readonly T[], query: string): T[] {
  const q = query.trim();
  if (!q) return [];
  const matched = pool.filter((row) => rowMatchesPurchaseVoucherSearch(row, q));
  return expandPurchaseRowsToVoucherReceipts(matched, pool);
}

/**
 * Default store list: every line on a voucher that has at least one
 * manager-authorized purchase request (full receipt per voucher).
 */
export function buildStoreUnitPriceRevisionDisplayPool(
  rows: readonly PurchaseRequestRow[],
): PurchaseRequestRow[] {
  const anchors = rows.filter((r) => isPurchaseAuthorized(r.status));
  if (!anchors.length) return [];
  return expandPurchaseRowsToVoucherReceipts(anchors, rows);
}

export function summarizeStoreUnitPricePool(rows: readonly PurchaseRequestRow[]): {
  voucherCount: number;
  lineCount: number;
  editableCount: number;
} {
  const groups = groupPurchaseRequestsByVoucher(rows);
  return {
    voucherCount: groups.length,
    lineCount: rows.length,
    editableCount: rows.filter((r) => !getPurchaseUnitPriceEditBlockReason(r)).length,
  };
}

export type UnitPriceApproverRole = "CostControl" | "Finance" | "Manager";

const ROLE_PENDING_STATUS: Record<UnitPriceApproverRole, string> = {
  CostControl: "PENDING_CC",
  Finance: "PENDING_FINANCE",
  Manager: "PENDING_MANAGER",
};

export function purchaseUnitPricePendingForRole(
  row: Pick<PurchaseRequestRow, "unitPriceChangeStatus">,
  role: UnitPriceApproverRole,
): boolean {
  return row.unitPriceChangeStatus === ROLE_PENDING_STATUS[role];
}

export function filterPurchaseUnitPricePendingForRole(
  rows: readonly PurchaseRequestRow[],
  role: UnitPriceApproverRole,
): PurchaseRequestRow[] {
  return rows.filter((r) => purchaseUnitPricePendingForRole(r, role));
}

export function formatUnitPriceChangeStatus(
  status: string | null | undefined,
): string {
  switch (String(status ?? "").trim()) {
    case "PENDING_CC":
      return "Awaiting cost control";
    case "PENDING_FINANCE":
      return "Awaiting finance";
    case "PENDING_MANAGER":
      return "Awaiting manager";
    case "AUTHORIZED":
      return "Revision authorized";
    case "REJECTED":
      return "Revision rejected";
    default:
      return status ? String(status) : "—";
  }
}

/** Why store cannot submit a new unit price on this line (null = editable). */
export function getPurchaseUnitPriceEditBlockReason(
  row: PurchaseRequestRow,
): string | null {
  if (!isPurchaseAuthorized(row.status)) {
    return `${formatPurchaseStatus(row.status)} — unit price can only be revised after manager authorization.`;
  }

  const changeStatus = String(row.unitPriceChangeStatus ?? "").trim();
  if (changeStatus.startsWith("PENDING")) {
    const proposed =
      row.pendingUnitPrice != null
        ? `${row.pendingUnitPrice} ETB`
        : "a new price";
    return `Revision in progress (${proposed}) — ${formatUnitPriceChangeStatus(changeStatus).toLowerCase()}.`;
  }

  return null;
}
