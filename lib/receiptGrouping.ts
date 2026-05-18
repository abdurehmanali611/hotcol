import type { ItemRegistration, PurchaseRequestRow } from "@/lib/actions";
import { lineOwedETB } from "@/lib/hotelInventoryPayment";
import { formatVoucherDisplay } from "@/lib/voucherFormat";

export type ReceiptBundle = {
  key: string;
  /** Stable numeric id for DataTable row keys */
  id: number;
  items: ItemRegistration[];
  purchaseRequestVoucher?: string | null;
};

function bundleIdFromKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 33 + key.charCodeAt(i)) | 0;
  const n = Math.abs(h) % 1_000_000_000;
  return n === 0 ? 1 : n;
}

function regDateKey(d: Date | string): string {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString().slice(0, 10);
}

/** Group registrations that share supplier + registration calendar day for one printed receipt. */
export function groupRegistrationsForReceipt(
  rows: ItemRegistration[],
  purchaseRequests: PurchaseRequestRow[] = [],
): ReceiptBundle[] {
  const prById = new Map(
    purchaseRequests.map((p) => [
      p.id,
      formatVoucherDisplay(p.voucherNumber, p.voucherDisplay),
    ]),
  );
  const map = new Map<string, ItemRegistration[]>();
  for (const r of rows) {
    const supplier = String(r.supplierName || "").trim().toLowerCase();
    const day = regDateKey(r.registrationDate);
    const key = `${supplier}|${day}`;
    const bucket = map.get(key) ?? [];
    bucket.push(r);
    map.set(key, bucket);
  }
  return [...map.entries()]
    .map(([key, items]) => {
      const prId = items.find((i) => i.purchaseRequestId)?.purchaseRequestId;
      return {
        key,
        id: bundleIdFromKey(key),
        items,
        purchaseRequestVoucher:
          prId != null
            ? prById.get(prId) ?? formatVoucherDisplay(prId, null)
            : null,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.items[0]?.registrationDate ?? 0).getTime() -
        new Date(a.items[0]?.registrationDate ?? 0).getTime(),
    );
}

export function bundleReceivedLabel(bundle: ReceiptBundle): string {
  const d = bundle.items[0]?.registrationDate;
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function bundleSupplierName(bundle: ReceiptBundle): string {
  return String(bundle.items[0]?.supplierName || "—").trim() || "—";
}

export function bundleTotalETB(bundle: ReceiptBundle): number {
  return bundle.items.reduce((s, it) => s + lineOwedETB(it), 0);
}

export function bundleItemsToPrint(bundle: ReceiptBundle): (ItemRegistration & {
  purchaseRequestVoucher?: string | null;
})[] {
  return bundle.items.map((it) => ({
    ...it,
    purchaseRequestVoucher: bundle.purchaseRequestVoucher,
  }));
}
