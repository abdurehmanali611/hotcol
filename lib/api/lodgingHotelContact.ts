import { toast } from "sonner";
import { api, API_URL, dedupeHotelListRead, invalidateGraphqlListCache } from "./client";

export type TenantHotelContact = {
  tinNumber: string;
  hotelPhone: string;
  hotelPhoneSecondary: string;
  hotelDisplayName: string;
};

export async function fetchTenantHotelContact(): Promise<TenantHotelContact> {
  return dedupeHotelListRead("hotel:tenantHotelContact", async () => {
    const query = `
      query {
        tenantHotelContact {
          tinNumber
          hotelPhone
          hotelPhoneSecondary
          hotelDisplayName
        }
      }
    `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors?.length) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load hotel phone",
      );
    }
    return response.data.data.tenantHotelContact as TenantHotelContact;
  });
}

export async function updateTenantHotelPhoneApi(input: {
  hotelPhone: string;
  hotelPhoneSecondary?: string;
}): Promise<TenantHotelContact> {
  const mutation = `
    mutation UpdateTenantHotelPhone(
      $hotelPhone: String!
      $hotelPhoneSecondary: String
    ) {
      updateTenantHotelPhone(
        hotelPhone: $hotelPhone
        hotelPhoneSecondary: $hotelPhoneSecondary
      ) {
        tinNumber
        hotelPhone
        hotelPhoneSecondary
        hotelDisplayName
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      hotelPhone: input.hotelPhone,
      hotelPhoneSecondary: input.hotelPhoneSecondary ?? "",
    },
  });
  if (response.data.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Failed to save hotel phone",
    );
  }
  invalidateGraphqlListCache("hotel:tenantHotelContact");
  toast.success("Hotel phones saved for guest call center");
  return response.data.data.updateTenantHotelPhone as TenantHotelContact;
}
