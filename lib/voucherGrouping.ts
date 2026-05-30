import { formatVoucherDisplay } from "@/lib/voucherFormat";
import {
  groupVoucherBatchesForQueue,
  requestFifoTimestamp,
  sortRowsByFifo,
  type FifoRow,
  type VoucherGroup,
  voucherGroupActionableRows,
} from "@/lib/requestOrdering";

export type { VoucherGroup };
export { groupVoucherBatchesForQueue, voucherGroupActionableRows };

export type VoucherLike = {
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
};

function voucherGroupKey(row: VoucherLike): string {
  const n = Math.floor(Number(row.voucherNumber) || 0);
  if (n > 0) return `n:${n}`;
  const d = String(row.voucherDisplay ?? "").trim();
  if (d) return `d:${d}`;
  return "none";
}

/**
 * Rows with the same voucher (already FIFO-sorted list).
 * Groups are ordered FIFO by earliest line in each batch.
 */
export function groupRowsBySharedVoucher<T extends VoucherLike & FifoRow>(
  rows: T[],
): VoucherGroup<T>[] {
  const sorted = sortRowsByFifo(rows);
  const map = new Map<string, T[]>();
  for (const row of sorted) {
    const key = voucherGroupKey(row);
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }

  const groups: VoucherGroup<T>[] = [];
  for (const [key, bucket] of map) {
    const first = bucket[0];
    const voucherNumber =
      Math.floor(Number(first.voucherNumber) || 0) > 0
        ? Math.floor(Number(first.voucherNumber))
        : null;
    groups.push({
      key,
      voucherNumber,
      voucherDisplay: formatVoucherDisplay(
        first.voucherNumber,
        first.voucherDisplay,
      ),
      submittedAt: requestFifoTimestamp(first),
      rows: bucket,
    });
  }

  return groups.sort((a, b) => a.submittedAt - b.submittedAt);
}

export function voucherGroupLineSummary(
  rows: { itemName?: string | null; name?: string | null }[],
  maxNames = 3,
): string {
  const names = rows
    .map((r) => String(r.itemName ?? r.name ?? "").trim())
    .filter(Boolean);
  if (names.length === 0) return "—";
  if (names.length <= maxNames) return names.join(", ");
  return `${names.slice(0, maxNames).join(", ")} +${names.length - maxNames} more`;
}

/** Human-readable breakdown when lines on one voucher differ in status. */
export function voucherGroupStatusSummary(
  rows: { status?: string | null; approvalStatus?: string | null }[],
  formatStatus: (code: string) => string,
): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const code = String(row.status ?? row.approvalStatus ?? "").trim() || "—";
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  const parts = [...counts.entries()].map(([code, n]) =>
    n > 1 ? `${formatStatus(code)} (${n})` : formatStatus(code),
  );
  return parts.join(" · ");
}

export function voucherGroupsHaveMixedStatus(
  rows: { status?: string | null; approvalStatus?: string | null }[],
): boolean {
  const codes = new Set(
    rows.map((r) => String(r.status ?? r.approvalStatus ?? "").trim()),
  );
  codes.delete("");
  return codes.size > 1;
}
