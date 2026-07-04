import { APEX_SOLUTION_CBE_ACCOUNT, formatApexWhatsAppSupportList } from "@/lib/signupPayment";
import {
  isLodgingBusinessType,
  readBusinessTypeFromStorage,
  subscriptionRenewalAmountETB,
} from "@/lib/subscriptionBillingPeriod";
import { formatETB } from "@/lib/subscriptionModules";
import {
  computeSubscriptionPeriodStatus,
  formatSubscriptionDate,
  freeTrialDaysRemaining,
  parseSubscriptionDate,
  SUBSCRIPTION_GRACE_DAYS,
  TRIAL_PAYMENT_WINDOW_DAYS,
  trialPaymentDeadline,
  type SubscriptionBillingSnapshot,
  type SubscriptionPeriodStatus,
} from "@/lib/subscriptionQuarter";

export type SubscriptionNotification = {
  id: string;
  severity: "critical" | "warning";
  priority: "high";
  title: string;
  message: string;
  status: SubscriptionPeriodStatus;
};

export function buildSubscriptionNotifications(
  snap: SubscriptionBillingSnapshot,
  now: Date = new Date(),
): SubscriptionNotification[] {
  const status = computeSubscriptionPeriodStatus(snap, now);
  const businessType = readBusinessTypeFromStorage();
  const isYearly = isLodgingBusinessType(businessType);
  const renewalAmount = formatETB(
    subscriptionRenewalAmountETB(snap.quarterlyFeeETB, businessType),
  );
  const paidUntil = parseSubscriptionDate(snap.subscriptionPaidUntil);

  if (
    status === "exempt" ||
    status === "on_hold" ||
    status === "trial" ||
    status === "active"
  ) {
    return [];
  }

  if (status === "trial_ending") {
    const daysLeft = freeTrialDaysRemaining(snap, now) ?? 0;
    const deadline = trialPaymentDeadline(snap);
    const deadlineStr = deadline ? formatSubscriptionDate(deadline) : "";
    return [
      {
        id: "sub-trial-ending",
        severity: "warning" as const,
        priority: "high" as const,
        status,
        title: `Free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        message: `Your free trial is ending soon. Submit the setup fee payment to CBE ${APEX_SOLUTION_CBE_ACCOUNT} before the trial ends to avoid service interruption. After the trial, you have ${TRIAL_PAYMENT_WINDOW_DAYS} days (until ${deadlineStr}) to complete payment before all logins are disabled.`,
      },
    ];
  }

  if (status === "trial_expired") {
    const deadline = trialPaymentDeadline(snap);
    const deadlineStr = deadline ? ` before ${formatSubscriptionDate(deadline)}` : "";
    return [
      {
        id: "sub-trial-expired",
        severity: "critical" as const,
        priority: "high" as const,
        status,
        title: "Free trial ended — setup payment required",
        message: `Your free trial has ended. Submit the setup fee${deadlineStr} to CBE ${APEX_SOLUTION_CBE_ACCOUNT}. Staff logins are disabled until Apex approves the payment. For help, WhatsApp ${formatApexWhatsAppSupportList()}.`,
      },
    ];
  }

  if (status === "setup_pending") {
    return [
      {
        id: "sub-setup-pending",
        severity: "critical" as const,
        priority: "high" as const,
        status,
        title: "Setup fee awaiting Apex approval",
        message: `Your setup payment is being verified. Sign-in stays disabled until Apex approves (usually within about 30 minutes). For help, WhatsApp ${formatApexWhatsAppSupportList()}.`,
      },
    ];
  }

  if (status === "pending_approval") {
    return [
      {
        id: "sub-pending-approval",
        severity: "critical",
        priority: "high",
        status,
        title: "Payment awaiting Apex approval",
        message: `Your setup payment is pending verification. Transfer to CBE ${APEX_SOLUTION_CBE_ACCOUNT} and contact Apex if you already paid. Access unlocks once Apex approves your registration.`,
      },
    ];
  }

  if (status === "warning" && paidUntil) {
    const daysLeft = Math.max(
      0,
      Math.ceil((paidUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );
    return [
      {
        id: "sub-quarter-warning",
        severity: "warning",
        priority: "high",
        status,
        title: isYearly
          ? "Yearly subscription ending soon"
          : "Quarterly subscription ending soon",
        message: isYearly
          ? `Your paid year ends ${formatSubscriptionDate(paidUntil)} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left). After that date, submit ${renewalAmount} to CBE account ${APEX_SOLUTION_CBE_ACCOUNT} during the 10-day grace period.`
          : `Your paid quarter ends ${formatSubscriptionDate(paidUntil)} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left). After that date, submit ${renewalAmount} to CBE account ${APEX_SOLUTION_CBE_ACCOUNT} during the 10-day grace period.`,
      },
    ];
  }

  if (status === "grace" && paidUntil) {
    const daysPast = Math.min(
      SUBSCRIPTION_GRACE_DAYS,
      Math.max(
        1,
        Math.ceil((now.getTime() - paidUntil.getTime()) / (24 * 60 * 60 * 1000)),
      ),
    );
    const graceLeft = SUBSCRIPTION_GRACE_DAYS - daysPast;
    return [
      {
        id: "sub-quarter-grace",
        severity: "critical",
        priority: "high",
        status,
        title: "Subscription grace period — renew now",
        message: isYearly
          ? `Year ended ${formatSubscriptionDate(paidUntil)} (${daysPast} day${daysPast === 1 ? "" : "s"} ago). Pay ${renewalAmount} to CBE ${APEX_SOLUTION_CBE_ACCOUNT} within ${graceLeft} day${graceLeft === 1 ? "" : "s"} on the payment portal — after day 10 all logins are disabled until Apex approves.`
          : `Quarter ended ${formatSubscriptionDate(paidUntil)} (${daysPast} day${daysPast === 1 ? "" : "s"} ago). Pay ${renewalAmount} to CBE ${APEX_SOLUTION_CBE_ACCOUNT} within ${graceLeft} day${graceLeft === 1 ? "" : "s"} on the payment portal — after day 10 all logins are disabled until Apex approves.`,
      },
    ];
  }

  if (status === "expired") {
    return [
      {
        id: "sub-quarter-expired",
        severity: "critical",
        priority: "high",
        status,
        title: "Subscription expired",
        message: isYearly
          ? `Yearly payment was not received within the 10-day grace period. Pay ${renewalAmount} to CBE ${APEX_SOLUTION_CBE_ACCOUNT} and contact Apex — all property logins are disabled until payment is approved.`
          : `Quarterly payment was not received within the 10-day grace period. Pay ${renewalAmount} to CBE ${APEX_SOLUTION_CBE_ACCOUNT} and contact Apex — all property logins are disabled until payment is approved.`,
      },
    ];
  }

  return [];
}

export function subscriptionNotificationSummary(
  notifications: SubscriptionNotification[],
): { critical: number; warning: number } {
  let critical = 0;
  let warning = 0;
  for (const n of notifications) {
    if (n.severity === "critical") critical++;
    else warning++;
  }
  return { critical, warning };
}
