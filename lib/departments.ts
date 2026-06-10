export const HOTEL_DEPARTMENT_CODES = [
  "KITCHEN",
  "BAR",
  "HOUSE_KEEPING_ROOM",
  "HOUSE_KEEPING_PUBLIC",
  "SECURITY",
  "MAINTENANCE",
  "FINANCE",
  "HR",
  "GM",
  "FB_SERVICE",
  "STORE",
] as const;

export type HotelDepartmentCode = (typeof HOTEL_DEPARTMENT_CODES)[number];

/** @deprecated Renamed to HOUSE_KEEPING_ROOM — kept for receipt snapshots. */
export const LEGACY_HOUSE_KEEPING_CODE = "HOUSE_KEEPING";

/** Store staff submitted the request (not a department leader). */
export const STAFF_REQUESTED_BY_CODE = "STAFF";

/** Item registrations received by store, kitchen, or bar only. */
export const REGISTRATION_RECEIVED_BY_CODES = [
  "STORE",
  "KITCHEN",
  "BAR",
] as const satisfies readonly HotelDepartmentCode[];

/** Stock movements — staff option plus all departments except Store. */
export const REQUESTED_BY_DEPARTMENT_CODES = [
  STAFF_REQUESTED_BY_CODE,
  ...HOTEL_DEPARTMENT_CODES.filter((c) => c !== "STORE"),
];

/** Purchase requests — staff option plus all departments including Store. */
export const PURCHASE_REQUESTED_BY_DEPARTMENT_CODES = [
  STAFF_REQUESTED_BY_CODE,
  ...HOTEL_DEPARTMENT_CODES,
];

export const DEPARTMENT_LABELS: Record<HotelDepartmentCode, string> = {
  KITCHEN: "Kitchen",
  BAR: "Bar",
  HOUSE_KEEPING_ROOM: "House Keeping (Room)",
  HOUSE_KEEPING_PUBLIC: "House Keeping (Public)",
  SECURITY: "Security",
  MAINTENANCE: "Maintenance",
  FINANCE: "Finance",
  HR: "Human Resource (HR)",
  GM: "General Manager (GM)",
  FB_SERVICE: "Food and Beverage Service (F&B service)",
  STORE: "Store",
};

const LEGACY_DEPARTMENT_LABELS: Record<string, string> = {
  [LEGACY_HOUSE_KEEPING_CODE]: DEPARTMENT_LABELS.HOUSE_KEEPING_ROOM,
};

export function normalizeDepartmentCode(code: string): string {
  const key = String(code ?? "").trim();
  if (key === LEGACY_HOUSE_KEEPING_CODE) return "HOUSE_KEEPING_ROOM";
  return key;
}

export function departmentCodesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return normalizeDepartmentCode(String(a ?? "")) === normalizeDepartmentCode(String(b ?? ""));
}

export function departmentLabel(code: string): string {
  const key = String(code ?? "").trim();
  if (key === STAFF_REQUESTED_BY_CODE) return "Staff";
  if (LEGACY_DEPARTMENT_LABELS[key]) return LEGACY_DEPARTMENT_LABELS[key];
  const normalized = normalizeDepartmentCode(key);
  return DEPARTMENT_LABELS[normalized as HotelDepartmentCode] ?? key;
}

/** Stable key for grouping receipts and vouchers by department. */
export function receiptDepartmentGroupKey(code: string | null | undefined): string {
  const normalized = normalizeDepartmentCode(String(code ?? "").trim());
  return normalized || "unknown";
}

export function formatDepartmentWithLeader(
  code: string,
  leaderName?: string | null,
): string {
  const normalized = normalizeDepartmentCode(String(code ?? "").trim());
  if (normalized === STAFF_REQUESTED_BY_CODE) return "Staff";
  const label = departmentLabel(code);
  const name = String(leaderName ?? "").trim();
  return name ? `${label} (${name})` : label;
}

