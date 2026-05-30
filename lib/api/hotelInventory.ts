/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from "sonner";
import { api, API_URL, dedupeHotelListRead, invalidateGraphqlListCache } from "./client";

import { computeInventoryPaidAmountETB } from "../hotelInventoryPayment";
import { findRowByTenantScope, resolveCanonicalTenantKey } from "../tenantRowMatch";
import { fetchPityCash } from "./cafeCredit";
import { UpdatePityDeduction } from "./cafeOrders";
import type {
  createItemRegistration,
  UpdateItemRegistration as UpdateItemRegistrationInput,
  CreatingItemStatus,
} from "./types";


// ==================== Item REGISTRATION ====================

export async function CreateItemRegistration(values: createItemRegistration) {
  try {
    const mutation = `
      mutation ItemRegistration(
        $name: String!, 
        $imageUrl: String!,
        $category: String!, 
        $amount: Float!, 
        $measuredBy: String!, 
        $unitPrice: Float!, 
        $registrationDate: DateTime!,
        $expireDate: DateTime!,
        $supplierName: String!, 
        $supplierPhone: String!,
        $Address: String!,
        $purchaseWithVat: Boolean,
        $supplierTinNumber: String,
        $paidAmount: Float!,
        $HotelName: String!
      ) {
        ItemRegistration(
          name: $name, 
          imageUrl: $imageUrl,
          category: $category, 
          amount: $amount, 
          measuredBy: $measuredBy, 
          unitPrice: $unitPrice,
          registrationDate: $registrationDate,
          expireDate: $expireDate,
          supplierName: $supplierName,
          supplierPhone: $supplierPhone,
          Address: $Address,
          purchaseWithVat: $purchaseWithVat,
          supplierTinNumber: $supplierTinNumber,
          paidAmount: $paidAmount,
          HotelName: $HotelName
        ) {
          id
          name
          imageUrl
          category
          amount
          measuredBy
          unitPrice
          registrationDate
          expireDate
          supplierName
          supplierPhone
          Address
          purchaseWithVat
          supplierTinNumber
          paidAmount
          HotelName
          approvalStatus
          voucherNumber
          voucherDisplay
        }
      }
    `;

    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    if (!token) {
      toast.error("You are not logged in. Please Login again.");
      throw new Error("No authenticated token found");
    }

    const variables = {
      name: values.name || "",
      imageUrl: values.imageUrl || "",
      category: values.category || "",
      amount: values.amount || 0,
      measuredBy: values.measuredBy || "",
      unitPrice: values.unitPrice || 0,
      registrationDate: values.registrationDate || new Date(),
      expireDate: values.expireDate || new Date(),
      supplierName: values.supplierName || "",
      supplierPhone: values.supplierPhone || "",
      Address: values.Address || "",
      purchaseWithVat: values.purchaseWithVat !== false,
      supplierTinNumber: (values.supplierTinNumber || "").trim() || null,
      paidAmount: values.paidAmount || 0,
      HotelName: resolveCanonicalTenantKey(values.HotelName),
    };

    const response = await api.post(
      API_URL,
      {
        query: mutation,
        variables: variables,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data.errors) {
      const errorMessage =
        response.data.errors[0]?.message || "Failed to create item";

      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    const created = response.data.data?.ItemRegistration;
    if (!created) {
      const errorMessage = "Item registration was not saved by the server";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    const businessType =
      typeof window !== "undefined"
        ? localStorage.getItem("business_type")?.trim() || ""
        : "";
    const isLodgingStore =
      businessType === "Hotel" ||
      businessType === "Resort" ||
      businessType === "Pension";

    if (!isLodgingStore) {
      try {
        const pityCashList = await fetchPityCash();
        const currentPityCash = findRowByTenantScope(
          pityCashList,
          values.HotelName,
        );
        const totalCalc = computeInventoryPaidAmountETB(
            values.amount,
            values.unitPrice,
            values.purchaseWithVat,
          );

        if (currentPityCash) {
          const newAmount = currentPityCash.amount - totalCalc;

          try {
            await UpdatePityDeduction(currentPityCash.id, newAmount);
          } catch {
            toast.warning(
              "Item created but failed to update petty cash balance",
            );
          }
        }
      } catch {
        toast.error("Failed to fetch petty cash");
      }
    }

    invalidateGraphqlListCache([
      "ItemRegistration:list",
      "finance:pityCash",
    ]);
    return created;
  } catch (error: any) {
    throw error;
  }
}

export async function fetchItemRegistrations() {
  return dedupeHotelListRead("ItemRegistration:list", async () => {
    const query = `
      query {
        ItemRegistration {
          id
          name
          imageUrl
          category
          amount
          measuredBy
          unitPrice
          registrationDate
          expireDate
          supplierName
          supplierPhone
          purchaseWithVat
          supplierTinNumber
          Address
          paidAmount
          registeredAmount
          registeredValue
          statusBy
          HotelName
          voucherNumber
          voucherDisplay
          purchaseRequestId
          approvalStatus
          ccProfileId
          ccActorName
          ccCheckedAt
          financeActorName
          financeApprovedAt
          managerActorName
          managerAuthorizedAt
          rejectionReason
          pendingUnitPrice
          unitPriceChangeStatus
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to fetch item registrations",
      );
    }
    return response.data.data.ItemRegistration || [];
  });
}

export async function UpdateItemRegistration(
  creditRegData: UpdateItemRegistrationInput,
) {
  try {
    const mutation = `
      mutation UpdateItemRegistration(
        $id: Int!, 
        $name: String!, 
        $imageUrl: String!,
        $category: String!, 
        $amount: Float!, 
        $measuredBy: String!, 
        $unitPrice: Float!, 
        $registrationDate: DateTime!,
        $expireDate: DateTime!,
        $supplierName: String!, 
        $supplierPhone: String!,
        $Address: String!,
        $purchaseWithVat: Boolean,
        $supplierTinNumber: String,
        $paidAmount: Float!
      ) {
        UpdateItemRegistration(
          id: $id, 
          name: $name, 
          imageUrl: $imageUrl,
          category: $category, 
          amount: $amount, 
          measuredBy: $measuredBy, 
          unitPrice: $unitPrice, 
          registrationDate: $registrationDate,
          expireDate: $expireDate,
          supplierName: $supplierName,
          supplierPhone: $supplierPhone,
          Address: $Address,
          purchaseWithVat: $purchaseWithVat,
          supplierTinNumber: $supplierTinNumber,
          paidAmount: $paidAmount
        ) {
          id
          name
          imageUrl
          category
          amount
          measuredBy
          unitPrice
          registrationDate
          expireDate
          supplierName
          supplierPhone
          Address
          purchaseWithVat
          supplierTinNumber
          paidAmount
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
          "Failed to update item registration",
      );
    }

    toast.success("item registration updated successfully");
    invalidateGraphqlListCache("ItemRegistration:list");
    return response.data.data.UpdateItemRegistration;
  } catch (error: any) {
    toast.error("Failed to update item registration");
    throw error;
  }
}

export async function DeleteItemRegistration(id: number) {
  try {
    const mutation = `
      mutation DeleteItemRegistration($id: Int!) {
        DeleteItemRegistration(id: $id) {
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
          "Failed to delete item registration",
      );
    }

    toast.success("Item registration deleted successfully");
    invalidateGraphqlListCache([
      "ItemRegistration:list",
      "ItemStatus:list",
    ]);
    return response.data.data.DeleteItemRegistration;
  } catch (error: any) {
    toast.error("Failed to delete Item registration");
    throw error;
  }
}

export async function CreateItemStatus(data: CreatingItemStatus) {
  try {
    const mutation = `mutation CreateItemStatus($name: String!,
    $imageUrl: String!,
    $category: String!,
    $amount: Float!,
    $measuredBy: String!,
    $unitPrice: Float!,   
    $actionDate: DateTime!,
    $supplierName: String!,
    $supplierPhone: String!,   
    $Address:       String!,
    $purchaseWithVat: Boolean,
    $supplierTinNumber: String,
    $paidAmount: Float!,
    $status: String!,
    $statusBy: String!, $HotelName: String!) {
      CreateItemStatus(name: $name, imageUrl: $imageUrl, category: $category, amount: $amount, measuredBy: $measuredBy, unitPrice: $unitPrice, actionDate: $actionDate, supplierName: $supplierName, supplierPhone: $supplierPhone, Address: $Address, purchaseWithVat: $purchaseWithVat, supplierTinNumber: $supplierTinNumber, paidAmount: $paidAmount, status: $status, statusBy: $statusBy, HotelName: $HotelName) {
       name
       imageUrl
       category
       amount
       measuredBy
       unitPrice
       actionDate
       supplierName
       supplierPhone
       Address
       purchaseWithVat
       supplierTinNumber
       paidAmount
       status
       statusBy
       HotelName
      }
    }`;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: {
        ...data,
        purchaseWithVat: data.purchaseWithVat !== false,
        supplierTinNumber: (data.supplierTinNumber || "").trim() || null,
      },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0].message || "Failed to Update Item Status",
      );
    }

    toast.success("Status Updated Successfully");
    invalidateGraphqlListCache([
      "ItemRegistration:list",
      "ItemStatus:list",
    ]);
    return response.data.data.CreateItemStatus;
  } catch (error: any) {
    console.error("Status update error:", error);
    toast.error("Failed to update Status");
    throw error;
  }
}

export async function fetchItemStatus() {
  try {
    return await dedupeHotelListRead("ItemStatus:list", async () => {
      const query = `
      query {
        ItemStatus {
          id
          name
          imageUrl
          category
          amount
          measuredBy
          unitPrice
          actionDate
          supplierName
          supplierPhone
          Address
          purchaseWithVat
          supplierTinNumber
          paidAmount
          status
          statusBy
          HotelName
          voucherNumber
          voucherDisplay
          stockOutRequestId
        }
      }
          `;
      const response = await api.post(API_URL, { query });
      if (response.data.errors) {
        throw new Error(
          response.data.errors[0]?.message || "Failed to fetch item Status",
        );
      }
      return response.data.data.ItemStatus || [];
    });
  } catch (error: any) {
    toast.error("Failed to fetch Item Status");
    throw error;
  }
}

export async function DeleteItemStatus(id: number) {
  try {
    const mutation = `mutation DeleteItemStatus($id: Int!) {
      DeleteItemStatus(id: $id) {
       id
      }
    }`
     const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to delete item status",
      );
    }

    toast.success("Item Status deleted successfully");
    return response.data.data.DeleteItemStatus;
  } catch (error: any) {
    toast.error("Failed to Delete Item Status")
    throw error
  }
}
