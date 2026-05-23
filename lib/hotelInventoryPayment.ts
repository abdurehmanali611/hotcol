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

/**
 * UI/business rule for supplier-paid amount:
 * - without VAT: amount * unit price
 * - with VAT: amount * unit price + 15% VAT on that subtotal
 */
export function computeInventoryPaidAmountETB(
  amount: number,
  unitPrice: number,
  purchaseWithVat?: unknown,
): number {
  const qty = Number(amount) || 0;
  const price = Number(unitPrice) || 0;
  const subtotal = qty * price;
  if (!isVatEnabled(purchaseWithVat)) return subtotal;
  return subtotal + computeInventoryVatETB(subtotal, purchaseWithVat);
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
  const registeredAmount = Number(item.registeredAmount);
  const a =
    Number.isFinite(registeredAmount) && registeredAmount > 0
      ? registeredAmount
      : Number(item.amount) || 0;
  const u = Number(item.unitPrice) || 0;
  const duty = Number(item.dutyFee) || 0;
  return computeInventoryPaidAmountETB(a, u, item.purchaseWithVat) + duty;
}

export function creditAmountETB(item: {
  amount: number;
  unitPrice: number;
  dutyFee: number;
  paidAmount: number;
  purchaseWithVat?: unknown;
  registeredAmount?: number;
  registeredValue?: number;
}): number {
  const owed = lineOwedETB(item);
  const paid = Number(item.paidAmount) || 0;
  return Math.max(0, owed - paid);
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
) : {
  paid: number;
  credit: number;
  none: number;
  total: number;
  creditAmount: number;
} {
  let paid = 0;
  let credit = 0;
  let none = 0;
  let creditAmount = 0;
  for (const r of rows) {
    const item = pick(r);
    const b = itemPaymentBucket(item);
    if (b === "paid") paid += 1;
    else if (b === "credit") {
      credit += 1;
      creditAmount += creditAmountETB(item);
    }
    else none += 1;
  }
  return { paid, credit, none, total: rows.length, creditAmount };
}
