/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import {
  graphqlErrorsIndicateSessionExpiry,
  isSessionExpiredError,
  scheduleSessionExpiredRedirect,
  SessionExpiredError,
} from "./sessionExpiry";
import { findRowByTenantScope, resolveCanonicalTenantKey, rowHotelMatchesTenantScope } from "./tenantRowMatch";
import { computeInventoryPaidAmountETB } from "./hotelInventoryPayment";
import { validateCreditUsageAmount } from "./creditLimits";
import {
  invalidateGraphqlListCache,
  readListCache,
  writeListCache,
} from "./graphqlListCache";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { persistTenantSubscription, readTenantSubscriptionFromStorage } from "./tenantModules";
import {
  persistTenantAccessMode,
  type TenantPaymentKind,
} from "./tenantAccessMode";
import {
  parseModulesJson,
  roleAllowedForModules,
} from "./subscriptionModules";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { UseFormReturn } from "react-hook-form";

export interface LoginCredentials {
  UserName: string;
  Password: string;
}

interface cloudinarySuccessResult {
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

interface ReportData {
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
}

export interface createItemRegistration {
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
  HotelName: string;
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

/** Ensures POSTs hit the GraphQL HTTP endpoint (avoids 404/400 when env omits `/graphql`). */
function normalizeGraphqlHttpUrl(raw: string | undefined): string {
  const fallback = "https://hotcol-backend.vercel.app/graphql";
  const s = (raw ?? fallback).trim() || fallback;
  const base = s.replace(/\/+$/, "");
  if (/\/graphql$/i.test(base)) return base;
  return `${base}/graphql`;
}

const API_URL = normalizeGraphqlHttpUrl(process.env.NEXT_PUBLIC_GRAPHQL_URL);

function resolveGraphqlTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_GRAPHQL_TIMEOUT_MS;
  const n = raw ? Number.parseInt(String(raw).trim(), 10) : NaN;
  if (Number.isFinite(n) && n >= 10_000 && n <= 300_000) return n;
  return 60_000;
}

/** Default 60s; slow links: set `NEXT_PUBLIC_GRAPHQL_TIMEOUT_MS` (10000–300000). */
const GRAPHQL_TIMEOUT_MS = resolveGraphqlTimeoutMs();

/** Set `NEXT_PUBLIC_DEBUG_SLOW_GRAPHQL_MS` (e.g. 400) to log `[hotcol][graphql] <key> <ms>ms` in the browser console. */
const GRAPHQL_SLOW_FETCH_LOG_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_DEBUG_SLOW_GRAPHQL_MS;
  const n = raw ? Number.parseInt(String(raw).trim(), 10) : NaN;
  if (Number.isFinite(n) && n >= 0) return n;
  return -1;
})();

const api = axios.create({
  timeout: GRAPHQL_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    const errs = response.data?.errors as Array<{ message?: string }> | undefined;
    if (graphqlErrorsIndicateSessionExpiry(errs)) {
      scheduleSessionExpiredRedirect();
      return Promise.reject(new SessionExpiredError());
    }
    return response;
  },
  (error) => {
    if (isSessionExpiredError(error)) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && typeof window !== "undefined") {
      scheduleSessionExpiredRedirect();
      return Promise.reject(new SessionExpiredError());
    }
    return Promise.reject(error);
  },
);

const hotelListReadInflight = new Map<string, Promise<unknown>>();

/** When several surfaces request the same list read at once, share one HTTP round-trip. */
function dedupeHotelListRead<T>(key: string, run: () => Promise<T>): Promise<T> {
  const cached = readListCache<T>(key);
  if (cached != null) return Promise.resolve(cached);

  const existing = hotelListReadInflight.get(key);
  if (existing) return existing as Promise<T>;
  const startedAt =
    GRAPHQL_SLOW_FETCH_LOG_MS >= 0 && typeof performance !== "undefined"
      ? performance.now()
      : null;
  const p = (async () => {
    try {
      const result = await run();
      writeListCache(key, result);
      return result;
    } finally {
      hotelListReadInflight.delete(key);
      if (
        startedAt != null &&
        GRAPHQL_SLOW_FETCH_LOG_MS >= 0 &&
        typeof performance !== "undefined"
      ) {
        const ms = Math.round(performance.now() - startedAt);
        if (ms >= GRAPHQL_SLOW_FETCH_LOG_MS) {
          console.info(`[hotcol][graphql] ${key} ${ms}ms`);
        }
      }
    }
  })();
  hotelListReadInflight.set(key, p);
  return p;
}

export { invalidateGraphqlListCache };

/** UI catch helper: session expiry is already toasted + redirecting; surface timeouts/network clearly. */
export function notifyApiFailure(error: unknown, fallback = "Request failed"): void {
  if (typeof window === "undefined") return;
  if (isSessionExpiredError(error)) return;
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      toast.error(
        `Request timed out (>${GRAPHQL_TIMEOUT_MS / 1000}s). If your connection is slow, wait and try again.`,
      );
      return;
    }
    if (!error.response && error.message === "Network Error") {
      toast.error(
        "Network error — check your internet connection or try another network.",
      );
      return;
    }
  }
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;
  if (msg === "SESSION_EXPIRED") return;
  toast.error(msg?.trim() ? msg : fallback);
}

