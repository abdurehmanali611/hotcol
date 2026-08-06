/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { toast } from "sonner";
import { api, API_URL, invalidateGraphqlListCache } from "./client";
import { persistAuthToken } from "../authToken";
import { clearAuthStorage, resetSessionExpiryGuard } from "../sessionExpiry";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { persistTenantSubscription, readTenantSubscriptionFromStorage } from "../tenantModules";
import { persistTenantAccessMode, type TenantPaymentKind } from "../tenantAccessMode";
import { parseModulesJson, roleAllowedForModules, type TenantSubscription } from "../subscriptionModules";
import type { LoginCredentials, User, TenantFeedbackInbox } from "./types";


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
            awaitingSelfSignupSetup
            paymentTransactionRef
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

    const tin =
      user.tinNumber != null && String(user.tinNumber).trim() !== ""
        ? String(user.tinNumber).trim()
        : "";
    const tenantId = tin || String(user.HotelName || "").trim();

    if (typeof window !== "undefined") {
      // Drop every cached list so the new tenant never sees prior property data.
      invalidateGraphqlListCache();
      persistAuthToken(token);
      resetSessionExpiryGuard();
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
        awaitingSelfSignupSetup: Boolean(user.awaitingSelfSignupSetup),
        paymentTransactionRef: user.paymentTransactionRef ?? null,
      });

      if (accessMode === "payment_portal") {
        persistTenantAccessMode(
          "payment_portal",
          (paymentKind === "setup"
            ? "setup"
            : paymentKind === "yearly"
              ? "yearly"
              : "quarterly") as TenantPaymentKind,
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
      hotel: tenantId,
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
      case "HotelCashier": {
        // One cashier role: café POS when Cafe is subscribed, else credit desk for lodging.
        if (
          lodgingStore &&
          !modules.includes("Cafe and Restaurant") &&
          modules.includes("Credit Management")
        ) {
          router.push(`/HotelCashier?${queryParams}`);
          break;
        }
        if (user.Role === "HotelCashier" && !lodgingStore) {
          toast.error("Hotel cashier is only for hotel / resort / pension accounts.");
          break;
        }
        router.push(`/Cashier?${queryParams}`);
        break;
      }
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
      case "Reception":
        router.push(`/Reception?${queryParams}`);
        break;
      case "CMLeader":
        router.push(`/CMLeader?${queryParams}`);
        break;
      case "HR":
        if (!lodgingStore) {
          toast.message(
            "Café properties use Admin for HR. Opening the Admin workspace.",
          );
          router.push(`/Admin?${queryParams}`);
          break;
        }
        router.push(`/HR?${queryParams}`);
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
      errorMessage = /pool timeout|failed to retrieve a connection/i.test(fromGraphqlBody)
        ? "The API could not open a database connection. Redeploy hotcol-backend on Vercel and try again."
        : fromGraphqlBody;
    } else if (
      /pool timeout|failed to retrieve a connection/i.test(String(error.message || ""))
    ) {
      errorMessage =
        "The API could not open a database connection. Redeploy hotcol-backend on Vercel and try again.";
    } else if (
      error.message?.includes("Connection Timeout") ||
      error.message?.includes("Network Error")
    ) {
      errorMessage = `Could not reach the API at ${API_URL}. The server may be down, blocked, or still deploying. Check the backend on Vercel, then hard-refresh this page. For local API use NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql and restart npm run dev.`;
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
    invalidateGraphqlListCache();
    clearAuthStorage();
    window.location.href = "/";
  }
}

