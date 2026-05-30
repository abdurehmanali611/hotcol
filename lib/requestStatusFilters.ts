import { matchesRegistrationDateRange } from "@/lib/panelFilters";
import { formatVoucherDisplay } from "@/lib/voucherFormat";

export type VoucherSearchRow = {
  itemName?: string | null;
  name?: string | null;
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
};

export function matchesRequestStatusDateRange(
  date: string | Date | null | undefined,
  fromYmd: string,
  toYmd: string,
): boolean {
  return matchesRegistrationDateRange(date, fromYmd, toYmd);
}

export function matchesVoucherOrItemSearch(
  row: VoucherSearchRow,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const item = String(row.itemName ?? row.name ?? "").toLowerCase();
  const voucher = formatVoucherDisplay(
    row.voucherNumber,
    row.voucherDisplay,
  ).toLowerCase();
  const rawNum = String(Math.floor(Number(row.voucherNumber) || 0));
  const rawDisplay = String(row.voucherDisplay ?? "").toLowerCase();
  return (
    item.includes(q) ||
    voucher.includes(q) ||
    (rawNum !== "0" && rawNum.includes(q)) ||
    rawDisplay.includes(q)
  );
}

export function rowsOnSameVoucher<T extends VoucherSearchRow>(
  anchor: T,
  pool: readonly T[],
): T[] {
  const n = Math.floor(Number(anchor.voucherNumber) || 0);
  const d = String(anchor.voucherDisplay ?? "").trim();
  return pool.filter((r) => {
    const rn = Math.floor(Number(r.voucherNumber) || 0);
    const rd = String(r.voucherDisplay ?? "").trim();
    if (n > 0 && rn === n) return true;
    if (d && rd && d === rd) return true;
    return false;
  });
}

export function applyRequestStatusFilters<T extends VoucherSearchRow>(
  rows: readonly T[],
  opts: {
    matchesApproval: (row: T) => boolean;
    dateFrom: string;
    dateTo: string;
    getSubmittedDate: (row: T) => string | Date | null | undefined;
    searchQuery: string;
  },
): T[] {
  return rows.filter((row) => {
    if (!opts.matchesApproval(row)) return false;
    if (
      !matchesRequestStatusDateRange(
        opts.getSubmittedDate(row),
        opts.dateFrom,
        opts.dateTo,
      )
    ) {
      return false;
    }
    if (!matchesVoucherOrItemSearch(row, opts.searchQuery)) return false;
    return true;
  });
}
