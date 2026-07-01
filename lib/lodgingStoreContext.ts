import {
  isLodgingBusinessType,
  readBusinessTypeFromStorage,
} from "@/lib/subscriptionBillingPeriod";
import type { ItemStatus } from "@/lib/actions";
import { isStockMovementInactiveRow } from "@/lib/inactiveItemFilters";

export type InventoryChannel = "lodging" | "cafe";

/** Signed-in property uses hotel / resort / pension inventory workflow. */
export function isLodgingStoreSession(): boolean {
  return isLodgingBusinessType(readBusinessTypeFromStorage());
}

export function isHotelWorkflowInactiveRow(row: ItemStatus): boolean {
  return (
    row.stockOutRequestId != null && Number(row.stockOutRequestId) > 0
  );
}

/**
 * Split inactive movement history: hotel store uses approval-linked rows;
 * café store uses direct ItemStatus movements only.
 */
export function filterItemStatusForInventoryChannel(
  rows: ItemStatus[],
  channel: InventoryChannel,
): ItemStatus[] {
  return rows.filter((row) => {
    if (!isStockMovementInactiveRow(row)) return true;
    const hotelLinked = isHotelWorkflowInactiveRow(row);
    return channel === "lodging" ? hotelLinked : !hotelLinked;
  });
}
