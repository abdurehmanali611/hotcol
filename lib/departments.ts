export const HOTEL_DEPARTMENT_CODES = [
  "KITCHEN",
  "BAR",
  "HOUSE_KEEPING",
  "SECURITY",
  "MAINTENANCE",
  "FINANCE",
  "HR",
  "GM",
  "FB_SERVICE",
  "STORE",
] as const;

export type HotelDepartmentCode = (typeof HOTEL_DEPARTMENT_CODES)[number];

export const REGISTRATION_RECEIVED_BY_CODES = [
  "STORE",
  "KITCHEN",
  "BAR",
] as const satisfies readonly HotelDepartmentCode[];

export const REQUESTED_BY_DEPARTMENT_CODES = HOTEL_DEPARTMENT_CODES.filter(
  (c) => c !== "STORE",
);

export const DEPARTMENT_LABELS: Record<HotelDepartmentCode, string> = {
  KITCHEN: "Kitchen",
  BAR: "Bar",
  HOUSE_KEEPING: "House Keeping",
  SECURITY: "Security",
  MAINTENANCE: "Maintenance",
  FINANCE: "Finance",
  HR: "Human Resource (HR)",
  GM: "General Manager (GM)",
  FB_SERVICE: "Food and Beverage Service (F&B service)",
  STORE: "Store",
};

export function departmentLabel(code: string): string {
  const key = String(code ?? "").trim() as HotelDepartmentCode;
  return DEPARTMENT_LABELS[key] ?? key;
}

export function formatDepartmentWithLeader(
  code: string,
  leaderName?: string | null,
): string {
  const label = departmentLabel(code);
  const name = String(leaderName ?? "").trim();
  return name ? `${label} (${name})` : label;
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
  receivedByDepartment?: string | null;
  receivedByLeaderName?: string | null;
}): string | null {
  const reqDept = String(row.requestedByDepartment ?? "").trim();
  const reqLeader = String(row.requestedByLeaderName ?? "").trim();
  if (reqDept && reqLeader) {
    return formatDepartmentWithLeader(reqDept, reqLeader);
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
  return leaders
    .filter((r) => allowed.has(r.department) && r.leaderName.trim())
    .map((r) => ({
      value: r.department,
      label: formatDepartmentWithLeader(r.department, r.leaderName),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