export async function submitTenantPaymentAction(input: {
  paymentKind: "setup" | "quarterly" | "yearly";
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

export type TenantModuleChangeRequestResult = {
  id: number;
  tinNumber: string;
  status: string;
  requestedBySide: string;
  requestNote: string | null;
  requestedModules: string[];
  createdAt: string;
};

/** Admin/Manager: submit add/remove module change for Apex review. */
export async function requestTenantModuleChange(input: {
  changeType: "add" | "remove";
  modules: string[];
  requestNote?: string;
}): Promise<TenantModuleChangeRequestResult> {
  const MUTATION = `
    mutation RequestTenantModuleChange(
      $changeType: String!
      $modules: JSON!
      $requestNote: String
    ) {
      requestTenantModuleChange(
        changeType: $changeType
        modules: $modules
        requestNote: $requestNote
      ) {
        id
        tinNumber
        status
        requestedBySide
        requestNote
        requestedModules
        createdAt
      }
    }
  `;

  const response = await api.post(API_URL, {
    query: MUTATION,
    variables: {
      changeType: input.changeType,
      modules: input.modules,
      requestNote: input.requestNote?.trim() || null,
    },
  });

  if (response.data.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Could not submit module request",
    );
  }

  return response.data.data.requestTenantModuleChange;
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  try {
    const date = new Date(value as string | number | Date);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/** Pull live modules/billing from the API into localStorage after Apex changes. */
export async function refreshTenantSubscription(): Promise<TenantSubscription> {
  const QUERY = `
    query TenantSubscription {
      tenantSubscription {
        modules
        setupFeeETB
        quarterlyFeeETB
        setupFeeApproved
        createdAt
        billingStartedAt
        billingHold
        isIllustrationTenant
        freeTrialEndsAt
        subscriptionPaidUntil
        subscriptionPaymentApproved
        paidQuartersCount
        paymentTransactionRef
        awaitingSelfSignupSetup
      }
    }
  `;

  const response = await api.post(API_URL, { query: QUERY });
  if (response.data.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Could not refresh subscription",
    );
  }

  const row = response.data.data?.tenantSubscription as {
    modules?: unknown;
    setupFeeETB?: number;
    quarterlyFeeETB?: number;
    setupFeeApproved?: boolean;
    createdAt?: string | null;
    billingStartedAt?: string | null;
    billingHold?: boolean;
    isIllustrationTenant?: boolean;
    freeTrialEndsAt?: string | null;
    subscriptionPaidUntil?: string | null;
    subscriptionPaymentApproved?: boolean;
    paidQuartersCount?: number;
    paymentTransactionRef?: string | null;
    awaitingSelfSignupSetup?: boolean;
  };

  if (!row) {
    throw new Error("Could not refresh subscription");
  }

  const next: TenantSubscription = {
    modules: parseModulesJson(row.modules),
    setupFeeETB: Number(row.setupFeeETB) || 0,
    quarterlyFeeETB: Number(row.quarterlyFeeETB) || 0,
    setupFeeApproved: Boolean(row.setupFeeApproved),
    createdAt: toIsoOrNull(row.createdAt),
    billingStartedAt: toIsoOrNull(row.billingStartedAt),
    billingHold: Boolean(row.billingHold),
    isIllustrationTenant: Boolean(row.isIllustrationTenant),
    freeTrialEndsAt: toIsoOrNull(row.freeTrialEndsAt),
    subscriptionPaidUntil: toIsoOrNull(row.subscriptionPaidUntil),
    subscriptionPaymentApproved: Boolean(row.subscriptionPaymentApproved),
    paidQuartersCount: Number(row.paidQuartersCount) || 0,
    awaitingSelfSignupSetup: Boolean(row.awaitingSelfSignupSetup),
    paymentTransactionRef: row.paymentTransactionRef ?? null,
  };

  persistTenantSubscription(next);
  return next;
}

/** Authoritative signed-in username from the API (JWT session). */
export async function fetchMe(): Promise<{ UserName: string } | null> {
  const query = `
    query Me {
      me {
        UserName
      }
    }
  `;
  try {
    const response = await api.post(API_URL, { query });
    if (response.data.errors?.length) return null;
    const row = response.data.data?.me as { UserName?: string } | null | undefined;
    const name = String(row?.UserName ?? "").trim();
    return name ? { UserName: name } : null;
  } catch {
    return null;
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
