import {
  MODULE_OPTIONS,
  SIGNUP_COMING_SOON_BUSINESS_TYPES,
  SIGNUP_REQUIRED_MODULE_COMMON,
  type BusinessType,
  type ModuleOption,
  isLodgingBusinessType,
} from "@/constants";

export const BUSINESS_TYPE_SIGNUP_DESCRIPTIONS: Record<BusinessType, string> = {
  "Cafe and Restaurant":
    "Orders, kitchen, bar, tables, cashier, and daily café operations.",
  Hotel:
    "Lodging with optional room management, cleaning & maintenance, inventory, credit, and café.",
  Resort: "Resort operations — registration opening soon.",
  Pension: "Guest house and pension workflows — registration opening soon.",
};

export function isBusinessTypeComingSoon(type: BusinessType): boolean {
  return (SIGNUP_COMING_SOON_BUSINESS_TYPES as readonly string[]).includes(type);
}

/** Not selectable at signup yet. */
export const SIGNUP_COMING_SOON_MODULES = [
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
  "HR Module":
    "Employees, leave types, attendance/shifts, documents, payroll, and incidents.",
  "Room Management":
    "Rooms, reception check-in/out, guest stays, billing, and laundry. In-room F&B uses the Cafe and Restaurant module.",
  "Cleaning and Maintenance":
    "Housekeeping and maintenance queues: dirty rooms, maintenance windows, and CM assignments.",
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
  awaitingSelfSignupSetup?: boolean;
  paymentTransactionRef?: string | null;
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
  if (mod === "Financial Management" && businessType === "Cafe and Restaurant") {
    return true;
  }
  if (
    businessType === "Cafe and Restaurant" &&
    (mod === "Room Management" || mod === "Cleaning and Maintenance")
  ) {
    return true;
  }
  return false;
}

export function getSignupDisabledReason(
  mod: ModuleOption,
  businessType: BusinessType,
): string | null {
  if (isModuleComingSoon(mod)) return "Coming soon";
  if (isModuleRequiredAtSignup(mod, businessType)) return "Included";
  return null;
}

