import type {
  ItemRegistration,
  ItemStatus,
  PurchaseRequestRow,
  StockOutRequestRow,
  FreshBazaarRow,
} from "@/lib/actions";
import {
  computeInventoryPaidAmountETB,
  computeInventoryVatETB,
  computeLineSubtotalETB,
  isVatEnabled,
} from "@/lib/hotelInventoryPayment";

export function formatEtbAmount(amount: number): string {
  return `ETB ${Math.round(Number(amount) || 0).toLocaleString()}`;
}

export function registrationLineTotalETB(row: {
  amount: number;
  unitPrice: number;
  purchaseWithVat?: unknown;
}): number {
  return computeInventoryPaidAmountETB(
    row.amount,
    row.unitPrice,
    row.purchaseWithVat,
  );
}

export function purchaseLineTotalETB(row: {
  quantity: number;
  estimatedUnitPrice: number;
  purchaseWithVat?: unknown;
}): number {
  return computeInventoryPaidAmountETB(
    row.quantity,
    row.estimatedUnitPrice,
    row.purchaseWithVat,
  );
}

export type RegistrationUnitPriceLookup = Map<
  number,
  { unitPrice: number; purchaseWithVat?: unknown }
>;

export function unitPriceByRegistrationIdFromInventory(
  items: Iterable<ItemRegistration>,
): RegistrationUnitPriceLookup {
  const map: RegistrationUnitPriceLookup = new Map();
  for (const item of items) {
    const id = Math.floor(Number(item.id));
    if (!Number.isFinite(id) || id <= 0) continue;
    map.set(id, {
      unitPrice: Number(item.unitPrice) || 0,
      purchaseWithVat: item.purchaseWithVat,
    });
  }
  return map;
}

/** Kitchen fresh-bazaar archives keyed by deleted registration id. */
export function unitPriceByRegistrationIdFromFreshBazaar(
  items: Iterable<FreshBazaarRow>,
): RegistrationUnitPriceLookup {
  const map: RegistrationUnitPriceLookup = new Map();
  for (const row of items) {
    const id = Math.floor(Number(row.itemRegistrationId));
    if (!Number.isFinite(id) || id <= 0) continue;
    map.set(id, {
      unitPrice: Number(row.unitPrice) || 0,
      purchaseWithVat: row.purchaseWithVat,
    });
  }
  return map;
}

/** Snapshot from inactive/history rows created when stock is applied. */
export type StockMovementStatusSnapshot = {
  unitPrice: number;
  purchaseWithVat?: unknown;
  measuredBy: string;
  name: string;
  category: string;
  imageUrl: string;
  supplierName: string;
  supplierPhone: string;
  Address: string;
  supplierTinNumber?: string;
};

export function unitPriceByStockOutRequestIdFromItemStatus(
  items: Iterable<ItemStatus>,
): Map<number, StockMovementStatusSnapshot> {
  const map = new Map<number, StockMovementStatusSnapshot>();
  for (const row of items) {
    const id = Math.floor(Number(row.stockOutRequestId));
    if (!Number.isFinite(id) || id <= 0) continue;
    map.set(id, {
      unitPrice: Number(row.unitPrice) || 0,
      purchaseWithVat: row.purchaseWithVat,
      measuredBy: String(row.measuredBy || "").trim() || "units",
      name: String(row.name || "").trim(),
      category: String(row.category || "").trim(),
      imageUrl: String(row.imageUrl || "").trim(),
      supplierName: String(row.supplierName || "").trim(),
      supplierPhone: String(row.supplierPhone || "").trim(),
      Address: String(row.Address || "").trim(),
      supplierTinNumber: row.supplierTinNumber,
    });
  }
  return map;
}

