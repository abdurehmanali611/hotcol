import type { SortingState } from "@tanstack/react-table";
import { formatVoucherDisplay } from "@/lib/voucherFormat";

type VoucherLike = {
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
};

/** Default table sort: oldest submitted first (FIFO). */
export const FIFO_TABLE_SORT: SortingState = [
  { id: "submitted", desc: false },
];

export type FifoRow = {
  id?: number;
  createdAt?: string | null;
  registrationDate?: string | Date | null;
  entranceDate?: string | Date | null;
};

/** Earliest-first timestamp for queue ordering. */
export function requestFifoTimestamp(row: FifoRow): number {
  const entrance = new Date(row.entranceDate ?? "").getTime();
  if (!Number.isNaN(entrance) && entrance > 0) return entrance;
  const reg = new Date(row.registrationDate ?? "").getTime();
  if (!Number.isNaN(reg) && reg > 0) return reg;
  const created = new Date(row.createdAt ?? "").getTime();
  if (!Number.isNaN(created) && created > 0) return created;
  return 0;
}

export function compareFifo<T extends FifoRow>(a: T, b: T): number {
  const ta = requestFifoTimestamp(a);
  const tb = requestFifoTimestamp(b);
  if (ta !== tb) return ta - tb;
  return (Number(a.id) || 0) - (Number(b.id) || 0);
}

/** Oldest request first, newest last. */
export function sortRowsByFifo<T extends FifoRow>(rows: T[]): T[] {
  return [...rows].sort(compareFifo);
}

function voucherGroupKey(row: VoucherLike): string {
  const n = Math.floor(Number(row.voucherNumber) || 0);
  if (n > 0) return `n:${n}`;
  const d = String(row.voucherDisplay ?? "").trim();
  if (d) return `d:${d}`;
  return "none";
}

export type VoucherGroup<T extends VoucherLike & FifoRow> = {
  key: string;
  voucherNumber: number | null;
  voucherDisplay: string;
  /** Earliest line in the batch (FIFO anchor). */
  submittedAt: number;
  rows: T[];
};

/**
 * Group by voucher for approval queues: if any line on a voucher needs action,
 * include only those lines still awaiting this queue (hide siblings already checked).
 */
export function groupVoucherBatchesForQueue<T extends VoucherLike & FifoRow & { id: number }>(
  allRows: T[],
  needsAction: (row: T) => boolean,
): VoucherGroup<T>[] {
  const sorted = sortRowsByFifo(allRows);
  const actionableKeys = new Set<string>();
  for (const row of sorted) {
    if (needsAction(row)) actionableKeys.add(voucherGroupKey(row));
  }
  if (actionableKeys.size === 0) return [];

  const byKey = new Map<string, T[]>();
  for (const row of sorted) {
    if (!needsAction(row)) continue;
    const key = voucherGroupKey(row);
    if (!actionableKeys.has(key)) continue;
    const bucket = byKey.get(key) ?? [];
    bucket.push(row);
    byKey.set(key, bucket);
  }

  const groups: VoucherGroup<T>[] = [];
  for (const [key, bucket] of byKey) {
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

/** Lines in a voucher batch that still need the current queue action. */
export function voucherGroupActionableRows<T extends VoucherLike & FifoRow>(
  group: VoucherGroup<T>,
  needsAction: (row: T) => boolean,
): T[] {
  return group.rows.filter(needsAction);
}
