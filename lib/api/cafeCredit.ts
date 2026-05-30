/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from "sonner";
import { api, API_URL, dedupeHotelListRead, invalidateGraphqlListCache } from "./client";
import type {
  CreateCreditLevel as CreateCreditLevelInput,
  UpdateCreditLevel as UpdateCreditLevelInput,
  CreatePityCash as CreatePityCashInput,
  UpdatePityCash as UpdatePityCashInput,
  pityCash,
  CreateCreditRegistration as CreateCreditRegistrationInput,
  UpdateCreditRegistration as UpdateCreditRegistrationInput,
} from "./types";


// ==================== Credit Level ====================

export async function CreateCreditLevel(values: CreateCreditLevelInput) {
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
    return await dedupeHotelListRead("finance:creditLevels", async () => {
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
    });
  } catch (error: any) {
    console.error("Error fetching credit levels:", error);
    throw error;
  }
}

export async function UpdateCreditLevel(creditLevelData: UpdateCreditLevelInput) {
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

export async function CreatePityCash(values: CreatePityCashInput) {
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

export async function fetchPityCash(): Promise<pityCash[]> {
  return dedupeHotelListRead("finance:pityCash", async () => {
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
  });
}

export async function UpdatePityCash(pityCashData: UpdatePityCashInput) {
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
  values: CreateCreditRegistrationInput,
  options?: { suppressSuccessToast?: boolean },
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
        $HotelName: String!,
        $registrantType: String,
        $companyTinNumber: String,
        $affiliatedCompany: String
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
          HotelName: $HotelName,
          registrantType: $registrantType,
          companyTinNumber: $companyTinNumber,
          affiliatedCompany: $affiliatedCompany
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
          registrantType
          approvalStatus
          companyTinNumber
          affiliatedCompany
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: {
        ...values,
        registrantType: values.registrantType ?? "STAFF",
        companyTinNumber: values.companyTinNumber ?? "",
        affiliatedCompany: values.affiliatedCompany ?? "",
      },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to create credit registration",
      );
    }

    const row = response.data.data.CreditRegistration;
    if (!options?.suppressSuccessToast) {
      const pending =
        String(row?.approvalStatus ?? "").toUpperCase() === "PENDING_ADMIN";
      toast.success(
        pending
          ? "Registration submitted — awaiting admin authorization"
          : "Credit registration created successfully",
      );
    }
    return row;
  } catch (error: any) {
    toast.error("Failed to create credit registration");
    throw error;
  }
}

export async function authorizeCreditRegistrationApi(id: number) {
  try {
    const mutation = `
      mutation AuthorizeCreditRegistration($id: Int!) {
        AuthorizeCreditRegistration(id: $id) {
          id
          approvalStatus
          adminActorName
          adminAuthorizedAt
        }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Authorization failed",
      );
    }
    invalidateGraphqlListCache();
    toast.success("Creditor authorized");
    return response.data.data.AuthorizeCreditRegistration;
  } catch (error: any) {
    toast.error(error?.message || "Authorization failed");
    throw error;
  }
}

export async function rejectCreditRegistrationApi(id: number, reason?: string) {
  try {
    const mutation = `
      mutation RejectCreditRegistration($id: Int!, $reason: String) {
        RejectCreditRegistration(id: $id, reason: $reason) {
          id
          approvalStatus
          rejectionReason
        }
      }
    `;
    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, reason: reason?.trim() || undefined },
    });
    if (response.data.errors) {
      throw new Error(response.data.errors[0]?.message || "Rejection failed");
    }
    invalidateGraphqlListCache();
    toast.success("Registration rejected");
    return response.data.data.RejectCreditRegistration;
  } catch (error: any) {
    toast.error(error?.message || "Rejection failed");
    throw error;
  }
}

export async function fetchCreditRegistrations() {
  return dedupeHotelListRead("finance:creditRegistrations", async () => {
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
          registrantType
          approvalStatus
          companyTinNumber
          affiliatedCompany
          rejectionReason
          adminActorName
          adminAuthorizedAt
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
  });
}

export async function UpdateCreditRegistration(
  creditRegData: UpdateCreditRegistrationInput,
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