export async function handleCredential(
  values: any,
  setIsLoading: (loading: boolean) => void,
) {
  try {
    setIsLoading(true);

    const tinRaw =
      typeof values.tinNumber === "string" ? values.tinNumber.trim() : "";

    const graphqlQuery = {
      query: `
        mutation CreateAdmin(
          $UserName: String!
          $Password: String!
          $Role: String!
          $HotelName: String!
          $LogoUrl: String!
          $tinNumber: String
          $businessType: String
          $modules: String
          $setupFeeETB: Int
          $quarterlyFeeETB: Int
          $paymentChannel: String
          $paymentTransactionRef: String
        ) {
          CreateAdmin(
            UserName: $UserName
            Password: $Password
            Role: $Role
            HotelName: $HotelName
            LogoUrl: $LogoUrl
            tinNumber: $tinNumber
            businessType: $businessType
            modules: $modules
            setupFeeETB: $setupFeeETB
            quarterlyFeeETB: $quarterlyFeeETB
            paymentChannel: $paymentChannel
            paymentTransactionRef: $paymentTransactionRef
          ) {
            id
            HotelName
            tinNumber
            UserName
            LogoUrl
            Role
            setupFeeETB
            quarterlyFeeETB
            paymentChannel
            paymentTransactionRef
          }
        }
      `,
      variables: {
        UserName: values.UserName,
        Password: values.Password,
        Role:
          values.type === "Hotel" ||
          values.type === "Resort" ||
          values.type === "Pension"
            ? "Manager"
            : "Admin",
        HotelName: values.HotelName,
        LogoUrl: values.LogoUrl,
        tinNumber: tinRaw,
        businessType: values.type ?? "",
        modules: JSON.stringify(
          Array.isArray(values.modules) ? values.modules : [],
        ),
        setupFeeETB: Number(values.setupFeeETB) || 0,
        quarterlyFeeETB: Number(values.quarterlyFeeETB) || 0,
        paymentChannel: values.paymentChannel ?? null,
        paymentTransactionRef: values.paymentTransactionRef ?? null,
      },
    };

    const response = await api.post(API_URL, graphqlQuery, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = response.data;

    if (data.errors) {
      throw new Error(
        data.errors[0]?.message || "Failed to create admin account",
      );
    }

    setIsLoading(false);
    return data.data.CreateAdmin;
  } catch (error: unknown) {
    setIsLoading(false);
    let errorMessage = "An unknown error occurred.";

    if (axios.isAxiosError(error)) {
      if (error.response) {
        if (error.response.data?.errors) {
          errorMessage =
            error.response.data.errors[0]?.message ||
            "Failed to process request";
        } else {
          errorMessage =
            error.response.data?.message || `Request failed. Please try again.`;
        }
      } else if (error.request) {
        errorMessage =
          "Unable to connect to server. Please check your connection and try again.";
      } else {
        errorMessage = error.message || "An unexpected error occurred";
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
}

export async function LoginAction(
  credentials: LoginCredentials,
  setLoading: (value: boolean) => void,
  setError: (value: string | null) => void,
  router: AppRouterInstance,
) {
  setLoading(true);
  setError(null);

  try {
    const LOGIN_MUTATION = `
      mutation Login($UserName: String!, $Password: String!) {
        Login(UserName: $UserName, Password: $Password) {
          token
          accessMode
          paymentKind
          user {
            id
            UserName
            Role
            HotelName
            tinNumber
            LogoUrl
            businessType
            modules
            setupFeeETB
            quarterlyFeeETB
            setupFeeApproved
            isIllustrationTenant
            billingHold
            billingStartedAt
            freeTrialEndsAt
            createdAt
            subscriptionPaidUntil
            subscriptionPaymentApproved
            paidQuartersCount
          }
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: LOGIN_MUTATION,
      variables: credentials,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0]?.message || "Login failed");
    }

    const { token, user, accessMode, paymentKind } = response.data.data.Login;
    const modules = parseModulesJson(user.modules);

    if (!roleAllowedForModules(user.Role, modules)) {
      throw new Error(
        "Your account role is not included in this property's subscribed modules. Contact your administrator.",
      );
    }

    if (typeof window !== "undefined") {
      const tin =
        user.tinNumber != null && String(user.tinNumber).trim() !== ""
          ? String(user.tinNumber).trim()
          : "";
      const tenantId = tin || user.HotelName;
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_role", user.Role);
      localStorage.setItem("hotel_name", tenantId);
      localStorage.setItem("tin_number", tin || tenantId);
      localStorage.setItem("hotel_display_name", user.HotelName);
      localStorage.setItem("logo_url", user.LogoUrl || "");
      localStorage.setItem("user_name", user.UserName);
      localStorage.setItem(
        "business_type",
        user.businessType != null && String(user.businessType).trim() !== ""
          ? String(user.businessType).trim()
          : "",
      );
      persistTenantSubscription({
        modules,
        setupFeeETB: Number(user.setupFeeETB) || 0,
        quarterlyFeeETB: Number(user.quarterlyFeeETB) || 0,
        setupFeeApproved: Boolean(user.setupFeeApproved),
        isIllustrationTenant: Boolean(user.isIllustrationTenant),
        billingHold: Boolean(user.billingHold),
        billingStartedAt: user.billingStartedAt ?? null,
        freeTrialEndsAt: user.freeTrialEndsAt ?? null,
        createdAt: user.createdAt ?? null,
        subscriptionPaidUntil: user.subscriptionPaidUntil ?? null,
        subscriptionPaymentApproved: Boolean(user.subscriptionPaymentApproved),
        paidQuartersCount: Number(user.paidQuartersCount) || 0,
      });

      if (accessMode === "payment_portal") {
        persistTenantAccessMode(
          "payment_portal",
          (paymentKind === "setup" ? "setup" : "quarterly") as TenantPaymentKind,
        );
      } else {
        persistTenantAccessMode("full", null);
      }
    }

    if (accessMode === "payment_portal") {
      toast.message(
        "Complete payment verification to unlock your property dashboard.",
      );
      router.push("/PaymentVerification");
      return;
    }

    toast.success(`Welcome back, ${user.UserName}!`);

    const queryParams = new URLSearchParams({
      hotel: user.HotelName || "",
      logo: user.LogoUrl || "",
      role: user.Role,
    });

    const bt =
      user.businessType != null && String(user.businessType).trim() !== ""
        ? String(user.businessType).trim()
        : "";
    const lodgingStore =
      bt === "Hotel" || bt === "Resort" || bt === "Pension";

    switch (user.Role) {
      case "Admin":
        router.push(`/Admin?${queryParams}`);
        break;
      case "Manager":
        router.push(`/Manager?${queryParams}`);
        break;
      case "CostControl":
        router.push(`/CostControl?${queryParams}`);
        break;
      case "Finance":
        router.push(`/Finance?${queryParams}`);
        break;
      case "Cashier":
        router.push(`/Cashier?${queryParams}`);
        break;
      case "Barista":
        router.push(`/Bar?${queryParams}`);
        break;
      case "Kitchen":
        router.push(`/Chef?${queryParams}`);
        break;
      case "Store":
        router.push(
          lodgingStore ? `/HotelStore?${queryParams}` : `/Store?${queryParams}`,
        );
        break;
      case "HotelCashier":
        if (!lodgingStore) {
          toast.error("Hotel cashier is only for hotel / resort / pension accounts.");
          break;
        }
        router.push(`/HotelCashier?${queryParams}`);
        break;
      default:
        toast.error("No Role Found");
    }
  } catch (error: any) {
    let errorMessage =
      "Unable to sign in. Please check your credentials and try again.";

    const fromGraphqlBody = (() => {
      if (!axios.isAxiosError(error)) return null;
      const data = error.response?.data as
        | { errors?: Array<{ message?: string }> }
        | undefined;
      const msg = data?.errors?.[0]?.message;
      return typeof msg === "string" && msg.trim() ? msg.trim() : null;
    })();

    if (fromGraphqlBody) {
      errorMessage = fromGraphqlBody;
    } else if (
      error.message?.includes("Connection Timeout") ||
      error.message?.includes("Network Error")
    ) {
      errorMessage =
        "Connection timeout. Please check your internet connection and try again.";
    } else if (error.message?.includes("User.Password")) {
      errorMessage = "The password you entered is incorrect. Please try again.";
    } else if (error.message?.includes("Invalid credentials")) {
      errorMessage = "The username or password you entered is incorrect.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    setError(errorMessage);
    toast.error(errorMessage);
    setTimeout(() => {
      setError(null);
    }, 3000);
  } finally {
    setLoading(false);
  }
}

export function logoutAction() {
  if (typeof window !== "undefined") {
    localStorage.clear();
    window.location.href = "/";
  }
}

export async function submitTenantPaymentAction(input: {
  paymentKind: "setup" | "quarterly";
  paymentChannel: string;
  transactionRef: string;
}): Promise<void> {
  const MUTATION = `
    mutation SubmitTenantPayment(
      $paymentKind: String!
      $paymentChannel: String!
      $transactionRef: String!
    ) {
      SubmitTenantPayment(
        paymentKind: $paymentKind
        paymentChannel: $paymentChannel
        transactionRef: $transactionRef
      ) {
        id
        status
      }
    }
  `;

  const response = await api.post(API_URL, {
    query: MUTATION,
    variables: input,
  });

  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0]?.message || "Submission failed");
  }

  if (typeof window !== "undefined") {
    const sub = readTenantSubscriptionFromStorage();
    persistTenantSubscription({
      ...sub,
      subscriptionPaymentApproved:
        input.paymentKind === "setup" ? sub.subscriptionPaymentApproved : false,
    });
  }
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

export async function fetchTenantFeedbackInbox(
  limit = 80,
): Promise<TenantFeedbackInbox> {
  const QUERY = `
    query TenantFeedbackInbox($limit: Int) {
      tenantFeedbackInbox(limit: $limit) {
        threadId
        unreadFromApex
        messages {
          id
          threadId
          senderSide
          tenantUserId
          tenantUserName
          tenantRole
          apexMemberId
          apexDisplayName
          body
          imageUrl
          readByTenant
          readByApex
          createdAt
        }
      }
    }
  `;

  const response = await api.post(API_URL, {
    query: QUERY,
    variables: { limit },
  });

  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0]?.message || "Could not load feedback");
  }

  return response.data.data.tenantFeedbackInbox;
}

export async function sendTenantFeedbackMessage(
  body: string,
  imageUrl?: string | null,
): Promise<void> {
  const MUTATION = `
    mutation SendTenantFeedbackMessage($body: String, $imageUrl: String) {
      sendTenantFeedbackMessage(body: $body, imageUrl: $imageUrl) {
        id
      }
    }
  `;

  const response = await api.post(API_URL, {
    query: MUTATION,
    variables: {
      body: body.trim() || null,
      imageUrl: imageUrl?.trim() || null,
    },
  });

  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0]?.message || "Could not send message");
  }
}

export async function markTenantFeedbackRead(): Promise<void> {
  const MUTATION = `
    mutation MarkTenantFeedbackRead {
      markTenantFeedbackRead
    }
  `;

  const response = await api.post(API_URL, { query: MUTATION });

  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0]?.message || "Could not mark read");
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;

  const role = localStorage.getItem("user_role");
  const hotelName = localStorage.getItem("hotel_name");
  const logoUrl = localStorage.getItem("logo_url");
  const userName = localStorage.getItem("user_name");

  if (!role || !hotelName) return null;

  const tin = localStorage.getItem("tin_number");
  const businessType = localStorage.getItem("business_type");

  return {
    id: 0,
    UserName: userName || "",
    Role: role as User["Role"],
    HotelName: hotelName,
    tinNumber: tin || hotelName,
    LogoUrl: logoUrl || "",
    businessType: businessType || null,
  };
}

export async function fetchItems(): Promise<Item[]> {
  try {
    return await dedupeHotelListRead("catalog:items", async () => {
      const query = `
      query {
        items {
          id
          name
          price
          HotelName
          category
          type
          imageUrl
          createdAt
        }
      }
    `;

      const response = await api.post(API_URL, { query });

      if (response.data.errors) {
        throw new Error(
          response.data.errors[0]?.message || "Failed to fetch items",
        );
      }

      return response.data.data.items || [];
    });
  } catch (error: any) {
    toast.error("Unable to load menu items. Please refresh the page.");
    throw error;
  }
}

export async function createItem(itemData: CreateItemData) {
  try {
    const mutation = `
      mutation CreateItem($name: String!, $price: Float!, $category: String!, $imageUrl: String!, $type: String!) {
        CreateItem(name: $name, price: $price, category: $category, imageUrl: $imageUrl, type: $type) {
          id
          name
          price
          category
          type
          HotelName
          imageUrl
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: itemData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to create item",
      );
    }

    toast.success("Item created successfully");
    invalidateGraphqlListCache("catalog:items");
    return response.data.data.CreateItem;
  } catch (error: any) {
    toast.error(
      "Unable to create item. Please check all fields and try again.",
    );
    throw error;
  }
}

export async function updateItem(itemData: UpdateItemData) {
  try {
    const mutation = `
      mutation UpdateItem($id: Int!, $name: String!, $price: Float!, $category: String!, $imageUrl: String!, $type: String!) {
        UpdateItem(id: $id, name: $name, price: $price, category: $category, imageUrl: $imageUrl, type: $type) {
          id
          name
          price
          HotelName
          type
          category
          imageUrl
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: itemData,
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update item",
      );
    }

    return response.data;
  } catch (error: any) {
    toast.error("Unable to update item. Please try again.");
    throw error;
  }
}

export async function deleteItem(id: number) {
  try {
    const mutation = `
      mutation DeleteItem($id: Int!) {
        DeleteItem(id: $id) {
          id
          name
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to delete item",
      );
    }

    toast.success("Item deleted successfully");
    invalidateGraphqlListCache("catalog:items");
    return response.data.data.DeleteItem;
  } catch (error: any) {
    toast.error("Unable to delete item. Please try again.");
    throw error;
  }
}

export async function fetchCredentials(): Promise<Credential[]> {
  try {
    return await dedupeHotelListRead("auth:users", async () => {
      const query = `
      query {
        users {
          id
          UserName
          Password
          Role
          HotelName
          LogoUrl
        }
      }
    `;

      const response = await api.post(API_URL, { query });

      if (response.data.errors) {
        throw new Error(
          response.data.errors[0]?.message || "Failed to fetch credentials",
        );
      }

      return response.data.data.users || [];
    });
  } catch (error: any) {
    toast.error("Unable to load user credentials.");
    throw error;
  }
}

export async function createCredential(credentialData: CreateCredentialData) {
  try {
    const mutation = `
      mutation CreateCredential($UserName: String!, $Password: String!, $Role: String!, $HotelName: String!, $LogoUrl: String) {
        CreateCredential(UserName: $UserName, Password: $Password, Role: $Role, HotelName: $HotelName, LogoUrl: $LogoUrl) {
          id
          UserName
          HotelName
          tinNumber
          Password
          Role
          LogoUrl
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: credentialData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to create credential",
      );
    }

    toast.success("Credential granted successfully");
    return response.data.data.CreateCredential;
  } catch (error: any) {
    toast.error(
      "Unable to create user credential. Please check all fields and try again.",
    );
    throw error;
  }
}

export async function updateCredential(credentialData: UpdateCredentialData) {
  try {
    const mutation = `
      mutation UpdateCredential($UserName: String!, $Password: String!, $Role: String!) {
        UpdateCredential(UserName: $UserName, Password: $Password, Role: $Role) {
          id
          UserName
          Password
          HotelName
          Role
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: credentialData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update credential",
      );
    }

    toast.success("Credential updated successfully");
    return response.data.data.UpdateCredential;
  } catch (error: any) {
    toast.error("Unable to update credential. Please try again.");
    throw error;
  }
}

export async function deleteCredential(userName: string) {
  try {
    const mutation = `
      mutation DeleteCredential($UserName: String!) {
        DeleteCredential(UserName: $UserName)
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { UserName: userName },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to delete credential",
      );
    }

    toast.success("Staff account removed");
    return response.data.data.DeleteCredential;
  } catch (error: any) {
    toast.error(
      error?.message || "Unable to delete credential. Please try again.",
    );
    throw error;
  }
}

export async function updateAdminPassword(
  passwordData: UpdateAdminPasswordData,
): Promise<boolean> {
  try {
    const isValid = await verifyAdminPassword(
      passwordData.HotelName,
      passwordData.oldPassword,
    );
    if (!isValid) {
      toast.error("Old password is incorrect");
      return false;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return false;
    }

    const mutation = `
      mutation UpdateAdminCredential($Password: String!) {
        UpdateAdminCredential(Password: $Password) {
          id
          HotelName
          Password
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: {
        Password: passwordData.newPassword,
        HotelName: passwordData.HotelName,
      },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update admin password",
      );
    }

    toast.success("Admin password updated successfully");
    return true;
  } catch (error: any) {
    toast.error(
      `Unable to update password. Please verify your current password and try again. ${error.message}`,
    );
    console.error(error);
    return false;
  }
}

export async function verifyAdminPassword(
  HotelName: string,
  passwordInput: string,
): Promise<boolean> {
  try {
    const mutation = `
      mutation VerifyAdminPassword($HotelName: String!, $passwordInput: String!) {
        verifyAdminPassword(HotelName: $HotelName, passwordInput: $passwordInput)
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { HotelName, passwordInput },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Verification failed",
      );
    }

    return response.data.data.verifyAdminPassword;
  } catch (error: any) {
    throw error;
  }
}

export async function fetchWaiters(): Promise<Waiter[]> {
  return dedupeHotelListRead("cafe:waiters", async () => {
    const query = `
      query {
        waiters {
          id
          name
          HotelName
          age
          sex
          experience
          phoneNumber
          tablesServed
          price
          payment
          incomeAt
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to fetch waiters",
      );
    }

    return response.data.data.waiters || [];
  });
}

export async function createWaiter(waiterData: CreateWaiterData) {
  try {
    const mutation = `
      mutation CreateWaiter($name: String!, $HotelName: String!, $sex: String!, $age: Int!, $experience: Int!, $phoneNumber: String!) {
        CreateWaiter(name: $name, HotelName: $HotelName, sex: $sex, age: $age, experience: $experience, phoneNumber: $phoneNumber) {
          id
          name
          HotelName
          age
          sex
          experience
          phoneNumber
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: waiterData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to create waiter",
      );
    }

    toast.success("Waiter added successfully");
    return response.data.data.CreateWaiter;
  } catch (error: any) {
    toast.error("Failed to create waiter");
    throw error;
  }
}

export async function updateWaiter(waiterData: UpdateWaiterData) {
  try {
    const mutation = `
      mutation UpdateWaiter($id: Int!, $name: String!, $age: Int!, $sex: String!, $experience: Int!, $phoneNumber: String!) {
        UpdateWaiter(id: $id, name: $name, age: $age, sex: $sex, experience: $experience, phoneNumber: $phoneNumber) {
          id
          name
          age
          sex
          experience
          phoneNumber
          HotelName
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: waiterData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update waiter",
      );
    }

    toast.success("Waiter updated successfully");
    return response.data.data.UpdateWaiter;
  } catch (error: any) {
    toast.error("Failed to update waiter");
    throw error;
  }
}

export async function deleteWaiter(id: number) {
  try {
    const mutation = `
      mutation DeleteWaiter($id: Int!) {
        DeleteWaiter(id: $id) {
          id
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to delete waiter",
      );
    }

    toast.success("Waiter deleted successfully");
    return response.data.data.DeleteWaiter;
  } catch (error: any) {
    toast.error("Failed to delete waiter");
    throw error;
  }
}

export async function fetchTables(): Promise<Table[]> {
  return dedupeHotelListRead("cafe:tables", async () => {
    const query = `
      query {
        tables {
          id
          tableNo
          HotelName
          capacity
          price
          payment
          incomeAt
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to fetch tables",
      );
    }

    return response.data.data.tables || [];
  });
}

export async function createTable(tableData: CreateTableData) {
  try {
    const mutation = `
      mutation CreateTable($tableNo: Int!, $HotelName: String!, $capacity: Int!) {
        CreateTable(tableNo: $tableNo, HotelName: $HotelName, capacity: $capacity) {
          id
          tableNo
          HotelName
          capacity
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: tableData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to create table",
      );
    }

    toast.success("Table created successfully");
    return response.data.data.CreateTable;
  } catch (error: any) {
    toast.error("Failed to create table");
    throw error;
  }
}

export async function updateTable(tableData: UpdateTableData) {
  try {
    const mutation = `
      mutation UpdateTable($id: Int!, $tableNo: Int!, $capacity: Int!) {
        UpdateTable(id: $id, tableNo: $tableNo, capacity: $capacity) {
          id
          tableNo
          capacity
          HotelName
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: tableData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update table",
      );
    }

    toast.success("Table updated successfully");
    return response.data.data.UpdateTable;
  } catch (error: any) {
    toast.error("Failed to update table");
    throw error;
  }
}

export async function deleteTable(id: number) {
  try {
    const mutation = `
      mutation DeleteTable($id: Int!) {
        DeleteTable(id: $id) {
          id
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to delete table",
      );
    }

    toast.success("Table deleted successfully");
    return response.data.data.DeleteTable;
  } catch (error: any) {
    toast.error("Failed to delete table");
    throw error;
  }
}

export async function fetchOrders(): Promise<Order[]> {
  return dedupeHotelListRead("cafe:orders", async () => {
    const query = `
      query {
        orders {
          id
          title
          imageUrl
          orderAmount
          category
          type
          HotelName
          price
          tableNo
          waiterName
          status
          payment
          withBank
          credit
          credittorName
          creditAmount
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to fetch orders",
      );
    }

    return response.data.data.orders || [];
  });
}

export async function createOrder(orderData: OrderCreationData) {
  try {
    const mutation = `
      mutation OrderCreation(
        $title: String!
        $imageUrl: String!
        $tableNo: Int!
        $waiterName: String!
        $orderAmount: Int!
        $HotelName: String!
        $category: String!
        $type: String!
        $price: Float!
        $status: String
        $payment: String
      ) {
        OrderCreation(
          title: $title
          imageUrl: $imageUrl
          tableNo: $tableNo
          waiterName: $waiterName
          orderAmount: $orderAmount
          HotelName: $HotelName
          category: $category
          type: $type
          price: $price
          status: $status
          payment: $payment
        ) {
          id
          title
          imageUrl
          tableNo
          orderAmount
          category
          type
          HotelName
          price
          waiterName
          status
          payment
          createdAt
        }
      }
    `;

    const transformedData = {
      title: orderData.title || "",
      imageUrl: orderData.imageUrl || "",
      tableNo: Number(orderData.tableNo),
      waiterName: orderData.waiterName || "",
      orderAmount: Number(orderData.orderAmount),
      HotelName: orderData.HotelName || "",
      category: orderData.category || "",
      type: orderData.type || "",
      price: Number(orderData.price),
      status: orderData.status || "Pending",
      payment: orderData.payment || "Unpaid",
    };

    const response = await api.post(API_URL, {
      query: mutation,
      variables: transformedData,
    });

    if (response.data.errors) {
      const errorMessage =
        response.data.errors[0]?.message || "Failed to create order";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    toast.success("Order sent successfully");
    invalidateGraphqlListCache("cafe:orders");
    return response.data.data.OrderCreation;
  } catch (error: any) {
    if (error.code === "ECONNABORTED") {
      toast.error("Connection timeout. Please try again.");
    } else if (!error.response) {
      toast.error("Network error. Please check your connection.");
    } else if (error.message) {
      toast.error(error.message);
    } else {
      toast.error("Failed to create order");
    }

    throw error;
  }
}

export async function createBatchOrders(orderDataArray: any[]) {
  try {
    const mutation = `
      mutation BatchOrderCreation($orders: [OrderInput!]!) {
        BatchOrderCreation(orders: $orders) {
          id
          title
          tableNo
          orderAmount
          price
          waiterName
          status
          payment
          HotelName
          category
          type
          imageUrl
        }
      }
    `;

    const orders = orderDataArray.map((o) => ({
      title: String(o.title),
      imageUrl: String(o.imageUrl || ""),
      tableNo: Math.floor(Number(o.tableNo)),
      orderAmount: Math.floor(Number(o.orderAmount)), // Backend requires Int
      HotelName: String(o.HotelName),
      category: String(o.category),
      type: String(o.type),
      price: parseFloat(Number(o.price).toFixed(2)), // Backend requires Float
      waiterName: String(o.waiterName),
      status: "Pending",
      payment: "Unpaid",
    }));

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { orders },
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    toast.success(`${orders.length} orders sent to kitchen!`);
    return response.data.data.BatchOrderCreation;
  } catch (error: any) {
    const message = error.response?.data?.errors?.[0]?.message || error.message;
    toast.error(message);
    throw error;
  }
}

export async function updateOrderStatus(id: number, status: string) {
  try {
    const mutation = `
      mutation UpdateStatus($id: Int!, $status: String) {
        UpdateStatus(id: $id, status: $status) {
          id
          status
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, status },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update status",
      );
    }

    toast.success("Status updated successfully");
    return response.data.data.UpdateStatus;
  } catch (error: any) {
    toast.error("Failed to update status");
    throw error;
  }
}

export async function updateOrderPayment(
  id: number,
  payment: string,
  withBank: boolean,
) {
  try {
    const mutation = `
      mutation UpdatePayment($id: Int!, $payment: String, $withBank: Boolean) {
        UpdatePayment(id: $id, payment: $payment, withBank: $withBank) {
          id
          payment
          waiterName
          tableNo
          title
          orderAmount
          price
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, payment, withBank },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update payment",
      );
    }

    toast.success("Payment updated successfully");
    return response.data.data.UpdatePayment;
  } catch (error: any) {
    console.error("Payment update error:", error);
    toast.error("Failed to update payment");
    throw error;
  }
}

export async function checkPityCashBalance(
  HotelName: string,
  requiredAmount: number,
): Promise<boolean> {
  try {
    const pityCashList = await fetchPityCash();
    const currentPityCash = findRowByTenantScope(pityCashList, HotelName);

    if (!currentPityCash) {
      toast.error("No pity cash found for this hotel");
      return false;
    }

    if (currentPityCash.amount < requiredAmount) {
      toast.error(
        `Insufficient pity cash balance. Available: ${currentPityCash.amount}, Required: ${requiredAmount}`,
      );
      return false;
    }

    if (currentPityCash.startDate > new Date()) {
      toast.error("Pity cash is not yet available");
      return false;
    }

    if (currentPityCash.endDate < new Date()) {
      toast.error("Pity cash has expired");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to check pity cash balance:", error);
    return false;
  }
}

export async function checkCreditRegistrantBalance(
  name: string,
  requiredAmount: number,
  HotelName: string,
): Promise<boolean> {
  try {
    const creditRegistrations = await fetchCreditRegistrations();
    const creditRegistrant = creditRegistrations.find(
      (reg: CreditRegistration) =>
        reg.name.toLowerCase() === name.toLowerCase() &&
        rowHotelMatchesTenantScope(reg.HotelName, HotelName),
    );

    if (!creditRegistrant) {
      toast.error("Credit registrant not found");
      return false;
    }

    const err = validateCreditUsageAmount(
      requiredAmount,
      creditRegistrant.amount,
    );
    if (err) {
      toast.error(`${name}: ${err}`);
      return false;
    }

    return true;
  } catch {
    toast.error("Could not verify credit balance");
    return false;
  }
}

async function UpdatePityDeduction(id: number, amount: number) {
  try {
    const mutation = `
        mutation UpdatePityDeduction($id: Int!, $amount: Float!) {
          UpdatePityDeduction(id: $id, amount: $amount) {
           id 
           amount
           startDate
           endDate
           HotelName
          }
        }
      `;

    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, amount },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to Deduct the Pity Cash",
      );
    }

    toast.success("Successfully Deducted the Pity Cash");
    return response.data.data.UpdatePityDeduction;
  } catch (error: any) {
    console.error("UpdatePityDeduction error:", error);
    if (error.response?.data?.errors) {
      console.error("GraphQL Error details:", error.response.data.errors);
    }
    throw error;
  }
}