export function stockLineUnitPriceLookup(
  row: Pick<
    StockOutRequestRow,
    | "itemRegistrationId"
    | "id"
    | "unitPriceSnapshot"
    | "purchaseWithVatSnapshot"
  >,
  lookup?: RegistrationUnitPriceLookup,
  statusLookup?: Map<number, StockMovementStatusSnapshot>,
  freshBazaarLookup?: RegistrationUnitPriceLookup,
): { unitPrice: number; purchaseWithVat?: unknown } | null {
  if (row.unitPriceSnapshot != null && Number.isFinite(Number(row.unitPriceSnapshot))) {
    return {
      unitPrice: Number(row.unitPriceSnapshot) || 0,
      purchaseWithVat: row.purchaseWithVatSnapshot,
    };
  }
  const regId = Math.floor(Number(row.itemRegistrationId));
  const linked = Number.isFinite(regId) && regId > 0 ? lookup?.get(regId) : undefined;
  if (linked) {
    return { unitPrice: linked.unitPrice, purchaseWithVat: linked.purchaseWithVat };
  }
  const snap = statusLookup?.get(row.id);
  if (snap) {
    return { unitPrice: snap.unitPrice, purchaseWithVat: snap.purchaseWithVat };
  }
  const archived =
    Number.isFinite(regId) && regId > 0 ? freshBazaarLookup?.get(regId) : undefined;
  if (archived) {
    return {
      unitPrice: archived.unitPrice,
      purchaseWithVat: archived.purchaseWithVat,
    };
  }
  return null;
}

export function stockLineTotalETB(
  row: Pick<
    StockOutRequestRow,
    | "amount"
    | "itemRegistrationId"
    | "id"
    | "unitPriceSnapshot"
    | "purchaseWithVatSnapshot"
  >,
  lookup?: RegistrationUnitPriceLookup,
  statusLookup?: Map<number, StockMovementStatusSnapshot>,
  freshBazaarLookup?: RegistrationUnitPriceLookup,
): number | null {
  const pricing = stockLineUnitPriceLookup(
    row,
    lookup,
    statusLookup,
    freshBazaarLookup,
  );
  if (!pricing) return null;
  return computeInventoryPaidAmountETB(
    row.amount,
    pricing.unitPrice,
    pricing.purchaseWithVat,
  );
}

export function formatUnitAndTotalDetail(
  unitPrice: number,
  total: number,
  options?: { estimated?: boolean },
): string {
  const prefix = options?.estimated ? "Est. " : "";
  return `${prefix}${formatEtbAmount(unitPrice)}/unit · Total ${formatEtbAmount(total)}`;
}

export function formatRegistrationMoneyDetail(row: ItemRegistration): string {
  return formatUnitAndTotalDetail(
    Number(row.unitPrice) || 0,
    registrationLineTotalETB(row),
  );
}

export function purchaseVatModeLabel(purchaseWithVat?: unknown): string {
  return isVatEnabled(purchaseWithVat) ? "With VAT (15%)" : "Without VAT";
}

/** Subtotal, VAT portion, and line total (total includes 15% VAT when enabled). */
export function purchaseLineMoneyBreakdown(row: {
  quantity: number;
  estimatedUnitPrice: number;
  purchaseWithVat?: unknown;
}) {
  const unit = Number(row.estimatedUnitPrice) || 0;
  const qty = Number(row.quantity) || 0;
  const subtotalETB = computeLineSubtotalETB(qty, unit);
  const withVat = isVatEnabled(row.purchaseWithVat);
  const vatETB = withVat ? computeInventoryVatETB(subtotalETB, true) : 0;
  const totalETB = subtotalETB + vatETB;
  return { unit, qty, subtotalETB, vatETB, totalETB, withVat };
}

export function formatPurchaseMoneyDetail(row: PurchaseRequestRow): string {
  const { unit, subtotalETB, vatETB, totalETB, withVat } =
    purchaseLineMoneyBreakdown(row);
  const mode = purchaseVatModeLabel(row.purchaseWithVat);
  if (withVat) {
    return `${mode} · Est. ${formatEtbAmount(unit)}/unit (ex-VAT) · ${formatEtbAmount(subtotalETB)} + VAT ${formatEtbAmount(vatETB)} = Total ${formatEtbAmount(totalETB)}`;
  }
  return `${mode} · Est. ${formatEtbAmount(unit)}/unit · Total ${formatEtbAmount(totalETB)}`;
}

export function formatStockMoneyDetail(
  row: StockOutRequestRow,
  lookup?: RegistrationUnitPriceLookup,
  statusLookup?: Map<number, StockMovementStatusSnapshot>,
): string | null {
  const pricing = stockLineUnitPriceLookup(row, lookup, statusLookup);
  if (!pricing) return null;
  const total = stockLineTotalETB(row, lookup, statusLookup);
  if (total == null) return null;
  return formatUnitAndTotalDetail(pricing.unitPrice, total);
}
