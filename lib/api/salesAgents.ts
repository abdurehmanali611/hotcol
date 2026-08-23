import { api, API_URL } from "./client";

export type SalesAgentOption = {
  id: number;
  displayName: string;
  phone: string | null;
  city: string | null;
  isActive: boolean;
};

export async function fetchSalesAgents(): Promise<SalesAgentOption[]> {
  const response = await api.post(API_URL, {
    query: `
      query SalesAgents {
        salesAgents {
          id
          displayName
          phone
          city
          isActive
        }
      }
    `,
  });
  if (response.data.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Could not load sales agents",
    );
  }
  return (response.data.data?.salesAgents ?? []) as SalesAgentOption[];
}
