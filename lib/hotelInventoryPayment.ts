export const INVENTORY_VAT_RATE = 0.15;

export function isVatEnabled(flag: unknown): boolean {
  if (flag === true) return true;
  if (typeof flag === "string") {
    const v = flag.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
  if (typeof flag === "number") return flag === 1;
  return false;
}

export function computeInventoryVatETB(
  subtotal: number,
  purchaseWithVat?: unknown,
): number {
  if (!isVatEnabled(purchaseWithVat)) return 0;
  return subtotal * INVENTORY_VAT_RATE;
}

/** Canonical inventory total: subtotal + duty fee + VAT(15% when enabled). */
export function lineOwedETB(item: {
  amount: number;
  unitPrice: number;
  dutyFee: number;
  purchaseWithVat?: unknown;
  registeredAmount?: number;
  registeredValue?: number;
}): number {
  const a = Number(item.amount) || 0;
  const u = Number(item.unitPrice) || 0;
  const duty = Number(item.dutyFee) || 0;
  const subtotal = a * u;
  const vat = computeInventoryVatETB(subtotal, item.purchaseWithVat);
  return subtotal + duty + vat;
}

export type InventoryPaymentBucket = "paid" | "credit" | "none";

export function itemPaymentBucket(item: {
  amount: number;
  unitPrice: number;
  dutyFee: number;
  paidAmount: number;
  purchaseWithVat?: unknown;
  registeredAmount?: number;
  registeredValue?: number;
}): InventoryPaymentBucket {
  const owed = lineOwedETB(item);
  const paid = Number(item.paidAmount) || 0;
  if (owed <= 0.01) return paid > 0 ? "paid" : "none";
  if (paid >= owed - 0.02) return "paid";
  return "credit";
}

export function itemPaymentLabel(bucket: InventoryPaymentBucket): string {
  switch (bucket) {
    case "paid":
      return "Fully paid";
    case "credit":
      return "On credit";
    default:
      return "No balance";
  }
}

export function summarizeInventoryPayment<T>(
  rows: T[],
  pick: (r: T) => {
    amount: number;
    unitPrice: number;
    dutyFee: number;
    paidAmount: number;
    purchaseWithVat?: unknown;
    registeredAmount?: number;
    registeredValue?: number;
  },
): { paid: number; credit: number; none: number; total: number } {
  let paid = 0;
  let credit = 0;
  let none = 0;
  for (const r of rows) {
    const b = itemPaymentBucket(pick(r));
    if (b === "paid") paid += 1;
    else if (b === "credit") credit += 1;
    else none += 1;
  }
  return { paid, credit, none, total: rows.length };
}
