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

/** Hotel, resort, and pension must enable room operations. */
export const SIGNUP_REQUIRED_MODULES_LODGING = [
  SIGNUP_REQUIRED_MODULE_COMMON,
  "Room Management",
] as const satisfies readonly ModuleOption[];

/** Admin dashboard sidebar: `icon` is keyed in the Admin page for Lucide icons. */
export const ADMIN_SIDEBAR_ITEMS = [
  { id: "reports", label: "Reports", icon: "FileText" },
  { id: "create-item", label: "Add Item", icon: "PlusCircle" },
  { id: "update-item", label: "Update/Delete Item", icon: "Edit" },
  { id: "waiter-table", label: "Waiters & Tables", icon: "Users" },
  { id: "grant-credential", label: "Grant Credential", icon: "Key" },
  { id: "update-credential", label: "Update Credential", icon: "RefreshCw" },
  { id: "inventory", label: "Inventory", icon: "Store" },
  { id: "item-receipts", label: "Item receipts", icon: "Receipt" },
  { id: "credit-registrations", label: "Corporate credit", icon: "Building2" },
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

/** Manager (hotel) dashboard — stock & credential operations; expand later. */
export const MANAGER_SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "menu-create-item", label: "Add menu item", icon: "PlusCircle" },
  { id: "menu-update-item", label: "Menu items", icon: "Edit" },
  { id: "cc-profiles", label: "Cost control IDs", icon: "UserCheck" },
  { id: "reports-inventory", label: "Inventory items (list)", icon: "Package" },
  { id: "reports-movements", label: "Stock movements", icon: "ArrowRightLeft" },
  { id: "reports-purchases", label: "Purchase pipeline", icon: "ShoppingCart" },
  { id: "authorize-item-registrations", label: "Authorize registrations", icon: "Package" },
  { id: "authorize-purchases", label: "Authorize purchases", icon: "ShoppingCart" },
  { id: "authorize-stock", label: "Authorize stock", icon: "ArrowRightLeft" },
  { id: "authorize-companies", label: "Corporate companies", icon: "Building2" },
  { id: "item-receipts", label: "Item receipts", icon: "Receipt" },
  { id: "reports-beginnings", label: "Station daily counts", icon: "ClipboardList" },
  {
    id: "inventory-payment-vat",
    label: "Inventory payment & tax",
    icon: "Receipt",
  },
  {
    id: "creditor-usage-report",
    label: "Creditor staff usage report",
    icon: "Table2",
  },
  {
    id: "corporate-credit-tiers",
    label: "Corporate credit tiers",
    icon: "BadgePercent",
  },
  { id: "grant-credential", label: "Grant credential", icon: "Key" },
  { id: "update-credential", label: "Update credential", icon: "RefreshCw" },
] as const;

export type ManagerSidebarItemId =
  (typeof MANAGER_SIDEBAR_ITEMS)[number]["id"];

/** Hotel cashier terminal — sidebar keys match Lucide icon names used in the page. */
export const HOTEL_CASHIER_NAV_ITEMS = [
  {
    id: "companies",
    label: "Company deals",
    icon: "Building2",
    description:
      "Corporate accounts, credit tiers, allowed dishes & drinks, deal sheet.",
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

/** Legacy name — prefer `BUSINESS_TYPES`. */
export const businessTypes = [...BUSINESS_TYPES] as BusinessType[];

/** Legacy name — prefer `MODULE_OPTIONS`. */
export const modules = [...MODULE_OPTIONS] as ModuleOption[];
