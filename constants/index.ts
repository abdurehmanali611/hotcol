/** Ethiopian TIN length (federal taxpayer identifier). */
export const ETHIOPIAN_TIN_LENGTH = 10;

/** When no TIN is supplied, the server assigns a random numeric tenant id in this range (digits). */
export const AUTO_TENANT_KEY_LENGTH_MIN = 11;
export const AUTO_TENANT_KEY_LENGTH_MAX = 12;

export const BUSINESS_TYPES = [
  "Cafe and Restaurant",
  "Hotel",
  "Resort",
  "Pension",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

/** Shown on signup but not selectable until product is ready. */
export const SIGNUP_COMING_SOON_BUSINESS_TYPES = [
  "Resort",
  "Pension",
] as const satisfies readonly BusinessType[];

export const LODGING_BUSINESS_TYPES = ["Hotel", "Resort", "Pension"] as const;

export type LodgingBusinessType = (typeof LODGING_BUSINESS_TYPES)[number];

export function isLodgingBusinessType(
  type: BusinessType,
): type is LodgingBusinessType {
  return (LODGING_BUSINESS_TYPES as readonly string[]).includes(type);
}

/** Module keys selectable at signup (aligned with backend / validations). */
export const MODULE_OPTIONS = [
  "Cafe and Restaurant",
  "Credentials(Common)",
  "Inventory",
  "Credit Management",
  "Financial Management",
  "HR Module",
  "Room Management",
  "Cleaning and Maintenance",
] as const;

export type ModuleOption = (typeof MODULE_OPTIONS)[number];

/** Every registration must enable shared credential management. */
export const SIGNUP_REQUIRED_MODULE_COMMON = "Credentials(Common)" as const;

/** Cafe-type businesses must enable the cafe/restaurant module. */
export const SIGNUP_REQUIRED_MODULES_CAFE = [
  SIGNUP_REQUIRED_MODULE_COMMON,
  "Cafe and Restaurant",
] as const satisfies readonly ModuleOption[];

/** Hotel, resort, and pension — credentials always; room modules optional. */
export const SIGNUP_REQUIRED_MODULES_LODGING = [
  SIGNUP_REQUIRED_MODULE_COMMON,
] as const satisfies readonly ModuleOption[];

/** Admin dashboard sidebar: `icon` is keyed in the Admin page for Lucide icons. */
export const ADMIN_SIDEBAR_ITEMS = [
  { id: "reports", label: "Reports", icon: "FileText" },
  { id: "create-item", label: "Add Item", icon: "PlusCircle" },
  { id: "update-item", label: "Update/Delete Item", icon: "Edit" },
  { id: "station-prep-qty", label: "Prep totals", icon: "ClipboardList" },
  { id: "waiter-table", label: "Waiters & Tables", icon: "Users" },
  { id: "grant-credential", label: "Grant Credential", icon: "Key" },
  { id: "delete-credential", label: "Delete credential", icon: "UserMinus" },
  { id: "inventory", label: "Inventory", icon: "Store" },
  { id: "item-receipts", label: "Item receipts", icon: "Receipt" },
  { id: "credit-registrations", label: "Corporate credit", icon: "Building2" },
  { id: "hr-overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "hr-employees", label: "Employees", icon: "Users" },
  { id: "hr-leave", label: "Leave types", icon: "CalendarDays" },
  { id: "hr-attendance", label: "Attendance", icon: "ClipboardList" },
  { id: "hr-payroll", label: "Payroll", icon: "Wallet" },
  { id: "hr-incidents", label: "Incidents", icon: "AlertTriangle" },
] as const;

/** Café cashier terminal — sidebar section keys. */
export const CAFE_CASHIER_NAV_ITEMS = [
  {
    id: "order",
    label: "Orders",
    icon: "ShoppingCart",
    description: "Take orders and manage tables.",
  },
  {
    id: "payment",
    label: "Payment",
    icon: "Wallet",
    description: "Collect cash or bank payments for open orders.",
  },
  {
    id: "payment-type",
    label: "Payment type",
    icon: "ArrowLeftRight",
    description:
      "Correct cash or bank on orders already paid today. Select lines and apply the right channel.",
  },
  {
    id: "cashout",
    label: "Cashout",
    icon: "Receipt",
    description:
      "Record petty-cash purchases from the till and review today's entries.",
  },
  {
    id: "credit",
    label: "Corporate credit",
    icon: "Building2",
    description:
      "Register company deals and view usage reports. Staff are recorded at payment. Agreements are printed in Admin → Corporate credit.",
  },
] as const;

export type CafeCashierNavId = (typeof CAFE_CASHIER_NAV_ITEMS)[number]["id"];

export type AdminSidebarItemId = (typeof ADMIN_SIDEBAR_ITEMS)[number]["id"];

/**
 * Manager café / restaurant + credit sidebar — cafe Admin service tools only.
 * Inventory / item receipts stay under the lodging Inventory group (hotel flow differs from café).
 */
export const MANAGER_SERVICE_SIDEBAR_ITEMS = [
  { id: "reports", label: "Reports", icon: "FileText" },
  { id: "create-item", label: "Add Item", icon: "PlusCircle" },
  { id: "update-item", label: "Update/Delete Item", icon: "Edit" },
  { id: "station-prep-qty", label: "Prep totals", icon: "ClipboardList" },
  { id: "waiter-table", label: "Waiters & Tables", icon: "Users" },
  { id: "credit-registrations", label: "Corporate credit", icon: "Building2" },
] as const;

/** @deprecated Legacy service tab ids — still accepted when restoring saved tabs. */
export const MANAGER_SERVICE_LEGACY_TAB_IDS = [
  "cafe-reports",
  "menu-create-item",
  "menu-update-item",
  "cafe-item-receipts",
] as const;

export type ManagerServiceSidebarItemId =
  (typeof MANAGER_SERVICE_SIDEBAR_ITEMS)[number]["id"];

/** Manager (hotel) dashboard — lodging inventory & credential operations. */
export const MANAGER_SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "cc-profiles", label: "Cost control IDs", icon: "UserCheck" },
  { id: "department-leaders", label: "Department leaders", icon: "Users" },
  { id: "reports-inventory", label: "Inventory items (list)", icon: "Package" },
  { id: "reports-movements", label: "Stock movements", icon: "ArrowRightLeft" },
  { id: "reports-purchases", label: "Purchase pipeline", icon: "ShoppingCart" },
  { id: "authorize-item-registrations", label: "Authorize registrations", icon: "Package" },
  { id: "authorize-purchases", label: "Authorize purchases", icon: "ShoppingCart" },
  { id: "authorize-stock", label: "Authorize stock", icon: "ArrowRightLeft" },
  { id: "item-receipts", label: "Item receipts", icon: "Receipt" },
  { id: "reports-beginnings", label: "Station daily counts", icon: "ClipboardList" },
  { id: "hr-overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "hr-employees", label: "Employees", icon: "Users" },
  { id: "hr-leave", label: "Leave types", icon: "CalendarDays" },
  { id: "hr-attendance", label: "Attendance", icon: "ClipboardList" },
  { id: "hr-payroll", label: "Payroll", icon: "Wallet" },
  { id: "hr-incidents", label: "Incidents", icon: "AlertTriangle" },
  {
    id: "inventory-payment-vat",
    label: "Inventory payment & tax",
    icon: "Receipt",
  },
  { id: "lodging-reports", label: "Reports", icon: "FileText" },
  { id: "lodging-rooms", label: "Rooms", icon: "Building2" },
  { id: "lodging-guest-call", label: "Guest call", icon: "Phone" },
  { id: "grant-credential", label: "Grant credential", icon: "Key" },
  { id: "delete-credential", label: "Delete credential", icon: "UserMinus" },
] as const;

/** Nested under Manager Rooms → Laundry (F&B lives under Cafe and Restaurant). */
export const MANAGER_LODGING_NESTED_TAB_IDS = [
  "lodging-laundry-add",
  "lodging-laundry-items",
] as const;

export type ManagerSidebarItemId =
  (typeof MANAGER_SIDEBAR_ITEMS)[number]["id"];

export const MANAGER_HR_TAB_IDS = [
  "hr-overview",
  "hr-employees",
  "hr-leave",
  "hr-attendance",
  "hr-payroll",
  "hr-incidents",
] as const;

export type ManagerHrTabId = (typeof MANAGER_HR_TAB_IDS)[number];

/** Hotel cashier terminal — sidebar keys match Lucide icon names used in the page. */
export const HOTEL_CASHIER_NAV_ITEMS = [
  {
    id: "companies",
    label: "Company deals",
    icon: "Building2",
    description:
      "Corporate accounts, credit tiers, allowed dishes and drinks, and the deal sheet.",
  },
  {
    id: "usage",
    label: "Record usage",
    icon: "Receipt",
    description:
      "Bill meals to a company guest: lines, quantities, and date/time.",
  },
  {
    id: "report",
    label: "Usage report",
    icon: "Table2",
    description: "Summarize posted corporate consumption over a date range.",
  },
] as const;

export type HotelCashierNavId =
  (typeof HOTEL_CASHIER_NAV_ITEMS)[number]["id"];

/** Reception terminal — room check-in, stays, services, CM portal. */
export const RECEPTION_NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    description: "Room occupancy snapshot and recent activity.",
  },
  {
    id: "check-in",
    label: "Check-in",
    icon: "UserPlus",
    description: "Register guests and assign vacant clean rooms.",
  },
  {
    id: "active-stays",
    label: "Active stays",
    icon: "BedDouble",
    description: "View bills, add charges, split/transfer, and checkout.",
  },
  {
    id: "cm-portal",
    label: "CM portal",
    icon: "Sparkles",
    description: "Dirty and maintenance queue — assign and mark clean.",
  },
  {
    id: "reports",
    label: "Reports",
    icon: "FileText",
    description: "Daily and monthly stay summaries for print.",
  },
  {
    id: "history",
    label: "History",
    icon: "History",
    description: "Lodging action audit trail.",
  },
] as const;

export type ReceptionNavId = (typeof RECEPTION_NAV_ITEMS)[number]["id"];

/** CM Leader terminal — cleaning & maintenance queue. */
export const CM_LEADER_NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    description: "Room status and open assignment counts.",
  },
  {
    id: "queue",
    label: "Dirty & maintenance",
    icon: "Sparkles",
    description: "Act on vacant dirty and on-maintenance rooms.",
  },
  {
    id: "assignments",
    label: "Assignments",
    icon: "ClipboardList",
    description: "Open and completed CM assignments.",
  },
  {
    id: "history",
    label: "History",
    icon: "History",
    description: "CM action audit trail.",
  },
] as const;

export type CmLeaderNavId = (typeof CM_LEADER_NAV_ITEMS)[number]["id"];

/** Legacy name — prefer `BUSINESS_TYPES`. */
export const businessTypes = [...BUSINESS_TYPES] as BusinessType[];

/** Legacy name — prefer `MODULE_OPTIONS`. */
export const modules = [...MODULE_OPTIONS] as ModuleOption[];
