/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
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
  Role: "Admin" | "Cashier" | "Barista" | "Kitchen";
  HotelName: string;
  LogoUrl?: string;
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
  createdAt: string;
}

export interface Item {
  id: number;
  name: string;
  price: number;
  HotelName: string;
  category: string;
  type: string;
  imageUrl: string;
  createdAt: string;
}

export interface Credential {
  id: number;
  UserName: string;
  Password: string;
  Role: "Kitchen" | "Barista" | "Cashier" | "Admin";
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
  createdAt: string;
}

export interface Table {
  id: number;
  tableNo: number;
  HotelName: string;
  capacity: number;
  status: string;
  price: number[];
  payment: string[];
  createdAt: string;
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

const API_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "https://hotcol-backend.vercel.app/graphql";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

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
  }
);

export async function handleCredential(
  values: any,
  setIsLoading: (loading: boolean) => void
) {
  try {
    setIsLoading(true);

    const graphqlQuery = {
      query: `
        mutation CreateAdmin(
          $HotelName: String!
          $UserName: String!
          $Password: String!
          $LogoUrl: String!
          $Role: String!
        ) {
          CreateAdmin(
            HotelName: $HotelName
            UserName: $UserName
            Password: $Password
            LogoUrl: $LogoUrl
            Role: $Role
          ) {
            id
            HotelName
            UserName
            LogoUrl
            Role
          }
        }
      `,
      variables: {
        HotelName: values.HotelName,
        UserName: values.UserName,
        Password: values.Password,
        LogoUrl: values.LogoUrl,
        Role: "Admin",
      },
    };

    const response = await axios.post(API_URL, graphqlQuery, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = response.data;

    if (data.errors) {
      throw new Error(data.errors[0]?.message || "Failed to create admin account");
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
            error.response.data.errors[0]?.message || "Failed to process request";
        } else {
          errorMessage =
            error.response.data?.message ||
            `Request failed. Please try again.`;
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
  router: AppRouterInstance
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
            LogoUrl
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
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_role", user.Role);
      localStorage.setItem("hotel_name", user.HotelName);
      localStorage.setItem("logo_url", user.LogoUrl || "");
      localStorage.setItem("user_name", user.UserName);
    }

    toast.success(`Welcome back, ${user.UserName}!`);

    const queryParams = new URLSearchParams({
      hotel: user.HotelName,
      logo: user.LogoUrl || "",
      role: user.Role,
    });

    switch (user.Role) {
      case "Admin":
        router.push(`/Admin?${queryParams}`);
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
      default:
        toast.error("No Role Found");
    }
    } catch (error: any) {
    let errorMessage = "Unable to sign in. Please check your credentials and try again.";

    if (
      error.message?.includes("Connection Timeout") ||
      error.message?.includes("Network Error")
    ) {
      errorMessage = "Connection timeout. Please check your internet connection and try again.";
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
    window.location.href = "/login";
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;

  const role = localStorage.getItem("user_role");
  const hotelName = localStorage.getItem("hotel_name");
  const logoUrl = localStorage.getItem("logo_url");
  const userName = localStorage.getItem("user_name");

  if (!role || !hotelName) return null;

  return {
    id: 0,
    UserName: userName || "",
    Role: role as User["Role"],
    HotelName: hotelName,
    LogoUrl: logoUrl || "",
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
        response.data.errors[0]?.message || "Failed to fetch items"
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
        response.data.errors[0]?.message || "Failed to create item"
      );
    }

    toast.success("Item created successfully");
    return response.data.data.CreateItem;
  } catch (error: any) {
    toast.error("Unable to create item. Please check all fields and try again.");
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
        response.data.errors[0]?.message || "Failed to update item"
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
        response.data.errors[0]?.message || "Failed to delete item"
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
        response.data.errors[0]?.message || "Failed to fetch credentials"
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
        response.data.errors[0]?.message || "Failed to create credential"
      );
    }

    toast.success("Credential granted successfully");
    return response.data.data.CreateCredential;
  } catch (error: any) {
    toast.error("Unable to create user credential. Please check all fields and try again.");
    throw error;
  }
}

