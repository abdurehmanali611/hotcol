import {
  REQUESTED_BY_DEPARTMENT_CODES,
  resolveStockOutDestinationDepartmentCode,
  stockOutDestinationTextFromDepartmentCode,
} from "@/lib/departments";

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
    const match = resolveStockOutDestinationDepartmentCode(raw);
    if (match) {
      return {
        stakeholder: match,
        customStation: "",
        reason: "",
      };
    }
    return {
      stakeholder: "",
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
    const code = String(stakeholder ?? "").trim();
    if (!code) return "";
    if (REQUESTED_BY_DEPARTMENT_CODES.includes(code)) {
      return stockOutDestinationTextFromDepartmentCode(code);
    }
    return code;
  }
  return reason.trim();
}
