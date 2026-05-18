import type { ItemRegistration, PurchaseRequestRow } from "@/lib/actions";
import { formatVoucherDisplay } from "@/lib/voucherFormat";

export type ReceiptBundle = {
  key: string;
  items: ItemRegistration[];
  purchaseRequestVoucher?: string | null;
};

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
  return [...map.entries()].map(([key, items]) => {
    const prId = items.find((i) => i.purchaseRequestId)?.purchaseRequestId;
    return {
      key,
      items,
      purchaseRequestVoucher:
        prId != null ? prById.get(prId) ?? formatVoucherDisplay(prId, null) : null,
    };
  });
}