export function isCreditPayment(order: Order): boolean {
  return order.credit === true && order.withBank === null;
}

export function isCashPayment(order: Order): boolean {
  return order.withBank === false;
}

export function isBankPayment(order: Order): boolean {
  return order.withBank === true;
}

export function getPaymentMethod(order: Order): string {
  if (order.credit === true && order.withBank === null) return "Credit";
  if (order.withBank === true) return "Bank";
  if (order.withBank === false) return "Cash";
  return "Unknown";
}

async function UpdateCreditRegistrantDeduction(id: number, amount: number) {
  try {
    const mutation = `
      mutation UpdateCreditRegistrantDeduction($id: Int!, $amount: Float!) {
        UpdateCreditRegistrantDeduction(id: $id, amount: $amount) {
          id 
          amount
          name
          paidAmount
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, amount },
    });

    if (response.data.errors) {
      const errorMessage =
        response.data.errors[0]?.message ||
        "Failed to Deduct from Credit Registrant";
      throw new Error(errorMessage);
    }

    invalidateGraphqlListCache("finance:creditRegistrations");
    return response.data.data.UpdateCreditRegistrantDeduction;
  } catch (error: any) {
    toast.error("Failed to update credit registrant balance");
    throw error;
  }
}

export async function updateOrderCredit(
  id: number,
  credittorName: string,
  creditAmount: number,
) {
  try {
    console.log("updateOrderCredit called with:", {
      id,
      credittorName,
      creditAmount,
    });

    const currentUser = getCurrentUser();
    console.log("Current user:", currentUser);

    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    // Check if we have a token
    const token = localStorage.getItem("auth_token");
    console.log("Token exists:", !!token);

    const mutation = `
      mutation UpdateCredit($id: Int!, $credittorName: String!, $creditAmount: Float!) {
        UpdateCredit(id: $id, credittorName: $credittorName, creditAmount: $creditAmount) {
          id
          credittorName
          creditAmount
          HotelName
          title
        }
      }
    `;

    console.log("Sending mutation with variables:", {
      id,
      credittorName,
      creditAmount,
    });

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, credittorName, creditAmount },
    });

    console.log("Full API response:", response);
    console.log("Response data:", response.data);

    if (response.data.errors) {
      const errorMessage =
        response.data.errors[0]?.message || "Failed to update Credit";
      console.error("GraphQL Error details:", response.data.errors[0]);
      throw new Error(errorMessage);
    }

    const updatedOrder = response.data.data?.UpdateCredit;
    console.log("Updated order:", updatedOrder);

    if (!updatedOrder) {
      throw new Error("No data returned from update");
    }

    toast.success("Credit updated successfully for the Order");
    return updatedOrder;
  } catch (error: any) {
    console.error("updateOrderCredit error:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    toast.error(error.message || "Failed to update credit");
    throw error;
  }
}

export async function deductFromCreditRegistrant(
  credittorName: string,
  amountToDeduct: number,
) {
  try {
    const creditRegistrations = await fetchCreditRegistrations();
    const cu = getCurrentUser();
    const creditRegistrant = creditRegistrations.find(
      (reg: any) =>
        reg.name.toLowerCase() === credittorName.toLowerCase() &&
        rowHotelMatchesTenantScope(reg.HotelName, cu?.HotelName ?? ""),
    );

    if (creditRegistrant) {
      const newAmount = creditRegistrant.amount - amountToDeduct;
      await UpdateCreditRegistrantDeduction(creditRegistrant.id, newAmount);
    } else {
      throw new Error("Credit registrant not found");
    }
  } catch (error: any) {
    console.error("Failed to deduct from credit registrant:", error);
    toast.error(error.message || "Failed to deduct from credit registrant");
    throw error;
  }
}

export async function updateWaiterPayment(data: {
  id: number;
  payment: string[];
  price: number[];
  tablesServed: number[];
  incomeAt: string[];
  HotelName: string;
}) {
  try {
    const mutation = `
      mutation UpdatePaymentWaiter(
        $id: Int!, 
        $payment: JSON!, 
        $price: JSON!, 
        $tablesServed: JSON!,
        $incomeAt: JSON!
      ) {
        UpdatePaymentWaiter(
          id: $id, 
          payment: $payment, 
          price: $price, 
          tablesServed: $tablesServed,
          incomeAt: $incomeAt
        ) {
          id
          HotelName
          payment
          tablesServed
          price
          incomeAt
        }
      }
    `;
    if (data.payment.length === 0) return null

    const response = await api.post(API_URL, {
      query: mutation,
      variables: {
        id: data.id,
        payment: data.payment,
        price: data.price,
        tablesServed: data.tablesServed,
        incomeAt: data.incomeAt,
      },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update waiter payment",
      );
    }

    toast.success("Waiter payment updated successfully");
    return response.data.data.UpdatePaymentWaiter;
  } catch (error: any) {
    toast.error("Failed to update waiter payment");
    throw error;
  }
}

export async function updateTablePayment(data: {
  id: number;
  payment: string[];
  price: number[];
  incomeAt: string[];
  HotelName: string;
}) {
  try {
    const mutation = `
      mutation UpdatePaymentTable(
        $id: Int!, 
        $payment: JSON!, 
        $price: JSON!,
        $incomeAt: JSON!
      ) {
        UpdatePaymentTable(
          id: $id, 
          payment: $payment, 
          price: $price,
          incomeAt: $incomeAt
        ) {
          id
          HotelName
          payment
          price
          incomeAt
        }
      }
    `;

    if (data.payment.length === 0) return null

    const response = await api.post(API_URL, {
      query: mutation,
      variables: {
        id: data.id,
        payment: data.payment,
        price: data.price,
        incomeAt: data.incomeAt,
      },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update table payment",
      );
    }

    toast.success("Table payment updated successfully");
    return response.data.data.UpdatePaymentTable;
  } catch (error: any) {
    toast.error("Failed to update table payment");
    throw error;
  }
}

export async function CreateCashout(data: any) {
  try {
    const mutation = `
      mutation CreateCashout(
        $items: JSON, 
        $prices: JSON, 
        $measuredBy: JSON, 
        $requiredAmount: JSON, 
        $totalCalc: Float!
      ) {
        CreateCashout(
          items: $items, 
          prices: $prices, 
          measuredBy: $measuredBy, 
          requiredAmount: $requiredAmount, 
          totalCalc: $totalCalc
        ) {
          id
          items
          prices
          measuredBy
          totalCalc
          requiredAmount
          HotelName
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: data,
    });

    if (response.data.errors) {
      const errorMessage =
        response.data.errors[0]?.message || "Failed to create cashout";

      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    toast.success("Cashout created successfully");
    invalidateGraphqlListCache("finance:cashouts");
    return response.data.data.CreateCashout;
  } catch (error: any) {
    if (isSessionExpiredError(error)) throw error;
    if (error.response?.data?.errors) {
      const graphqlErrors = error.response.data.errors;
      const errorMessages = graphqlErrors
        .map((err: any) => {
          if (err.extensions?.validation) {
            return Object.values(err.extensions.validation).flat().join(", ");
          }
          return err.message;
        })
        .join("\n");
      toast.error(`GraphQL Error: ${errorMessages}`);
    } else if (error.response?.status === 400) {
      toast.error("Bad request. Please check the data you're sending.");
    } else if (error.message) {
      toast.error(error.message);
    } else {
      toast.error("Failed to create cashout. Please try again.");
    }

    throw error;
  }
}

export async function fetchCashout(HotelName?: string) {
  try {
    const currentUser = getCurrentUser();
    const hotel = HotelName || currentUser?.HotelName;

    if (!hotel) {
      toast.error("Hotel name is required");
      throw new Error("Hotel name is required");
    }

    return await dedupeHotelListRead(`finance:cashouts:${hotel}`, async () => {
      const query = `
      query fetchCashouts {
        cashouts {
          id
          items
          prices
          measuredBy
          totalCalc
          requiredAmount
          createdAt
          HotelName
        }
      }
    `;

      const response = await api.post(API_URL, {
        query: query,
        variables: {
          HotelName: hotel,
        },
      });

      if (response.data.errors) {
        const errorMessage =
          response.data.errors[0]?.message || "Failed to fetch cashouts";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const cashouts = response.data.data.cashouts || [];
      return cashouts;
    });
  } catch (error: any) {
    if (isSessionExpiredError(error)) throw error;
    toast.error("Failed to fetch cashout: " + (error.message || "Unknown error"));

    throw error;
  }
}

export function filterBaristaOrders(
  orders: Order[],
  hotelName: string,
): Order[] {
  return orders.filter((order) => {
    const isSameHotel = rowHotelMatchesTenantScope(order.HotelName, hotelName);
    const isPending = order.status === null || order.status === "Pending";
    const isBeverage = order.category?.toLowerCase() === "beverage";
    return isSameHotel && isPending && isBeverage;
  });
}

export function filterChefOrders(orders: Order[], hotelName: string): Order[] {
  return orders.filter((order) => {
    const isSameHotel = rowHotelMatchesTenantScope(order.HotelName, hotelName);
    const isPending = order.status === null || order.status === "Pending";
    const isFood =
      order.category?.toLowerCase() === "food" ||
      order.category?.toLowerCase() === "others";
    return isSameHotel && isPending && isFood;
  });
}

export function filterUnpaidOrders(
  orders: Order[],
  hotelName: string,
): Order[] {
  return orders.filter((order) => {
    const isSameHotel = rowHotelMatchesTenantScope(order.HotelName, hotelName);
    const isUnpaid = order.payment !== "Paid";

    const notCancelled = order.status?.toLowerCase() !== "cancelled";

    return isSameHotel && isUnpaid && notCancelled;
  });
}

function calculateTotalSales(orders: Order[]): number {
  return orders.reduce((total, order) => {
    return total + order.price * order.orderAmount;
  }, 0);
}

export async function exportToExcel(exportData: ExcelExportData) {
  try {
    const XLSX = await import("xlsx");
    const { sheetName, data, headers } = exportData;

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Add headers
    headers.map((header) => ({ v: header, t: "s" }));
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Save file
    saveAs(blob, `${sheetName}_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast.success(`${sheetName} exported successfully`);
    return true;
  } catch (error: any) {
    toast.error("Failed to export to Excel");
    throw error;
  }
}

export function prepareWaiterExportData(waiters: Waiter[]): ExcelExportData {
  const data = waiters.map((waiter) => ({
    Name: waiter.name,
    "Hotel Name": waiter.HotelName,
    Age: waiter.age,
    Sex: waiter.sex,
    Experience: waiter.experience,
    "Phone Number": waiter.phoneNumber,
    "Completed Orders": waiter.tablesServed?.length || 0,
    "Total Sales":
      waiter.price?.reduce((sum, price) => sum + (price || 0), 0) || 0,
  }));

  return {
    sheetName: "Waiters",
    data,
    headers: [
      "Name",
      "Hotel Name",
      "Age",
      "Sex",
      "Experience",
      "Phone Number",
      "Completed Orders",
      "Total Sales",
    ],
  };
}

export function prepareTableExportData(tables: Table[]): ExcelExportData {
  const data = tables.map((table) => ({
    "Table No": table.tableNo,
    Capacity: table.capacity,
    "Completed Orders": table.payment?.filter((p) => p === "Paid").length || 0,
    "Total Sales":
      table.price?.reduce((sum, price) => sum + (price || 0), 0) || 0,
  }));

  return {
    sheetName: "Tables",
    data,
    headers: ["Table No", "Capacity", "Completed Orders", "Total Sales"],
  };
}

function filterReportOrders(orders: Order[], filter: ReportFilter): Order[] {
  return orders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    const filterDate = filter.date;
    const isSameHotel = rowHotelMatchesTenantScope(
      order.HotelName,
      filter.HotelName,
    );
    const isPaid =
      String(order.payment ?? "").trim().toLowerCase() === "paid";

    if (!isSameHotel || !isPaid) return false;

    if (filter.type === "Daily") {
      return (
        orderDate.getFullYear() === filterDate.getFullYear() &&
        orderDate.getMonth() === filterDate.getMonth() &&
        orderDate.getDate() === filterDate.getDate()
      );
    } else {
      return (
        orderDate.getFullYear() === filterDate.getFullYear() &&
        orderDate.getMonth() === filterDate.getMonth()
      );
    }
  });
}

export async function generateReport(
  orders: Order[],
  cashouts: Cashout[],
  filter: { date: Date; type: "Daily" | "Monthly"; HotelName: string },
): Promise<ReportData | null> {
  const filteredOrders = filterReportOrders(orders, {
    HotelName: filter.HotelName,
    date: filter.date,
    type: filter.type,
  });

  const totalSales = calculateTotalSales(filteredOrders);
  const filterDate = filter.date;
  const filteredCashouts = cashouts.filter((cashout) => {
    const cashoutDate = new Date(cashout.createdAt);
    if (filter.type === "Daily") {
      return (
        cashoutDate.getFullYear() === filterDate.getFullYear() &&
        cashoutDate.getMonth() === filterDate.getMonth() &&
        cashoutDate.getDate() === filterDate.getDate()
      );
    } else if (filter.type === "Monthly") {
      return (
        cashoutDate.getFullYear() === filterDate.getFullYear() &&
        cashoutDate.getMonth() === filterDate.getMonth()
      );
    }
    return false;
  });

  const totalCashouts = filteredCashouts.reduce(
    (sum, cashout) => sum + (Number(cashout.totalCalc) || 0),
    0,
  );
  const netSales = totalSales - totalCashouts;
  const cashOrders = filteredOrders.filter((order) => order.withBank === false);
  const bankOrders = filteredOrders.filter((order) => order.withBank === true);
  const creditOrders = filteredOrders.filter(
    (order) => order.credit === true && order.withBank === null,
  );

  const cashAmount = calculateTotalSales(cashOrders);
  const bankAmount = calculateTotalSales(bankOrders);
  const creditAmount = calculateTotalSales(creditOrders);
  const totalAmount = totalSales || 1;

  return {
    orders: filteredOrders,
    totalSales,
    netSales,
    totalCashouts,
    cashPayments: {
      count: cashOrders.length,
      amount: cashAmount,
      percentage: totalAmount > 0 ? (cashAmount / totalAmount) * 100 : 0,
    },
    bankPayments: {
      count: bankOrders.length,
      amount: bankAmount,
      percentage: totalAmount > 0 ? (bankAmount / totalAmount) * 100 : 0,
    },
    creditPayments: {
      count: creditOrders.length,
      amount: creditAmount,
      percentage: totalAmount > 0 ? (creditAmount / totalAmount) * 100 : 0,
    },
  };
}

export function prepareReportExportData(
  orders: Order[],
  reportType: "Daily" | "Monthly",
): ExcelExportData {
  const data = orders.map((order) => {
    let paymentMethod = "Cash";
    if (order.credit === true) paymentMethod = "Credit";
    else if (order.withBank === true) paymentMethod = "Bank";

    const lineTotal =
      (Number(order.price) || 0) * (Number(order.orderAmount) || 0);
    return {
      "Item Name": order.title,
      Category: order.category,
      Price: order.price,
      "Order Amount": order.orderAmount,
      "Total Amount": lineTotal,
      "Order Date": new Date(order.createdAt).toLocaleDateString(),
      Status: order.status || "Pending",
      Payment: order.payment,
      "Payment Method": paymentMethod,
      "Credit Customer":
        order.credit === true ? (order.credittorName ?? "") : "",
    };
  });

  return {
    sheetName: `${reportType} Report`,
    data,
    headers: [
      "Item Name",
      "Category",
      "Price",
      "Order Amount",
      "Total Amount",
      "Order Date",
      "Status",
      "Payment",
      "Payment Method",
      "Credit Customer",
    ],
  };
}

// ==================== IMAGE UPLOAD ====================

export async function uploadImage(
  result: unknown,
  form: UseFormReturn<any>,
  setPreviewUrl: (url: string | null) => void,
  formField: string,
) {
  try {
    if (
      typeof result === "object" &&
      result !== null &&
      "event" in result &&
      result.event === "success" &&
      "info" in result &&
      typeof result.info === "object" &&
      result.info !== null &&
      "secure_url" in result.info
    ) {
      const typedResult = result as cloudinarySuccessResult;
      const secured_url = typedResult.info.secure_url;

      form.setValue(formField, secured_url, { shouldValidate: true });
      setPreviewUrl(secured_url);
    } else {
      form.setValue(formField, "");
      setPreviewUrl(null);
    }
  } catch (error: any) {
    toast.error("An unexpected error occurred during image upload processing.");
    console.error("Image processing error:", error);
  }
}

export function transformOrderDataForWaiterUpdate(
  orders: Order[],
  waiterId: number,
) {
  const paidOrders = orders.filter(
    (order) => String(order.payment ?? "").toLowerCase() === "paid",
  );
  const recordedAt = new Date().toISOString();

  return {
    id: waiterId,
    payment: paidOrders.map((order) => order.payment),
    price: paidOrders.map((order) => order.price * order.orderAmount),
    tablesServed: paidOrders.map((order) => order.tableNo || 0),
    incomeAt: paidOrders.map(() => recordedAt),
    HotelName: orders[0]?.HotelName || "",
  };
}

export function transformOrderDataForTableUpdate(
  orders: Order[],
  tableId: number,
  tableNo: number,
) {
  const paidOrders = orders.filter(
    (order) =>
      String(order.payment ?? "").toLowerCase() === "paid" &&
      order.tableNo === tableNo,
  );
  const recordedAt = new Date().toISOString();

  return {
    id: tableId,
    payment: paidOrders.map((order) => order.payment),
    price: paidOrders.map(
      (order) =>
        (Number(order.price) || 0) * (Number(order.orderAmount) || 0),
    ),
    incomeAt: paidOrders.map(() => recordedAt),
    HotelName: orders[0]?.HotelName || "",
  };
}

// ==================== Credit Level ====================

export async function CreateCreditLevel(values: CreateCreditLevel) {
  try {
    const mutation = `
     mutation CreateCreditLevel($level: String!, $requiredAmount: Float!, $timeInterval: Int!, $timeFrame: String!, $HotelName: String!) {
      CreateCreditLevel(level: $level, requiredAmount: $requiredAmount, timeInterval: $timeInterval, timeFrame: $timeFrame, HotelName: $HotelName) {
      id
      level
      requiredAmount
      timeInterval
      timeFrame
      HotelName
      }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: values,
    });

    if (response.data.errors) {
      throw (
        new Error(response.data.errors[0].message) ||
        "Failed to create credit level"
      );
    }

    toast.success("Credit level created successfully");
    return response.data.data.CreateCreditLevel;
  } catch (error: any) {
    toast.error("Failed to create credit level");
    throw error;
  }
}

export async function fetchCreditLevels() {
  try {
    return await dedupeHotelListRead("finance:creditLevels", async () => {
      const query = `
      query {
        creditLevel {  
          id
          level
          requiredAmount
          timeInterval
          timeFrame
          HotelName
        }
      }
    `;

      const response = await api.post(API_URL, { query });

      if (response.data.errors) {
        console.error("GraphQL Errors:", response.data.errors);
        throw new Error(
          response.data.errors[0]?.message || "Failed to fetch credit levels",
        );
      }

      console.log("Fetched credit levels:", response.data.data.creditLevel); // Add logging
      return response.data.data.creditLevel || []; // Changed from 'creditLevels' to 'creditLevel'
    });
  } catch (error: any) {
    console.error("Error fetching credit levels:", error);
    throw error;
  }
}

export async function UpdateCreditLevel(creditLevelData: UpdateCreditLevel) {
  try {
    const mutation = `
      mutation UpdateCreditLevel($id: Int!, $level: String!, $requiredAmount: Float!, $timeInterval: Int!, $timeFrame: String!) {
        UpdateCreditLevel(id: $id, level: $level, requiredAmount: $requiredAmount, timeInterval: $timeInterval, timeFrame: $timeFrame) {
            id
            level
            requiredAmount
            timeInterval
            timeFrame
            HotelName
        }}`;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: creditLevelData,
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update credit level",
      );
    }

    toast.success("Credit Level updated successfully");
    return response.data.data.UpdateCreditLevel;
  } catch (error: any) {
    toast.error("Failed to update credit level");
    throw error;
  }
}

