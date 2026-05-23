/** Validate requested credit against a tier ceiling (café levels or hotel corporate tiers). */
export function validateRequestedCreditAgainstCeiling(
  requested: number,
  ceiling: number,
): string | null {
  const r = Number(requested);
  const c = Number(ceiling);
  if (!Number.isFinite(r) || r <= 0) {
    return "Enter a credit amount greater than zero";
  }
  if (!Number.isFinite(c) || c <= 0) {
    return "Credit tier ceiling is not configured";
  }
  if (r > c + 1e-6) {
    return `Requested credit cannot exceed the tier maximum of ETB ${c.toLocaleString()}`;
  }
  return null;
}

/** Presale / paid-now amount must not exceed requested credit. */
export function validatePresalePaidAgainstRequested(
  paidNow: number,
  requested: number,
): string | null {
  const p = Number(paidNow);
  const r = Number(requested);
  if (!Number.isFinite(p) || p < 0) {
    return "Paid amount cannot be negative";
  }
  if (p > r + 1e-6) {
    return "Presale paid now cannot exceed the requested credit amount";
  }
  return null;
}

/** Remaining balance after a charge must stay non-negative. */
export function validateCreditUsageAmount(
  usageAmount: number,
  remainingCredit: number,
): string | null {
  const u = Number(usageAmount);
  const left = Number(remainingCredit);
  if (!Number.isFinite(u) || u <= 0) {
    return "Charge amount must be greater than zero";
  }
  if (u > left + 1e-6) {
    return `Charge exceeds remaining credit (ETB ${left.toLocaleString()} available)`;
  }
  return null;
}