/** Printed receipt / voucher label for who requested a purchase or stock movement. */
export function formatRequestedByReceiptLabel(row: {
  requestedByDepartment?: string | null;
  requestedByLeaderName?: string | null;
}): string {
  return formatDepartmentWithLeader(
    String(row.requestedByDepartment ?? "").trim(),
    row.requestedByLeaderName,
  );
}

export type DepartmentLeaderRow = {
  id: number;
  department: string;
  leaderName: string;
  departmentLabel?: string;
  HotelName: string;
};

export function leadersByDepartment(
  rows: DepartmentLeaderRow[],
): Map<string, DepartmentLeaderRow> {
  return new Map(rows.map((r) => [r.department, r]));
}

export function departmentLeaderDisplayLabel(row: {
  requestedByDepartment?: string | null;
  requestedByLeaderName?: string | null;
  requestedByDepartmentLabel?: string | null;
  receivedByDepartment?: string | null;
  receivedByLeaderName?: string | null;
}): string | null {
  const reqDept = normalizeDepartmentCode(
    String(row.requestedByDepartment ?? "").trim(),
  );
  if (reqDept === STAFF_REQUESTED_BY_CODE) return "Staff";
  const reqLeader = String(row.requestedByLeaderName ?? "").trim();
  if (reqDept && reqLeader) {
    const deptLabel =
      String(row.requestedByDepartmentLabel ?? "").trim() ||
      departmentLabel(reqDept);
    return `${deptLabel} (${reqLeader})`;
  }
  const recvDept = String(row.receivedByDepartment ?? "").trim();
  const recvLeader = String(row.receivedByLeaderName ?? "").trim();
  if (recvDept && recvLeader) {
    return formatDepartmentWithLeader(recvDept, recvLeader);
  }
  return null;
}

export function selectOptionsForDepartments(
  leaders: DepartmentLeaderRow[],
  allowedCodes: readonly string[],
) {
  const allowed = new Set(allowedCodes);
  const staffOption = allowed.has(STAFF_REQUESTED_BY_CODE)
    ? [{ value: STAFF_REQUESTED_BY_CODE, label: "Staff" }]
    : [];
  const departmentOptions = leaders
    .filter((r) => allowed.has(r.department) && r.leaderName.trim())
    .map((r) => ({
      value: r.department,
      label: formatDepartmentWithLeader(r.department, r.leaderName),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...staffOption, ...departmentOptions];
}

/** Text stored on StockOutRequest.stakeHolderOrReason from a department select value. */
export function stockOutDestinationTextFromDepartmentCode(code: string): string {
  return departmentLabel(normalizeDepartmentCode(String(code ?? "").trim()));
}

const LEGACY_STOCK_OUT_DESTINATION_TO_DEPARTMENT: Record<string, string> = {
  kitchen: "KITCHEN",
  barista: "BAR",
  bar: "BAR",
  juicer: "FB_SERVICE",
  "cleaning service": "HOUSE_KEEPING_PUBLIC",
  cleaning: "HOUSE_KEEPING_PUBLIC",
  housekeeping: "HOUSE_KEEPING_ROOM",
  maintenance: "MAINTENANCE",
};

/** Map saved destination text or department code back to a department select value. */
export function resolveStockOutDestinationDepartmentCode(
  raw: string,
): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;

  const normalized = normalizeDepartmentCode(trimmed);
  if (REQUESTED_BY_DEPARTMENT_CODES.includes(normalized)) {
    return normalized;
  }

  const lower = trimmed.toLowerCase();
  for (const code of REQUESTED_BY_DEPARTMENT_CODES) {
    if (departmentLabel(code).toLowerCase() === lower) return code;
  }

  const legacyCode = LEGACY_STOCK_OUT_DESTINATION_TO_DEPARTMENT[lower];
  if (
    legacyCode &&
    REQUESTED_BY_DEPARTMENT_CODES.includes(legacyCode)
  ) {
    return legacyCode;
  }

  return null;
}
