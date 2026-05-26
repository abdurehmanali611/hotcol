import { formatETB } from "@/lib/subscriptionModules";
import {
  computeSubscriptionPeriodStatus,
  formatSubscriptionDate,
  parseSubscriptionDate,
  SUBSCRIPTION_GRACE_DAYS,
  type SubscriptionBillingSnapshot,
  type SubscriptionPeriodStatus,
} from "@/lib/subscriptionQuarter";
import { APEX_SOLUTION_CBE_ACCOUNT, formatApexWhatsAppSupportList } from "@/lib/signupPayment";

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
  const quarterly = formatETB(snap.quarterlyFeeETB);
  const paidUntil = parseSubscriptionDate(snap.subscriptionPaidUntil);

  if (
    status === "exempt" ||
    status === "on_hold" ||
    status === "trial" ||
    status === "active"
  ) {
    return [];
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
        message: `Your setup or quarterly payment is pending verification. Transfer to CBE ${APEX_SOLUTION_CBE_ACCOUNT} and contact Apex if you already paid. Access unlocks once payment is approved for the next 90-day quarter.`,
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
        title: "Quarterly subscription ending soon",
        message: `Your paid quarter ends ${formatSubscriptionDate(paidUntil)} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left). Pay ${quarterly} to CBE account ${APEX_SOLUTION_CBE_ACCOUNT} before the deadline to avoid interruption.`,
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
        message: `Quarter ended ${formatSubscriptionDate(paidUntil)} (${daysPast} day${daysPast === 1 ? "" : "s"} ago). Pay ${quarterly} to CBE ${APEX_SOLUTION_CBE_ACCOUNT} within ${graceLeft} day${graceLeft === 1 ? "" : "s"} on the payment portal — after day 10 all logins are disabled until Apex approves.`,
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
        message: `Quarterly payment was not received within the 10-day grace period. Pay ${quarterly} to CBE ${APEX_SOLUTION_CBE_ACCOUNT} and contact Apex — all property logins are disabled until payment is approved.`,
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