export async function DeleteCreditLevel(id: number) {
  try {
    const mutation = `
      mutation DeleteCreditLevel($id: Int!) {
        DeleteCreditLevel(id: $id) {
          id
        }
      }`;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to delete credit level",
      );
    }
    toast.success("Credit Level deleted successfully");
    return response.data.data.DeleteCreditLevel;
  } catch (error: any) {
    toast.error("Failed to delete credit level");
    throw error;
  }
}

// ==================== PITY CASH ====================

export async function CreatePityCash(values: CreatePityCash) {
  try {
    const mutation = `
      mutation CreatePityCash($amount: Float!, $startDate: DateTime!, $endDate: DateTime!, $HotelName: String!) {
        CreatePityCash(amount: $amount, startDate: $startDate, endDate: $endDate, HotelName: $HotelName) {
          id
          amount
          startDate
          endDate
          HotelName
        }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: values,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to create pity cash",
      );
    }

    toast.success("Pity cash created successfully");
    return response.data.data.CreatePityCash;
  } catch (error: any) {
    toast.error("Failed to create pity cash");
    throw error;
  }
}

export async function fetchPityCash(): Promise<pityCash[]> {
  return dedupeHotelListRead("finance:pityCash", async () => {
    const query = `
      query {
        pityCash {
          id
          amount
          startDate
          endDate
          HotelName
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to fetch pity cash",
      );
    }
    return response.data.data.pityCash || [];
  });
}

export async function UpdatePityCash(pityCashData: UpdatePityCash) {
  try {
    const mutation = `
      mutation UpdatePityCash($id: Int!, $amount: Float!, $startDate: DateTime!, $endDate: DateTime!) {
        UpdatePityCash(id: $id, amount: $amount, startDate: $startDate, endDate: $endDate) {
          id
          amount
          startDate
          endDate
          HotelName
        }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: pityCashData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update pity cash",
      );
    }

    toast.success("Pity cash updated successfully");
    return response.data.data.UpdatePityCash;
  } catch (error: any) {
    toast.error("Failed to update pity cash");
    throw error;
  }
}

export async function DeletePityCash(id: number) {
  try {
    const mutation = `
      mutation DeletePityCash($id: Int!) {
        DeletePityCash(id: $id) {
          id
        }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to delete pity cash",
      );
    }

    toast.success("Pity cash deleted successfully");
    return response.data.data.DeletePityCash;
  } catch (error: any) {
    toast.error("Failed to delete pity cash");
    throw error;
  }
}

// ==================== CREDIT REGISTRATION ====================

export async function CreateCreditRegistration(
  values: CreateCreditRegistration,
  options?: { suppressSuccessToast?: boolean },
) {
  try {
    const mutation = `
      mutation CreditRegistration(
        $name: String!, 
        $imageUrl: String!,
        $sex: String!, 
        $creditLevel: String!, 
        $phoneNumber: String!, 
        $amount: Float!, 
        $timeInterval: Int!,
        $timeFrame: String!,
        $paidAmount: Float!,
        $registrationDate: DateTime!, 
        $HotelName: String!,
        $registrantType: String,
        $companyTinNumber: String,
        $affiliatedCompany: String
      ) {
        CreditRegistration(
          name: $name, 
          imageUrl: $imageUrl,
          sex: $sex, 
          creditLevel: $creditLevel, 
          phoneNumber: $phoneNumber, 
          amount: $amount,
          timeInterval: $timeInterval,
          timeFrame: $timeFrame,
          paidAmount: $paidAmount,
          registrationDate: $registrationDate, 
          HotelName: $HotelName,
          registrantType: $registrantType,
          companyTinNumber: $companyTinNumber,
          affiliatedCompany: $affiliatedCompany
        ) {
          id
          name
          imageUrl
          sex
          creditLevel
          phoneNumber
          amount
          timeInterval
          timeFrame
          paidAmount
          registrationDate
          HotelName
          registrantType
          approvalStatus
          companyTinNumber
          affiliatedCompany
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: {
        ...values,
        registrantType: values.registrantType ?? "STAFF",
        companyTinNumber: values.companyTinNumber ?? "",
        affiliatedCompany: values.affiliatedCompany ?? "",
      },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to create credit registration",
      );
    }

    const row = response.data.data.CreditRegistration;
    if (!options?.suppressSuccessToast) {
      const pending =
        String(row?.approvalStatus ?? "").toUpperCase() === "PENDING_ADMIN";
      toast.success(
        pending
          ? "Registration submitted — awaiting admin authorization"
          : "Credit registration created successfully",
      );
    }
    return row;
  } catch (error: any) {
    toast.error("Failed to create credit registration");
    throw error;
  }
}

export async function authorizeCreditRegistrationApi(id: number) {
  try {
    const mutation = `
      mutation AuthorizeCreditRegistration($id: Int!) {
        AuthorizeCreditRegistration(id: $id) {
          id
          approvalStatus
          adminActorName
          adminAuthorizedAt
        }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Authorization failed",
      );
    }
    invalidateGraphqlListCache();
    toast.success("Creditor authorized");
    return response.data.data.AuthorizeCreditRegistration;
  } catch (error: any) {
    toast.error(error?.message || "Authorization failed");
    throw error;
  }
}

export async function rejectCreditRegistrationApi(id: number, reason?: string) {
  try {
    const mutation = `
      mutation RejectCreditRegistration($id: Int!, $reason: String) {
        RejectCreditRegistration(id: $id, reason: $reason) {
          id
          approvalStatus
          rejectionReason
        }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, reason: reason?.trim() || undefined },
    });
    if (response.data.errors) {
      throw new Error(response.data.errors[0]?.message || "Rejection failed");
    }
    invalidateGraphqlListCache();
    toast.success("Registration rejected");
    return response.data.data.RejectCreditRegistration;
  } catch (error: any) {
    toast.error(error?.message || "Rejection failed");
    throw error;
  }
}

export async function fetchCreditRegistrations() {
  return dedupeHotelListRead("finance:creditRegistrations", async () => {
    const query = `
      query {
        CreditRegistration {
          id
          name
          imageUrl
          sex
          creditLevel
          phoneNumber
          amount
          timeInterval
          timeFrame
          paidAmount
          registrationDate
          HotelName
          registrantType
          approvalStatus
          companyTinNumber
          affiliatedCompany
          rejectionReason
          adminActorName
          adminAuthorizedAt
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to fetch credit registrations",
      );
    }
    return response.data.data.CreditRegistration || [];
  });
}

