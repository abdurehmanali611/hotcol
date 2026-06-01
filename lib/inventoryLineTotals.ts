import type { ItemRegistration, PurchaseRequestRow, StockOutRequestRow } from "@/lib/actions";
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
    if (!item.id) continue;
    map.set(item.id, {
      unitPrice: Number(item.unitPrice) || 0,
      purchaseWithVat: item.purchaseWithVat,
    });
  }
  return map;
}

export function stockLineTotalETB(
  row: Pick<StockOutRequestRow, "amount" | "itemRegistrationId">,
  lookup?: RegistrationUnitPriceLookup,
): number | null {
  const linked = lookup?.get(row.itemRegistrationId);
  if (!linked) return null;
  return computeInventoryPaidAmountETB(
    row.amount,
    linked.unitPrice,
    linked.purchaseWithVat,
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
): string | null {
  const linked = lookup?.get(row.itemRegistrationId);
  if (!linked) return null;
  const total = stockLineTotalETB(row, lookup);
  if (total == null) return null;
  return formatUnitAndTotalDetail(linked.unitPrice, total);
}
