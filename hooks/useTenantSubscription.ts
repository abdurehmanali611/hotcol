"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readTenantSubscriptionFromStorage } from "@/lib/tenantModules";
import {
  computeSubscriptionPeriodStatus,
  subscriptionAllowsFullSystemAccess,
} from "@/lib/subscriptionQuarter";
import {
  buildSubscriptionNotifications,
  subscriptionNotificationSummary,
} from "@/lib/subscriptionNotifications";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return JSON.stringify(readTenantSubscriptionFromStorage());
}

function getServerSnapshot() {
  return "{}";
}

export function useTenantSubscriptionState() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    const sub = readTenantSubscriptionFromStorage();
    const status = computeSubscriptionPeriodStatus(sub);
    const notifications = buildSubscriptionNotifications(sub);
    return {
      ...sub,
      status,
      canUseSystem: subscriptionAllowsFullSystemAccess(status),
      notifications,
      summary: subscriptionNotificationSummary(notifications),
    };
  }, [raw]);
}
