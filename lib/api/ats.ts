import { api, API_URL } from "@/lib/api/client";

export type AtsAccessOtp = {
  id: number;
  tinNumber: string;
  HotelName: string;
  role: string;
  hasCode: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  otpPreview: string;
};

const OTP_FIELDS = `
  id tinNumber HotelName role hasCode updatedBy createdAt updatedAt otpPreview
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