export async function UpdateCreditRegistration(
  creditRegData: UpdateCreditRegistration,
) {
  try {
    const mutation = `
      mutation UpdateCreditRegistration(
        $id: Int!, 
        $name: String!, 
        $imageUrl: String!,
        $sex: String!, 
        $creditLevel: String!, 
        $phoneNumber: String!, 
        $amount: Float!, 
        $timeInterval: Int!,
        $timeFrame: String!,
        $paidAmount: Float!
        $registrationDate: DateTime!
      ) {
        UpdateCreditRegistration(
          id: $id, 
          name: $name, 
          imageUrl: $imageUrl,
          sex: $sex, 
          creditLevel: $creditLevel, 
          phoneNumber: $phoneNumber, 
          amount: $amount, 
          timeInterval: $timeInterval,
          timeFrame: $timeFrame,
          paidAmount: $paidAmount,
          registrationDate: $registrationDate
        ) {
          id
          name
          imageUrl
          sex
          creditLevel
          phoneNumber
          amount
          timeInterval
          timeFrame
          paidAmount
          registrationDate
          HotelName
        }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: creditRegData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to update credit registration",
      );
    }

    toast.success("Credit registration updated successfully");
    return response.data.data.UpdateCreditRegistration;
  } catch (error: any) {
    toast.error("Failed to update credit registration");
    throw error;
  }
}

export async function DeleteCreditRegistration(id: number) {
  try {
    const mutation = `
      mutation DeleteCreditRegistration($id: Int!) {
        DeleteCreditRegistration(id: $id) {
          id
        }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to delete credit registration",
      );
    }

    toast.success("Credit registration deleted successfully");
    return response.data.data.DeleteCreditRegistration;
  } catch (error: any) {
    toast.error("Failed to delete credit registration");
    throw error;
  }
}

// ==================== Item REGISTRATION ====================

