import {
  MODULE_OPTIONS,
  SIGNUP_REQUIRED_MODULE_COMMON,
  type BusinessType,
  type ModuleOption,
  isLodgingBusinessType,
} from "@/constants";

/** Not selectable at signup yet. */
export const SIGNUP_COMING_SOON_MODULES = [
  "HR Module",
  "Cleaning and Maintenance",
  "Room Management",
] as const satisfies readonly ModuleOption[];

export const MODULE_DESCRIPTIONS: Record<ModuleOption, string> = {
  "Credentials(Common)":
    "Grant and update staff login credentials for your property.",
  "Cafe and Restaurant":
    "Orders, cashier, bar, chef, tables/waiters, and menu handling.",
  Inventory:
    "Store terminal, stock lists, suppliers, and item receipts. Without Financial Management, cost control and finance approval steps are omitted.",
  "Credit Management":
    "Corporate credit registration, agreements, tiers, and usage reporting.",
  "Financial Management":
    "Cost control and finance roles; purchase, registration, and stock movement approvals.",
  "HR Module": "Staff HR workflows — coming soon.",
  "Room Management": "Room operations — coming soon.",
  "Cleaning and Maintenance": "Housekeeping and maintenance — coming soon.",
};

export type SignupPricing = {
  setupFeeETB: number;
  quarterlyFeeETB: number;
};

export type TenantSubscription = SignupPricing & {
  modules: ModuleOption[];
  setupFeeApproved: boolean;
  createdAt: string | null;
  billingStartedAt: string | null;
  billingHold: boolean;
  isIllustrationTenant: boolean;
  freeTrialEndsAt: string | null;
  subscriptionPaidUntil: string | null;
  subscriptionPaymentApproved: boolean;
  paidQuartersCount: number;
};

export function isModuleComingSoon(mod: ModuleOption): boolean {
  return (SIGNUP_COMING_SOON_MODULES as readonly string[]).includes(mod);
}

export function isModuleRequiredAtSignup(
  mod: ModuleOption,
  businessType: BusinessType,
): boolean {
  if (mod === SIGNUP_REQUIRED_MODULE_COMMON) return true;
  if (businessType === "Cafe and Restaurant" && mod === "Cafe and Restaurant") {
    return true;
  }
  return false;
}

/** Locked (checked, not toggleable) or unavailable for this business type. */
export function isModuleDisabledAtSignup(
  mod: ModuleOption,
  businessType: BusinessType,
): boolean {
  if (isModuleComingSoon(mod)) return true;
  if (isModuleRequiredAtSignup(mod, businessType)) return true;
  if (mod === "Cafe and Restaurant" && isLodgingBusinessType(businessType)) {
    return true;
  }
  if (mod === "Financial Management" && businessType === "Cafe and Restaurant") {
    return true;
  }
  return false;
}

export function getSignupDisabledReason(
  mod: ModuleOption,
  businessType: BusinessType,
): string | null {
  if (isModuleComingSoon(mod)) return "Coming soon";
  if (mod === "Cafe and Restaurant" && isLodgingBusinessType(businessType)) {
    return "Coming soon for hotels";
  }
  if (isModuleRequiredAtSignup(mod, businessType)) return "Included";
  return null;
}

export function getDefaultSignupModules(
  businessType: BusinessType,
): ModuleOption[] {
  if (businessType === "Cafe and Restaurant") {
    return ["Credentials(Common)", "Cafe and Restaurant"];
  }
  return ["Credentials(Common)"];
}

export function normalizeSignupModules(
  businessType: BusinessType,
  selected: readonly ModuleOption[],
): ModuleOption[] {
  const allowed = new Set<ModuleOption>();
  for (const mod of MODULE_OPTIONS) {
    if (isModuleDisabledAtSignup(mod, businessType) && !isModuleRequiredAtSignup(mod, businessType)) {
      continue;
    }
    if (selected.includes(mod)) allowed.add(mod);
  }
  for (const req of getDefaultSignupModules(businessType)) {
    allowed.add(req);
  }
  return MODULE_OPTIONS.filter((m) => allowed.has(m));
}

