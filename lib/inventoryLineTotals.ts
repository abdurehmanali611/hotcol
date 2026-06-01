import type { ItemRegistration, PurchaseRequestRow, StockOutRequestRow } from "@/lib/actions";
import {
  computeInventoryPaidAmountETB,
  computeLineSubtotalETB,
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
}): number {
  return computeLineSubtotalETB(row.quantity, row.estimatedUnitPrice);
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

export function formatPurchaseMoneyDetail(row: PurchaseRequestRow): string {
  return formatUnitAndTotalDetail(
    Number(row.estimatedUnitPrice) || 0,
    purchaseLineTotalETB(row),
    { estimated: true },
  );
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
