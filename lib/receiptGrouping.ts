import type {
  ItemRegistration,
  PurchaseRequestRow,
  StockOutRequestRow,
} from "@/lib/actions";
import {
  formatMovementType,
  formatQtyWithUnit,
} from "@/lib/hotelDisplayLabels";
import {
  isItemRegistrationPrintable,
  isPurchaseRequestPrintable,
  isStockMovementPrintable,
} from "@/lib/hotelApproval";
import {
  itemPaymentBucket,
  itemPaymentLabel,
  lineOwedETB,
} from "@/lib/hotelInventoryPayment";
import { formatVoucherDisplay, formatVoucherRange } from "@/lib/voucherFormat";

export type ReceiptKind = "registration" | "purchase_request" | "stock_movement";

export type ReceiptLine = {
  id: string;
  sourceId: number;
  sourceKind: ReceiptKind;
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
  name: string;
  quantity: number;
  measuredBy: string;
  unitPrice?: number | null;
  lineTotal?: number | null;
  category?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
  paymentLabel?: string | null;
  movementLabel?: string | null;
  purchaseWithVat?: boolean | null;
};

export type ReceiptBundle = {
  key: string;
  id: number;
  kind: ReceiptKind;
  title: string;
  date: string;
  dateLabel: string;
  supplierName: string;
  supplierPhone?: string | null;
  supplierAddress?: string | null;
  supplierTinNumber?: string | null;
  totalETB: number;
  paymentLabel?: string | null;
  purchaseRequestVoucher?: string | null;
  registrationVoucher?: string | null;
  stockMovementVoucher?: string | null;
  lines: ReceiptLine[];
  storeActorName?: string | null;
  ccActorName?: string | null;
  financeActorName?: string | null;
  managerActorName?: string | null;
};

function bundleIdFromKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 33 + key.charCodeAt(i)) | 0;
  const n = Math.abs(h) % 1_000_000_000;
  return n === 0 ? 1 : n;
}

function dateKey(d: Date | string | null | undefined): string {
  const t = new Date(d ?? "");
  return Number.isNaN(t.getTime()) ? "" : t.toISOString().slice(0, 10);
}

