import { toast } from "sonner";
import { api, API_URL, dedupeHotelListRead, invalidateGraphqlListCache } from "./client";
import type { DepartmentLeaderRow } from "@/lib/departments";
import { rowHotelMatchesCanonicalTenantScope } from "@/lib/tenantRowMatch";

/** Drop leaders that do not belong to the signed-in property (SaaS isolation). */
function leadersForCurrentTenant(
  rows: DepartmentLeaderRow[],
): DepartmentLeaderRow[] {
  return (rows ?? []).filter((row) =>
    rowHotelMatchesCanonicalTenantScope(row.HotelName, null),
  );
}

export async function fetchDepartmentLeaders(): Promise<DepartmentLeaderRow[]> {
  return dedupeHotelListRead("hotel:departmentLeaders", async () => {
    const query = `
      query {
        departmentLeaders {
          id
          department
          leaderName
          departmentLabel
          HotelName
        }
      }
    `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors?.length) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load department leaders",
      );
    }
    return leadersForCurrentTenant(
      (response.data.data.departmentLeaders ?? []) as DepartmentLeaderRow[],
    );
  });
}

export async function upsertDepartmentLeaderApi(
  department: string,
  leaderName: string,
): Promise<DepartmentLeaderRow> {
  const mutation = `
    mutation UpsertDepartmentLeader($department: String!, $leaderName: String!) {
      upsertDepartmentLeader(department: $department, leaderName: $leaderName) {
        id
        department
        leaderName
        departmentLabel
        HotelName
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { department, leaderName: leaderName.trim() },
  });
  if (response.data.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Could not save department leader",
    );
  }
  invalidateGraphqlListCache(["hotel:departmentLeaders"]);
  toast.success("Department leader saved");
  return response.data.data.upsertDepartmentLeader;
}

export async function deleteDepartmentLeaderApi(department: string): Promise<boolean> {
  const mutation = `
    mutation DeleteDepartmentLeader($department: String!) {
      deleteDepartmentLeader(department: $department)
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { department },
  });
  if (response.data.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Could not remove department leader",
    );
  }
  invalidateGraphqlListCache(["hotel:departmentLeaders"]);
  toast.success("Department leader removed");
  return response.data.data.deleteDepartmentLeader === true;
}
