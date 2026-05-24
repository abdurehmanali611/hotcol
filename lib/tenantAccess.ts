"use client";

import type { ModuleOption } from "@/constants";
import {
  computeSubscriptionPeriodStatus,
  subscriptionAllowsFullSystemAccess,
  type SubscriptionPeriodStatus,
} from "@/lib/subscriptionQuarter";
import { tenantHasModule } from "@/lib/subscriptionModules";
import { readTenantBillingFromStorage, readTenantModulesFromStorage } from "@/lib/tenantModules";
import { isPaymentPortalMode } from "@/lib/tenantAccessMode";

export const TERMINAL_PAGE_MODULES: Record<string, ModuleOption | undefined> = {
  Admin: undefined,
  Manager: undefined,
  Kitchen: "Cafe and Restaurant",
  Barista: "Cafe and Restaurant",
  Cashier: "Cafe and Restaurant",
  Store: "Inventory",
  CostControl: "Financial Management",
  Finance: "Financial Management",
  HotelCashier: "Credit Management",
};

export function readSubscriptionBillingSnapshot() {
  return readTenantBillingFromStorage();
}

export function getSubscriptionPeriodStatus(): SubscriptionPeriodStatus {
  return computeSubscriptionPeriodStatus(readSubscriptionBillingSnapshot());
}

export function canUseTenantSystem(): boolean {
  if (isPaymentPortalMode()) return false;
  const status = getSubscriptionPeriodStatus();
  return subscriptionAllowsFullSystemAccess(status);
}

export function canAccessTenantModule(module: ModuleOption): boolean {
  if (!canUseTenantSystem()) return false;
  return tenantHasModule(readTenantModulesFromStorage(), module);
}

export function canAccessTerminalRole(role: string): boolean {
  if (!canUseTenantSystem()) return false;
  const required = TERMINAL_PAGE_MODULES[role];
  if (!required) return true;
  return tenantHasModule(readTenantModulesFromStorage(), required);
}

export function subscriptionBlockMessage(status: SubscriptionPeriodStatus): string {
  if (status === "on_hold") {
    return "Billing has not started for this property yet (Apex hold). Quarters begin when hold is released.";
  }
  if (status === "trial") {
    return "Free trial is active.";
  }
  if (status === "setup_pending") {
    return "Setup fee approval is pending. Sign-in is disabled until Apex verifies your payment (usually within about 30 minutes). Contact Apex on WhatsApp if you need help.";
  }
  if (status === "pending_approval") {
    return "Your payment is pending Apex approval. Admin or Manager can check status on the payment portal.";
  }
  if (status === "grace") {
    return "Quarterly renewal is required. Admin or Manager must submit payment within the grace period.";
  }
  if (status === "expired") {
    return "Your quarterly subscription grace period has ended. Pay Apex and contact support to restore access.";
  }
  return "Your property cannot access the system right now.";
}

export function moduleBlockMessage(module: ModuleOption): string {
  return `"${module}" is not subscribed for this property. Contact Apex to add the module.`;
}