function displayDate(d: Date | string | null | undefined): string {
  const t = new Date(d ?? "");
  if (Number.isNaN(t.getTime())) return "-";
  return t.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function receiptTitle(kind: ReceiptKind, opts?: {
  paymentLabel?: string | null;
  movementType?: string | null;
}): string {
  if (kind === "stock_movement") {
    return "Store Issue voucher";
  }
  if (kind === "purchase_request") {
    return "Purchase Request";
  }
  return opts?.paymentLabel === "On credit"
    ? "Credit Goods Receiving voucher"
    : "Cash Goods Receiving Voucher";
}

function groupSupplierKey(name: string | null | undefined): string {
  return String(name ?? "").trim().toLowerCase();
}

function mapItemById(rows: ItemRegistration[]): Map<number, ItemRegistration> {
  return new Map(rows.map((row) => [row.id, row]));
}

function registrationBundles(
  rows: ItemRegistration[],
  prById: Map<number, string>,
): ReceiptBundle[] {
  const map = new Map<string, ItemRegistration[]>();
  for (const row of rows) {
    const day = dateKey(row.registrationDate);
    const supplier = groupSupplierKey(row.supplierName);
    const payment = itemPaymentBucket(row);
    const kind: ReceiptKind = "registration";
    const key = `${kind}|${supplier}|${day}|${payment}`;
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }

  return [...map.entries()].map(([key, items]) => {
    const first = items[0];
    const paymentLabel = itemPaymentLabel(itemPaymentBucket(first));
    const prIds = [
      ...new Set(
        items
          .map((item) => item.purchaseRequestId)
          .filter((id): id is number => id != null),
      ),
    ];
    const purchaseRequestVoucher = prIds.length
      ? prIds
          .map((id) => prById.get(id) ?? formatVoucherDisplay(id, null))
          .join(", ")
      : null;
    const lines: ReceiptLine[] = items.map((item) => ({
      id: `registration-${item.id}`,
      sourceId: item.id,
      sourceKind: "registration",
      voucherNumber: item.voucherNumber,
      voucherDisplay: item.voucherDisplay,
      name: item.name,
      quantity: Number(item.amount) || 0,
      measuredBy: item.measuredBy,
      unitPrice: Number(item.unitPrice) || 0,
      lineTotal: lineOwedETB(item),
      category: item.category,
      imageUrl: item.imageUrl,
      paymentLabel,
      purchaseWithVat: item.purchaseWithVat,
    }));
    const kind: ReceiptKind = "registration";
    return {
      key,
      id: bundleIdFromKey(key),
      kind,
      title: receiptTitle(kind, { paymentLabel }),
      date: dateKey(first.registrationDate),
      dateLabel: displayDate(first.registrationDate),
      supplierName: String(first.supplierName || "").trim() || "-",
      supplierPhone: first.supplierPhone,
      supplierAddress: first.Address,
      supplierTinNumber: first.supplierTinNumber,
      totalETB: items.reduce((sum, item) => sum + lineOwedETB(item), 0),
      paymentLabel,
      purchaseRequestVoucher,
      registrationVoucher: formatVoucherRange(items),
      lines,
      storeActorName: first.statusBy ?? null,
      ccActorName: first.ccActorName ?? null,
      financeActorName: first.financeActorName ?? null,
      managerActorName: first.managerActorName ?? null,
    };
  });
}

function purchaseRequestBundles(rows: PurchaseRequestRow[]): ReceiptBundle[] {
  const map = new Map<string, PurchaseRequestRow[]>();
  for (const row of rows) {
    const day = dateKey(row.createdAt);
    const supplier = groupSupplierKey(row.supplierName);
    const key = `purchase_request|${supplier}|${day}`;
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }

  return [...map.entries()].map(([key, items]) => {
    const first = items[0];
    const lines: ReceiptLine[] = items.map((item) => ({
      id: `purchase-request-${item.id}`,
      sourceId: item.id,
      sourceKind: "purchase_request",
      voucherNumber: item.voucherNumber,
      voucherDisplay: item.voucherDisplay,
      name: item.itemName,
      quantity: Number(item.quantity) || 0,
      measuredBy: item.measuredBy,
      unitPrice: Number(item.estimatedUnitPrice) || 0,
      lineTotal:
        (Number(item.quantity) || 0) * (Number(item.estimatedUnitPrice) || 0),
      category: item.category,
      notes: item.notes,
    }));
    return {
      key,
      id: bundleIdFromKey(key),
      kind: "purchase_request",
      title: receiptTitle("purchase_request"),
      date: dateKey(first.createdAt),
      dateLabel: displayDate(first.createdAt),
      supplierName: String(first.supplierName || "").trim() || "-",
      supplierPhone: first.supplierPhone,
      supplierAddress: null,
      supplierTinNumber: null,
      totalETB: lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0),
      registrationVoucher: null,
      purchaseRequestVoucher: formatVoucherRange(items),
      lines,
      storeActorName: first.storeUserName ?? null,
      ccActorName: first.ccActorName ?? null,
      financeActorName: first.financeActorName ?? null,
      managerActorName: first.managerActorName ?? null,
    };
  });
}

function stockMovementBundles(
  rows: StockOutRequestRow[],
  itemById: Map<number, ItemRegistration>,
): ReceiptBundle[] {
  return rows.map((row) => {
    const linkedItem = itemById.get(row.itemRegistrationId);
    const line: ReceiptLine = {
      id: `stock-movement-${row.id}`,
      sourceId: row.id,
      sourceKind: "stock_movement",
      voucherNumber: row.voucherNumber,
      voucherDisplay: row.voucherDisplay,
      name:
        String(row.itemName || "").trim() ||
        String(linkedItem?.name || "").trim() ||
        "Unknown item",
      quantity: Number(row.amount) || 0,
      measuredBy: linkedItem?.measuredBy || "units",
      unitPrice:
        linkedItem?.unitPrice != null ? Number(linkedItem.unitPrice) || 0 : null,
      lineTotal:
        linkedItem?.unitPrice != null
          ? (Number(row.amount) || 0) * (Number(linkedItem.unitPrice) || 0)
          : null,
      category: linkedItem?.category ?? null,
      imageUrl: linkedItem?.imageUrl ?? null,
      notes: row.stakeHolderOrReason,
      movementLabel: formatMovementType(row.movementType),
    };

    const key = `stock_movement|${row.id}`;
    return {
      key,
      id: bundleIdFromKey(key),
      kind: "stock_movement",
      title: receiptTitle("stock_movement", { movementType: row.movementType }),
      date: dateKey(row.createdAt),
      dateLabel: displayDate(row.createdAt),
      supplierName: String(linkedItem?.supplierName || "").trim() || "-",
      supplierPhone: linkedItem?.supplierPhone ?? null,
      supplierAddress: linkedItem?.Address ?? null,
      supplierTinNumber: linkedItem?.supplierTinNumber ?? null,
      totalETB: line.lineTotal || 0,
      paymentLabel: linkedItem ? itemPaymentLabel(itemPaymentBucket(linkedItem)) : null,
      registrationVoucher: linkedItem
        ? formatVoucherDisplay(linkedItem.voucherNumber, linkedItem.voucherDisplay)
        : null,
      stockMovementVoucher: formatVoucherDisplay(
        row.voucherNumber,
        row.voucherDisplay,
      ),
      lines: [line],
      storeActorName: row.requestedByUserName ?? null,
      ccActorName: row.ccActorName ?? null,
      financeActorName: row.financeActorName ?? null,
      managerActorName: row.managerActorName ?? null,
    };
  });
}

