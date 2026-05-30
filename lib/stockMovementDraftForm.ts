import { HOTEL_STORE_STOCK_OUT_STAKEHOLDERS } from "@/lib/hotelDailyStation";

export type StockMovementKind = "STOCK_OUT" | "WASTAGE" | "RETURN_SUPPLIER";

export function parseStockMovementDestination(
  movementType: string,
  stakeHolderOrReason: string,
): {
  stakeholder: string;
  customStation: string;
  reason: string;
} {
  const raw = String(stakeHolderOrReason ?? "").trim();
  if (movementType === "STOCK_OUT") {
    const match = HOTEL_STORE_STOCK_OUT_STAKEHOLDERS.find(
      (s) => s.toLowerCase() === raw.toLowerCase(),
    );
    if (match) {
      return {
        stakeholder: match,
        customStation: "",
        reason: "",
      };
    }
    return {
      stakeholder: HOTEL_STORE_STOCK_OUT_STAKEHOLDERS[0] ?? "Kitchen",
      customStation: raw,
      reason: "",
    };
  }
  return { stakeholder: "", customStation: "", reason: raw };
}

export function formatStockMovementDestination(
  movementType: StockMovementKind,
  stakeholder: string,
  customStation: string,
  reason: string,
): string {
  if (movementType === "STOCK_OUT") {
    const custom = customStation.trim();
    if (custom) return custom;
    return stakeholder.trim();
  }
  return reason.trim();
}
