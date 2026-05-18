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