export type ReceiptGroupingOptions = {
  /** Omit purchase-request and stock-movement receipt groups. */
  registrationsOnly?: boolean;
};

export function groupRegistrationsForReceipt(
  rows: ItemRegistration[],
  purchaseRequests: PurchaseRequestRow[] = [],
  stockMovements: StockOutRequestRow[] = [],
  options?: ReceiptGroupingOptions,
): ReceiptBundle[] {
  const printableRows = rows.filter((row) =>
    isItemRegistrationPrintable(row.approvalStatus),
  );
  const registrationRows = printableRows;

  const printablePr = options?.registrationsOnly
    ? []
    : purchaseRequests.filter((row) => isPurchaseRequestPrintable(row.status));
  const printableStock = options?.registrationsOnly
    ? []
    : stockMovements.filter((row) => isStockMovementPrintable(row.status));

  const prById = new Map(
    printablePr.map((p) => [
      p.id,
      formatVoucherDisplay(p.voucherNumber, p.voucherDisplay),
    ]),
  );
  const itemById = mapItemById(registrationRows);

  const receivedItems = registrationRows.filter(
    (row) => row.purchaseRequestId != null,
  );
  const directRegistrations = registrationRows.filter(
    (row) => row.purchaseRequestId == null,
  );
  const linkedPrIds = new Set(
    receivedItems
      .map((row) => row.purchaseRequestId)
      .filter((id): id is number => id != null),
  );
  const standalonePurchaseRequests = printablePr.filter(
    (row) => !linkedPrIds.has(row.id),
  );

  return [
    ...registrationBundles(directRegistrations, prById),
    ...registrationBundles(receivedItems, prById),
    ...purchaseRequestBundles(standalonePurchaseRequests),
    ...stockMovementBundles(printableStock, itemById),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function bundleReceivedLabel(bundle: ReceiptBundle): string {
  return bundle.dateLabel;
}

export function bundleSupplierName(bundle: ReceiptBundle): string {
  return bundle.supplierName || "-";
}

export function bundleTotalETB(bundle: ReceiptBundle): number {
  return bundle.totalETB;
}

export function bundleItemsToPrint(bundle: ReceiptBundle): ReceiptBundle {
  return bundle;
}

export function bundleItemSummary(bundle: ReceiptBundle): string {
  const names = bundle.lines.map((line) => line.name);
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
}

export function bundleTypeLabel(bundle: ReceiptBundle): string {
  if (bundle.kind === "stock_movement") return bundle.title;
  if (bundle.paymentLabel) return `${bundle.title} - ${bundle.paymentLabel}`;
  return bundle.title;
}

export function bundleQuantityLabel(bundle: ReceiptBundle): string {
  const qty = bundle.lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  const measuredBy = bundle.lines[0]?.measuredBy || "units";
  return formatQtyWithUnit(qty, measuredBy);
}

/** Item registration voucher(s) for a receipt bundle or line list. */
export function formatRegistrationVoucherRange(
  rows: Pick<ItemRegistration, "voucherNumber" | "voucherDisplay">[],
): string {
  return formatVoucherRange(rows);
}
