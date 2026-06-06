/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LoginCredentials {
  UserName: string;
  Password: string;
}

export interface cloudinarySuccessResult {
  event: "success";
  info: {
    secure_url: string;
  };
}

export interface User {
  id: number;
  UserName: string;
  Role:
    | "Admin"
    | "Manager"
    | "Cashier"
    | "Barista"
    | "Kitchen"
    | "Store"
    | "CostControl"
    | "Finance";
  /** Tenant id (matches `tinNumber` / Item.Order `HotelName` column). */
  HotelName: string;
  tinNumber?: string | null;
  LogoUrl?: string;
  businessType?: string | null;
}

export interface Order {
  id: number;
  title: string;
  imageUrl: string;
  orderAmount: number;
  category: string;
  type: string;
  HotelName: string;
  price: number;
  tableNo: number;
  waiterName: string;
  status: string | null;
  payment: string;
  withBank?: boolean | null;
  credit?: boolean | null;
  credittorName?: string | null;
  creditAmount?: number | null;
  serviceCaption?: string | null;
  cancelledBy?: string | null;
  orderRevisedAt?: string | null;
  orderRevisionCount?: number | null;
  createdAt: Date;
}

export interface Item {
  id: number;
  name: string;
  price: number;
  HotelName: string;
  category: string;
  type: string;
  imageUrl: string;
  /** When true, kitchen/bar prep summary aggregates quantity for this item. */
  showStationPrepQty?: boolean;
  createdAt: Date;
}

export interface Credential {
  id: number;
  UserName: string;
  Password: string;
  Role:
    | "Kitchen"
    | "Barista"
    | "Cashier"
    | "Admin"
    | "Manager"
    | "Store"
    | "CostControl"
    | "Finance"
    | "HotelCashier";
  HotelName: string;
  LogoUrl?: string;
}

export interface Waiter {
  id: number;
  name: string;
  HotelName: string;
  age: number;
  sex: string;
  experience: number;
  phoneNumber: string;
  tablesServed: number[];
  price: number[];
  payment: string[];
  /** ISO timestamps aligned with payment/price/tablesServed indices */
  incomeAt?: string[];
  createdAt: Date;
}

export interface Table {
  id: number;
  tableNo: number;
  HotelName: string;
  capacity: number;
  orderCaption?: string | null;
  price: number[];
  payment: string[];
  incomeAt?: string[];
  createdAt: Date;
}

export interface CreateItemData {
  name: string;
  price: number;
  category: string;
  type: string;
  imageUrl: string;
}

export interface UpdateItemData extends CreateItemData {
  id: number;
}

export interface CreateCredentialData {
  UserName: string;
  Password: string;
  Role: string;
  HotelName: string;
  LogoUrl?: string;
}

export interface UpdateCredentialData {
  UserName: string;
  Password: string;
  HotelName: string;
  Role: string;
}

export interface UpdateAdminPasswordData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  HotelName: string;
}

export interface CreateWaiterData {
  name: string;
  HotelName: string;
  sex: string;
  age: number;
  experience: number;
  phoneNumber: string;
}

export interface UpdateWaiterData extends CreateWaiterData {
  id: number;
}

export interface CreateTableData {
  tableNo: number;
  HotelName: string;
  capacity: number;
  orderCaption?: string | null;
}

export interface UpdateLiveOrderData {
  id: number;
  tableNo?: number;
  waiterName?: string;
  orderAmount?: number;
  title?: string;
}

export interface UpdateTableData extends CreateTableData {
  id: number;
}

export interface OrderCreationData {
  title: string;
  imageUrl: string;
  tableNo: number;
  waiterName: string;
  orderAmount: number;
  HotelName: string;
  category: string;
  type: string;
  price: number;
  status?: string | null;
  payment?: string;
}

export interface ReportFilter {
  HotelName: string;
  date: Date;
  type: "Daily" | "Monthly";
}

export interface ExcelExportData {
  sheetName: string;
  data: any[];
  headers: string[];
}

