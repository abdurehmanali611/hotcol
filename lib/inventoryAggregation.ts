import { normalizeInventoryItemName } from "@/lib/tenantRowMatch";
import type { items, InventorySupplierLine } from "@/app/StoreItems/columns";
import { creditAmountETB, isVatEnabled, lineOwedETB } from "@/lib/hotelInventoryPayment";

export type AggregatedInventoryRow = items & {
  isAggregated: true;
  registrationLines: items[];
  suppliers: InventorySupplierLine[];
};

export function isAggregatedInventoryRow(
  row: items,
): row is AggregatedInventoryRow {
  return Boolean((row as AggregatedInventoryRow).isAggregated);
}

export function aggregatedLineOwedETB(row: items): number {
  if (isAggregatedInventoryRow(row)) {
    return row.registrationLines.reduce((sum, line) => sum + lineOwedETB(line), 0);
  }
  return lineOwedETB(row);
}

export function aggregatedCreditETB(row: items): number {
  if (isAggregatedInventoryRow(row)) {
    return row.registrationLines.reduce(
      (sum, line) => sum + creditAmountETB(line),
      0,
    );
  }
  return creditAmountETB(row);
}

export function aggregateInventoryByItemName(rows: items[]): items[] {
  const groups = new Map<string, items[]>();

  for (const row of rows) {
    const key = normalizeInventoryItemName(row.name);
    if (!key) {
      groups.set(`__id_${row.id}`, [row]);
      continue;
    }
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const merged: items[] = [];

  for (const lines of groups.values()) {
    if (lines.length === 1) {
      merged.push(lines[0]);
      continue;
    }

    const primary = lines.reduce((best, line) =>
      line.amount > best.amount ? line : best,
    lines[0]);

    const totalAmount = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
    const totalPaid = lines.reduce(
      (sum, line) => sum + (Number(line.paidAmount) || 0),
      0,
    );

    const expireDate = lines.reduce((earliest, line) => {
      const d = new Date(line.expireDate);
      return d < new Date(earliest) ? line.expireDate : earliest;
    }, lines[0].expireDate);

    const suppliers: InventorySupplierLine[] = lines.map((line) => ({
      registrationId: line.id,
      supplierName: line.supplierName,
      supplierPhone: line.supplierPhone,
      supplierTinNumber: line.supplierTinNumber,
      Address: line.Address,
      amount: line.amount,
      paidAmount: line.paidAmount,
      unitPrice: line.unitPrice,
      registrationDate: line.registrationDate,
      purchaseWithVat: line.purchaseWithVat,
    }));

    const vatFlags = new Set(lines.map((l) => isVatEnabled(l.purchaseWithVat)));
    const purchaseWithVat =
      vatFlags.size === 1 ? isVatEnabled(primary.purchaseWithVat) : undefined;

    const aggregated: AggregatedInventoryRow = {
      ...primary,
      amount: totalAmount,
      paidAmount: totalPaid,
      expireDate,
      purchaseWithVat,
      isAggregated: true,
      registrationLines: lines,
      suppliers,
    };

    merged.push(aggregated);
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

export function countUniqueInventoryNames(rows: items[]): number {
  const keys = new Set<string>();
  for (const row of rows) {
    const key = normalizeInventoryItemName(row.name);
    keys.add(key || `__id_${row.id}`);
  }
  return keys.size;
}
