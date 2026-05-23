export type CafeCreditRegistrantType = "COMPANY" | "STAFF";
export type CafeCreditApprovalStatus =
  | "PENDING_ADMIN"
  | "AUTHORIZED"
  | "REJECTED";

export function isCafeCreditRegistrationActive(
  row: { approvalStatus?: string | null },
): boolean {
  const s = String(row.approvalStatus ?? "").trim().toUpperCase();
  return !s || s === "AUTHORIZED";
}

export function cafeCreditApprovalLabel(status?: string | null): string {
  const s = String(status ?? "").trim().toUpperCase();
  if (!s || s === "AUTHORIZED") return "Authorized";
  if (s === "PENDING_ADMIN") return "Pending admin";
  if (s === "REJECTED") return "Rejected";
  return status ?? "—";
}
