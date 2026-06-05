import type { PurchaseRequestRow } from "@/lib/actions";

export function buildOptimisticPurchaseRequestRow(
  fields: {
    itemName: string;
    quantity: number;
    measuredBy: string;
    entranceDate?: Date | string;
    notes?: string;
    estimatedUnitPrice?: number;
    supplierName?: string;
    supplierPhone?: string;
    category?: string;
    purchaseWithVat?: boolean;
  },
  created: { id: number; status: string; voucherNumber?: number | null; voucherDisplay?: string | null },
  storeUserName: string,
  hotelName: string,
): PurchaseRequestRow {
  const now = new Date().toISOString();
  return {
    id: created.id,
    HotelName: hotelName,
    itemName: fields.itemName,
    quantity: fields.quantity,
    measuredBy: fields.measuredBy,
    entranceDate: fields.entranceDate
      ? new Date(fields.entranceDate).toISOString()
      : now,
    notes: fields.notes ?? "",
    estimatedUnitPrice: Number(fields.estimatedUnitPrice) || 0,
    supplierName: fields.supplierName ?? "",
    supplierPhone: fields.supplierPhone ?? "",
    category: fields.category ?? "Others",
    purchaseWithVat: fields.purchaseWithVat !== false,
    status: created.status,
    storeUserName,
    ccProfileId: null,
    ccActorName: null,
    ccApprovedAt: null,
    financeActorName: null,
    financeApprovedAt: null,
    rejectionReason: null,
    createdAt: now,
    voucherNumber: created.voucherNumber ?? null,
    voucherDisplay: created.voucherDisplay ?? null,
  };
}