export interface ReportData {
  orders: Order[];
  totalSales: number;
  netSales: number;
  totalCashouts: number;
  cashPayments: {
    count: number;
    amount: number;
    percentage: number;
  };
  bankPayments: {
    count: number;
    amount: number;
    percentage: number;
  };
  creditPayments: {
    count: number;
    amount: number;
    percentage: number;
  };
}

export interface Cashout {
  id: number;
  items: any;
  prices: any;
  measuredBy: any;
  requiredAmount: any;
  totalCalc: number;
  HotelName: string;
  createdAt: Date;
}

export interface creditLevel {
  id: number;
  level: string;
  requiredAmount: number;
  timeInterval: number;
  timeFrame: string;
  HotelName: string;
}

export interface CreateCreditLevel {
  level: string;
  requiredAmount: number;
  timeInterval: number;
  timeFrame: string;
  HotelName: string;
}

export interface UpdateCreditLevel extends CreateCreditLevel {
  id: number;
}

export interface pityCash {
  id: number;
  amount: number;
  startDate: Date;
  endDate: Date;
  HotelName: string;
}

export interface CreatePityCash {
  amount: number;
  startDate: Date;
  endDate: Date;
  HotelName: string;
}

export interface UpdatePityCash extends CreatePityCash {
  id: number;
}

export interface CreditRegistration {
  id: number;
  name: string;
  imageUrl: string;
  sex: string;
  creditLevel: string;
  phoneNumber: string;
  amount: number;
  timeInterval: number;
  timeFrame: string;
  paidAmount: number;
  registrationDate: Date;
  HotelName: string;
  registrantType?: string;
  approvalStatus?: string;
  companyTinNumber?: string;
  affiliatedCompany?: string;
  rejectionReason?: string | null;
  adminActorName?: string | null;
  adminAuthorizedAt?: string | null;
}

export interface CreateCreditRegistration {
  name: string;
  imageUrl: string;
  sex: string;
  creditLevel: string;
  phoneNumber: string;
  amount: number;
  timeInterval: number;
  timeFrame: string;
  paidAmount: number;
  registrationDate: Date;
  HotelName: string;
  registrantType?: "COMPANY" | "STAFF";
  companyTinNumber?: string;
  affiliatedCompany?: string;
}

export interface UpdateCreditRegistration extends CreateCreditRegistration {
  id: number;
}

export interface ItemRegistration {
  id: number;
  name: string;
  imageUrl: string;
  category: string;
  amount: number;
  measuredBy: string;
  unitPrice: number;
  registrationDate: Date;
  expireDate: Date;
  supplierName: string;
  supplierPhone: string;
  purchaseWithVat?: boolean;
  supplierTinNumber?: string;
  Address: string;
  paidAmount: number;
  registeredAmount?: number;
  registeredValue?: number;
  statusBy?: string;
  HotelName: string;
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
  purchaseRequestId?: number | null;
  approvalStatus?: string;
  ccProfileId?: number | null;
  ccActorName?: string | null;
  ccCheckedAt?: string | null;
  financeActorName?: string | null;
  financeApprovedAt?: string | null;
  managerActorName?: string | null;
  managerAuthorizedAt?: string | null;
  rejectionReason?: string | null;
  pendingUnitPrice?: number | null;
  unitPriceChangeStatus?: string | null;
  receivedByDepartment?: string | null;
  receivedByLeaderName?: string | null;
  financeDeptLeaderName?: string | null;
  gmDeptLeaderName?: string | null;
}

export interface createItemRegistration {
  name: string;
  imageUrl?: string;
  category: string;
  amount: number;
  measuredBy: string;
  unitPrice: number;
  registrationDate: Date;
  expireDate: Date;
  supplierName: string;
  supplierPhone?: string;
  purchaseWithVat?: boolean;
  supplierTinNumber?: string;
  Address: string;
  paidAmount: number;
  HotelName: string;
  /** When set, reuses this voucher instead of allocating a new one. */
  voucherNumber?: number | null;
}

