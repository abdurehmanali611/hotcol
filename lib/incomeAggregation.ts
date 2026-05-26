import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type IncomePeriod = "day" | "week" | "month" | "all";

export function getIncomePeriodRange(
  period: IncomePeriod,
  anchor: Date,
): { start: Date; end: Date } | null {
  if (period === "all") return null;
  if (period === "day") {
    return { start: startOfDay(anchor), end: endOfDay(anchor) };
  }
  if (period === "week") {
    const opts = { weekStartsOn: 1 as const };
    return {
      start: startOfWeek(anchor, opts),
      end: endOfWeek(anchor, opts),
    };
  }
  return {
    start: startOfMonth(anchor),
    end: endOfMonth(anchor),
  };
}

function isPaidStatus(p: string | undefined) {
  return (p || "").toLowerCase() === "paid";
}

/** Per-index stats for a waiter; legacy rows without incomeAt[i] are skipped when range is set. */
export function aggregateWaiterIncomeInRange(
  payment: string[] | undefined,
  price: number[] | undefined,
  tablesServed: number[] | undefined,
  incomeAt: string[] | undefined,
  range: { start: Date; end: Date } | null,
): { revenue: number; uniqueTables: number; completions: number } {
  const pay = Array.isArray(payment) ? payment : [];
  const pr = Array.isArray(price) ? price : [];
  const ts = Array.isArray(tablesServed) ? tablesServed : [];
  const ia = Array.isArray(incomeAt) ? incomeAt : [];
  const len = Math.max(pay.length, pr.length, ts.length, ia.length);

  let revenue = 0;
  const tableNums = new Set<number>();
  let completions = 0;

  for (let i = 0; i < len; i++) {
    if (!isPaidStatus(pay[i])) continue;

    const amount = Number(pr[i]) || 0;
    const tableNo = Number(ts[i]) || 0;

    if (range === null) {
      revenue += amount;
      completions += 1;
      if (tableNo) tableNums.add(tableNo);
      continue;
    }

    const stamp = typeof ia[i] === "string" ? ia[i] : null;
    if (!stamp) continue;
    const d = new Date(stamp);
    if (Number.isNaN(d.getTime())) continue;
    if (d < range.start || d > range.end) continue;

    revenue += amount;
    completions += 1;
    if (tableNo) tableNums.add(tableNo);
  }

  return { revenue, uniqueTables: tableNums.size, completions };
}

export function aggregateTableIncomeInRange(
  payment: string[] | undefined,
  price: number[] | undefined,
  incomeAt: string[] | undefined,
  range: { start: Date; end: Date } | null,
): { revenue: number; completions: number } {
  const pay = Array.isArray(payment) ? payment : [];
  const pr = Array.isArray(price) ? price : [];
  const ia = Array.isArray(incomeAt) ? incomeAt : [];
  const len = Math.max(pay.length, pr.length, ia.length);

  let revenue = 0;
  let completions = 0;

  for (let i = 0; i < len; i++) {
    if (!isPaidStatus(pay[i])) continue;

    const amount = Number(pr[i]) || 0;

    if (range === null) {
      revenue += amount;
      completions += 1;
      continue;
    }

    const stamp = typeof ia[i] === "string" ? ia[i] : null;
    if (!stamp) continue;
    const d = new Date(stamp);
    if (Number.isNaN(d.getTime())) continue;
    if (d < range.start || d > range.end) continue;

    revenue += amount;
    completions += 1;
  }

  return { revenue, completions };
}

export type WaiterRankRow = {
  id: number;
  name: string;
  revenue: number;
  uniqueTables: number;
  completions: number;
  composite: number;
  rank: number;
};

export function rankWaitersByRevenueAndTables(
  rows: Omit<WaiterRankRow, "composite" | "rank">[],
): WaiterRankRow[] {
  const maxRev = Math.max(1, ...rows.map((r) => r.revenue));
  const maxTables = Math.max(1, ...rows.map((r) => r.uniqueTables));
  const scored = rows.map((r) => ({
    ...r,
    composite:
      0.5 * (r.revenue / maxRev) + 0.5 * (r.uniqueTables / maxTables),
  }));
  scored.sort((a, b) => {
    if (b.composite !== a.composite) return b.composite - a.composite;
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    return b.uniqueTables - a.uniqueTables;
  });
  return scored.map((r, idx) => ({ ...r, rank: idx + 1 }));
}

export type TableRankRow = {
  id: number;
  tableNo: number;
  tableLabel: string;
  revenue: number;
  completions: number;
  composite: number;
  rank: number;
};

export function rankTablesByRevenueAndVolume(
  rows: Omit<TableRankRow, "composite" | "rank">[],
): TableRankRow[] {
  const maxRev = Math.max(1, ...rows.map((r) => r.revenue));
  const maxVol = Math.max(1, ...rows.map((r) => r.completions));
  const scored = rows.map((r) => ({
    ...r,
    composite: 0.5 * (r.revenue / maxRev) + 0.5 * (r.completions / maxVol),
  }));
  scored.sort((a, b) => {
    if (b.composite !== a.composite) return b.composite - a.composite;
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    return b.completions - a.completions;
  });
  return scored.map((r, idx) => ({ ...r, rank: idx + 1 }));
}
