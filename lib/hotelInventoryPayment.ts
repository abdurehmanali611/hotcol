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
  const subtotal = computeLineSubtotalETB(amount, unitPrice);
  if (!isVatEnabled(purchaseWithVat)) return subtotal;
  return subtotal + computeInventoryVatETB(subtotal, purchaseWithVat);
}

export function computeLineSubtotalETB(
  amount: number,
  unitPrice: number,
): number {
  const qty = Number(amount) || 0;
  const price = Number(unitPrice) || 0;
  return qty * price;
}

export function summarizeReceiptFinancials(
  lines: {
    quantity: number;
    unitPrice?: number | null;
    purchaseWithVat?: unknown;
  }[],
): { subtotalETB: number; vatETB: number; grandTotalETB: number } {
  let subtotalETB = 0;
  let vatETB = 0;
  for (const line of lines) {
    const sub = computeLineSubtotalETB(line.quantity, line.unitPrice ?? 0);
    subtotalETB += sub;
    vatETB += computeInventoryVatETB(sub, line.purchaseWithVat);
  }
  return {
    subtotalETB,
    vatETB,
    grandTotalETB: subtotalETB + vatETB,
  };
}

/**
 * Quantity as originally registered (before any stock movements): current
 * inventory + amount moved out. Falls back to the live amount when the backend
 * does not provide a registered figure.
 */
export function registeredAmountOf(item: {
  amount: number;
  registeredAmount?: number;
}): number {
  const registeredAmount = Number(item.registeredAmount);
  if (Number.isFinite(registeredAmount) && registeredAmount > 0) {
    return registeredAmount;
  }
  return Number(item.amount) || 0;
}

/** Canonical inventory total: subtotal + VAT(15% when enabled). */
export function lineOwedETB(item: {
  amount: number;
  unitPrice: number;
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
  return computeInventoryPaidAmountETB(a, u, item.purchaseWithVat);
}

export function creditAmountETB(item: {
  amount: number;
  unitPrice: number;
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
    paidAmount: number;
    purchaseWithVat?: unknown;
    registeredAmount?: number;
    registeredValue?: number;
  },
): {
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
    } else none += 1;
  }
  return { paid, credit, none, total: rows.length, creditAmount };
}