export function getDefaultSignupModules(
  businessType: BusinessType,
): ModuleOption[] {
  if (businessType === "Cafe and Restaurant") {
    return ["Credentials(Common)", "Cafe and Restaurant"];
  }
  // Lodging: credentials only — Room Management / Cleaning are opt-in.
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

/**
 * Default signup pricing matrix (café / hotel tiers).
 * Lodging + Cafe and Restaurant uses café tier setup fees with hotel quarterly
 * rates where inventory/finance apply. Used as fallback and to detect when the
 * Apex catalog differs from baseline. Live signup reads the catalog via
 * signupPricingPreview when available.
 */
export function calculateSignupPricing(
  businessType: BusinessType,
  modules: readonly ModuleOption[],
): SignupPricing {
  const set = new Set(modules);
  const hasCafe = set.has("Cafe and Restaurant");
  const hasInv = set.has("Inventory");
  const hasFin = set.has("Financial Management");
  const hasCredit = set.has("Credit Management");
  const hasHr = set.has("HR Module");
  const hrSetup = hasHr ? 5_000 : 0;
  const hrQuarterly = hasHr ? 2_000 : 0;

  if (businessType === "Cafe and Restaurant") {
    let base: SignupPricing;
    if (hasCredit) base = { setupFeeETB: 35_000, quarterlyFeeETB: 10_000 };
    else if (hasInv) base = { setupFeeETB: 30_000, quarterlyFeeETB: 7_000 };
    else base = { setupFeeETB: 25_000, quarterlyFeeETB: 5_000 };
    return {
      setupFeeETB: base.setupFeeETB + hrSetup,
      quarterlyFeeETB: base.quarterlyFeeETB + hrQuarterly,
    };
  }

  if (isLodgingBusinessType(businessType)) {
    let base: SignupPricing;
    if (hasCafe) {
      if (hasInv && hasFin && hasCredit) {
        base = { setupFeeETB: 35_000, quarterlyFeeETB: 15_000 };
      } else if (hasInv && hasCredit) {
        base = { setupFeeETB: 35_000, quarterlyFeeETB: 10_000 };
      } else if (hasCredit && !hasInv) {
        base = { setupFeeETB: 35_000, quarterlyFeeETB: 10_000 };
      } else if (hasInv && hasFin) {
        base = { setupFeeETB: 30_000, quarterlyFeeETB: 10_000 };
      } else if (hasInv) {
        base = { setupFeeETB: 30_000, quarterlyFeeETB: 10_000 };
      } else {
        base = { setupFeeETB: 25_000, quarterlyFeeETB: 5_000 };
      }
    } else if (hasInv && hasFin && hasCredit) {
      base = { setupFeeETB: 35_000, quarterlyFeeETB: 15_000 };
    } else if (hasInv && hasCredit) {
      base = { setupFeeETB: 30_000, quarterlyFeeETB: 10_000 };
    } else if (hasCredit && !hasInv) {
      base = { setupFeeETB: 20_000, quarterlyFeeETB: 7_000 };
    } else if (hasInv && hasFin) {
      base = { setupFeeETB: 30_000, quarterlyFeeETB: 10_000 };
    } else if (hasInv) {
      base = { setupFeeETB: 25_000, quarterlyFeeETB: 10_000 };
    } else {
      base = { setupFeeETB: 0, quarterlyFeeETB: 0 };
    }
    return {
      setupFeeETB: base.setupFeeETB + hrSetup,
      quarterlyFeeETB: base.quarterlyFeeETB + hrQuarterly,
    };
  }

  return { setupFeeETB: hrSetup, quarterlyFeeETB: hrQuarterly };
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
  "station-prep-qty": "Cafe and Restaurant",
  "waiter-table": "Cafe and Restaurant",
  "grant-credential": "Credentials(Common)",
  "delete-credential": "Credentials(Common)",
  inventory: "Inventory",
  "item-receipts": "Inventory",
  "credit-registrations": "Credit Management",
  "hr-overview": "HR Module",
  "hr-employees": "HR Module",
  "hr-leave": "HR Module",
  "hr-attendance": "HR Module",
  "hr-documents": "HR Module",
  "hr-payroll": "HR Module",
  "hr-incidents": "HR Module",
  "hr-departments": "HR Module",
  "hr-workforce": "HR Module",
};

/** Manager café / restaurant + credit tabs (no inventory / receipts — those stay in lodging Inventory). */
export const MANAGER_SERVICE_TAB_MODULES: Partial<
  Record<string, ModuleOption>
> = {
  reports: "Cafe and Restaurant",
  "create-item": "Cafe and Restaurant",
  "update-item": "Cafe and Restaurant",
  "station-prep-qty": "Cafe and Restaurant",
  "waiter-table": "Cafe and Restaurant",
  "credit-registrations": "Credit Management",
  // Legacy ids (pre-parity rename)
  "cafe-reports": "Cafe and Restaurant",
  "menu-create-item": "Cafe and Restaurant",
  "menu-update-item": "Cafe and Restaurant",
  "cafe-item-receipts": "Cafe and Restaurant",
};

export const MANAGER_TAB_MODULES: Partial<Record<string, ModuleOption>> = {
  "grant-credential": "Credentials(Common)",
  "delete-credential": "Credentials(Common)",
  "reports-inventory": "Inventory",
  "reports-movements": "Inventory",
  "reports-purchases": "Financial Management",
  "authorize-item-registrations": "Financial Management",
  "authorize-purchases": "Financial Management",
  "authorize-stock": "Financial Management",
  "item-receipts": "Inventory",
  "reports-beginnings": "Inventory",
  "hr-overview": "HR Module",
  "hr-employees": "HR Module",
  "hr-leave": "HR Module",
  "hr-attendance": "HR Module",
  "hr-documents": "HR Module",
  "hr-payroll": "HR Module",
  "hr-incidents": "HR Module",
  "hr-departments": "HR Module",
  "hr-workforce": "HR Module",
  "inventory-payment-vat": "Financial Management",
  "cc-profiles": "Financial Management",
  "lodging-rooms": "Room Management",
  "lodging-reports": "Room Management",
  "lodging-guest-call": "Room Management",
  "lodging-laundry-add": "Room Management",
  "lodging-laundry-items": "Room Management",
  /** @deprecated legacy flat tab */
  "lodging-service-prices": "Room Management",
};

export const ROLE_REQUIRED_MODULE: Partial<Record<string, ModuleOption>> = {
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

export const HOTEL_STORE_FINANCE_VIEWS = new Set([
  "Purchases",
  "PurchaseRequestStatus",
  "StockMovementStatus",
  "PaymentCredit",
  "PaymentPaid",
  "PaymentWithVat",
  "PaymentWithoutVat",
]);

/** Finance terminal sections that require a subscribed module. */
export const FINANCE_SECTION_MODULES: Partial<Record<string, ModuleOption>> = {
  "creditor-usage": "Credit Management",
};

/** Cost Control terminal sections that require a subscribed module. */
export const COST_CONTROL_SECTION_MODULES: Partial<
  Record<string, ModuleOption>
> = {
  "creditor-usage": "Credit Management",
};

export function filterFinanceSectionId(
  sectionId: string,
  modules: readonly ModuleOption[],
): boolean {
  const required = FINANCE_SECTION_MODULES[sectionId];
  if (!required) return true;
  return tenantHasModule(modules, required);
}

export function filterCostControlSectionId(
  sectionId: string,
  modules: readonly ModuleOption[],
): boolean {
  const required = COST_CONTROL_SECTION_MODULES[sectionId];
  if (!required) return true;
  return tenantHasModule(modules, required);
}
export const CAFE_CASHIER_NAV_MODULES: Partial<
  Record<
    | "order"
    | "payment"
    | "payment-type"
    | "cashout"
    | "credit",
    ModuleOption
  >
> = {
  order: "Cafe and Restaurant",
  payment: "Cafe and Restaurant",
  "payment-type": "Cafe and Restaurant",
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
  // Cashier and legacy HotelCashier are one role: café POS and/or corporate credit.
  if (role === "Cashier" || role === "HotelCashier") {
    return (
      tenantHasModule(modules, "Cafe and Restaurant") ||
      tenantHasModule(modules, "Credit Management")
    );
  }
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

export function tenantHasAnyModule(
  modules: readonly ModuleOption[],
  requiredAny: readonly ModuleOption[],
): boolean {
  if (modules.length === 0) return true;
  return requiredAny.some((m) => modules.includes(m));
}

export function filterManagerTabId(
  tabId: string,
  modules: readonly ModuleOption[],
): boolean {
  const required = MANAGER_TAB_MODULES[tabId];
  if (!required) return true;
  return tenantHasModule(modules, required);
}

export function filterManagerServiceTabId(
  tabId: string,
  modules: readonly ModuleOption[],
): boolean {
  const required = MANAGER_SERVICE_TAB_MODULES[tabId];
  if (!required) return true;
  return tenantHasModule(modules, required);
}

export function tenantHasServiceModuleGroup(
  modules: readonly ModuleOption[],
): boolean {
  return (
    tenantHasModule(modules, "Cafe and Restaurant") ||
    tenantHasModule(modules, "Credit Management")
  );
}
