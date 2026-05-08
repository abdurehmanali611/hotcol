/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { rowHotelMatchesTenantScope } from "./tenantRowMatch";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { toast } from "sonner";
import * as XLSX from "xlsx";
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
  dutyFee: number;
  supplierName: string;
  supplierPhone: string;
  supplierLevel: string;
  purchaseWithVat?: boolean;
  supplierTinNumber?: string;
  Address: string;
  paidAmount: number;
  registeredAmount?: number;
  registeredValue?: number;
  statusBy?: string;
  HotelName: string;
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
  dutyFee: number;
  supplierName: string;
  supplierPhone: string;
  supplierLevel: string;
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
  supplierLevel: string;
  purchaseWithVat?: boolean;
  supplierTinNumber?: string;
  paidAmount: number;
  status: string;
  statusBy: string;
  HotelName: string;
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
  supplierLevel: string;
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

const api = axios.create({
  timeout: 30000,
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
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.clear();
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      }
    }
    return Promise.reject(error);
  },
);

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
          ) {
            id
            HotelName
            tinNumber
            UserName
            LogoUrl
            Role
          }
        }
      `,
      variables: {
        UserName: values.UserName,
        Password: values.Password,
        Role: values.type === "Hotel" ? "Manager" : "Admin",
        HotelName: values.HotelName,
        LogoUrl: values.LogoUrl,
        tinNumber: tinRaw,
        businessType: values.type ?? "",
        modules: JSON.stringify(
          Array.isArray(values.modules) ? values.modules : [],
        ),
      },
    };

    const response = await axios.post(API_URL, graphqlQuery, {
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
          user {
            id
            UserName
            Role
            HotelName
            tinNumber
            LogoUrl
            businessType
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

    const { token, user } = response.data.data.Login;

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
    return response.data.data.DeleteItem;
  } catch (error: any) {
    toast.error("Unable to delete item. Please try again.");
    throw error;
  }
}

export async function fetchCredentials(): Promise<Credential[]> {
  try {
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
  try {
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
  } catch (error: any) {
    throw error;
  }
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
  try {
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
  } catch (error: any) {
    throw error;
  }
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
  try {
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
  } catch (error: any) {
    throw error;
  }
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
    const currentPityCash = pityCashList.find(
      (p: any) => p.HotelName === HotelName,
    );

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
      (reg: any) =>
        reg.name.toLowerCase() === name.toLowerCase() &&
        reg.HotelName === HotelName,
    );

    if (!creditRegistrant) {
      toast.error("Credit registrant not found");
      return false;
    }

    if (creditRegistrant.amount < requiredAmount) {
      toast.error(
        `Insufficient credit balance for ${name}. Available: ${creditRegistrant.amount}, Required: ${requiredAmount}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to check credit registrant balance:", error);
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

    const response = await axios.post(
      API_URL,
      {
        query: mutation,
        variables: { id, amount },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

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
    console.log("UpdateCreditRegistrantDeduction called:", { id, amount });

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

    console.log("UpdateCreditRegistrantDeduction response:", response.data);

    if (response.data.errors) {
      const errorMessage =
        response.data.errors[0]?.message ||
        "Failed to Deduct from Credit Registrant";
      console.error("GraphQL Error:", response.data.errors[0]);
      throw new Error(errorMessage);
    }

    toast.success("Successfully Deducted from Credit Registrant");
    return response.data.data.UpdateCreditRegistrantDeduction;
  } catch (error: any) {
    console.error("UpdateCreditRegistrantDeduction error:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
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

      if (
        errorMessage.includes("Not Authenticated") ||
        errorMessage.includes("Unauthorized")
      ) {
        toast.error("Session expired. Please login again.");
        logoutAction();
        throw new Error("Authentication failed");
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    toast.success("Cashout created successfully");
    return response.data.data.CreateCashout;
  } catch (error: any) {
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

    const currentUser = getCurrentUser();
    const hotel = HotelName || currentUser?.HotelName;

    if (!hotel) {
      toast.error("Hotel name is required");
      throw new Error("Hotel name is required");
    }

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
  } catch (error: any) {
    if (
      error.message?.includes("Not Authenticated") ||
      error.response?.status === 401
    ) {
      toast.error("Session expired. Please login again.");
      logoutAction();
    } else {
      toast.error("Failed to fetch cashout: " + error.message);
    }

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

export async function fetchPityCash() {
  try {
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
  } catch (error: any) {
    throw error;
  }
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
        $HotelName: String!
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
          HotelName: $HotelName
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
      variables: values,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to create credit registration",
      );
    }

    toast.success("Credit registration created successfully");
    return response.data.data.CreditRegistration;
  } catch (error: any) {
    toast.error("Failed to create credit registration");
    throw error;
  }
}

export async function fetchCreditRegistrations() {
  try {
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
  } catch (error: any) {
    throw error;
  }
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
        $dutyFee: Float!,
        $supplierName: String!, 
        $supplierPhone: String!,
        $Address: String!,
        $supplierLevel: String!,
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
          dutyFee: $dutyFee,
          supplierName: $supplierName,
          supplierPhone: $supplierPhone,
          Address: $Address,
          supplierLevel: $supplierLevel,
          purchaseWithVat: $purchaseWithVat,
          supplierTinNumber: $supplierTinNumber,
          paidAmount: $paidAmount,
          HotelName: $HotelName
        ) {
          name
          imageUrl
          category
          amount
          measuredBy
          unitPrice
          registrationDate
          expireDate
          dutyFee
          supplierName
          supplierPhone
          Address
          supplierLevel
          purchaseWithVat
          supplierTinNumber
          paidAmount
          HotelName
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
      dutyFee: values.dutyFee || 0,
      supplierName: values.supplierName || "",
      supplierPhone: values.supplierPhone || "",
      Address: values.Address || "",
      supplierLevel: values.supplierLevel || "",
      purchaseWithVat: values.purchaseWithVat === true,
      supplierTinNumber: (values.supplierTinNumber || "").trim(),
      paidAmount: values.paidAmount || 0,
      HotelName: values.HotelName,
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

      if (
        errorMessage.includes("Not Authenticated") ||
        errorMessage.includes("Unauthorized")
      ) {
        toast.error("Session expired. Please login again.");
        logoutAction();
        throw new Error("Authentication failed");
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    if (response.data.data.ItemRegistration) {
      try {
        const pityCashList = await fetchPityCash();
        const currentPityCash = pityCashList.find(
          (p: any) => p.HotelName === values.HotelName,
        );
        const totalCalc = values.amount * values.unitPrice + values.dutyFee;

        if (currentPityCash) {
          const newAmount = currentPityCash.amount - totalCalc;

          try {
            await UpdatePityDeduction(currentPityCash.id, newAmount);
          } catch {
            toast.warning(
              "Item created but failed to update pity cash balance",
            );
          }
        }
      } catch {
        toast.error("Failed to fetch pity cash");
      }
    }

    toast.success("Item registration created successfully");
    return response.data.data.ItemRegistration;
  } catch (error: any) {
    toast.error("Failed to create Item registration");
    throw error;
  }
}

export async function fetchItemRegistrations() {
  try {
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
          dutyFee
          supplierName
          supplierPhone
          supplierLevel
          purchaseWithVat
          supplierTinNumber
          Address
          paidAmount
          registeredAmount
          registeredValue
          statusBy
          HotelName
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
  } catch (error: any) {
    throw error;
  }
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
        $dutyFee: Float!,
        $supplierName: String!, 
        $supplierPhone: String!,
        $Address: String!,
        $supplierLevel: String!,
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
          dutyFee: $dutyFee,
          supplierName: $supplierName,
          supplierPhone: $supplierPhone,
          Address: $Address,
          supplierLevel: $supplierLevel,
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
          dutyFee
          supplierName
          supplierPhone
          Address
          supplierLevel
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
    $supplierLevel: String!,
    $purchaseWithVat: Boolean,
    $supplierTinNumber: String,
    $paidAmount: Float!,
    $status: String!,
    $statusBy: String!, $HotelName: String!) {
      CreateItemStatus(name: $name, imageUrl: $imageUrl, category: $category, amount: $amount, measuredBy: $measuredBy, unitPrice: $unitPrice, actionDate: $actionDate, supplierName: $supplierName, supplierPhone: $supplierPhone, Address: $Address, supplierLevel: $supplierLevel, purchaseWithVat: $purchaseWithVat, supplierTinNumber: $supplierTinNumber, paidAmount: $paidAmount, status: $status, statusBy: $statusBy, HotelName: $HotelName) {
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
       supplierLevel
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
        purchaseWithVat: data.purchaseWithVat === true,
        supplierTinNumber: (data.supplierTinNumber || "").trim(),
      },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0].message || "Failed to Update Item Status",
      );
    }

    toast.success("Status Updated Successfully");
    return response.data.data.CreateItemStatus;
  } catch (error: any) {
    console.error("Status update error:", error);
    toast.error("Failed to update Status");
    throw error;
  }
}

