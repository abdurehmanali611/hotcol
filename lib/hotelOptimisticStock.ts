import type { ItemRegistration, StockOutRequestRow } from "@/lib/actions";

/**
 * Builds a full stock-out request row for immediate UI (request status tab) after
 * `createStockOutRequest` returns id + status (GraphQL may not return the full row).
 */
export function buildOptimisticStockOutRequestRow(
  item: Pick<ItemRegistration, "id" | "name" | "HotelName">,
  movementType: string,
  amount: number,
  stakeHolderOrReason: string,
  created: {
    id: number;
    status: string;
    voucherNumber?: number | null;
    voucherDisplay?: string | null;
  },
  requestedByUserName: string,
): StockOutRequestRow {
  const now = new Date().toISOString();
  return {
    id: created.id,
    HotelName: item.HotelName,
    itemRegistrationId: item.id,
    itemName: item.name,
    movementType,
    amount,
    stakeHolderOrReason,
    status: created.status,
    voucherNumber: created.voucherNumber ?? null,
    voucherDisplay: created.voucherDisplay ?? null,
    requestedByUserName,
    ccProfileId: null,
    ccActorName: null,
    decidedAt: null,
    rejectionReason: null,
    createdAt: now,
  };
}
