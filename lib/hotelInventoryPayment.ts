import type { FreshBazaarRow, ItemRegistration } from "@/lib/api/types";

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

/** Row shown in Inventory payment & tax (live store + archives). */
export type InventoryPaymentSource = "store" | "fresh_bazaar" | "depleted";

export type InventoryPaymentRow = ItemRegistration & {
  paymentSource?: InventoryPaymentSource;
  /** On-hand qty for store lines (before adding stock-outs into registeredAmount). */
  onHandAmount?: number;
};

/**
 * True fresh-bazaar archives: stocked in (received) as Kitchen or Bar, then
 * fully stocked out — not Store-received depletes.
 */
export function isKitchenFreshBazaarArchive(row: {
  name?: string | null;
  receivedByDepartment?: string | null;
}): boolean {
  const name = String(row.name ?? "").toLowerCase();
  // Staff-meal style names are not fresh-bazaar format for payment labeling.
  if (/\(staff\)/.test(name)) return false;
  const dept = String(row.receivedByDepartment ?? "")
    .trim()
    .toUpperCase();
  if (dept === "STORE") return false;
  if (dept === "KITCHEN" || dept === "BAR") return true;
  // Legacy archives with empty dept defaulted to kitchen — treat as fresh bazaar.
  return !dept;
}

/**
 * Ensure each live registration uses original qty = on-hand + approved stock-outs.
 * Prefers server `registeredAmount` when present; otherwise reconstructs from movements.
 */
export function applyRegisteredAmountsFromStockOuts(
  items: readonly ItemRegistration[],
  stockOuts: readonly {
    itemRegistrationId: number;
    amount: number;
    status: string;
  }[] = [],
): ItemRegistration[] {
  const deducted = new Map<number, number>();
  for (const s of stockOuts) {
    if (String(s.status ?? "").toUpperCase() !== "APPROVED") continue;
    const id = Number(s.itemRegistrationId);
    if (!Number.isFinite(id) || id <= 0) continue;
    deducted.set(id, (deducted.get(id) || 0) + (Number(s.amount) || 0));
  }
  return items.map((item) => {
    const onHand = Number(item.amount) || 0;
    const fromMoves = deducted.get(item.id) || 0;
    const existing = Number(item.registeredAmount);
    const registeredAmount =
      Number.isFinite(existing) && existing > 0
        ? Math.max(existing, onHand + fromMoves)
        : onHand + fromMoves;
    return { ...item, registeredAmount };
  });
}

/** Map a FreshBazaar archive into a payment-table row. */
export function freshBazaarToPaymentRow(
  row: FreshBazaarRow,
): InventoryPaymentRow {
  const qty = Number(row.amount) || 0;
  const unitPrice = Number(row.unitPrice) || 0;
  const paidAmount = Number(row.paidAmount) || 0;
  const registrationDate = (row.registrationDate ||
    row.archivedAt ||
    new Date()) as Date;
  // Use a stable synthetic id so DataTable keys never collide with live store rows
  // if MySQL ever reuses an itemRegistrationId after delete.
  const syntheticId = -(Number(row.id) || row.itemRegistrationId || 0);
  const paymentSource: InventoryPaymentSource = isKitchenFreshBazaarArchive(row)
    ? "fresh_bazaar"
    : "depleted";
  return {
    id: syntheticId !== 0 ? syntheticId : -row.itemRegistrationId,
    name: row.name,
    imageUrl: row.imageUrl || "",
    category: row.category || "",
    amount: 0,
    measuredBy: row.measuredBy,
    unitPrice,
    registrationDate,
    expireDate: registrationDate,
    supplierName: row.supplierName,
    supplierPhone: row.supplierPhone,
    purchaseWithVat: row.purchaseWithVat,
    supplierTinNumber: row.supplierTinNumber,
    Address: row.Address,
    paidAmount,
    registeredAmount: qty,
    registeredValue: computeInventoryPaidAmountETB(
      qty,
      unitPrice,
      row.purchaseWithVat,
    ),
    HotelName: row.HotelName,
    approvalStatus: "AUTHORIZED",
    paymentSource,
    onHandAmount: 0,
  };
}

/**
 * Live store lines (qty = original registered = on-hand + stocked out) plus
 * kitchen/bar fresh-bazaar archives. Store-received fully depleted archives stay
 * in the list without the Fresh bazaar tag (`depleted`) so payment still shows
 * them as one line — never split into remaining inventory + stocked-out separately.
 */
export function mergeInventoryPaymentRows(
  inventoryItems: readonly ItemRegistration[],
  freshBazaarArchives: readonly FreshBazaarRow[] = [],
  stockOuts: readonly {
    itemRegistrationId: number;
    amount: number;
    status: string;
  }[] = [],
): InventoryPaymentRow[] {
  const withRegistered = applyRegisteredAmountsFromStockOuts(
    inventoryItems,
    stockOuts,
  );
  const storeRows: InventoryPaymentRow[] = withRegistered.map((r) => ({
    ...r,
    // Payment math uses registeredAmount (on-hand + out); keep amount as on-hand.
    paymentSource: "store" as const,
    onHandAmount: Number(r.amount) || 0,
  }));
  const storeIds = new Set(withRegistered.map((r) => r.id));
  const archiveRows = freshBazaarArchives
    // Skip when the same registration is still live (partial stock — one summed store line).
    .filter((f) => !storeIds.has(f.itemRegistrationId))
    .map(freshBazaarToPaymentRow);
  return [...storeRows, ...archiveRows];
}