export async function fetchItemStatus() {
  try {
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
          supplierLevel
          purchaseWithVat
          supplierTinNumber
          paidAmount
          status
          statusBy
          HotelName
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
  ccProfileId?: number | null;
  ccActorName?: string | null;
  ccApprovedAt?: string | null;
  financeActorName?: string | null;
  financeApprovedAt?: string | null;
  rejectionReason?: string | null;
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
  requestedByUserName: string;
  ccProfileId?: number | null;
  ccActorName?: string | null;
  decidedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

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
  contactName: string;
  phoneNumber: string;
  email: string;
  creditLevel: string;
  creditLimit: number;
  timeInterval: number;
  timeFrame: string;
  hotelCorporateCreditTierId?: number | null;
  allowedMenuJson: string;
  dealNotes: string;
  imageUrl: string;
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
}

export async function fetchStockOutRequests(): Promise<StockOutRequestRow[]> {
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
        requestedByUserName
        ccProfileId
        ccActorName
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
}

export async function fetchCostControllerProfiles(): Promise<
  CostControllerProfileRow[]
> {
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
}

export async function fetchKitchenBarBeginnings(): Promise<
  KitchenBarBeginningRow[]
> {
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
}

export async function createPurchaseRequestApi(input: {
  itemName: string;
  quantity: number;
  measuredBy: string;
  notes?: string;
  estimatedUnitPrice?: number;
  supplierName?: string;
  supplierPhone?: string;
  category?: string;
}) {
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
  toast.success("Purchase request submitted");
  return response.data.data.createPurchaseRequest;
}

export async function createStockOutRequestApi(input: {
  itemRegistrationId: number;
  movementType: string;
  amount: number;
  stakeHolderOrReason: string;
}) {
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
  toast.success("Movement submitted for cost control approval");
  return response.data.data.createStockOutRequest;
}

export async function approvePurchaseRequestCCApi(
  id: number,
  costControllerProfileId: number,
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
  toast.success("Forwarded to finance");
  return response.data.data.approvePurchaseRequestCC;
}

export async function rejectPurchaseRequestCCApi(id: number, reason?: string) {
  const mutation = `
    mutation RejectCC($id: Int!, $reason: String) {
      rejectPurchaseRequestCC(id: $id, reason: $reason) {
        id
        status
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
  toast.success("Request rejected");
  return response.data.data.rejectPurchaseRequestCC;
}

export async function approvePurchaseRequestFinanceApi(id: number) {
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
    toast.success(
      "Payment approved — store registers stock when goods are received",
    );
  return response.data.data.approvePurchaseRequestFinance;
}

export async function rejectPurchaseRequestFinanceApi(
  id: number,
  reason?: string,
) {
  const mutation = `
    mutation RejectFin($id: Int!, $reason: String) {
      rejectPurchaseRequestFinance(id: $id, reason: $reason) {
        id
        status
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
  toast.success("Request rejected");
  return response.data.data.rejectPurchaseRequestFinance;
}

export async function approveStockOutRequestApi(
  id: number,
  costControllerProfileId: number,
) {
  const mutation = `
    mutation ApproveSO($id: Int!, $costControllerProfileId: Int!) {
      approveStockOutRequest(id: $id, costControllerProfileId: $costControllerProfileId) {
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
  toast.success("Movement applied to inventory");
  return response.data.data.approveStockOutRequest;
}

export async function rejectStockOutRequestApi(id: number, reason?: string) {
  const mutation = `
    mutation RejectSO($id: Int!, $reason: String) {
      rejectStockOutRequest(id: $id, reason: $reason) {
        id
        status
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
  toast.success("Request rejected");
  return response.data.data.rejectStockOutRequest;
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

export async function fetchKitchenBarMonthlySnapshots(
  monthPeriod: string,
): Promise<KitchenBarMonthlySnapshotRow[]> {
  const query = `
    query Snap($monthPeriod: String!) {
      kitchenBarMonthlySnapshots(monthPeriod: $monthPeriod) {
        id
        HotelName
        station
        itemName
        monthPeriod
        totalImpliedSales
        lastDayClosingOnHand
        syncedAt
      }
    }
  `;
  const response = await api.post(API_URL, {
    query,
    variables: { monthPeriod },
  });
  if (response.data.errors) {
    throw new Error(
      response.data.errors[0]?.message || "Failed to load monthly snapshots",
    );
  }
  return response.data.data.kitchenBarMonthlySnapshots || [];
}

export async function syncKitchenBarMonthlyApi(monthPeriod: string) {
  const mutation = `
    mutation Sync($monthPeriod: String!) {
      syncKitchenBarMonthly(monthPeriod: $monthPeriod) {
        id
        itemName
        station
        totalImpliedSales
        lastDayClosingOnHand
        syncedAt
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { monthPeriod },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Sync failed");
  }
  toast.success("Monthly inventory synced from daily rows");
  return response.data.data.syncKitchenBarMonthly;
}

export async function fetchHotelCreditCompanies(): Promise<
  HotelCreditCompanyRow[]
> {
  const query = `
    query {
      hotelCreditCompanies {
        id
        HotelName
        companyName
        contactName
        phoneNumber
        email
        creditLevel
        creditLimit
        timeInterval
        timeFrame
        hotelCorporateCreditTierId
        allowedMenuJson
        dealNotes
        imageUrl
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
}

export async function fetchHotelCorporateCreditTiers(): Promise<
  HotelCorporateCreditTierRow[]
> {
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
}

export async function fetchHotelCreditParties(
  companyId: number,
): Promise<HotelCreditPartyRow[]> {
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
}

export async function fetchHotelCreditConsumptions(
  fromIso: string,
  toIso: string,
): Promise<HotelCreditConsumptionRow[]> {
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
}

export async function createHotelCreditCompanyApi(input: {
  companyName: string;
  contactName?: string;
  phoneNumber: string;
  email?: string;
  hotelCorporateCreditTierId: number;
  allowedMenuJson: string;
  dealNotes?: string;
  imageUrl?: string;
}) {
  const mutation = `
    mutation HccCreate(
      $companyName: String!
      $contactName: String
      $phoneNumber: String!
      $email: String
      $hotelCorporateCreditTierId: Int!
      $allowedMenuJson: String!
      $dealNotes: String
      $imageUrl: String
    ) {
      createHotelCreditCompany(
        companyName: $companyName
        contactName: $contactName
        phoneNumber: $phoneNumber
        email: $email
        hotelCorporateCreditTierId: $hotelCorporateCreditTierId
        allowedMenuJson: $allowedMenuJson
        dealNotes: $dealNotes
        imageUrl: $imageUrl
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
  toast.success("Company credit registered");
  return response.data.data.createHotelCreditCompany;
}

export async function updateHotelCreditCompanyApi(input: {
  id: number;
  companyName: string;
  contactName?: string;
  phoneNumber: string;
  email?: string;
  hotelCorporateCreditTierId?: number | null;
  allowedMenuJson: string;
  dealNotes?: string;
  imageUrl?: string;
}) {
  const mutation = `
    mutation HccUp(
      $id: Int!
      $companyName: String!
      $contactName: String
      $phoneNumber: String!
      $email: String
      $hotelCorporateCreditTierId: Int
      $allowedMenuJson: String!
      $dealNotes: String
      $imageUrl: String
    ) {
      updateHotelCreditCompany(
        id: $id
        companyName: $companyName
        contactName: $contactName
        phoneNumber: $phoneNumber
        email: $email
        hotelCorporateCreditTierId: $hotelCorporateCreditTierId
        allowedMenuJson: $allowedMenuJson
        dealNotes: $dealNotes
        imageUrl: $imageUrl
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
  toast.success("Consumption recorded");
  return response.data.data.createHotelCreditConsumption;
}
