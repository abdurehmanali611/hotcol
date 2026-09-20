/** Client-side lodging alerts for the in-app notification bell. */

export type LodgingAlertSeverity = "critical" | "warning" | "info";

export type LodgingNotification = {
  id: string;
  severity: LodgingAlertSeverity;
  title: string;
  body: string;
  kind:
    | "cm_backlog"
    | "overstay"
    | "checkout_blocker"
    | "reservation_due"
    | "business_day_open"
    | "inspected_ready";
};

export type LodgingNotificationInput = {
  dirtyCount?: number;
  maintenanceCount?: number;
  inspectedCount?: number;
  openCmCount?: number;
  overstayCount?: number;
  checkoutBlockerCount?: number;
  reservationsDueToday?: number;
  businessDayOpen?: boolean;
};

export function buildLodgingNotifications(
  input: LodgingNotificationInput,
): LodgingNotification[] {
  const out: LodgingNotification[] = [];
  const dirty = input.dirtyCount ?? 0;
  const maint = input.maintenanceCount ?? 0;
  const inspected = input.inspectedCount ?? 0;
  const openCm = input.openCmCount ?? 0;
  const overstay = input.overstayCount ?? 0;
  const blockers = input.checkoutBlockerCount ?? 0;
  const due = input.reservationsDueToday ?? 0;

  if (dirty > 0) {
    out.push({
      id: `cm-dirty-${dirty}`,
      severity: dirty >= 5 ? "critical" : "warning",
      title: "Rooms need cleaning",
      body: `${dirty} vacant dirty room${dirty === 1 ? "" : "s"} in the CM queue.`,
      kind: "cm_backlog",
    });
  }
  if (maint > 0) {
    out.push({
      id: `cm-maint-${maint}`,
      severity: "warning",
      title: "Rooms on maintenance",
      body: `${maint} room${maint === 1 ? "" : "s"} currently on maintenance.`,
      kind: "cm_backlog",
    });
  }
  if (inspected > 0) {
    out.push({
      id: `cm-inspected-${inspected}`,
      severity: "info",
      title: "Inspected — ready to open",
      body: `${inspected} inspected room${inspected === 1 ? "" : "s"} can be marked vacant clean.`,
      kind: "inspected_ready",
    });
  }
  if (openCm > 0) {
    out.push({
      id: `cm-open-${openCm}`,
      severity: "info",
      title: "Open CM assignments",
      body: `${openCm} cleaning/maintenance assignment${openCm === 1 ? "" : "s"} still open.`,
      kind: "cm_backlog",
    });
  }
  if (overstay > 0) {
    out.push({
      id: `overstay-${overstay}`,
      severity: "critical",
      title: "Past expected departure",
      body: `${overstay} in-house stay${overstay === 1 ? "" : "s"} past expected departure.`,
      kind: "overstay",
    });
  }
  if (blockers > 0) {
    out.push({
      id: `blocker-${blockers}`,
      severity: "warning",
      title: "Checkout blocked",
      body: `${blockers} stay${blockers === 1 ? "" : "s"} waiting on F&B or laundry completion.`,
      kind: "checkout_blocker",
    });
  }
  if (due > 0) {
    out.push({
      id: `rsv-due-${due}`,
      severity: "info",
      title: "Arrivals expected today",
      body: `${due} reservation${due === 1 ? "" : "s"} scheduled for today.`,
      kind: "reservation_due",
    });
  }
  if (input.businessDayOpen) {
    out.push({
      id: "biz-day-open",
      severity: "info",
      title: "Business day still open",
      body: "Night audit has not closed today’s business day yet.",
      kind: "business_day_open",
    });
  }

  const order: Record<LodgingAlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function summarizeLodgingNotifications(list: LodgingNotification[]) {
  return {
    total: list.length,
    critical: list.filter((n) => n.severity === "critical").length,
    warning: list.filter((n) => n.severity === "warning").length,
    info: list.filter((n) => n.severity === "info").length,
  };
}
