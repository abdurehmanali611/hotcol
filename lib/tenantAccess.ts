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
import {
  isLodgingBusinessType,
  readBusinessTypeFromStorage,
} from "@/lib/subscriptionBillingPeriod";

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
  Reception: "Room Management",
  CMLeader: "Cleaning and Maintenance",
  HR: "HR Module",
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
  const modules = readTenantModulesFromStorage();
  // Unified cashier terminal: café POS and/or credit desk.
  if (role === "Cashier" || role === "HotelCashier") {
    return (
      tenantHasModule(modules, "Cafe and Restaurant") ||
      tenantHasModule(modules, "Credit Management")
    );
  }
  const required = TERMINAL_PAGE_MODULES[role];
  if (!required) return true;
  return tenantHasModule(modules, required);
}

export function readLoggedInRole(): string | null {
  if (typeof window === "undefined") return null;
  const role = localStorage.getItem("user_role")?.trim();
  return role || null;
}

export function isAdminOrManagerRole(role: string | null | undefined): boolean {
  return role === "Admin" || role === "Manager";
}

export function canAccessTenantOwnerPage(): boolean {
  return isAdminOrManagerRole(readLoggedInRole());
}

export function hasAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("auth_token")?.trim());
}

function isCashierFamilyRole(role: string): boolean {
  return role === "Cashier" || role === "HotelCashier";
}

/** True when the signed-in staff role matches the terminal (e.g. Cashier on /Cashier). */
export function loggedInRoleMatchesTerminal(terminalRole: string): boolean {
  const logged = readLoggedInRole();
  if (!logged) return false;
  if (logged === terminalRole) return true;
  // Cashier and legacy HotelCashier are the same staff role.
  if (isCashierFamilyRole(logged) && isCashierFamilyRole(terminalRole)) {
    return true;
  }
  return false;
}

export function subscriptionBlockMessage(status: SubscriptionPeriodStatus): string {
  const isYearly = isLodgingBusinessType(readBusinessTypeFromStorage());
  if (status === "on_hold") {
    return isYearly
      ? "Billing has not started for this property yet (Apex hold). Yearly subscription begins when hold is released."
      : "Billing has not started for this property yet (Apex hold). Quarters begin when hold is released.";
  }
  if (status === "trial") {
    return "Free trial is active.";
  }
  if (status === "trial_ending") {
    return "Free trial is ending soon. Submit the setup fee to continue using the system after the trial ends.";
  }
  if (status === "trial_expired") {
    return "Free trial has ended. Login is disabled until Admin or Manager submits the setup payment and Apex approves.";
  }
  if (status === "setup_pending") {
    return "Setup fee approval is pending. Sign-in is disabled until Apex verifies your payment (usually within about 30 minutes). Contact Apex on WhatsApp if you need help.";
  }
  if (status === "pending_approval") {
    return isYearly
      ? "A yearly payment is awaiting Apex approval. Admin or Manager can check status on the payment portal."
      : "A quarterly payment is awaiting Apex approval. Admin or Manager can check status on the payment portal.";
  }
  if (status === "grace") {
    return isYearly
      ? "Yearly renewal is required. Admin or Manager must submit payment within the grace period."
      : "Quarterly renewal is required. Admin or Manager must submit payment within the grace period.";
  }
  if (status === "expired") {
    return isYearly
      ? "Your yearly subscription grace period has ended. Pay Apex and contact support to restore access."
      : "Your quarterly subscription grace period has ended. Pay Apex and contact support to restore access.";
  }
  return "Your property cannot access the system right now.";
}

export function moduleBlockMessage(module: ModuleOption): string {
  return `"${module}" is not subscribed for this property. Contact Apex to add the module.`;
}
