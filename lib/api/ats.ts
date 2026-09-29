import { api, API_URL } from "@/lib/api/client";

export type AtsAccessOtp = {
  id: number;
  tinNumber: string;
  HotelName: string;
  role: string;
  hasCode: boolean;
  awaitingFirstUnlock: boolean;
  mustChangeOtp: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  otpIssuedAt: string | null;
  firstUnlockAt: string | null;
  otpPreview: string;
};

const OTP_FIELDS = `
  id tinNumber HotelName role hasCode awaitingFirstUnlock mustChangeOtp
  updatedBy createdAt updatedAt otpIssuedAt firstUnlockAt otpPreview
`;

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await api.post(API_URL, { query, variables });
  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0]?.message || "ATS request failed");
  }
  return response.data.data;
}

export async function fetchAtsAccessOtpsApi(): Promise<AtsAccessOtp[]> {
  const data = await gql<{ atsAccessOtps: AtsAccessOtp[] }>(
    `query { atsAccessOtps { ${OTP_FIELDS} } }`,
  );
  return data.atsAccessOtps ?? [];
}

export async function upsertAtsAccessOtpApi(
  role: "HR" | "Manager",
): Promise<AtsAccessOtp> {
  const data = await gql<{ upsertAtsAccessOtp: AtsAccessOtp }>(
    `mutation ($role: String!) {
      upsertAtsAccessOtp(role: $role) { ${OTP_FIELDS} }
    }`,
    { role },
  );
  return data.upsertAtsAccessOtp;
}

export async function deleteAtsAccessOtpApi(
  role: "HR" | "Manager",
): Promise<boolean> {
  const data = await gql<{ deleteAtsAccessOtp: boolean }>(
    `mutation ($role: String!) {
      deleteAtsAccessOtp(role: $role)
    }`,
    { role },
  );
  return Boolean(data.deleteAtsAccessOtp);
}