export async function updateCredential(credentialData: UpdateCredentialData) {
  try {
    const mutation = `
      mutation UpdateCredential($UserName: String!, $Password: String!, $HotelName: String!, $Role: String!) {
        UpdateCredential(UserName: $UserName, Password: $Password, HotelName: $HotelName, Role: $Role) {
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
        response.data.errors[0]?.message || "Failed to update credential"
      );
    }

    toast.success("Credential updated successfully");
    return response.data.data.UpdateCredential;
  } catch (error: any) {
    toast.error("Unable to update credential. Please try again.");
    throw error;
  }
}

export async function updateAdminPassword(
  passwordData: UpdateAdminPasswordData
): Promise<boolean> {
  try {
    const isValid = await verifyAdminPassword(
      passwordData.HotelName,
      passwordData.oldPassword
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
      mutation UpdateAdminCredential($Password: String!, $HotelName: String!) {
        UpdateAdminCredential(Password: $Password, HotelName: $HotelName) {
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
        response.data.errors[0]?.message || "Failed to update admin password"
      );
    }

    toast.success("Admin password updated successfully");
    return true;
  } catch (error: any) {
    toast.error("Unable to update password. Please verify your current password and try again.");
    return false;
  }
}

export async function verifyAdminPassword(
  HotelName: string,
  passwordInput: string
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
        response.data.errors[0]?.message || "Verification failed"
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
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to fetch waiters"
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
        response.data.errors[0]?.message || "Failed to create waiter"
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
      mutation UpdateWaiter($id: Int!, $name: String!, $age: Int!, $sex: String!, $experience: Int!, $phoneNumber: String!, $HotelName: String!) {
        UpdateWaiter(id: $id, name: $name, age: $age, sex: $sex, experience: $experience, phoneNumber: $phoneNumber, HotelName: $HotelName) {
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
        response.data.errors[0]?.message || "Failed to update waiter"
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
        response.data.errors[0]?.message || "Failed to delete waiter"
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
          status
          price
          payment
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to fetch tables"
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
        response.data.errors[0]?.message || "Failed to create table"
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
      mutation UpdateTable($id: Int!, $tableNo: Int!, $capacity: Int!, $HotelName: String!) {
        UpdateTable(id: $id, tableNo: $tableNo, capacity: $capacity, HotelName: $HotelName) {
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
        response.data.errors[0]?.message || "Failed to update table"
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
        response.data.errors[0]?.message || "Failed to delete table"
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
          HotelName
          price
          tableNo
          waiterName
          status
          payment
          withBank
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to fetch orders"
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
      tableNo: Math.floor(Number(o.tableNo)), // Backend requires Int
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
        response.data.errors[0]?.message || "Failed to update status"
      );
    }

    toast.success("Status updated successfully");
    return response.data.data.UpdateStatus;
  } catch (error: any) {
    toast.error("Failed to update status");
    throw error;
  }
}

export async function updateOrderPayment(id: number, payment: string, withBank: boolean, order?: Order) {
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
        response.data.errors[0]?.message || "Failed to update payment"
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

export async function updateWaiterPayment(data: {
  id: number;
  payment: string[];
  price: number[];
  tablesServed: number[];
  HotelName: string;
}) {
  try {
    const mutation = `
      mutation UpdatePaymentWaiter(
        $id: Int!, 
        $payment: JSON!, 
        $price: JSON!, 
        $tablesServed: JSON!, 
        $HotelName: String!
      ) {
        UpdatePaymentWaiter(
          id: $id, 
          payment: $payment, 
          price: $price, 
          tablesServed: $tablesServed, 
          HotelName: $HotelName
        ) {
          id
          HotelName
          payment
          tablesServed
          price
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: data,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update waiter payment"
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
  HotelName: string;
}) {
  try {
    const mutation = `
      mutation UpdatePaymentTable(
        $id: Int!, 
        $payment: JSON!, 
        $price: JSON!, 
        $HotelName: String!
      ) {
        UpdatePaymentTable(
          id: $id, 
          payment: $payment, 
          price: $price, 
          HotelName: $HotelName
        ) {
          id
          HotelName
          payment
          price
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: data,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update table payment"
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
      mutation CreateCashout($Amount: Int!, $Reason: JSON, $HotelName: String!) {
        CreateCashout(Amount: $Amount, Reason: $Reason, HotelName: $HotelName) {
          id
          Amount
          Reason
          HotelName
          createdAt
        }
      }
    `;
    
    const formattedReason = Array.isArray(data.Reason) ? data.Reason : 
                           typeof data.Reason === 'string' ? [data.Reason] : 
                           data.Reason || [];
    
    const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;
    
    if (!token) {
      toast.error("You are not logged in. Please login again.");
      throw new Error("No authentication token found");
    }
    
    const response = await axios.post(API_URL, {
      query: mutation,
      variables: {
        Amount: Number(data.Amount),
        Reason: formattedReason,
        HotelName: data.HotelName
      },
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.errors) {
      const errorMessage = response.data.errors[0]?.message || "Failed to create cashout";
      
      if (errorMessage.includes("Not Authenticated") || errorMessage.includes("Unauthorized")) {
        toast.error("Session expired. Please login again.");
        logoutAction(); // Clear localStorage and redirect
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
      query fetchCashouts($HotelName: String) {
        cashouts(HotelName: $HotelName) {
          id
          Amount
          Reason
          HotelName
          createdAt
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
        HotelName: hotel
      },
    });

    if (response.data.errors) {
      const errorMessage = response.data.errors[0]?.message || "Failed to fetch cashouts";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    const cashouts = response.data.data.cashouts || [];
    return cashouts;
  } catch (error: any) {
    if (error.message?.includes("Not Authenticated") || error.response?.status === 401) {
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
  hotelName: string
): Order[] {
  return orders.filter((order) => {
    const isSameHotel = order.HotelName === hotelName;
    const isPending = order.status === null || order.status === "Pending";
    const isBeverage = order.category?.toLowerCase() === "beverage";
    return isSameHotel && isPending && isBeverage;
  });
}

export function filterChefOrders(orders: Order[], hotelName: string): Order[] {
  return orders.filter((order) => {
    const isSameHotel = order.HotelName === hotelName;
    const isPending = order.status === null || order.status === "Pending";
    const isFood = order.category?.toLowerCase() === "food" || order.category?.toLowerCase() === "others";
    return isSameHotel && isPending && isFood;
  });
}

export function filterItemsByCategoryAndHotel(
  items: Item[],
  hotelName: string,
  category: "food" | "beverage" | "others"
): Item[] {
  return items.filter(
    (item) =>
      item.HotelName === hotelName && item.category.toLowerCase() === category
  );
}

export function filterUnpaidOrders(
  orders: Order[],
  hotelName: string
): Order[] {
  return orders.filter(
    (order) => order.HotelName === hotelName && order.payment !== "Paid"
  );
}

export function filterReportOrders(
  orders: Order[],
  filter: ReportFilter
): Order[] {
  return orders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    const filterDate = filter.date;
    const isSameHotel = order.HotelName === filter.HotelName;
    const isPaid = order.payment === "Paid";

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

export function groupItemsByCategory(items: Item[]): {
  food: Item[];
  beverage: Item[];
  others: Item[];
} {
  return {
    food: items.filter((item) => item.category.toLowerCase() === "food"),
    beverage: items.filter((item) => item.category.toLowerCase() === "beverage"),
    others: items.filter((item) => item.category.toLowerCase() === "others"),
  };
}

export function calculateTotalSales(orders: Order[]): number {
  return orders.reduce((total, order) => {
    return total + order.price * order.orderAmount;
  }, 0);
}

export function calculateMonthlySales(orders: Order[], month: Date): number {
  const filtered = orders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    return (
      orderDate.getFullYear() === month.getFullYear() &&
      orderDate.getMonth() === month.getMonth() &&
      order.payment === "Paid"
    );
  });
  return calculateTotalSales(filtered);
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
}

export interface Cashout {
  id: number;
  Amount: number;
  Reason: any;
  HotelName: string;
  createdAt: string;
}

export async function generateReport(
  orders: Order[],
  cashouts: Cashout[],
  filter: { date: Date; type: "Daily" | "Monthly" | "remain"; HotelName: string }
): Promise<ReportData | null> {
  if (filter.type === "remain") {
    return null;
  }

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

  const totalCashouts = filteredCashouts.reduce((sum, cashout) => sum + cashout.Amount, 0);
  const netSales = totalSales - totalCashouts;
  const cashOrders = filteredOrders.filter((order) => !order.withBank);
  const bankOrders = filteredOrders.filter((order) => order.withBank === true);

  const cashAmount = calculateTotalSales(cashOrders);
  const bankAmount = calculateTotalSales(bankOrders);
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
  };
}

export function prepareReportExportData(
  orders: Order[],
  reportType: "Daily" | "Monthly"
): ExcelExportData {
  const data = orders.map((order) => ({
    "Item Name": order.title,
    Category: order.category,
    Price: order.price,
    "Order Amount": order.orderAmount,
    "Total Amount": order.price * order.orderAmount,
    "Order Date": new Date(order.createdAt).toLocaleDateString(),
    Status: order.status || "Pending",
    Payment: order.payment,
    "Payment Method": order.withBank ? "Bank" : "Cash",
  }));

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
    ],
  };
}

export function prepareInventoryExportData(
  items: Item[],
  cashouts: Cashout[],
  hotelName: string
): ExcelExportData {
  const totalCashouts = cashouts.reduce((sum, cashout) => sum + cashout.Amount, 0);
  const cashoutCount = cashouts.length;

  const foodItems = items.filter((item) => item.category.toLowerCase() === "food");
  const beverageItems = items.filter((item) => item.category.toLowerCase() === "beverage");
  const othersItems = items.filter((item) => item.category.toLowerCase() === "others");

  const data = [
    {
      "Item Name": "=== INVENTORY SUMMARY ===",
      Category: "",
      Price: "",
      "Order Amount": "",
      "Total Amount": "",
      "Order Date": "",
      Status: "",
      Payment: "",
      "Payment Method": "",
    },
    {
      "Item Name": "Total Items",
      Category: items.length.toString(),
      Price: "",
      "Order Amount": "",
      "Total Amount": "",
      "Order Date": "",
      Status: "",
      Payment: "",
      "Payment Method": "",
    },
    {
      "Item Name": "Food Items",
      Category: foodItems.length.toString(),
      Price: "",
      "Order Amount": "",
      "Total Amount": "",
      "Order Date": "",
      Status: "",
      Payment: "",
      "Payment Method": "",
    },
    {
      "Item Name": "Beverage Items",
      Category: beverageItems.length.toString(),
      Price: "",
      "Order Amount": "",
      "Total Amount": "",
      "Order Date": "",
      Status: "",
      Payment: "",
      "Payment Method": "",
    },
    {
      "Item Name": "=== CASHOUT INFORMATION ===",
      Category: "",
      Price: "",
      "Order Amount": "",
      "Total Amount": "",
      "Order Date": "",
      Status: "",
      Payment: "",
      "Payment Method": "",
    },
    {
      "Item Name": "Total Cashouts",
      Category: cashoutCount.toString(),
      Price: "",
      "Order Amount": "",
      "Total Amount": totalCashouts.toString(),
      "Order Date": "",
      Status: "",
      Payment: "",
      "Payment Method": "",
    },
    {
      "Item Name": "=== ITEM DETAILS ===",
      Category: "",
      Price: "",
      "Order Amount": "",
      "Total Amount": "",
      "Order Date": "",
      Status: "",
      Payment: "",
      "Payment Method": "",
    },
    ...items.map((item) => ({
      "Item Name": item.name,
      Category: item.category,
      Price: item.price,
      "Order Amount": "",
      "Total Amount": "",
      "Order Date": new Date(item.createdAt).toLocaleDateString(),
      Status: item.type,
      Payment: "",
      "Payment Method": "",
    })),
  ];

  return {
    sheetName: "Inventory Report",
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
    ],
  };
}

// ==================== IMAGE UPLOAD ====================

export async function uploadImage(
  result: unknown,
  form: UseFormReturn<any>,
  setPreviewUrl: (url: string | null) => void,
  formField: string
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
  waiterId: number
) {
  const paidOrders = orders.filter((order) => order.payment === "Paid");

  return {
    id: waiterId,
    payment: paidOrders.map((order) => order.payment),
    price: paidOrders.map((order) => order.price * order.orderAmount),
    tablesServed: paidOrders.map((order) => order.tableNo || 0),
    HotelName: orders[0]?.HotelName || "",
  };
}

export function transformOrderDataForTableUpdate(
  orders: Order[],
  tableId: number,
  tableNo: number
) {
  const paidOrders = orders.filter(
    (order) => order.payment === "Paid" && order.tableNo === tableNo
  );

  return {
    id: tableId,
    payment: paidOrders.map((order) => order.payment),
    price: paidOrders.map((order) => order.price * order.orderAmount),
    HotelName: orders[0]?.HotelName || "",
  };
}

// ==================== CACHE MANAGEMENT ====================

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchWithCache<T>(
  key: string,
  fetchFunction: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const data = await fetchFunction();
  cache.set(key, { data, timestamp: now });
  return data;
}

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export function getCacheKeys(): string[] {
  return Array.from(cache.keys());
}


export async function batchUpdateOrderStatus(
  orderIds: number[],
  status: string
): Promise<boolean[]> {
  const results = await Promise.allSettled(
    orderIds.map((id) => updateOrderStatus(id, status))
  );

  return results.map((result) => result.status === "fulfilled");
}

export async function batchUpdateOrderPayment(
  orderIds: number[],
  payment: string,
  withBank: boolean
): Promise<boolean[]> {
  const results = await Promise.allSettled(
    orderIds.map((id) => updateOrderPayment(id, payment, withBank))
  );

  return results.map((result) => result.status === "fulfilled");
}

// ==================== STATISTICS ====================

export interface SalesStatistics {
  totalSales: number;
  foodSales: number;
  beverageSales: number;
  othersSales: number;
  averageOrderValue: number;
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
}

export function calculateSalesStatistics(orders: Order[]): SalesStatistics {
  const paidOrders = orders.filter((order) => order.payment === "Paid");

  if (paidOrders.length === 0) {
    return {
      totalSales: 0,
      foodSales: 0,
      beverageSales: 0,
      othersSales: 0,
      averageOrderValue: 0,
      topSellingItems: [],
    };
  }

  const foodOrders = paidOrders.filter(
    (order) => order.category.toLowerCase() === "food"
  );
  const beverageOrders = paidOrders.filter(
    (order) => order.category.toLowerCase() === "beverage"
  );
  const othersOrders = paidOrders.filter(
    (order) => order.category.toLowerCase() === "others"
  );

  const totalSales = calculateTotalSales(paidOrders);
  const foodSales = calculateTotalSales(foodOrders);
  const beverageSales = calculateTotalSales(beverageOrders);
  const othersSales = calculateTotalSales(othersOrders);
  const averageOrderValue = totalSales / paidOrders.length;

  const itemMap = new Map<string, { quantity: number; revenue: number }>();

  paidOrders.forEach((order) => {
    const current = itemMap.get(order.title) || { quantity: 0, revenue: 0 };
    current.quantity += order.orderAmount;
    current.revenue += order.price * order.orderAmount;
    itemMap.set(order.title, current);
  });

  const topSellingItems = Array.from(itemMap.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    totalSales,
    foodSales,
    beverageSales,
    othersSales,
    averageOrderValue,
    topSellingItems,
  };
}


let eventSource: EventSource | null = null;

export function startRealTimeUpdates(
  hotelName: string,
  onUpdate: (data: any) => void,
  onError?: (error: any) => void
) {
  if (eventSource) {
    eventSource.close();
  }

  const token = localStorage.getItem("auth_token");
  eventSource = new EventSource(
    `${API_URL}/subscriptions?hotel=${hotelName}&token=${token}`
  );

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate(data);
    } catch (error) {
      onError?.(error);
    }
  };

  eventSource.onerror = (error) => {
    onError?.(error);
    eventSource?.close();
    eventSource = null;
  };
}

export function stopRealTimeUpdates() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

// ==================== BACKUP & RESTORE ====================

export async function createBackup(): Promise<Blob> {
  try {
    const [items, orders, waiters, tables, credentials] = await Promise.all([
      fetchItems(),
      fetchOrders(),
      fetchWaiters(),
      fetchTables(),
      fetchCredentials(),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      items,
      orders,
      waiters,
      tables,
      credentials,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    return new Blob([jsonString], { type: "application/json" });
  } catch {
    throw new Error("Failed to create backup");
  }
}

export function downloadBackup(backupData: any, filename: string) {
  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
