import type { ItemRegistration } from "@/lib/actions";
import { departmentCodesMatch } from "@/lib/departments";
import { matchesRegistrationDateRange } from "@/lib/panelFilters";

export type InventoryListFilters = {
  dateFrom: string;
  dateTo: string;
  department: string;
};

export const DEFAULT_INVENTORY_LIST_FILTERS: InventoryListFilters = {
  dateFrom: "",
  dateTo: "",
  department: "",
};

export function filterInventoryRegistrations<
  T extends Pick<ItemRegistration, "registrationDate" | "receivedByDepartment">,
>(items: readonly T[], filters: InventoryListFilters): T[] {
  const from = String(filters.dateFrom ?? "").trim();
  const to = String(filters.dateTo ?? "").trim();
  const dept = String(filters.department ?? "").trim();

  return items.filter((row) => {
    if (!matchesRegistrationDateRange(row.registrationDate, from, to)) {
      return false;
    }
    if (!dept) return true;
    return departmentCodesMatch(row.receivedByDepartment, dept);
  });
}

export function inventoryListFiltersActive(filters: InventoryListFilters): boolean {
  return Boolean(
    filters.dateFrom.trim() || filters.dateTo.trim() || filters.department.trim(),
  );
}
