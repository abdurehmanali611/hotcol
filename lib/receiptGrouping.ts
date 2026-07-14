import type {
  ItemRegistration,
  ItemStatus,
  PurchaseRequestRow,
  StockOutRequestRow,
  FreshBazaarRow,
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
import {
  accountabilityGroupKey,
  accountabilityMatches,
  formatDepartmentWithLeader,
  formatRequestedByReceiptLabel,
} from "@/lib/departments";
import { computeInventoryPaidAmountETB } from "@/lib/hotelInventoryPayment";
import { formatVoucherDisplay, formatVoucherRange } from "@/lib/voucherFormat";
import {
  formatPurchaseEntranceDate,
  purchaseEntranceDate,
} from "@/lib/purchaseRequestDates";
import {
  stockMovementBusinessDate,
  stockMovementBusinessDateYmd,
} from "@/lib/stockMovementDates";
import { toYmdLocal } from "@/lib/hotelDateYmd";
import {
  stockLineTotalETB,
  stockLineUnitPriceLookup,
  unitPriceByRegistrationIdFromFreshBazaar,
  unitPriceByRegistrationIdFromInventory,
  unitPriceByStockOutRequestIdFromItemStatus,
  type StockMovementStatusSnapshot,
} from "@/lib/inventoryLineTotals";

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
  /** Department leader snapshot at submit (registration). */
  receivedByLabel?: string | null;
  /** Department leader snapshot at submit (purchase / stock). */
  requestedByLabel?: string | null;
  /** Store department leader at submit. */
  preparedByLeaderName?: string | null;
  /** Cost controller name from approval workflow. */
  checkedByName?: string | null;
  /** Finance department head name frozen at submit. */
  approvedByLeaderName?: string | null;
  /** GM department head name frozen at submit. */
  authorizedByLeaderName?: string | null;
};

function bundleIdFromKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 33 + key.charCodeAt(i)) | 0;
  const n = Math.abs(h) % 1_000_000_000;
  return n === 0 ? 1 : n;
}

function dateKey(d: Date | string | null | undefined): string {
  const t = new Date(d ?? "");
  if (Number.isNaN(t.getTime())) return "";
  return toYmdLocal(t);
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
    const recv = accountabilityGroupKey(
      row.receivedByDepartment,
      row.receivedByLeaderName,
    );
    const voucher =
      Math.floor(Number(row.voucherNumber) || 0) > 0
        ? String(Math.floor(Number(row.voucherNumber)))
        : String(row.voucherDisplay ?? "").trim() || `id:${row.id}`;
    const key = `${kind}|${voucher}|${supplier}|${day}|${payment}|${recv}`;
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
      receivedByLabel: formatDepartmentWithLeader(
        first.receivedByDepartment ?? "",
        first.receivedByLeaderName,
      ),
      checkedByName: first.ccActorName ?? null,
      approvedByLeaderName: first.financeDeptLeaderName ?? null,
      authorizedByLeaderName: first.gmDeptLeaderName ?? null,
    };
  });
}

function purchaseRequestBundles(rows: PurchaseRequestRow[]): ReceiptBundle[] {
  const map = new Map<string, PurchaseRequestRow[]>();
  for (const row of rows) {
    const day = dateKey(purchaseEntranceDate(row));
    const supplier = groupSupplierKey(row.supplierName);
    const dept = accountabilityGroupKey(
      row.requestedByDepartment,
      row.requestedByLeaderName,
    );
    const voucher =
      Math.floor(Number(row.voucherNumber) || 0) > 0
        ? String(Math.floor(Number(row.voucherNumber)))
        : String(row.voucherDisplay ?? "").trim() || `id:${row.id}`;
    const key = `purchase_request|${voucher}|${supplier}|${day}|${dept}`;
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
      lineTotal: computeInventoryPaidAmountETB(
        item.quantity,
        item.estimatedUnitPrice,
        item.purchaseWithVat,
      ),
      category: item.category,
      notes: item.notes,
      purchaseWithVat: item.purchaseWithVat,
    }));
    return {
      key,
      id: bundleIdFromKey(key),
      kind: "purchase_request",
      title: receiptTitle("purchase_request"),
      date: dateKey(purchaseEntranceDate(first)),
      dateLabel: formatPurchaseEntranceDate(first),
      supplierName: String(first.supplierName || "").trim() || "-",
      supplierPhone: first.supplierPhone,
      supplierAddress: null,
      supplierTinNumber: null,
      totalETB: lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0),
      registrationVoucher: null,
      purchaseRequestVoucher: formatVoucherRange(items),
      lines,
      requestedByLabel: formatRequestedByReceiptLabel(first),
      preparedByLeaderName: first.preparedByLeaderName ?? null,
      checkedByName: first.ccActorName ?? null,
      approvedByLeaderName: first.financeDeptLeaderName ?? null,
      authorizedByLeaderName: first.gmDeptLeaderName ?? null,
    };
  });
}

