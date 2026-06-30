import type { ItemStatus, StockOutRequestRow } from "@/lib/actions";
import {
  departmentCodesMatch,
  departmentLabel,
  normalizeDepartmentCode,
} from "@/lib/departments";

/** Canonical stock movement type keys (empty string = all types). */
export type StockMovementTypeFilter =
  | ""
  | "STOCK_OUT"
  | "WASTAGE"
  | "RETURN_SUPPLIER";

export type InactiveItemFilters = {
  dateFrom: string;
  dateTo: string;
  department: string;
  movementType: StockMovementTypeFilter;
};

/**
 * Normalize an inactive row to a canonical movement-type key.
 * Prefers the linked stock-out request's movementType, then falls back to the
 * ItemStatus.status label (covers legacy rows created before the request workflow).
 */
export function inactiveRowMovementType(
  row: InactiveItemRow,
): StockMovementTypeFilter {
  const mt = String(row.movementType ?? "").trim().toUpperCase();
  if (mt === "STOCK_OUT" || mt === "WASTAGE" || mt === "RETURN_SUPPLIER") {
    return mt;
  }
  const status = String(row.status ?? "").trim().toLowerCase();
  if (status.includes("wast")) return "WASTAGE";
  if (status.includes("return")) return "RETURN_SUPPLIER";
  if (status.includes("stock out") || status.includes("stockout")) {
    return "STOCK_OUT";
  }
  return "";
}

export type InactiveItemRow = ItemStatus & {
  movementDepartmentCode?: string;
  movementDepartmentLabel?: string;
  movementType?: string;
};

export function actionDateYmd(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function isStockMovementInactiveRow(row: ItemStatus): boolean {
  if (row.stockOutRequestId != null && row.stockOutRequestId > 0) return true;
  const status = String(row.status ?? "").toLowerCase();
  return (
    status.includes("stock out") ||
    status.includes("wastage") ||
    status.includes("return")
  );
}

/** Resolve department code for a stock movement inactive row. */
export function stockOutDepartmentCode(
  req: StockOutRequestRow | undefined,
): string {
  if (!req) return "";
  const requested = String(req.requestedByDepartment ?? "").trim();
  if (requested) return normalizeDepartmentCode(requested);

  if (req.movementType !== "STOCK_OUT") return "";

  const stake = String(req.stakeHolderOrReason ?? "").trim().toLowerCase();
  if (!stake) return "";
  if (stake === "kitchen") return "KITCHEN";
  if (stake === "barista" || stake === "bar") return "BAR";
  if (stake.includes("house")) return "HOUSE_KEEPING_ROOM";
  if (stake === "maintenance") return "MAINTENANCE";
  if (stake.includes("clean")) return "HOUSE_KEEPING_PUBLIC";
  return "";
}

export function buildStockOutLookup(
  stocks: StockOutRequestRow[],
): Map<number, StockOutRequestRow> {
  const map = new Map<number, StockOutRequestRow>();
  for (const row of stocks) {
    if (row.id > 0) map.set(row.id, row);
  }
  return map;
}

export function enrichInactiveRow(
  row: ItemStatus,
  stockById: Map<number, StockOutRequestRow>,
): InactiveItemRow {
  const req =
    row.stockOutRequestId != null && row.stockOutRequestId > 0
      ? stockById.get(row.stockOutRequestId)
      : undefined;
  const movementDepartmentCode = stockOutDepartmentCode(req);
  return {
    ...row,
    movementType: req?.movementType,
    movementDepartmentCode: movementDepartmentCode || undefined,
    movementDepartmentLabel: movementDepartmentCode
      ? departmentLabel(movementDepartmentCode)
      : req
        ? String(req.stakeHolderOrReason ?? "").trim() || undefined
        : undefined,
  };
}

export function filterInactiveItems(
  items: ItemStatus[],
  stocks: StockOutRequestRow[],
  filters: InactiveItemFilters,
): InactiveItemRow[] {
  const stockById = buildStockOutLookup(stocks);
  const from = String(filters.dateFrom ?? "").trim();
  const to = String(filters.dateTo ?? "").trim();
  const dept = String(filters.department ?? "").trim();
  const movementType = String(filters.movementType ?? "").trim();

  return items
    .map((row) => enrichInactiveRow(row, stockById))
    .filter((row) => {
      const ymd = actionDateYmd(row.actionDate);
      if (from && (!ymd || ymd < from)) return false;
      if (to && (!ymd || ymd > to)) return false;

      if (movementType && inactiveRowMovementType(row) !== movementType) {
        return false;
      }

      const isMovement = isStockMovementInactiveRow(row);

      if (!dept) return true;
      if (!isMovement) return false;
      return departmentCodesMatch(row.movementDepartmentCode, dept);
    });
}

export function inactiveFiltersActive(filters: InactiveItemFilters): boolean {
  return Boolean(
    filters.dateFrom.trim() ||
      filters.dateTo.trim() ||
      filters.department.trim() ||
      String(filters.movementType ?? "").trim(),
  );
}