export async function CreateItemRegistration(values: createItemRegistration) {
  try {
    const mutation = `
      mutation ItemRegistration(
        $name: String!, 
        $imageUrl: String!,
        $category: String!, 
        $amount: Float!, 
        $measuredBy: String!, 
        $unitPrice: Float!, 
        $registrationDate: DateTime!,
        $expireDate: DateTime!,
        $supplierName: String!, 
        $supplierPhone: String!,
        $Address: String!,
        $purchaseWithVat: Boolean,
        $supplierTinNumber: String,
        $paidAmount: Float!,
        $HotelName: String!
      ) {
        ItemRegistration(
          name: $name, 
          imageUrl: $imageUrl,
          category: $category, 
          amount: $amount, 
          measuredBy: $measuredBy, 
          unitPrice: $unitPrice,
          registrationDate: $registrationDate,
          expireDate: $expireDate,
          supplierName: $supplierName,
          supplierPhone: $supplierPhone,
          Address: $Address,
          purchaseWithVat: $purchaseWithVat,
          supplierTinNumber: $supplierTinNumber,
          paidAmount: $paidAmount,
          HotelName: $HotelName
        ) {
          id
          name
          imageUrl
          category
          amount
          measuredBy
          unitPrice
          registrationDate
          expireDate
          supplierName
          supplierPhone
          Address
          purchaseWithVat
          supplierTinNumber
          paidAmount
          HotelName
          approvalStatus
          voucherNumber
          voucherDisplay
        }
      }
    `;

    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    if (!token) {
      toast.error("You are not logged in. Please Login again.");
      throw new Error("No authenticated token found");
    }

    const variables = {
      name: values.name || "",
      imageUrl: values.imageUrl || "",
      category: values.category || "",
      amount: values.amount || 0,
      measuredBy: values.measuredBy || "",
      unitPrice: values.unitPrice || 0,
      registrationDate: values.registrationDate || new Date(),
      expireDate: values.expireDate || new Date(),
      supplierName: values.supplierName || "",
      supplierPhone: values.supplierPhone || "",
      Address: values.Address || "",
      purchaseWithVat: values.purchaseWithVat !== false,
      supplierTinNumber: (values.supplierTinNumber || "").trim() || null,
      paidAmount: values.paidAmount || 0,
      HotelName: resolveCanonicalTenantKey(values.HotelName),
    };

    const response = await api.post(
      API_URL,
      {
        query: mutation,
        variables: variables,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data.errors) {
      const errorMessage =
        response.data.errors[0]?.message || "Failed to create item";

      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    const created = response.data.data?.ItemRegistration;
    if (!created) {
      const errorMessage = "Item registration was not saved by the server";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    const businessType =
      typeof window !== "undefined"
        ? localStorage.getItem("business_type")?.trim() || ""
        : "";
    const isLodgingStore =
      businessType === "Hotel" ||
      businessType === "Resort" ||
      businessType === "Pension";

    if (!isLodgingStore) {
      try {
        const pityCashList = await fetchPityCash();
        const currentPityCash = findRowByTenantScope(
          pityCashList,
          values.HotelName,
        );
        const totalCalc = computeInventoryPaidAmountETB(
            values.amount,
            values.unitPrice,
            values.purchaseWithVat,
          );

        if (currentPityCash) {
          const newAmount = currentPityCash.amount - totalCalc;

          try {
            await UpdatePityDeduction(currentPityCash.id, newAmount);
          } catch {
            toast.warning(
              "Item created but failed to update petty cash balance",
            );
          }
        }
      } catch {
        toast.error("Failed to fetch petty cash");
      }
    }

    invalidateGraphqlListCache([
      "ItemRegistration:list",
      "finance:pityCash",
    ]);
    return created;
  } catch (error: any) {
    throw error;
  }
}

export async function fetchItemRegistrations() {
  return dedupeHotelListRead("ItemRegistration:list", async () => {
    const query = `
      query {
        ItemRegistration {
          id
          name
          imageUrl
          category
          amount
          measuredBy
          unitPrice
          registrationDate
          expireDate
          supplierName
          supplierPhone
          purchaseWithVat
          supplierTinNumber
          Address
          paidAmount
          registeredAmount
          registeredValue
          statusBy
          HotelName
          voucherNumber
          voucherDisplay
          purchaseRequestId
          approvalStatus
          ccProfileId
          ccActorName
          ccCheckedAt
          financeActorName
          financeApprovedAt
          managerActorName
          managerAuthorizedAt
          rejectionReason
          pendingUnitPrice
          unitPriceChangeStatus
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to fetch item registrations",
      );
    }
    return response.data.data.ItemRegistration || [];
  });
}

export async function UpdateItemRegistration(
  creditRegData: UpdateItemRegistration,
) {
  try {
    const mutation = `
      mutation UpdateItemRegistration(
        $id: Int!, 
        $name: String!, 
        $imageUrl: String!,
        $category: String!, 
        $amount: Float!, 
        $measuredBy: String!, 
        $unitPrice: Float!, 
        $registrationDate: DateTime!,
        $expireDate: DateTime!,
        $supplierName: String!, 
        $supplierPhone: String!,
        $Address: String!,
        $purchaseWithVat: Boolean,
        $supplierTinNumber: String,
        $paidAmount: Float!
      ) {
        UpdateItemRegistration(
          id: $id, 
          name: $name, 
          imageUrl: $imageUrl,
          category: $category, 
          amount: $amount, 
          measuredBy: $measuredBy, 
          unitPrice: $unitPrice, 
          registrationDate: $registrationDate,
          expireDate: $expireDate,
          supplierName: $supplierName,
          supplierPhone: $supplierPhone,
          Address: $Address,
          purchaseWithVat: $purchaseWithVat,
          supplierTinNumber: $supplierTinNumber,
          paidAmount: $paidAmount
        ) {
          id
          name
          imageUrl
          category
          amount
          measuredBy
          unitPrice
          registrationDate
          expireDate
          supplierName
          supplierPhone
          Address
          purchaseWithVat
          supplierTinNumber
          paidAmount
        }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: creditRegData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to update item registration",
      );
    }

    toast.success("item registration updated successfully");
    invalidateGraphqlListCache("ItemRegistration:list");
    return response.data.data.UpdateItemRegistration;
  } catch (error: any) {
    toast.error("Failed to update item registration");
    throw error;
  }
}

export async function DeleteItemRegistration(id: number) {
  try {
    const mutation = `
      mutation DeleteItemRegistration($id: Int!) {
        DeleteItemRegistration(id: $id) {
          id
        }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to delete item registration",
      );
    }

    toast.success("Item registration deleted successfully");
    invalidateGraphqlListCache([
      "ItemRegistration:list",
      "ItemStatus:list",
    ]);
    return response.data.data.DeleteItemRegistration;
  } catch (error: any) {
    toast.error("Failed to delete Item registration");
    throw error;
  }
}

export async function CreateItemStatus(data: CreatingItemStatus) {
  try {
    const mutation = `mutation CreateItemStatus($name: String!,
    $imageUrl: String!,
    $category: String!,
    $amount: Float!,
    $measuredBy: String!,
    $unitPrice: Float!,   
    $actionDate: DateTime!,
    $supplierName: String!,
    $supplierPhone: String!,   
    $Address:       String!,
    $purchaseWithVat: Boolean,
    $supplierTinNumber: String,
    $paidAmount: Float!,
    $status: String!,
    $statusBy: String!, $HotelName: String!) {
      CreateItemStatus(name: $name, imageUrl: $imageUrl, category: $category, amount: $amount, measuredBy: $measuredBy, unitPrice: $unitPrice, actionDate: $actionDate, supplierName: $supplierName, supplierPhone: $supplierPhone, Address: $Address, purchaseWithVat: $purchaseWithVat, supplierTinNumber: $supplierTinNumber, paidAmount: $paidAmount, status: $status, statusBy: $statusBy, HotelName: $HotelName) {
       name
       imageUrl
       category
       amount
       measuredBy
       unitPrice
       actionDate
       supplierName
       supplierPhone
       Address
       purchaseWithVat
       supplierTinNumber
       paidAmount
       status
       statusBy
       HotelName
      }
    }`;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: {
        ...data,
        purchaseWithVat: data.purchaseWithVat !== false,
        supplierTinNumber: (data.supplierTinNumber || "").trim() || null,
      },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0].message || "Failed to Update Item Status",
      );
    }

    toast.success("Status Updated Successfully");
    invalidateGraphqlListCache([
      "ItemRegistration:list",
      "ItemStatus:list",
    ]);
    return response.data.data.CreateItemStatus;
  } catch (error: any) {
    console.error("Status update error:", error);
    toast.error("Failed to update Status");
    throw error;
  }
}

export async function fetchItemStatus() {
  try {
    return await dedupeHotelListRead("ItemStatus:list", async () => {
      const query = `
      query {
        ItemStatus {
          id
          name
          imageUrl
          category
          amount
          measuredBy
          unitPrice
          actionDate
          supplierName
          supplierPhone
          Address
          purchaseWithVat
          supplierTinNumber
          paidAmount
          status
          statusBy
          HotelName
          voucherNumber
          voucherDisplay
          stockOutRequestId
        }
      }
          `;
      const response = await api.post(API_URL, { query });
      if (response.data.errors) {
        throw new Error(
          response.data.errors[0]?.message || "Failed to fetch item Status",
        );
      }
      return response.data.data.ItemStatus || [];
    });
  } catch (error: any) {
    toast.error("Failed to fetch Item Status");
    throw error;
  }
}

export async function DeleteItemStatus(id: number) {
  try {
    const mutation = `mutation DeleteItemStatus($id: Int!) {
      DeleteItemStatus(id: $id) {
       id
      }
    }`
     const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to delete item status",
      );
    }

    toast.success("Item Status deleted successfully");
    return response.data.data.DeleteItemStatus;
  } catch (error: any) {
    toast.error("Failed to Delete Item Status")
    throw error
  }
}

/* --- Hotel inventory workflow (GraphQL) --- */

export interface PurchaseRequestRow {
  id: number;
  HotelName: string;
  itemName: string;
  quantity: number;
  measuredBy: string;
  notes: string;
  estimatedUnitPrice: number;
  supplierName: string;
  supplierPhone: string;
  category: string;
  status: string;
  storeUserName: string;
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
  ccProfileId?: number | null;
  ccActorName?: string | null;
  ccApprovedAt?: string | null;
  financeActorName?: string | null;
  financeApprovedAt?: string | null;
  managerActorName?: string | null;
  managerAuthorizedAt?: string | null;
  rejectionReason?: string | null;
  pendingUnitPrice?: number | null;
  unitPriceChangeStatus?: string | null;
  createdAt: string;
}

export interface StockOutRequestRow {
  id: number;
  HotelName: string;
  itemRegistrationId: number;
  /** From inventory registration; empty if row deleted */
  itemName: string;
  movementType: string;
  amount: number;
  stakeHolderOrReason: string;
  status: string;
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
  requestedByUserName: string;
  ccProfileId?: number | null;
  ccActorName?: string | null;
  ccCheckedAt?: string | null;
  financeActorName?: string | null;
  financeApprovedAt?: string | null;
  managerActorName?: string | null;
  managerAuthorizedAt?: string | null;
  decidedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

/** Fields to request after reject mutations (must match GraphQL `PurchaseRequest` type). */
const HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS = `
        id
        status
        HotelName
        itemName
        quantity
        measuredBy
        notes
        estimatedUnitPrice
        supplierName
        supplierPhone
        category
        storeUserName
        ccProfileId
        ccActorName
        ccApprovedAt
        financeActorName
        financeApprovedAt
        rejectionReason
        createdAt
`;

/** Fields to request after stock-out reject (must match GraphQL `StockOutRequest` type). */
const HOTEL_STOCK_OUT_AFTER_REJECT_FIELDS = `
        id
        status
        HotelName
        itemRegistrationId
        itemName
        movementType
        amount
        stakeHolderOrReason
        requestedByUserName
        ccProfileId
        ccActorName
        decidedAt
        rejectionReason
        createdAt
`;

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

export async function fetchPurchaseRequests(): Promise<PurchaseRequestRow[]> {
  return dedupeHotelListRead("hotel:purchaseRequests", async () => {
    const query = `
    query {
      purchaseRequests {
        id
        HotelName
        itemName
        quantity
        measuredBy
        notes
        estimatedUnitPrice
        supplierName
        supplierPhone
        category
        status
        storeUserName
        ccProfileId
        ccActorName
        ccApprovedAt
        financeActorName
        financeApprovedAt
        managerActorName
        managerAuthorizedAt
        voucherNumber
        voucherDisplay
        pendingUnitPrice
        unitPriceChangeStatus
        rejectionReason
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load purchase requests",
      );
    }
    return response.data.data.purchaseRequests || [];
  });
}

export async function fetchStockOutRequests(): Promise<StockOutRequestRow[]> {
  return dedupeHotelListRead("hotel:stockOutRequests", async () => {
    const query = `
    query {
      stockOutRequests {
        id
        HotelName
        itemRegistrationId
        itemName
        movementType
        amount
        stakeHolderOrReason
        status
        voucherNumber
        voucherDisplay
        requestedByUserName
        ccProfileId
        ccActorName
        ccCheckedAt
        financeActorName
        financeApprovedAt
        managerActorName
        managerAuthorizedAt
        decidedAt
        rejectionReason
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load stock-out requests",
      );
    }
    return response.data.data.stockOutRequests || [];
  });
}

export async function fetchCostControllerProfiles(): Promise<
  CostControllerProfileRow[]
> {
  return dedupeHotelListRead("hotel:costControllerProfiles", async () => {
    const query = `
    query {
      costControllerProfiles {
        id
        displayName
        HotelName
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load CC profiles",
      );
    }
    return response.data.data.costControllerProfiles || [];
  });
}

export async function fetchKitchenBarBeginnings(): Promise<
  KitchenBarBeginningRow[]
> {
  return dedupeHotelListRead("hotel:kitchenBarBeginnings", async () => {
    const query = `
    query {
      kitchenBarBeginnings {
        id
        HotelName
        station
        itemName
        amount
        measuredBy
        monthPeriod
        calendarDate
        stockOutDay
        managementTakenDay
        closingOnHand
        notes
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load beginnings",
      );
    }
    return response.data.data.kitchenBarBeginnings || [];
  });
}

export async function createPurchaseRequestApi(
  input: {
    itemName: string;
    quantity: number;
    measuredBy: string;
    notes?: string;
    estimatedUnitPrice?: number;
    supplierName?: string;
    supplierPhone?: string;
    category?: string;
  },
  options?: { suppressSuccessToast?: boolean },
) {
  const mutation = `
    mutation CreatePurchaseRequest(
      $itemName: String!
      $quantity: Float!
      $measuredBy: String!
      $notes: String
      $estimatedUnitPrice: Float
      $supplierName: String
      $supplierPhone: String
      $category: String
    ) {
      createPurchaseRequest(
        itemName: $itemName
        quantity: $quantity
        measuredBy: $measuredBy
        notes: $notes
        estimatedUnitPrice: $estimatedUnitPrice
        supplierName: $supplierName
        supplierPhone: $supplierPhone
        category: $category
      ) {
        id
        status
        voucherNumber
        voucherDisplay
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Request failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Purchase request submitted");
  }
  invalidateGraphqlListCache("hotel:purchaseRequests");
  return response.data.data.createPurchaseRequest;
}

export async function createStockOutRequestApi(
  input: {
    itemRegistrationId: number;
    movementType: string;
    amount: number;
    stakeHolderOrReason: string;
  },
  options?: { suppressSuccessToast?: boolean },
) {
  const mutation = `
    mutation CreateStockOutRequest(
      $itemRegistrationId: Int!
      $movementType: String!
      $amount: Float!
      $stakeHolderOrReason: String!
    ) {
      createStockOutRequest(
        itemRegistrationId: $itemRegistrationId
        movementType: $movementType
        amount: $amount
        stakeHolderOrReason: $stakeHolderOrReason
      ) {
        id
        status
        voucherNumber
        voucherDisplay
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Request failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Movement submitted for cost control approval");
  }
  invalidateGraphqlListCache([
    "hotel:stockOutRequests",
    "ItemRegistration:list",
  ]);
  return response.data.data.createStockOutRequest;
}

export type HotelMutationToastOptions = {
  /** When true, skip success toasts (used by batch / sequential fallbacks). */
  suppressSuccessToast?: boolean;
  /** When the server omits `ccActorName`, stamp the selected cost controller display name (client). */
  fallbackCcDisplayName?: string;
  /** When the server omits `financeActorName`, stamp the rejecting finance user (client). */
  fallbackFinanceActorName?: string;
};

export async function approvePurchaseRequestCCApi(
  id: number,
  costControllerProfileId: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation ApproveCC($id: Int!, $costControllerProfileId: Int!) {
      approvePurchaseRequestCC(id: $id, costControllerProfileId: $costControllerProfileId) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, costControllerProfileId },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approval failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Checked — forwarded to finance");
  }
  return response.data.data.approvePurchaseRequestCC;
}

export async function rejectPurchaseRequestCCApi(
  id: number,
  reason?: string,
  options?: HotelMutationToastOptions,
): Promise<PurchaseRequestRow> {
  const mutation = `
    mutation RejectCC($id: Int!, $reason: String) {
      rejectPurchaseRequestCC(id: $id, reason: $reason) {
        ${HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS}
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Request rejected");
  }
  const row = response.data.data.rejectPurchaseRequestCC as PurchaseRequestRow;
  const fb = options?.fallbackCcDisplayName?.trim();
  if (fb && !String(row.ccActorName ?? "").trim()) {
    return { ...row, ccActorName: fb };
  }
  return row;
}

export async function approvePurchaseRequestFinanceApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation ApproveFin($id: Int!) {
      approvePurchaseRequestFinance(id: $id) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approval failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Approved — forwarded to manager for authorization");
  }
  return response.data.data.approvePurchaseRequestFinance;
}

export async function authorizePurchaseRequestManagerApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation AuthMgr($id: Int!) {
      authorizePurchaseRequestManager(id: $id) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Purchase request authorized — store may receive goods");
  }
  return response.data.data.authorizePurchaseRequestManager;
}

export async function rejectPurchaseRequestManagerApi(
  id: number,
  reason?: string,
  options?: HotelMutationToastOptions,
): Promise<PurchaseRequestRow> {
  const mutation = `
    mutation RejectMgr($id: Int!, $reason: String) {
      rejectPurchaseRequestManager(id: $id, reason: $reason) {
        ${HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS}
        managerActorName
        managerAuthorizedAt
        voucherNumber
        voucherDisplay
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Request rejected");
  }
  return response.data.data.rejectPurchaseRequestManager as PurchaseRequestRow;
}

export async function submitPurchaseRequestUnitPriceChangeApi(
  id: number,
  proposedUnitPrice: number,
) {
  const mutation = `
    mutation SubmitPrPrice($id: Int!, $proposedUnitPrice: Float!) {
      submitPurchaseRequestUnitPriceChange(id: $id, proposedUnitPrice: $proposedUnitPrice) {
        id
        unitPriceChangeStatus
        pendingUnitPrice
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, proposedUnitPrice },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Submit failed");
  }
  toast.success("Unit price revision submitted for approval");
  return response.data.data.submitPurchaseRequestUnitPriceChange;
}

export async function checkPurchaseRequestUnitPriceCCApi(
  id: number,
  costControllerProfileId: number,
) {
  const mutation = `
    mutation CheckPrPriceCC($id: Int!, $costControllerProfileId: Int!) {
      checkPurchaseRequestUnitPriceCC(id: $id, costControllerProfileId: $costControllerProfileId) {
        id
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, costControllerProfileId },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Check failed");
  }
  toast.success("Price revision checked — forwarded to finance");
  return response.data.data.checkPurchaseRequestUnitPriceCC;
}

export async function approvePurchaseRequestUnitPriceFinanceApi(id: number) {
  const mutation = `
    mutation ApprovePrPriceFin($id: Int!) {
      approvePurchaseRequestUnitPriceFinance(id: $id) {
        id
        unitPriceChangeStatus
        estimatedUnitPrice
      }
    }
  `;
  const response = await api.post(API_URL, { query: mutation, variables: { id } });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approval failed");
  }
  toast.success("Price revision approved — forwarded to manager");
  return response.data.data.approvePurchaseRequestUnitPriceFinance;
}

export async function authorizePurchaseRequestUnitPriceManagerApi(id: number) {
  const mutation = `
    mutation AuthPrPriceMgr($id: Int!) {
      authorizePurchaseRequestUnitPriceManager(id: $id) {
        id
        unitPriceChangeStatus
        estimatedUnitPrice
      }
    }
  `;
  const response = await api.post(API_URL, { query: mutation, variables: { id } });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  toast.success("Unit price revision authorized");
  return response.data.data.authorizePurchaseRequestUnitPriceManager;
}

export async function rejectPurchaseRequestUnitPriceApi(id: number, reason?: string) {
  const mutation = `
    mutation RejectPrPrice($id: Int!, $reason: String) {
      rejectPurchaseRequestUnitPrice(id: $id, reason: $reason) {
        id
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Reject failed");
  }
  toast.success("Price revision rejected");
  return response.data.data.rejectPurchaseRequestUnitPrice;
}

export async function submitItemRegistrationUnitPriceChangeApi(
  id: number,
  proposedUnitPrice: number,
) {
  const mutation = `
    mutation SubmitInvPrice($id: Int!, $proposedUnitPrice: Float!) {
      submitItemRegistrationUnitPriceChange(id: $id, proposedUnitPrice: $proposedUnitPrice) {
        id
        pendingUnitPrice
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, proposedUnitPrice },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Submit failed");
  }
  toast.success("Unit price revision submitted");
  return response.data.data.submitItemRegistrationUnitPriceChange;
}

export async function checkItemRegistrationUnitPriceCCApi(
  id: number,
  costControllerProfileId: number,
) {
  const mutation = `
    mutation CheckInvPriceCC($id: Int!, $costControllerProfileId: Int!) {
      checkItemRegistrationUnitPriceCC(id: $id, costControllerProfileId: $costControllerProfileId) {
        id
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, costControllerProfileId },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Check failed");
  }
  toast.success("Unit price revision checked");
  return response.data.data.checkItemRegistrationUnitPriceCC;
}

export async function approveItemRegistrationUnitPriceFinanceApi(id: number) {
  const mutation = `
    mutation ApproveInvPriceFinance($id: Int!) {
      approveItemRegistrationUnitPriceFinance(id: $id) {
        id
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approve failed");
  }
  toast.success("Unit price revision approved");
  return response.data.data.approveItemRegistrationUnitPriceFinance;
}

export async function authorizeItemRegistrationUnitPriceManagerApi(id: number) {
  const mutation = `
    mutation AuthorizeInvPriceManager($id: Int!) {
      authorizeItemRegistrationUnitPriceManager(id: $id) {
        id
        unitPrice
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  toast.success("Unit price revision authorized");
  return response.data.data.authorizeItemRegistrationUnitPriceManager;
}

export async function rejectItemRegistrationUnitPriceApi(
  id: number,
  reason?: string,
) {
  const mutation = `
    mutation RejectInvPrice($id: Int!, $reason: String) {
      rejectItemRegistrationUnitPrice(id: $id, reason: $reason) {
        id
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Reject failed");
  }
  toast.success("Price revision rejected");
  return response.data.data.rejectItemRegistrationUnitPrice;
}

export async function checkItemRegistrationCCApi(
  id: number,
  costControllerProfileId: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation CheckRegCC($id: Int!, $costControllerProfileId: Int!) {
      checkItemRegistrationCC(id: $id, costControllerProfileId: $costControllerProfileId) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, costControllerProfileId },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Check failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Checked — forwarded to finance");
  }
  return response.data.data.checkItemRegistrationCC;
}

export async function approveItemRegistrationFinanceApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation ApproveRegFin($id: Int!) {
      approveItemRegistrationFinance(id: $id) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approval failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Approved — forwarded to manager");
  }
  return response.data.data.approveItemRegistrationFinance;
}

export async function rejectItemRegistrationFinanceApi(
  id: number,
  reason?: string,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation RejectRegFin($id: Int!, $reason: String) {
      rejectItemRegistrationFinance(id: $id, reason: $reason) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Rejection failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Receipt voided — item will not appear in inventory");
  }
  return response.data.data.rejectItemRegistrationFinance;
}

export async function authorizeItemRegistrationManagerApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation AuthRegMgr($id: Int!) {
      authorizeItemRegistrationManager(id: $id) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Registration authorized — item is now in inventory");
  }
  return response.data.data.authorizeItemRegistrationManager;
}

export async function checkStockOutRequestCCApi(
  id: number,
  costControllerProfileId: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation CheckSO($id: Int!, $costControllerProfileId: Int!) {
      checkStockOutRequestCC(id: $id, costControllerProfileId: $costControllerProfileId) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, costControllerProfileId },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Check failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Checked — forwarded to finance");
  }
  return response.data.data.checkStockOutRequestCC;
}

export async function approveStockOutRequestFinanceApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation ApproveSOFin($id: Int!) {
      approveStockOutRequestFinance(id: $id) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approval failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Approved — forwarded to manager");
  }
  return response.data.data.approveStockOutRequestFinance;
}

export async function authorizeStockOutRequestManagerApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation AuthSOMgr($id: Int!) {
      authorizeStockOutRequestManager(id: $id) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Movement authorized and applied to inventory");
  }
  return response.data.data.authorizeStockOutRequestManager;
}

export async function authorizeHotelCreditCompanyApi(id: number) {
  const mutation = `
    mutation AuthCo($id: Int!) {
      authorizeHotelCreditCompany(id: $id) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  invalidateGraphqlListCache("hotel:creditCompanies");
  toast.success("Company authorized for corporate meals");
  return response.data.data.authorizeHotelCreditCompany;
}

export async function rejectHotelCreditCompanyApi(id: number, reason?: string) {
  const mutation = `
    mutation RejectCo($id: Int!, $reason: String) {
      rejectHotelCreditCompany(id: $id, reason: $reason) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Rejection failed");
  }
  invalidateGraphqlListCache("hotel:creditCompanies");
  toast.success("Company registration rejected");
  return response.data.data.rejectHotelCreditCompany;
}

export async function rejectPurchaseRequestFinanceApi(
  id: number,
  reason?: string,
  options?: HotelMutationToastOptions,
): Promise<PurchaseRequestRow> {
  const mutation = `
    mutation RejectFin($id: Int!, $reason: String) {
      rejectPurchaseRequestFinance(id: $id, reason: $reason) {
        ${HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS}
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Request rejected");
  }
  const row = response.data.data.rejectPurchaseRequestFinance as PurchaseRequestRow;
  const fb = options?.fallbackFinanceActorName?.trim();
  if (fb && !String(row.financeActorName ?? "").trim()) {
    return { ...row, financeActorName: fb };
  }
  return row;
}

export async function approveStockOutRequestApi(
  id: number,
  costControllerProfileId: number,
  options?: HotelMutationToastOptions,
) {
  return checkStockOutRequestCCApi(id, costControllerProfileId, options);
}

export async function rejectStockOutRequestApi(
  id: number,
  reason?: string,
  options?: HotelMutationToastOptions,
): Promise<StockOutRequestRow> {
  const mutation = `
    mutation RejectSO($id: Int!, $reason: String) {
      rejectStockOutRequest(id: $id, reason: $reason) {
        ${HOTEL_STOCK_OUT_AFTER_REJECT_FIELDS}
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Request rejected");
  }
  const row = response.data.data.rejectStockOutRequest as StockOutRequestRow;
  const fb = options?.fallbackCcDisplayName?.trim();
  if (fb && !String(row.ccActorName ?? "").trim()) {
    return { ...row, ccActorName: fb };
  }
  return row;
}

function graphqlLooksLikeMissingBatchField(message: string): boolean {
  const m = String(message || "");
  return /Unknown field|Cannot query field|Unknown argument/i.test(m);
}

/** GraphQL `errors[].message` from an Axios error body (many gateways use HTTP 400). */
function graphqlMessagesFromAxiosError(e: unknown): string | null {
  if (!axios.isAxiosError(e)) return null;
  const data = e.response?.data as
    | { errors?: Array<{ message?: string }> }
    | undefined;
  const list = data?.errors;
  if (!Array.isArray(list) || !list.length) return null;
  const parts = list
    .map((x) => String(x?.message ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join("; ") : null;
}

/** Prefer GraphQL error text from the response body; otherwise the thrown message. */
function graphqlUserVisibleMessage(e: unknown): string {
  return (
    graphqlMessagesFromAxiosError(e) ??
    (e instanceof Error ? e.message : String(e ?? ""))
  );
}

/**
 * When a batch GraphQL mutation is missing or the gateway rejects the combined
 * request (common: HTTP 400), fall back to per-id mutations so cost control /
 * finance can still clear queues.
 */
function hotelBatchMutationShouldFallbackToSequential(e: unknown): boolean {
  if (isSessionExpiredError(e)) return false;
  const msg = graphqlUserVisibleMessage(e);
  if (graphqlLooksLikeMissingBatchField(msg)) return true;
  if (axios.isAxiosError(e)) {
    const s = e.response?.status;
    if (typeof s === "number") {
      if (s === 401 || s === 403) return false;
      if (s >= 400 && s < 600) return true;
    }
  }
  const sc = msg.match(/request failed with status code\s*(\d{3})/i);
  if (sc) {
    const code = Number(sc[1]);
    if (code === 401 || code === 403) return false;
    if (code >= 400 && code < 600) return true;
  }
  return false;
}

async function postHotelMutation<T>(query: string, variables: object): Promise<T> {
  const response = await api.post(API_URL, { query, variables });
  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0]?.message || "Request failed");
  }
  return response.data.data as T;
}

/**
 * When `NEXT_PUBLIC_HOTEL_BATCH_MUTATIONS` is `"false"`, skip batch GraphQL
 * mutations and use sequential fan-out only (avoids a failed batch round-trip
 * until the backend implements batch resolvers).
 */
function hotelBatchGraphqlAttemptsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HOTEL_BATCH_MUTATIONS !== "false";
}

async function sequentialApprovePurchaseRequestsFinance(
  unique: number[],
): Promise<{ id: number; status: string }[]> {
  const ok: { id: number; status: string }[] = [];
  const failed: string[] = [];
  for (const id of unique) {
    try {
      ok.push(
        await approvePurchaseRequestFinanceApi(id, {
          suppressSuccessToast: true,
        }),
      );
    } catch (err: unknown) {
      failed.push(
        `#${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (ok.length) toast.success(`Approved ${ok.length} payment(s)`);
  if (failed.length)
    toast.error(`Some approvals failed (${failed.length})`, {
      description: failed.slice(0, 5).join(" · "),
    });
  return ok;
}

async function sequentialRejectPurchaseRequestsFinance(
  unique: number[],
  reason: string,
  fallbackFinanceActorName?: string,
): Promise<PurchaseRequestRow[]> {
  const ok: PurchaseRequestRow[] = [];
  const failed: string[] = [];
  for (const id of unique) {
    try {
      ok.push(
        await rejectPurchaseRequestFinanceApi(id, reason, {
          suppressSuccessToast: true,
          fallbackFinanceActorName,
        }),
      );
    } catch (err: unknown) {
      failed.push(
        `#${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (ok.length) toast.success(`Rejected ${ok.length} request(s)`);
  if (failed.length)
    toast.error(`Some rejections failed (${failed.length})`, {
      description: failed.slice(0, 5).join(" · "),
    });
  return ok;
}

async function sequentialApprovePurchaseRequestsCC(
  unique: number[],
  costControllerProfileId: number,
): Promise<{ id: number; status: string }[]> {
  const ok: { id: number; status: string }[] = [];
  const failed: string[] = [];
  for (const id of unique) {
    try {
      ok.push(
        await approvePurchaseRequestCCApi(id, costControllerProfileId, {
          suppressSuccessToast: true,
        }),
      );
    } catch (err: unknown) {
      failed.push(
        `#${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (ok.length) toast.success(`Forwarded ${ok.length} request(s) to finance`);
  if (failed.length)
    toast.error(`Some approvals failed (${failed.length})`, {
      description: failed.slice(0, 5).join(" · "),
    });
  return ok;
}

async function sequentialRejectPurchaseRequestsCC(
  unique: number[],
  reason: string,
  fallbackCcDisplayName?: string,
): Promise<PurchaseRequestRow[]> {
  const ok: PurchaseRequestRow[] = [];
  const failed: string[] = [];
  for (const id of unique) {
    try {
      ok.push(
        await rejectPurchaseRequestCCApi(id, reason, {
          suppressSuccessToast: true,
          fallbackCcDisplayName,
        }),
      );
    } catch (err: unknown) {
      failed.push(
        `#${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (ok.length) toast.success(`Rejected ${ok.length} request(s)`);
  if (failed.length)
    toast.error(`Some rejections failed (${failed.length})`, {
      description: failed.slice(0, 5).join(" · "),
    });
  return ok;
}

async function sequentialApproveStockOutRequests(
  unique: number[],
  costControllerProfileId: number,
): Promise<{ id: number; status: string }[]> {
  const ok: { id: number; status: string }[] = [];
  const failed: string[] = [];
  for (const id of unique) {
    try {
      ok.push(
        await approveStockOutRequestApi(id, costControllerProfileId, {
          suppressSuccessToast: true,
        }),
      );
    } catch (err: unknown) {
      failed.push(
        `#${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (ok.length)
    toast.success(`Applied ${ok.length} movement(s) to inventory`);
  if (failed.length)
    toast.error(`Some approvals failed (${failed.length})`, {
      description: failed.slice(0, 5).join(" · "),
    });
  return ok;
}

async function sequentialRejectStockOutRequests(
  unique: number[],
  reason: string,
  fallbackCcDisplayName?: string,
): Promise<StockOutRequestRow[]> {
  const ok: StockOutRequestRow[] = [];
  const failed: string[] = [];
  for (const id of unique) {
    try {
      ok.push(
        await rejectStockOutRequestApi(id, reason, {
          suppressSuccessToast: true,
          fallbackCcDisplayName,
        }),
      );
    } catch (err: unknown) {
      failed.push(
        `#${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (ok.length) toast.success(`Rejected ${ok.length} movement(s)`);
  if (failed.length)
    toast.error(`Some rejections failed (${failed.length})`, {
      description: failed.slice(0, 5).join(" · "),
    });
  return ok;
}

/** Batch finance approve — uses server transaction when the backend exposes it; otherwise falls back to sequential calls. */
export async function approvePurchaseRequestsFinanceBatchApi(
  ids: number[],
): Promise<{ id: number; status: string }[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await approvePurchaseRequestFinanceApi(unique[0]);
    return [{ id: one.id, status: one.status }];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialApprovePurchaseRequestsFinance(unique);
  }
  const mutation = `
    mutation ApprovePurchaseRequestsFinanceBatch($ids: [Int!]!) {
      approvePurchaseRequestsFinanceBatch(ids: $ids) {
        id
        status
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      approvePurchaseRequestsFinanceBatch: { id: number; status: string }[];
    }>(mutation, { ids: unique });
    const rows = data.approvePurchaseRequestsFinanceBatch;
    toast.success(`Approved ${rows.length} payment(s)`);
    return rows;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialApprovePurchaseRequestsFinance(unique);
  }
}

export async function rejectPurchaseRequestsFinanceBatchApi(
  ids: number[],
  reason = "Rejected by finance",
  fallbackFinanceActorName?: string,
): Promise<PurchaseRequestRow[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await rejectPurchaseRequestFinanceApi(unique[0], reason, {
      fallbackFinanceActorName,
    });
    return [one];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialRejectPurchaseRequestsFinance(
      unique,
      reason,
      fallbackFinanceActorName,
    );
  }
  const mutation = `
    mutation RejectPurchaseRequestsFinanceBatch($ids: [Int!]!, $reason: String) {
      rejectPurchaseRequestsFinanceBatch(ids: $ids, reason: $reason) {
        ${HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS}
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      rejectPurchaseRequestsFinanceBatch: PurchaseRequestRow[];
    }>(mutation, { ids: unique, reason });
    const rows = data.rejectPurchaseRequestsFinanceBatch;
    const fb = fallbackFinanceActorName?.trim();
    const merged = fb
      ? rows.map((r) =>
          String(r.financeActorName ?? "").trim()
            ? r
            : { ...r, financeActorName: fb },
        )
      : rows;
    toast.success(`Rejected ${merged.length} request(s)`);
    return merged;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialRejectPurchaseRequestsFinance(
      unique,
      reason,
      fallbackFinanceActorName,
    );
  }
}

export async function approvePurchaseRequestsCCBatchApi(
  ids: number[],
  costControllerProfileId: number,
): Promise<{ id: number; status: string }[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await approvePurchaseRequestCCApi(
      unique[0],
      costControllerProfileId,
    );
    return [{ id: one.id, status: one.status }];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialApprovePurchaseRequestsCC(unique, costControllerProfileId);
  }
  const mutation = `
    mutation ApprovePurchaseRequestsCCBatch($ids: [Int!]!, $costControllerProfileId: Int!) {
      approvePurchaseRequestsCCBatch(ids: $ids, costControllerProfileId: $costControllerProfileId) {
        id
        status
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      approvePurchaseRequestsCCBatch: { id: number; status: string }[];
    }>(mutation, { ids: unique, costControllerProfileId });
    const rows = data.approvePurchaseRequestsCCBatch;
    toast.success(`Forwarded ${rows.length} request(s) to finance`);
    return rows;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialApprovePurchaseRequestsCC(unique, costControllerProfileId);
  }
}

export async function rejectPurchaseRequestsCCBatchApi(
  ids: number[],
  reason = "Rejected by cost control",
  fallbackCcDisplayName?: string,
): Promise<PurchaseRequestRow[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await rejectPurchaseRequestCCApi(unique[0], reason, {
      fallbackCcDisplayName,
    });
    return [one];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialRejectPurchaseRequestsCC(
      unique,
      reason,
      fallbackCcDisplayName,
    );
  }
  const mutation = `
    mutation RejectPurchaseRequestsCCBatch($ids: [Int!]!, $reason: String) {
      rejectPurchaseRequestsCCBatch(ids: $ids, reason: $reason) {
        ${HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS}
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      rejectPurchaseRequestsCCBatch: PurchaseRequestRow[];
    }>(mutation, { ids: unique, reason });
    const rows = data.rejectPurchaseRequestsCCBatch;
    const fb = fallbackCcDisplayName?.trim();
    const merged = fb
      ? rows.map((r) =>
          String(r.ccActorName ?? "").trim()
            ? r
            : { ...r, ccActorName: fb },
        )
      : rows;
    toast.success(`Rejected ${merged.length} request(s)`);
    return merged;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialRejectPurchaseRequestsCC(
      unique,
      reason,
      fallbackCcDisplayName,
    );
  }
}

export async function approveStockOutRequestsBatchApi(
  ids: number[],
  costControllerProfileId: number,
): Promise<{ id: number; status: string }[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await approveStockOutRequestApi(
      unique[0],
      costControllerProfileId,
    );
    return [{ id: one.id, status: one.status }];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialApproveStockOutRequests(unique, costControllerProfileId);
  }
  const mutation = `
    mutation ApproveStockOutRequestsBatch($ids: [Int!]!, $costControllerProfileId: Int!) {
      approveStockOutRequestsBatch(ids: $ids, costControllerProfileId: $costControllerProfileId) {
        id
        status
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      approveStockOutRequestsBatch: { id: number; status: string }[];
    }>(mutation, { ids: unique, costControllerProfileId });
    const rows = data.approveStockOutRequestsBatch;
    toast.success(`Applied ${rows.length} movement(s) to inventory`);
    return rows;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialApproveStockOutRequests(unique, costControllerProfileId);
  }
}

export async function rejectStockOutRequestsBatchApi(
  ids: number[],
  reason = "Rejected by cost control",
  fallbackCcDisplayName?: string,
): Promise<StockOutRequestRow[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await rejectStockOutRequestApi(unique[0], reason, {
      fallbackCcDisplayName,
    });
    return [one];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialRejectStockOutRequests(
      unique,
      reason,
      fallbackCcDisplayName,
    );
  }
  const mutation = `
    mutation RejectStockOutRequestsBatch($ids: [Int!]!, $reason: String) {
      rejectStockOutRequestsBatch(ids: $ids, reason: $reason) {
        ${HOTEL_STOCK_OUT_AFTER_REJECT_FIELDS}
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      rejectStockOutRequestsBatch: StockOutRequestRow[];
    }>(mutation, { ids: unique, reason });
    const rows = data.rejectStockOutRequestsBatch;
    const fb = fallbackCcDisplayName?.trim();
    const merged = fb
      ? rows.map((r) =>
          String(r.ccActorName ?? "").trim()
            ? r
            : { ...r, ccActorName: fb },
        )
      : rows;
    toast.success(`Rejected ${merged.length} movement(s)`);
    return merged;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialRejectStockOutRequests(
      unique,
      reason,
      fallbackCcDisplayName,
    );
  }
}

export async function createCostControllerProfileApi(displayName: string) {
  const mutation = `
    mutation Ccp($displayName: String!) {
      createCostControllerProfile(displayName: $displayName) {
        id
        displayName
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { displayName },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Failed to add profile");
  }
  toast.success("Cost controller identity added");
  return response.data.data.createCostControllerProfile;
}

export async function deleteCostControllerProfileApi(id: number) {
  const mutation = `
    mutation Dcp($id: Int!) {
      deleteCostControllerProfile(id: $id)
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Delete failed");
  }
  toast.success("Profile removed");
}

export async function createKitchenBarBeginningApi(vars: {
  station: string;
  itemName: string;
  amount: number;
  measuredBy: string;
  managementTakenDay?: number;
  monthPeriod?: string;
  calendarDate: string;
  notes?: string;
}) {
  const mutation = `
    mutation Kbb(
      $station: String!
      $itemName: String!
      $amount: Float!
      $measuredBy: String!
      $managementTakenDay: Float
      $monthPeriod: String
      $calendarDate: String!
      $notes: String
    ) {
      createKitchenBarBeginning(
        station: $station
        itemName: $itemName
        amount: $amount
        measuredBy: $measuredBy
        managementTakenDay: $managementTakenDay
        monthPeriod: $monthPeriod
        calendarDate: $calendarDate
        notes: $notes
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, { query: mutation, variables: vars });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Save failed");
  }
  toast.success("Beginning recorded");
  return response.data.data.createKitchenBarBeginning;
}

export async function updateKitchenBarBeginningApi(vars: {
  id: number;
  station: string;
  itemName: string;
  amount: number;
  measuredBy: string;
  managementTakenDay?: number;
  monthPeriod?: string;
  calendarDate: string;
  notes?: string;
}) {
  const mutation = `
    mutation Ukbb(
      $id: Int!
      $station: String!
      $itemName: String!
      $amount: Float!
      $measuredBy: String!
      $managementTakenDay: Float
      $monthPeriod: String
      $calendarDate: String!
      $notes: String
    ) {
      updateKitchenBarBeginning(
        id: $id
        station: $station
        itemName: $itemName
        amount: $amount
        measuredBy: $measuredBy
        managementTakenDay: $managementTakenDay
        monthPeriod: $monthPeriod
        calendarDate: $calendarDate
        notes: $notes
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, { query: mutation, variables: vars });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  toast.success("Updated");
  return response.data.data.updateKitchenBarBeginning;
}

export async function deleteKitchenBarBeginningApi(id: number) {
  const mutation = `
    mutation Dkbb($id: Int!) {
      deleteKitchenBarBeginning(id: $id)
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Delete failed");
  }
  toast.success("Removed");
}

export async function fetchKitchenBarRollupSnapshots(
  fromYmd: string,
  toYmd: string,
): Promise<KitchenBarMonthlySnapshotRow[]> {
  const key = `hotel:kitchenBarRollupSnapshots:${fromYmd}:${toYmd}`;
  return dedupeHotelListRead(key, async () => {
    const query = `
    query RollupSnap($fromYmd: String!, $toYmd: String!) {
      kitchenBarRollupSnapshots(fromYmd: $fromYmd, toYmd: $toYmd) {
        id
        HotelName
        station
        itemName
        monthPeriod
        periodFrom
        periodTo
        totalImpliedSales
        lastDayClosingOnHand
        syncedAt
      }
    }
  `;
    const response = await api.post(API_URL, {
      query,
      variables: { fromYmd, toYmd },
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load roll-up snapshots",
      );
    }
    return response.data.data.kitchenBarRollupSnapshots || [];
  });
}

const KITCHEN_BAR_ROLLUP_SYNC_SELECTION = `
        id
        itemName
        station
        totalImpliedSales
        lastDayClosingOnHand
        syncedAt
`;

/** True when the server rejected the primary sync for role/policy reasons (retry alt). */
function rollupSyncRoleDenied(message: string): boolean {
  const m = String(message || "").toLowerCase();
  return (
    /not authorized/.test(m) ||
    /unauthorized/.test(m) ||
    /forbidden/.test(m) ||
    /permission denied/.test(m) ||
    /cost control/.test(m) ||
    /cost controller/.test(m) ||
    /\bonly\b.*\b(cost control|cost controller)\b/.test(m) ||
    /\b(cost control|cost controller)\b.*\bonly\b/.test(m) ||
    (/administrator/.test(m) &&
      /permission|grant|allowed|authorize|access|role/.test(m)) ||
    /(do not|don't) have permission/.test(m) ||
    /insufficient privilege/.test(m) ||
    /not allowed to perform/.test(m)
  );
}

/**
 * Alternate roll-up sync mutation tried after `syncKitchenBarRollup` returns a role error.
 * Defaults to `syncKitchenBarRollupForManager` when unset. Set
 * `NEXT_PUBLIC_HOTEL_MANAGER_KITCHEN_BAR_ROLLUP_SYNC_FIELD` to override the name, or to
 * `false` to disable the retry (only the primary mutation is used).
 */
function managerKitchenBarRollupSyncGraphqlField(): string | null {
  const raw = process.env.NEXT_PUBLIC_HOTEL_MANAGER_KITCHEN_BAR_ROLLUP_SYNC_FIELD;
  if (raw != null && String(raw).trim().toLowerCase() === "false") return null;
  if (raw != null) {
    const trimmed = String(raw).trim();
    return trimmed.length ? trimmed : null;
  }
  return "syncKitchenBarRollupForManager";
}

async function postKitchenBarRollupSyncField(
  fieldName: string,
  fromYmd: string,
  toYmd: string,
): Promise<unknown> {
  const mutation = `
    mutation SyncKitchenBarRollupDyn($fromYmd: String!, $toYmd: String!) {
      ${fieldName}(fromYmd: $fromYmd, toYmd: $toYmd) {
        ${KITCHEN_BAR_ROLLUP_SYNC_SELECTION}
      }
    }
  `;
  try {
    const response = await api.post(API_URL, {
      query: mutation,
      variables: { fromYmd, toYmd },
    });
    if (response.data.errors?.length) {
      throw new Error(
        response.data.errors[0]?.message || "Sync failed",
      );
    }
    const data = response.data.data as Record<string, unknown>;
    return data[fieldName];
  } catch (e: unknown) {
    const gql = graphqlMessagesFromAxiosError(e);
    if (gql) throw new Error(gql);
    throw e;
  }
}

/**
 * Rebuilds kitchen/bar monthly roll-up snapshot rows from daily beginning rows for
 * [fromYmd, toYmd]. Calls `syncKitchenBarRollup` first; on a role/permission denial,
 * retries using `NEXT_PUBLIC_HOTEL_MANAGER_KITCHEN_BAR_ROLLUP_SYNC_FIELD` or the
 * default `syncKitchenBarRollupForManager` when that resolver exists for Manager.
 */
export async function syncKitchenBarRollupApi(
  fromYmd: string,
  toYmd: string,
  options?: { quiet?: boolean },
) {
  const quiet = options?.quiet;
  const altField = managerKitchenBarRollupSyncGraphqlField();

  const finish = () => {
    if (!quiet) {
      toast.success("Roll-up synced from daily rows for selected dates");
    }
  };

  try {
    const rows = await postKitchenBarRollupSyncField(
      "syncKitchenBarRollup",
      fromYmd,
      toYmd,
    );
    finish();
    return rows;
  } catch (first: unknown) {
    const msg = graphqlUserVisibleMessage(first);
    if (!altField || !rollupSyncRoleDenied(msg)) {
      throw first;
    }
    try {
      const rows = await postKitchenBarRollupSyncField(altField, fromYmd, toYmd);
      finish();
      return rows;
    } catch (second: unknown) {
      const inner = graphqlUserVisibleMessage(second);
      if (graphqlLooksLikeMissingBatchField(inner)) {
        throw first;
      }
      throw second;
    }
  }
}

export async function fetchHotelCreditCompanies(): Promise<
  HotelCreditCompanyRow[]
> {
  return dedupeHotelListRead("hotel:creditCompanies", async () => {
    const query = `
    query {
      hotelCreditCompanies {
        id
        HotelName
        companyName
        companyTinNumber
        contactName
        phoneNumber
        email
        payTiming
        approvalStatus
        managerActorName
        managerAuthorizedAt
        rejectionReason
        creditLevel
        creditLimit
        timeInterval
        timeFrame
        hotelCorporateCreditTierId
        allowedMenuJson
        dealNotes
        imageUrl
        paidAmount
        createdAt
      }
    }
  `;
  const response = await api.post(API_URL, { query });
  if (response.data.errors) {
    throw new Error(
      response.data.errors[0]?.message || "Failed to load companies",
    );
  }
  return response.data.data.hotelCreditCompanies || [];
  });
}

export async function fetchHotelCorporateCreditTiers(): Promise<
  HotelCorporateCreditTierRow[]
> {
  return dedupeHotelListRead("hotel:corporateCreditTiers", async () => {
    const query = `
    query {
      hotelCorporateCreditTiers {
        id
        HotelName
        name
        creditCeiling
        timeInterval
        timeFrame
        sortOrder
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load credit tiers",
      );
    }
    return response.data.data.hotelCorporateCreditTiers || [];
  });
}

export async function fetchHotelCreditParties(
  companyId: number,
): Promise<HotelCreditPartyRow[]> {
  return dedupeHotelListRead(`hotel:creditParties:${companyId}`, async () => {
    const query = `
    query Hcp($companyId: Int!) {
      hotelCreditParties(companyId: $companyId) {
        id
        HotelName
        companyId
        displayName
        phoneNumber
        sex
        notes
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, {
      query,
      variables: { companyId },
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load parties",
      );
    }
    return response.data.data.hotelCreditParties || [];
  });
}

export async function fetchHotelCreditConsumptions(
  fromIso: string,
  toIso: string,
): Promise<HotelCreditConsumptionRow[]> {
  const key = `hotel:creditConsumptions:${fromIso}:${toIso}`;
  return dedupeHotelListRead(key, async () => {
    const query = `
    query Hcc($from: DateTime!, $to: DateTime!) {
      hotelCreditConsumptions(from: $from, to: $to) {
        id
        HotelName
        companyId
        partyId
        linesJson
        totalAmount
        occurredAt
        recordedBy
      }
    }
  `;
    const response = await api.post(API_URL, {
      query,
      variables: { from: fromIso, to: toIso },
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load consumptions",
      );
    }
    return response.data.data.hotelCreditConsumptions || [];
  });
}

export async function createHotelCreditCompanyApi(input: {
  companyName: string;
  companyTinNumber?: string;
  contactName?: string;
  phoneNumber?: string;
  email?: string;
  payTiming?: string;
  hotelCorporateCreditTierId: number;
  allowedMenuJson: string;
  dealNotes?: string;
  imageUrl?: string;
  creditLimit: number;
  paidAmount?: number;
}) {
  const mutation = `
    mutation HccCreate(
      $companyName: String!
      $companyTinNumber: String
      $contactName: String
      $phoneNumber: String
      $email: String
      $payTiming: String
      $hotelCorporateCreditTierId: Int!
      $allowedMenuJson: String!
      $dealNotes: String
      $imageUrl: String
      $creditLimit: Float
      $paidAmount: Float
    ) {
      createHotelCreditCompany(
        companyName: $companyName
        companyTinNumber: $companyTinNumber
        contactName: $contactName
        phoneNumber: $phoneNumber
        email: $email
        payTiming: $payTiming
        hotelCorporateCreditTierId: $hotelCorporateCreditTierId
        allowedMenuJson: $allowedMenuJson
        dealNotes: $dealNotes
        imageUrl: $imageUrl
        creditLimit: $creditLimit
        paidAmount: $paidAmount
      ) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Save failed");
  }
  invalidateGraphqlListCache("hotel:creditCompanies");
  toast.success("Company submitted — awaiting authorization");
  return response.data.data.createHotelCreditCompany;
}

export async function updateHotelCreditCompanyApi(input: {
  id: number;
  companyName: string;
  companyTinNumber?: string;
  contactName?: string;
  phoneNumber?: string;
  email?: string;
  payTiming?: string;
  hotelCorporateCreditTierId?: number | null;
  allowedMenuJson: string;
  dealNotes?: string;
  imageUrl?: string;
  creditLimit?: number;
  paidAmount?: number;
}) {
  const mutation = `
    mutation HccUp(
      $id: Int!
      $companyName: String!
      $companyTinNumber: String
      $contactName: String
      $phoneNumber: String
      $email: String
      $payTiming: String
      $hotelCorporateCreditTierId: Int
      $allowedMenuJson: String!
      $dealNotes: String
      $imageUrl: String
      $creditLimit: Float
      $paidAmount: Float
    ) {
      updateHotelCreditCompany(
        id: $id
        companyName: $companyName
        companyTinNumber: $companyTinNumber
        contactName: $contactName
        phoneNumber: $phoneNumber
        email: $email
        payTiming: $payTiming
        hotelCorporateCreditTierId: $hotelCorporateCreditTierId
        allowedMenuJson: $allowedMenuJson
        dealNotes: $dealNotes
        imageUrl: $imageUrl
        creditLimit: $creditLimit
        paidAmount: $paidAmount
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  invalidateGraphqlListCache("hotel:creditCompanies");
  toast.success("Company updated");
  return response.data.data.updateHotelCreditCompany;
}

export async function deleteHotelCreditCompanyApi(id: number) {
  const mutation = `
    mutation HccDel($id: Int!) {
      deleteHotelCreditCompany(id: $id)
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Delete failed");
  }
  invalidateGraphqlListCache("hotel:creditCompanies");
  toast.success("Company removed");
}

export async function createHotelCorporateCreditTierApi(input: {
  name: string;
  creditCeiling: number;
  timeInterval: number;
  timeFrame: string;
  sortOrder?: number;
}) {
  const mutation = `
    mutation HtCreate(
      $name: String!
      $creditCeiling: Float!
      $timeInterval: Int!
      $timeFrame: String!
      $sortOrder: Int
    ) {
      createHotelCorporateCreditTier(
        name: $name
        creditCeiling: $creditCeiling
        timeInterval: $timeInterval
        timeFrame: $timeFrame
        sortOrder: $sortOrder
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Save failed");
  }
  invalidateGraphqlListCache("hotel:corporateCreditTiers");
  toast.success("Credit tier saved");
  return response.data.data.createHotelCorporateCreditTier;
}

export async function updateHotelCorporateCreditTierApi(input: {
  id: number;
  name: string;
  creditCeiling: number;
  timeInterval: number;
  timeFrame: string;
  sortOrder?: number;
}) {
  const mutation = `
    mutation HtUp(
      $id: Int!
      $name: String!
      $creditCeiling: Float!
      $timeInterval: Int!
      $timeFrame: String!
      $sortOrder: Int
    ) {
      updateHotelCorporateCreditTier(
        id: $id
        name: $name
        creditCeiling: $creditCeiling
        timeInterval: $timeInterval
        timeFrame: $timeFrame
        sortOrder: $sortOrder
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  invalidateGraphqlListCache("hotel:corporateCreditTiers");
  toast.success("Tier updated");
  return response.data.data.updateHotelCorporateCreditTier;
}

export async function deleteHotelCorporateCreditTierApi(id: number) {
  const mutation = `
    mutation HtDel($id: Int!) {
      deleteHotelCorporateCreditTier(id: $id)
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Delete failed");
  }
  invalidateGraphqlListCache("hotel:corporateCreditTiers");
  toast.success("Tier removed");
}

export async function createHotelCreditPartyApi(input: {
  companyId: number;
  displayName: string;
  phoneNumber?: string;
  sex?: string;
  notes?: string;
}) {
  const mutation = `
    mutation HcpCreate(
      $companyId: Int!
      $displayName: String!
      $phoneNumber: String
      $sex: String
      $notes: String
    ) {
      createHotelCreditParty(
        companyId: $companyId
        displayName: $displayName
        phoneNumber: $phoneNumber
        sex: $sex
        notes: $notes
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Save failed");
  }
  toast.success("Guest / staff registered");
  return response.data.data.createHotelCreditParty;
}

export async function createHotelCreditConsumptionApi(input: {
  companyId: number;
  partyId?: number;
  guestName?: string;
  guestPhone?: string;
  linesJson: string;
  totalAmount: number;
  occurredAt?: string;
  suppressSuccessToast?: boolean;
}) {
  const mutation = `
    mutation Hccon(
      $companyId: Int!
      $partyId: Int
      $guestName: String
      $guestPhone: String
      $linesJson: String!
      $totalAmount: Float!
      $occurredAt: DateTime
    ) {
      createHotelCreditConsumption(
        companyId: $companyId
        partyId: $partyId
        guestName: $guestName
        guestPhone: $guestPhone
        linesJson: $linesJson
        totalAmount: $totalAmount
        occurredAt: $occurredAt
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Could not save usage");
  }
  if (!input.suppressSuccessToast) {
    toast.success("Consumption recorded");
  }
  return response.data.data.createHotelCreditConsumption;
}