function freshBazaarSnapshotByRegistrationId(
  items: Iterable<FreshBazaarRow>,
): Map<number, StockMovementStatusSnapshot> {
  const map = new Map<number, StockMovementStatusSnapshot>();
  for (const row of items) {
    const id = Math.floor(Number(row.itemRegistrationId));
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

function stockMovementBundles(
  rows: StockOutRequestRow[],
  itemById: Map<number, ItemRegistration>,
  statusByStockOutId: Map<number, StockMovementStatusSnapshot>,
  freshBazaarArchives: FreshBazaarRow[] = [],
): ReceiptBundle[] {
  const priceByRegId = unitPriceByRegistrationIdFromInventory(itemById.values());
  const freshBazaarPriceByRegId =
    unitPriceByRegistrationIdFromFreshBazaar(freshBazaarArchives);
  const freshBazaarByRegId =
    freshBazaarSnapshotByRegistrationId(freshBazaarArchives);
  const map = new Map<string, StockOutRequestRow[]>();
  for (const row of rows) {
    const day = stockMovementBusinessDateYmd(row);
    const dept = accountabilityGroupKey(
      row.requestedByDepartment,
      row.requestedByLeaderName,
    );
    const voucher =
      Math.floor(Number(row.voucherNumber) || 0) > 0
        ? String(Math.floor(Number(row.voucherNumber)))
        : String(row.voucherDisplay ?? "").trim() || `id:${row.id}`;
    const key = `stock_movement|${voucher}|${day}|${dept}`;
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }

  return [...map.entries()].map(([key, items]) => {
    const first = items[0];
    const linkedFirst = itemById.get(Math.floor(Number(first.itemRegistrationId)));
    const firstStatusSnap = statusByStockOutId.get(first.id);
    const firstFreshSnap = freshBazaarByRegId.get(
      Math.floor(Number(first.itemRegistrationId)),
    );
    const lines: ReceiptLine[] = items.map((row) => {
      const regId = Math.floor(Number(row.itemRegistrationId));
      const linkedItem =
        Number.isFinite(regId) && regId > 0 ? itemById.get(regId) : undefined;
      const statusSnap = statusByStockOutId.get(row.id);
      const freshSnap =
        Number.isFinite(regId) && regId > 0
          ? freshBazaarByRegId.get(regId)
          : undefined;
      const pricing = stockLineUnitPriceLookup(
        row,
        priceByRegId,
        statusByStockOutId,
        freshBazaarPriceByRegId,
      );
      return {
        id: `stock-movement-${row.id}`,
        sourceId: row.id,
        sourceKind: "stock_movement",
        voucherNumber: row.voucherNumber,
        voucherDisplay: row.voucherDisplay,
        name:
          String(row.itemName || "").trim() ||
          String(linkedItem?.name || "").trim() ||
          String(statusSnap?.name || "").trim() ||
          String(freshSnap?.name || "").trim() ||
          "Unknown item",
        quantity: Number(row.amount) || 0,
        measuredBy:
          String(row.measuredBySnapshot || "").trim() ||
          linkedItem?.measuredBy ||
          statusSnap?.measuredBy ||
          freshSnap?.measuredBy ||
          "units",
        unitPrice: pricing?.unitPrice ?? null,
        lineTotal: stockLineTotalETB(
          row,
          priceByRegId,
          statusByStockOutId,
          freshBazaarPriceByRegId,
        ),
        category:
          linkedItem?.category ?? statusSnap?.category ?? freshSnap?.category ?? null,
        imageUrl:
          linkedItem?.imageUrl ?? statusSnap?.imageUrl ?? freshSnap?.imageUrl ?? null,
        notes: row.stakeHolderOrReason,
        movementLabel: formatMovementType(row.movementType),
        purchaseWithVat:
          pricing?.purchaseWithVat === true ||
          pricing?.purchaseWithVat === false
            ? pricing.purchaseWithVat
            : null,
      };
    });
    return {
      key,
      id: bundleIdFromKey(key),
      kind: "stock_movement",
      title: receiptTitle("stock_movement", {
        movementType: first.movementType,
      }),
      date: stockMovementBusinessDateYmd(first),
      dateLabel: displayDate(stockMovementBusinessDate(first)),
      supplierName:
        String(
          linkedFirst?.supplierName ||
            firstStatusSnap?.supplierName ||
            firstFreshSnap?.supplierName ||
            "",
        ).trim() || "-",
      supplierPhone:
        linkedFirst?.supplierPhone ??
        firstStatusSnap?.supplierPhone ??
        firstFreshSnap?.supplierPhone ??
        null,
      supplierAddress:
        linkedFirst?.Address ??
        firstStatusSnap?.Address ??
        firstFreshSnap?.Address ??
        null,
      supplierTinNumber:
        linkedFirst?.supplierTinNumber ??
        firstStatusSnap?.supplierTinNumber ??
        firstFreshSnap?.supplierTinNumber ??
        null,
      totalETB: lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0),
      paymentLabel: linkedFirst
        ? itemPaymentLabel(itemPaymentBucket(linkedFirst))
        : null,
      registrationVoucher: linkedFirst
        ? formatVoucherDisplay(
            linkedFirst.voucherNumber,
            linkedFirst.voucherDisplay,
          )
        : null,
      stockMovementVoucher: formatVoucherRange(items),
      lines,
      requestedByLabel: formatRequestedByReceiptLabel(first),
      preparedByLeaderName: first.preparedByLeaderName ?? null,
      checkedByName: first.ccActorName ?? null,
      approvedByLeaderName: first.financeDeptLeaderName ?? null,
      authorizedByLeaderName: first.gmDeptLeaderName ?? null,
    };
  });
}

export type ReceiptGroupingOptions = {
  /** Omit purchase-request and stock-movement receipt groups. */
  registrationsOnly?: boolean;
  /** Inactive rows snapshotted when stock movements are applied (unit price fallback). */
  itemStatusHistory?: ItemStatus[];
  /** Kitchen fresh-bazaar archives when inventory registration was removed. */
  freshBazaarArchives?: FreshBazaarRow[];
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
  const statusByStockOutId = unitPriceByStockOutRequestIdFromItemStatus(
    options?.itemStatusHistory ?? [],
  );

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
    ...stockMovementBundles(
      printableStock,
      itemById,
      statusByStockOutId,
      options?.freshBazaarArchives ?? [],
    ),
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

function mergeReceiptBundles(bundles: ReceiptBundle[]): ReceiptBundle | null {
  if (!bundles.length) return null;
  if (bundles.length === 1) return bundles[0];
  const first = bundles[0];
  return {
    ...first,
    lines: bundles.flatMap((b) => b.lines),
    totalETB: bundles.reduce((sum, b) => sum + b.totalETB, 0),
  };
}

export function buildPurchaseRequestReceiptBundle(
  rows: PurchaseRequestRow[],
): ReceiptBundle | null {
  return mergeReceiptBundles(purchaseRequestBundles(rows));
}

/** All lines on the same voucher (may span suppliers) for request-status preview. */
export function buildPurchaseRequestReceiptBundleForStatus(
  anchor: PurchaseRequestRow,
  pool: PurchaseRequestRow[],
): ReceiptBundle | null {
  const siblings = pool.filter((row) => {
    const n = Math.floor(Number(anchor.voucherNumber) || 0);
    const d = String(anchor.voucherDisplay ?? "").trim();
    const rn = Math.floor(Number(row.voucherNumber) || 0);
    const rd = String(row.voucherDisplay ?? "").trim();
    const voucherMatch =
      (n > 0 && rn === n) || (d && rd && d === rd);
    if (!voucherMatch) return false;
    return accountabilityMatches(
      row.requestedByDepartment,
      row.requestedByLeaderName,
      anchor.requestedByDepartment,
      anchor.requestedByLeaderName,
    );
  });
  if (!siblings.length) return null;
  const bundles = purchaseRequestBundles(siblings);
  const merged = mergeReceiptBundles(bundles);
  if (!merged) return null;
  return {
    ...merged,
    purchaseRequestVoucher: formatVoucherRange(siblings),
  };
}

export function buildStockMovementReceiptBundle(
  rows: StockOutRequestRow[],
  linkedItems: ItemRegistration[] = [],
  itemStatusHistory: ItemStatus[] = [],
  freshBazaarArchives: FreshBazaarRow[] = [],
): ReceiptBundle | null {
  const itemById = mapItemById(linkedItems);
  const statusByStockOutId =
    unitPriceByStockOutRequestIdFromItemStatus(itemStatusHistory);
  const bundles = stockMovementBundles(
    rows,
    itemById,
    statusByStockOutId,
    freshBazaarArchives,
  );
  return bundles[0] ?? null;
}

export function buildRegistrationReceiptBundle(
  rows: ItemRegistration[],
  purchaseRequests: PurchaseRequestRow[] = [],
): ReceiptBundle | null {
  const prById = new Map(
    purchaseRequests.map((p) => [
      p.id,
      formatVoucherDisplay(p.voucherNumber, p.voucherDisplay),
    ]),
  );
  return mergeReceiptBundles(registrationBundles(rows, prById));
}

export function buildRegistrationReceiptBundleForStatus(
  anchor: ItemRegistration,
  pool: ItemRegistration[],
  purchaseRequests: PurchaseRequestRow[] = [],
): ReceiptBundle | null {
  const siblings = pool.filter((row) => {
    const n = Math.floor(Number(anchor.voucherNumber) || 0);
    const d = String(anchor.voucherDisplay ?? "").trim();
    const rn = Math.floor(Number(row.voucherNumber) || 0);
    const rd = String(row.voucherDisplay ?? "").trim();
    const voucherMatch =
      (n > 0 && rn === n) || (d && rd && d === rd);
    if (!voucherMatch) return false;
    return accountabilityMatches(
      row.receivedByDepartment,
      row.receivedByLeaderName,
      anchor.receivedByDepartment,
      anchor.receivedByLeaderName,
    );
  });
  if (!siblings.length) return null;
  const prById = new Map(
    purchaseRequests.map((p) => [
      p.id,
      formatVoucherDisplay(p.voucherNumber, p.voucherDisplay),
    ]),
  );
  const bundles = registrationBundles(siblings, prById);
  const merged = mergeReceiptBundles(bundles);
  if (!merged) return null;
  return {
    ...merged,
    registrationVoucher: formatVoucherRange(siblings),
  };
}

export function buildStockMovementReceiptBundleForStatus(
  anchor: StockOutRequestRow,
  pool: StockOutRequestRow[],
  linkedItems: ItemRegistration[] = [],
  itemStatusHistory: ItemStatus[] = [],
  freshBazaarArchives: FreshBazaarRow[] = [],
): ReceiptBundle | null {
  const anchorDay = stockMovementBusinessDateYmd(anchor);
  const siblings = pool.filter((row) => {
    const n = Math.floor(Number(anchor.voucherNumber) || 0);
    const d = String(anchor.voucherDisplay ?? "").trim();
    const rn = Math.floor(Number(row.voucherNumber) || 0);
    const rd = String(row.voucherDisplay ?? "").trim();
    const voucherMatch =
      (n > 0 && rn === n) || (d && rd && d === rd);
    if (!voucherMatch) return false;
    if (stockMovementBusinessDateYmd(row) !== anchorDay) return false;
    return accountabilityMatches(
      row.requestedByDepartment,
      row.requestedByLeaderName,
      anchor.requestedByDepartment,
      anchor.requestedByLeaderName,
    );
  });
  const itemById = mapItemById(linkedItems);
  const statusByStockOutId =
    unitPriceByStockOutRequestIdFromItemStatus(itemStatusHistory);
  const bundles = stockMovementBundles(
    siblings,
    itemById,
    statusByStockOutId,
    freshBazaarArchives,
  );
  const merged = mergeReceiptBundles(bundles);
  if (!merged) return null;
  return {
    ...merged,
    stockMovementVoucher: formatVoucherRange(siblings),
  };
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

export function bundleDepartmentLeaderLabel(bundle: ReceiptBundle): string | null {
  return bundle.requestedByLabel ?? bundle.receivedByLabel ?? null;
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
