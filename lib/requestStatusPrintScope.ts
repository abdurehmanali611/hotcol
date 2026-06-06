import type { RequestStatusListPrintFilters } from "@/lib/requestStatusListPrint";

export function resolveRequestStatusPrintScope<T>(
  allRows: readonly T[],
  filteredRows: readonly T[],
  isFiltered: boolean,
  activeFilters: RequestStatusListPrintFilters,
): {
  rows: T[];
  filters: RequestStatusListPrintFilters;
  filteredCount: number;
  totalCount: number;
} {
  const totalCount = allRows.length;

  if (!isFiltered) {
    return {
      rows: [...allRows],
      filters: {
        dateFromLabel: activeFilters.dateFromLabel,
        dateToLabel: activeFilters.dateToLabel,
        departmentLabelText: activeFilters.departmentLabelText,
        dateFrom: "",
        dateTo: "",
        department: "",
        voucherFrom: "",
        voucherTo: "",
      },
      filteredCount: totalCount,
      totalCount,
    };
  }

  return {
    rows: [...filteredRows],
    filters: activeFilters,
    filteredCount: filteredRows.length,
    totalCount,
  };
}
