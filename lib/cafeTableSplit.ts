import { isRoomServiceTableNo } from "@/lib/lodgingRoomService";

/**
 * Encoded split table numbers (GraphQL `tableNo` is Int).
 * Physical tables stay 0–999. Splits use:
 *   10_000 + parent * 100 + splitIndex  →  Table 2.1 = 10201, Table 2.2 = 10202
 * Range stays below room-service (≥ 900_000).
 */
export const CAFE_TABLE_SPLIT_BASE = 10_000;
export const CAFE_TABLE_SPLIT_MAX_INDEX = 99;

export type CafeTableSplitParts = {
  parentTableNo: number;
  splitIndex: number;
};

export function isCafeTableSplitCode(tableNo: number | string): boolean {
  return decodeCafeTableSplit(tableNo) != null;
}

export function decodeCafeTableSplit(
  tableNo: number | string,
): CafeTableSplitParts | null {
  const n =
    typeof tableNo === "string"
      ? parseInt(tableNo, 10)
      : Math.floor(Number(tableNo));
  if (!Number.isFinite(n) || isRoomServiceTableNo(n)) return null;
  if (n < CAFE_TABLE_SPLIT_BASE) return null;

  const rem = n - CAFE_TABLE_SPLIT_BASE;
  const parentTableNo = Math.floor(rem / 100);
  const splitIndex = rem % 100;
  if (parentTableNo < 0 || parentTableNo > 999) return null;
  if (splitIndex < 1 || splitIndex > CAFE_TABLE_SPLIT_MAX_INDEX) return null;
  return { parentTableNo, splitIndex };
}

export function encodeCafeTableSplit(
  parentTableNo: number,
  splitIndex: number,
): number {
  const parent = Math.floor(Number(parentTableNo));
  const index = Math.floor(Number(splitIndex));
  if (parent < 0 || parent > 999) {
    throw new Error("Invalid parent table for split");
  }
  if (index < 1 || index > CAFE_TABLE_SPLIT_MAX_INDEX) {
    throw new Error("Invalid table split index");
  }
  return CAFE_TABLE_SPLIT_BASE + parent * 100 + index;
}

/** Physical floor table (parent). Room-service and plain tables pass through. */
export function cafePhysicalTableNo(tableNo: number | string): number {
  const n =
    typeof tableNo === "string"
      ? parseInt(tableNo, 10)
      : Math.floor(Number(tableNo));
  if (!Number.isFinite(n)) return 0;
  if (isRoomServiceTableNo(n)) return n;
  return decodeCafeTableSplit(n)?.parentTableNo ?? n;
}

export function formatCafeTableSplitLabel(
  tableNo: number | string,
  parentCaption?: string | null,
): string | null {
  const parts = decodeCafeTableSplit(tableNo);
  if (!parts) return null;
  const suffix = `${parts.parentTableNo}.${parts.splitIndex}`;
  const caption = String(parentCaption ?? "").trim();
  if (caption) return `${caption} ${suffix}`;
  return `Table ${suffix}`;
}

/** Short tab label: "Original" or "0.1" / "delivery 0.1". */
export function formatCafeTableSeatTabLabel(
  tableNo: number | string,
  parentCaption?: string | null,
): string {
  const parts = decodeCafeTableSplit(tableNo);
  if (!parts) {
    const caption = String(parentCaption ?? "").trim();
    return caption || "Original";
  }
  const suffix = `${parts.parentTableNo}.${parts.splitIndex}`;
  const caption = String(parentCaption ?? "").trim();
  return caption ? `${caption} ${suffix}` : suffix;
}

/** Sort key: parent ascending, then original (0) before .1, .2, … */
export function compareCafeTableNos(a: number, b: number): number {
  const pa = cafePhysicalTableNo(a);
  const pb = cafePhysicalTableNo(b);
  if (pa !== pb) return pa - pb;
  const sa = decodeCafeTableSplit(a)?.splitIndex ?? 0;
  const sb = decodeCafeTableSplit(b)?.splitIndex ?? 0;
  return sa - sb;
}
