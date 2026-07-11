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
 * Fresh bazaar for payment & tax:
 * fully stocked out to Kitchen/Bar (same “Department” as Inactive), or received by
 * Kitchen/Bar. Staff destination / `(staff)` names are never fresh bazaar.
 */
export function isKitchenFreshBazaarArchive(
  row: {
    name?: string | null;
    receivedByDepartment?: string | null;
  },
  stockOutDest?: string | null,
): boolean {
  const name = String(row.name ?? "").toLowerCase();
  if (/\(staff\)/.test(name)) return false;
  const dest = String(stockOutDest ?? "")
    .trim()
    .toUpperCase();
  if (dest === "STAFF") return false;
  if (dest === "KITCHEN" || dest === "BAR") return true;
  const dept = String(row.receivedByDepartment ?? "")
    .trim()
    .toUpperCase();
  if (dept === "STAFF" || dept === "STORE") return false;
  if (dept === "KITCHEN" || dept === "BAR") return true;
  // Legacy empty dept — treat as fresh bazaar only when no staff signal.
  return !dept;
}

/** Resolve stock-out department code the same way Inactive list does. */
export function paymentStockOutDepartmentCode(req: {
  requestedByDepartment?: string | null;
  stakeHolderOrReason?: string | null;
  movementType?: string | null;
  status?: string | null;
}): string {
  const requested = String(req.requestedByDepartment ?? "").trim().toUpperCase();
  if (requested) return requested;
  if (String(req.movementType ?? "").toUpperCase() === "STOCK_OUT" || !req.movementType) {
    const stake = String(req.stakeHolderOrReason ?? "").trim().toLowerCase();
    if (stake === "kitchen") return "KITCHEN";
    if (stake === "barista" || stake === "bar") return "BAR";
    if (stake === "staff") return "STAFF";
  }
  return "";
}