export interface UpdateItemRegistration extends createItemRegistration {
  id: number;
}

export interface ItemStatus {
  id: number;
  name: string;
  imageUrl: string;
  category: string;
  amount: number;
  measuredBy: string;
  unitPrice: number;
  actionDate: Date;
  supplierName: string;
  supplierPhone: string;
  Address: string;
  purchaseWithVat?: boolean;
  supplierTinNumber?: string;
  paidAmount: number;
  status: string;
  statusBy: string;
  HotelName: string;
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
  stockOutRequestId?: number | null;
}

export interface CreatingItemStatus {
  name: string;
  imageUrl: string;
  category: string;
  amount: number;
  measuredBy: string;
  unitPrice: number;
  actionDate: Date;
  supplierName: string;
  supplierPhone: string;
  Address: string;
  purchaseWithVat?: boolean;
  supplierTinNumber?: string;
  paidAmount: number;
  status: string;
  statusBy: string;
  HotelName: string;
}

export type TenantFeedbackMessageRow = {
  id: number;
  threadId: number;
  senderSide: "tenant" | "apex";
  tenantUserId: number | null;
  tenantUserName: string | null;
  tenantRole: string | null;
  apexMemberId: number | null;
  apexDisplayName: string | null;
  body: string;
  imageUrl: string | null;
  readByTenant: boolean;
  readByApex: boolean;
  createdAt: string;
};

export type TenantFeedbackInbox = {
  threadId: number;
  unreadFromApex: number;
  messages: TenantFeedbackMessageRow[];
};

export interface CostControllerProfileRow {
  id: number;
  displayName: string;
  HotelName: string;
  createdAt: string;
}

export interface KitchenBarBeginningRow {
  id: number;
  HotelName: string;
  station: string;
  itemName: string;
  amount: number;
  measuredBy: string;
  monthPeriod: string;
  calendarDate: string;
  stockOutDay: number;
  managementTakenDay: number;
  closingOnHand: number;
  notes: string;
  createdAt: string;
}

export interface KitchenBarMonthlySnapshotRow {
  id: number;
  HotelName: string;
  station: string;
  itemName: string;
  monthPeriod: string;
  periodFrom: string;
  periodTo: string;
  totalImpliedSales: number;
  lastDayClosingOnHand: number;
  syncedAt: string;
}

export interface HotelCorporateCreditTierRow {
  id: number;
  HotelName: string;
  name: string;
  creditCeiling: number;
  timeInterval: number;
  timeFrame: string;
  sortOrder: number;
  createdAt: string;
}

export interface HotelCreditCompanyRow {
  id: number;
  HotelName: string;
  companyName: string;
  companyTinNumber?: string;
  contactName: string;
  phoneNumber: string;
  email: string;
  payTiming?: string;
  approvalStatus?: string;
  managerActorName?: string | null;
  managerAuthorizedAt?: string | null;
  rejectionReason?: string | null;
  creditLevel: string;
  creditLimit: number;
  timeInterval: number;
  timeFrame: string;
  hotelCorporateCreditTierId?: number | null;
  allowedMenuJson: string;
  dealNotes: string;
  imageUrl: string;
  paidAmount?: number;
  createdAt: string;
}

export interface HotelCreditPartyRow {
  id: number;
  HotelName: string;
  companyId: number;
  displayName: string;
  phoneNumber: string;
  sex: string;
  notes: string;
  createdAt: string;
}

export interface HotelCreditConsumptionRow {
  id: number;
  HotelName: string;
  companyId: number;
  partyId: number;
  linesJson: string;
  totalAmount: number;
  occurredAt: string;
  recordedBy: string;
}


export type HotelMutationToastOptions = {
  /** When true, skip success toasts (used by batch / sequential fallbacks). */
  suppressSuccessToast?: boolean;
  /** When the server omits `ccActorName`, stamp the selected cost controller display name (client). */
  fallbackCcDisplayName?: string;
  /** When the server omits `financeActorName`, stamp the rejecting finance user (client). */
  fallbackFinanceActorName?: string;
};
