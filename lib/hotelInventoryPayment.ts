/** Line total owed to supplier for a stock row (matches Value + Fees column). */
export function lineOwedETB(item: {
  amount: number;
  unitPrice: number;
  dutyFee: number;
  registeredAmount?: number;
  registeredValue?: number;
}): number {
  const rv = Number(item.registeredValue);
  if (Number.isFinite(rv) && rv > 0) return rv;
  const ra = Number(item.registeredAmount);
  if (Number.isFinite(ra) && ra > 0) {
    return ra * (Number(item.unitPrice) || 0) + (Number(item.dutyFee) || 0);
  }
  const a = Number(item.amount) || 0;
  const u = Number(item.unitPrice) || 0;
  const d = Number(item.dutyFee) || 0;
  return a * u + d;
}

export type InventoryPaymentBucket = "paid" | "credit" | "none";

export function itemPaymentBucket(item: {
  amount: number;
  unitPrice: number;
  dutyFee: number;
  paidAmount: number;
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
