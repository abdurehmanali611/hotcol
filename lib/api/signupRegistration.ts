import { api, API_URL } from "./client";

export type SignupRegistrationStatusValue = "pending" | "approved" | "rejected";

export type SignupRegistrationStatus = {
  username: string;
  businessName: string;
  status: SignupRegistrationStatusValue;
  setupFeeETB: number;
  rejectionReason: string | null;
  paymentChannel: string | null;
  paymentTransactionRef: string | null;
  submittedAt: string | null;
};

export type SignupRegistrationReceipt = {
  username: string;
  businessName: string;
  savedAt: string;
};

const RECEIPT_KEY = "hotcol_signup_receipt";

function normalizeStatus(raw: unknown): SignupRegistrationStatusValue {
  const status = String(raw || "").toLowerCase().trim();
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

function mapStatus(row: Record<string, unknown>): SignupRegistrationStatus {
  return {
    username: String(row.username || ""),
    businessName: String(row.businessName || ""),
    status: normalizeStatus(row.status),
    setupFeeETB: Number(row.setupFeeETB) || 0,
    rejectionReason: row.rejectionReason ? String(row.rejectionReason) : null,
    paymentChannel: row.paymentChannel ? String(row.paymentChannel) : null,
    paymentTransactionRef: row.paymentTransactionRef
      ? String(row.paymentTransactionRef)
      : null,
    submittedAt: row.submittedAt ? String(row.submittedAt) : null,
  };
}

export function readSignupRegistrationReceipt(): SignupRegistrationReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RECEIPT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SignupRegistrationReceipt>;
    const username = String(parsed.username || "").trim();
    const businessName = String(parsed.businessName || "").trim();
    if (!username) return null;
    return {
      username,
      businessName: businessName || username,
      savedAt: String(parsed.savedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function persistSignupRegistrationReceipt(input: {
  username: string;
  businessName: string;
}): void {
  if (typeof window === "undefined") return;
  const username = String(input.username || "").trim();
  if (!username) return;
  const receipt: SignupRegistrationReceipt = {
    username,
    businessName: String(input.businessName || "").trim() || username,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(RECEIPT_KEY, JSON.stringify(receipt));
}

export function clearSignupRegistrationReceipt(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RECEIPT_KEY);
}

export async function fetchSignupRegistrationStatus(
  username: string,
): Promise<SignupRegistrationStatus> {
  const response = await api.post(API_URL, {
    query: `
      query SignupRegistrationStatus($username: String!) {
        signupRegistrationStatus(username: $username) {
          username
          businessName
          status
          setupFeeETB
          rejectionReason
          paymentChannel
          paymentTransactionRef
          submittedAt
        }
      }
    `,
    variables: { username: username.trim() },
  });

  if (response.data?.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Failed to load registration status",
    );
  }

  const row = response.data?.data?.signupRegistrationStatus;
  if (!row) throw new Error("Registration status not found");
  return mapStatus(row);
}

export async function resubmitSignupSetupPayment(input: {
  username: string;
  password: string;
  paymentChannel: string;
  transactionRef: string;
}): Promise<SignupRegistrationStatus> {
  const response = await api.post(API_URL, {
    query: `
      mutation ResubmitSignupSetupPayment(
        $username: String!
        $password: String!
        $paymentChannel: String!
        $transactionRef: String!
      ) {
        resubmitSignupSetupPayment(
          username: $username
          password: $password
          paymentChannel: $paymentChannel
          transactionRef: $transactionRef
        ) {
          username
          businessName
          status
          setupFeeETB
          rejectionReason
          paymentChannel
          paymentTransactionRef
          submittedAt
        }
      }
    `,
    variables: {
      username: input.username.trim(),
      password: input.password,
      paymentChannel: input.paymentChannel.trim(),
      transactionRef: input.transactionRef.trim(),
    },
  });

  if (response.data?.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Failed to resubmit setup payment",
    );
  }

  const row = response.data?.data?.resubmitSignupSetupPayment;
  if (!row) throw new Error("Failed to resubmit setup payment");
  return mapStatus(row);
}
