import { toast } from "sonner";
import { api, API_URL, dedupeHotelListRead, invalidateGraphqlListCache } from "./client";

export type TenantHotelContact = {
  tinNumber: string;
  hotelPhone: string;
  hotelDisplayName: string;
};

export async function fetchTenantHotelContact(): Promise<TenantHotelContact> {
  return dedupeHotelListRead("hotel:tenantHotelContact", async () => {
    const query = `
      query {
        tenantHotelContact {
          tinNumber
          hotelPhone
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

export async function updateTenantHotelPhoneApi(
  hotelPhone: string,
): Promise<TenantHotelContact> {
  const mutation = `
    mutation UpdateTenantHotelPhone($hotelPhone: String!) {
      updateTenantHotelPhone(hotelPhone: $hotelPhone) {
        tinNumber
        hotelPhone
        hotelDisplayName
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { hotelPhone },
  });
  if (response.data.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Failed to save hotel phone",
    );
  }
  invalidateGraphqlListCache("hotel:tenantHotelContact");
  toast.success("Hotel phone saved for guest call center");
  return response.data.data.updateTenantHotelPhone as TenantHotelContact;
}
