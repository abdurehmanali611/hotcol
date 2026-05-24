/** Days per billing quarter — counted from billingStartedAt when hold is released. */
export const SUBSCRIPTION_QUARTER_DAYS = 90;

/** Notify before quarter end and grace days after. */
export const SUBSCRIPTION_WARNING_DAYS = 10;
export const SUBSCRIPTION_GRACE_DAYS = 10;

export type SubscriptionPeriodStatus =
  | "exempt"
  | "on_hold"
  | "trial"
  | "setup_pending"
  | "pending_approval"
  | "active"
  | "warning"
  | "grace"
  | "expired";

export type SubscriptionBillingSnapshot = {
  setupFeeETB: number;
  quarterlyFeeETB: number;
  setupFeeApproved: boolean;
  subscriptionPaymentApproved: boolean;
  createdAt: string | null;
  billingStartedAt: string | null;
  billingHold: boolean;
  isIllustrationTenant: boolean;
  freeTrialEndsAt: string | null;
  subscriptionPaidUntil: string | null;
  paidQuartersCount: number;
};

export function subscriptionBillingApplies(snap: SubscriptionBillingSnapshot): boolean {
  if (snap.isIllustrationTenant) return false;
  return snap.quarterlyFeeETB > 0;
}

export function parseSubscriptionDate(raw: string | null | undefined): Date | null {
  if (raw == null || String(raw).trim() === "") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isFreeTrialActive(
  snap: SubscriptionBillingSnapshot,
  now: Date = new Date(),
): boolean {
  const end = parseSubscriptionDate(snap.freeTrialEndsAt);
  if (!end) return false;
  return now.getTime() < end.getTime();
}

/** Quarter anchor — billingStartedAt after hold release, else createdAt. */
export function resolveBillingAnchor(snap: SubscriptionBillingSnapshot): Date | null {
  if (snap.billingHold) return null;
  const started = parseSubscriptionDate(snap.billingStartedAt);
  if (started) return started;
  return parseSubscriptionDate(snap.createdAt);
}

export function computeQuarterEndFromCreatedAt(
  anchor: Date,
  paidQuartersCount: number,
): Date {
  const end = new Date(anchor.getTime());
  end.setDate(end.getDate() + paidQuartersCount * SUBSCRIPTION_QUARTER_DAYS);
  return end;
}

export function daysBetweenCalendar(start: Date, end: Date): number {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

export function computeSubscriptionPeriodStatus(
  snap: SubscriptionBillingSnapshot,
  now: Date = new Date(),
): SubscriptionPeriodStatus {
  if (snap.isIllustrationTenant) return "exempt";
  if (snap.billingHold) return "on_hold";

  if (!subscriptionBillingApplies(snap)) {
    return "exempt";
  }

  if (snap.setupFeeETB > 0 && !snap.setupFeeApproved) {
    return "setup_pending";
  }

  if (isFreeTrialActive(snap, now)) {
    return "trial";
  }

  if (!resolveBillingAnchor(snap)) {
    return "on_hold";
  }

  if (!snap.subscriptionPaymentApproved) {
    return "pending_approval";
  }

  const paidUntil = parseSubscriptionDate(snap.subscriptionPaidUntil);
  if (!paidUntil) {
    return "pending_approval";
  }

  const daysUntilEnd = daysBetweenCalendar(now, paidUntil);

  if (daysUntilEnd > SUBSCRIPTION_WARNING_DAYS) {
    return "active";
  }
  if (daysUntilEnd >= 0) {
    return "warning";
  }

  const daysPast = -daysUntilEnd;
  if (daysPast >= 1 && daysPast < SUBSCRIPTION_GRACE_DAYS) {
    return "grace";
  }
  return "expired";
}

export function subscriptionAllowsFullSystemAccess(
  status: SubscriptionPeriodStatus,
): boolean {
  return (
    status === "exempt" ||
    status === "on_hold" ||
    status === "trial" ||
    status === "active" ||
    status === "warning"
  );
}

export function subscriptionAllowsSystemAccess(
  status: SubscriptionPeriodStatus,
): boolean {
  return subscriptionAllowsFullSystemAccess(status);
}

export function formatSubscriptionDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function currentQuarterNumber(
  anchor: Date,
  now: Date = new Date(),
): number {
  const days = Math.max(0, daysBetweenCalendar(anchor, now));
  return Math.floor(days / SUBSCRIPTION_QUARTER_DAYS) + 1;
}