export function lastApprovedStockOutDest(
  itemRegistrationId: number,
  stockOuts: readonly {
    itemRegistrationId: number;
    amount?: number;
    status: string;
    movementType?: string | null;
    requestedByDepartment?: string | null;
    stakeHolderOrReason?: string | null;
  }[] = [],
): string {
  let best: (typeof stockOuts)[number] | null = null;
  for (const s of stockOuts) {
    if (Number(s.itemRegistrationId) !== itemRegistrationId) continue;
    if (String(s.status ?? "").toUpperCase() !== "APPROVED") continue;
    const mt = String(s.movementType ?? "STOCK_OUT").toUpperCase();
    if (mt && mt !== "STOCK_OUT") continue;
    best = s;
  }
  return best ? paymentStockOutDepartmentCode(best) : "";
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
  stockOutDest?: string | null,
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
  const paymentSource: InventoryPaymentSource = isKitchenFreshBazaarArchive(
    row,
    stockOutDest,
  )
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
 * kitchen/bar fresh-bazaar archives. Staff / non-kitchen-bar depletes stay as
 * `depleted` (Stocked out) — never tagged Fresh bazaar.
 */
export function mergeInventoryPaymentRows(
  inventoryItems: readonly ItemRegistration[],
  freshBazaarArchives: readonly FreshBazaarRow[] = [],
  stockOuts: readonly {
    itemRegistrationId: number;
    amount: number;
    status: string;
    movementType?: string | null;
    requestedByDepartment?: string | null;
    stakeHolderOrReason?: string | null;
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
    .map((f) =>
      freshBazaarToPaymentRow(
        f,
        lastApprovedStockOutDest(f.itemRegistrationId, stockOuts),
      ),
    );
  return [...storeRows, ...archiveRows];
}

/**
 * Group key for payment & tax item rollups: case-insensitive, collapses
 * whitespace, and folds `(staff)` variants into the same product.
 */
export function normalizePaymentItemGroupKey(name: string): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/\(staff\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Human display name for a group (strips staff suffix noise). */
export function paymentItemGroupDisplayName(name: string): string {
  const cleaned = String(name ?? "")
    .replace(/\(staff\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Item";
}

export type InventoryPaymentItemGroup = {
  id: number;
  groupKey: string;
  name: string;
  measuredBy: string;
  totalQty: number;
  totalLineValue: number;
  totalCredit: number;
  totalPaid: number;
  lineCount: number;
  freshBazaarLines: number;
  freshBazaarQty: number;
  depletedLines: number;
  depletedQty: number;
  storeLines: number;
  storeQty: number;
  paymentBucket: InventoryPaymentBucket | "mixed";
  vatMode: "with" | "without" | "mixed";
  supplierLabel: string;
  supplierCount: number;
  registrationFrom: Date | string | null;
  registrationTo: Date | string | null;
  lines: InventoryPaymentRow[];
};

export function formatPaymentSourceBreakdown(group: {
  freshBazaarLines: number;
  depletedLines: number;
  storeLines: number;
}): string {
  const parts: string[] = [];
  if (group.freshBazaarLines > 0) {
    parts.push(
      `${group.freshBazaarLines} fresh bazaar${group.freshBazaarLines === 1 ? "" : "s"}`,
    );
  }
  if (group.depletedLines > 0) {
    parts.push(`${group.depletedLines} stocked out`);
  }
  if (group.storeLines > 0) {
    parts.push(`${group.storeLines} in store`);
  }
  return parts.join(" · ") || "—";
}

function stableNegativeIdFromKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = h | 0;
  return n === 0 ? -1 : n > 0 ? -n : n;
}

/**
 * Roll payment lines into one row per item (general rule for any product name).
 * Underlying registration lines stay on `group.lines` for export / drill-down.
 */
export function groupInventoryPaymentRowsByItem(
  rows: readonly InventoryPaymentRow[],
): InventoryPaymentItemGroup[] {
  const buckets = new Map<string, InventoryPaymentRow[]>();
  for (const row of rows) {
    const key = normalizePaymentItemGroupKey(row.name) || `id:${row.id}`;
    const list = buckets.get(key);
    if (list) list.push(row);
    else buckets.set(key, [row]);
  }

  const groups: InventoryPaymentItemGroup[] = [];
  for (const [groupKey, lines] of buckets) {
    lines.sort((a, b) => {
      const da = new Date(a.registrationDate).getTime();
      const db = new Date(b.registrationDate).getTime();
      if (Number.isFinite(da) && Number.isFinite(db) && da !== db) return da - db;
      return String(a.supplierName).localeCompare(String(b.supplierName));
    });

    let freshBazaarLines = 0;
    let freshBazaarQty = 0;
    let depletedLines = 0;
    let depletedQty = 0;
    let storeLines = 0;
    let storeQty = 0;
    let totalQty = 0;
    let totalLineValue = 0;
    let totalCredit = 0;
    let totalPaid = 0;
    const nameVotes = new Map<string, number>();
    const units = new Set<string>();
    const suppliers = new Set<string>();
    const bucketsSeen = new Set<InventoryPaymentBucket>();
    const vatSeen = new Set<"with" | "without">();
    let registrationFrom: Date | string | null = null;
    let registrationTo: Date | string | null = null;

    for (const line of lines) {
      const qty = registeredAmountOf(line);
      totalQty += qty;
      totalLineValue += lineOwedETB(line);
      totalCredit += creditAmountETB(line);
      totalPaid += Number(line.paidAmount) || 0;
      bucketsSeen.add(itemPaymentBucket(line));
      vatSeen.add(isVatEnabled(line.purchaseWithVat) ? "with" : "without");
      const unit = String(line.measuredBy ?? "").trim();
      if (unit) units.add(unit);
      const sup = String(line.supplierName ?? "").trim();
      if (sup) suppliers.add(sup);

      const display = paymentItemGroupDisplayName(line.name);
      nameVotes.set(display, (nameVotes.get(display) || 0) + 1);

      const src = line.paymentSource ?? "store";
      if (src === "fresh_bazaar") {
        freshBazaarLines += 1;
        freshBazaarQty += qty;
      } else if (src === "depleted") {
        depletedLines += 1;
        depletedQty += qty;
      } else {
        storeLines += 1;
        storeQty += qty;
      }

      const rd = line.registrationDate;
      if (rd) {
        const t = new Date(rd).getTime();
        if (Number.isFinite(t)) {
          if (
            registrationFrom == null ||
            t < new Date(registrationFrom).getTime()
          ) {
            registrationFrom = rd;
          }
          if (
            registrationTo == null ||
            t > new Date(registrationTo).getTime()
          ) {
            registrationTo = rd;
          }
        }
      }
    }

    let bestName = paymentItemGroupDisplayName(lines[0]?.name ?? groupKey);
    let bestVotes = 0;
    for (const [n, v] of nameVotes) {
      if (v > bestVotes) {
        bestVotes = v;
        bestName = n;
      }
    }

    const paymentBucket: InventoryPaymentBucket | "mixed" =
      bucketsSeen.size === 1
        ? [...bucketsSeen][0]!
        : bucketsSeen.size === 0
          ? "none"
          : "mixed";
    const vatMode: "with" | "without" | "mixed" =
      vatSeen.size === 1 ? [...vatSeen][0]! : "mixed";

    const supplierList = [...suppliers].sort((a, b) => a.localeCompare(b));
    const supplierLabel =
      supplierList.length === 0
        ? "—"
        : supplierList.length === 1
          ? supplierList[0]!
          : `${supplierList.length} suppliers`;

    groups.push({
      id: stableNegativeIdFromKey(groupKey),
      groupKey,
      name: bestName,
      measuredBy: units.size === 1 ? [...units][0]! : units.size > 1 ? "mixed" : "",
      totalQty,
      totalLineValue,
      totalCredit,
      totalPaid,
      lineCount: lines.length,
      freshBazaarLines,
      freshBazaarQty,
      depletedLines,
      depletedQty,
      storeLines,
      storeQty,
      paymentBucket,
      vatMode,
      supplierLabel,
      supplierCount: supplierList.length,
      registrationFrom,
      registrationTo,
      lines,
    });
  }

  groups.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

