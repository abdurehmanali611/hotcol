/** Display voucher numbers with leading zeros (0001, 0010, 0100, …). */

export function formatVoucherDisplay(
  voucherNumber?: number | null,
  voucherDisplay?: string | null,
): string {
  if (voucherDisplay && String(voucherDisplay).trim()) {
    return String(voucherDisplay).trim();
  }
  const n = Math.floor(Number(voucherNumber) || 0);
  if (n <= 0) return "—";
  const s = String(n);
  return s.length >= 4 ? s : s.padStart(4, "0");
}

type VoucherLike = {
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
};

function voucherSortKey(row: VoucherLike): number {
  if (row.voucherNumber != null && Number(row.voucherNumber) > 0) {
    return Math.floor(Number(row.voucherNumber));
  }
  const d = String(row.voucherDisplay ?? "").trim();
  if (d) {
    const parsed = parseInt(d, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

/**
 * One voucher → "0001". Multiple → "0001-0010" (lowest–highest by sequence).
 */
export function formatVoucherRange(rows: VoucherLike[]): string {
  const keys = [
    ...new Set(rows.map((r) => voucherSortKey(r)).filter((n) => n > 0)),
  ].sort((a, b) => a - b);
  if (keys.length === 0) return "—";
  if (keys.length === 1) return formatVoucherDisplay(keys[0], null);
  return `${formatVoucherDisplay(keys[0], null)}-${formatVoucherDisplay(keys[keys.length - 1], null)}`;
}
