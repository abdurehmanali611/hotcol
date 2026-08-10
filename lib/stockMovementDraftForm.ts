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
    const lower = raw.toLowerCase();
    if (lower === "kitchen" || lower === "chef") {
      return { stakeholder: "KITCHEN", customStation: "", reason: "" };
    }
    if (lower === "bar" || lower === "barista") {
      return { stakeholder: "BAR", customStation: "", reason: "" };
    }
    if (lower === "room" || lower === "rooms") {
      return { stakeholder: "ROOM", customStation: "", reason: "" };
    }
    const match = resolveStockOutDestinationDepartmentCode(raw);
    if (match === "KITCHEN" || match === "BAR") {
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
    const code = String(stakeholder ?? "").trim().toUpperCase();
    if (!code) return "";
    if (code === "KITCHEN") return "Kitchen";
    if (code === "BAR") return "Bar";
    if (code === "ROOM") return "Room";
    if (REQUESTED_BY_DEPARTMENT_CODES.includes(code)) {
      return stockOutDestinationTextFromDepartmentCode(code);
    }
    return String(stakeholder ?? "").trim();
  }
  return reason.trim();
}