export function calculateSignupPricing(
  businessType: BusinessType,
  modules: readonly ModuleOption[],
): SignupPricing {
  const set = new Set(modules);
  const hasInv = set.has("Inventory");
  const hasFin = set.has("Financial Management");
  const hasCredit = set.has("Credit Management");

  if (businessType === "Cafe and Restaurant") {
    if (hasCredit) return { setupFeeETB: 35_000, quarterlyFeeETB: 10_000 };
    if (hasInv) return { setupFeeETB: 30_000, quarterlyFeeETB: 7_000 };
    return { setupFeeETB: 25_000, quarterlyFeeETB: 5_000 };
  }

  if (isLodgingBusinessType(businessType)) {
    if (hasInv && hasFin && hasCredit) {
      return { setupFeeETB: 35_000, quarterlyFeeETB: 15_000 };
    }
    if (hasInv && hasCredit) {
      return { setupFeeETB: 30_000, quarterlyFeeETB: 10_000 };
    }
    if (hasCredit && !hasInv) {
      return { setupFeeETB: 20_000, quarterlyFeeETB: 7_000 };
    }
    if (hasInv && hasFin) {
      return { setupFeeETB: 30_000, quarterlyFeeETB: 10_000 };
    }
    if (hasInv) return { setupFeeETB: 25_000, quarterlyFeeETB: 10_000 };
    return { setupFeeETB: 0, quarterlyFeeETB: 0 };
  }

  return { setupFeeETB: 0, quarterlyFeeETB: 0 };
}

export function formatETB(amount: number): string {
  return `${amount.toLocaleString("en-ET")} ETB`;
}

export function parseModulesJson(raw: unknown): ModuleOption[] {
  if (raw == null) return [];
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter((m): m is ModuleOption =>
    (MODULE_OPTIONS as readonly string[]).includes(String(m)),
  );
}

/** Legacy tenants with no module list keep full access. */
export function tenantHasModule(
  modules: readonly ModuleOption[],
  required: ModuleOption,
): boolean {
  if (modules.length === 0) return true;
  return modules.includes(required);
}

export const ADMIN_TAB_MODULES: Partial<Record<string, ModuleOption>> = {
  reports: "Cafe and Restaurant",
  "create-item": "Cafe and Restaurant",
  "update-item": "Cafe and Restaurant",
  "waiter-table": "Cafe and Restaurant",
  "grant-credential": "Credentials(Common)",
  "update-credential": "Credentials(Common)",
  inventory: "Inventory",
  "item-receipts": "Inventory",
  "credit-registrations": "Credit Management",
};

export const MANAGER_TAB_MODULES: Partial<Record<string, ModuleOption>> = {
  "menu-create-item": "Cafe and Restaurant",
  "menu-update-item": "Cafe and Restaurant",
  "grant-credential": "Credentials(Common)",
  "update-credential": "Credentials(Common)",
  "reports-inventory": "Inventory",
  "reports-movements": "Inventory",
  "reports-purchases": "Financial Management",
  "authorize-item-registrations": "Financial Management",
  "authorize-purchases": "Financial Management",
  "authorize-stock": "Financial Management",
  "item-receipts": "Inventory",
  "reports-beginnings": "Inventory",
  "inventory-payment-vat": "Financial Management",
  "creditor-usage-report": "Credit Management",
  "corporate-credit-tiers": "Credit Management",
  "authorize-companies": "Credit Management",
  "cc-profiles": "Financial Management",
};

export const ROLE_REQUIRED_MODULE: Partial<Record<string, ModuleOption>> = {
  Kitchen: "Cafe and Restaurant",
  Barista: "Cafe and Restaurant",
  Cashier: "Cafe and Restaurant",
  Store: "Inventory",
  CostControl: "Financial Management",
  Finance: "Financial Management",
  HotelCashier: "Credit Management",
};

export const HOTEL_STORE_FINANCE_VIEWS = new Set([
  "Purchases",
  "PurchaseRequestStatus",
  "StockMovementStatus",
  "PaymentCredit",
  "PaymentPaid",
  "PaymentWithVat",
  "PaymentWithoutVat",
]);

export const CAFE_CASHIER_NAV_MODULES: Partial<
  Record<"order" | "payment" | "cashout" | "credit", ModuleOption>
> = {
  order: "Cafe and Restaurant",
  payment: "Cafe and Restaurant",
  cashout: "Cafe and Restaurant",
  credit: "Credit Management",
};

export function filterCafeCashierNavId(
  navId: string,
  modules: readonly ModuleOption[],
): boolean {
  const required = CAFE_CASHIER_NAV_MODULES[navId as keyof typeof CAFE_CASHIER_NAV_MODULES];
  if (!required) return true;
  return tenantHasModule(modules, required);
}

export function roleAllowedForModules(
  role: string,
  modules: readonly ModuleOption[],
): boolean {
  const required = ROLE_REQUIRED_MODULE[role];
  if (!required) return true;
  return tenantHasModule(modules, required);
}

export function filterAdminTabId(
  tabId: string,
  modules: readonly ModuleOption[],
): boolean {
  const required = ADMIN_TAB_MODULES[tabId];
  if (!required) return true;
  return tenantHasModule(modules, required);
}

export function filterManagerTabId(
  tabId: string,
  modules: readonly ModuleOption[],
): boolean {
  const required = MANAGER_TAB_MODULES[tabId];
  if (!required) return true;
  return tenantHasModule(modules, required);
}
