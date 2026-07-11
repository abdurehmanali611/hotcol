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

function toGraphqlDateTime(value: Date | string | undefined): string {
  const t = new Date(value ?? "");
  if (Number.isNaN(t.getTime())) return new Date().toISOString();
  return t.toISOString();
}

function graphqlLooksLikeMissingBatchField(message: string): boolean {
  return /Unknown field|Cannot query field|Unknown argument|Unknown type/i.test(
    message,
  );
}

function graphqlLooksLikeBatchTimeout(message: string): boolean {
  return /expired transaction|transaction was \d+ ms|P2028/i.test(
    String(message || ""),
  );
}

const REGISTRATION_BATCH_CHUNK_SIZE = 15;

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
        $HotelName: String!,
        $voucherNumber: Int
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
          HotelName: $HotelName,
          voucherNumber: $voucherNumber
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
      registrationDate: toGraphqlDateTime(values.registrationDate),
      expireDate: toGraphqlDateTime(values.expireDate),
      supplierName: values.supplierName || "",
      supplierPhone: values.supplierPhone || "",
      Address: values.Address || "",
      purchaseWithVat: values.purchaseWithVat !== false,
      supplierTinNumber: (values.supplierTinNumber || "").trim() || null,
      paidAmount: values.paidAmount || 0,
      HotelName: resolveCanonicalTenantKey(values.HotelName),
      voucherNumber:
        values.voucherNumber != null && Number(values.voucherNumber) > 0
          ? Math.floor(Number(values.voucherNumber))
          : null,
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
      throw new Error(
        response.data.errors[0]?.message || "Failed to create item",
      );
    }

    const created = response.data.data?.ItemRegistration;
    if (!created) {
      throw new Error("Item registration was not saved by the server");
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
        // Petty cash only covers what was actually paid out at registration.
        // Credit / partial purchases keep the unpaid balance in petty cash.
        const owed = computeInventoryPaidAmountETB(
          values.amount,
          values.unitPrice,
          values.purchaseWithVat,
        );
        const paidFromPettyCash = Math.min(
          Math.max(0, Number(values.paidAmount) || 0),
          owed,
        );

        if (currentPityCash) {
          const newAmount = currentPityCash.amount - paidFromPettyCash;

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

async function sequentialItemRegistrationsWithSharedVoucher(
  lines: ItemRegistrationLineInput[],
  hotelName: string,
): Promise<
  {
    id: number;
    approvalStatus?: string;
    voucherNumber?: number | null;
    voucherDisplay?: string | null;
  }[]
> {
  const canonical = resolveCanonicalTenantKey(hotelName);

  async function createOne(
    line: ItemRegistrationLineInput,
    sharedVoucher?: number | null,
  ) {
    return CreateItemRegistration({
      ...line,
      HotelName: canonical,
      supplierTinNumber: line.supplierTinNumber,
      voucherNumber: sharedVoucher,
    });
  }

  try {
    const first = await createOne(lines[0]);
    const sharedVoucher = first.voucherNumber;
    const results = [first];
    for (let i = 1; i < lines.length; i++) {
      results.push(await createOne(lines[i], sharedVoucher));
    }
    return results;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err ?? "");
    if (!graphqlLooksLikeMissingBatchField(msg)) throw err;
    const results = [];
    for (const line of lines) {
      results.push(await createOne(line));
    }
    return results;
  }
}

function mapLinesToBatchVariables(lines: ItemRegistrationLineInput[]) {
  return lines.map((line) => ({
    name: line.name || "",
    imageUrl: line.imageUrl || "",
    category: line.category || "",
    amount: line.amount || 0,
    measuredBy: line.measuredBy || "",
    unitPrice: line.unitPrice || 0,
    registrationDate: toGraphqlDateTime(line.registrationDate),
    expireDate: toGraphqlDateTime(line.expireDate),
    supplierName: line.supplierName || "",
    supplierPhone: line.supplierPhone || "",
    Address: line.Address || "",
    purchaseWithVat: line.purchaseWithVat !== false,
    supplierTinNumber: (line.supplierTinNumber || "").trim() || null,
    paidAmount: line.paidAmount || 0,
    purchaseRequestId: line.purchaseRequestId ?? null,
  }));
}

export type ItemRegistrationLineInput = {
  name: string;
  imageUrl: string;
  category: string;
  amount: number;
  measuredBy: string;
  unitPrice: number;
  registrationDate: Date;
  expireDate: Date;
  supplierName: string;
  supplierPhone: string;
  Address: string;
  purchaseWithVat?: boolean;
  supplierTinNumber?: string;
  paidAmount: number;
  purchaseRequestId?: number | null;
};

/** Multiple item lines registered together share one voucher number. */
async function postItemRegistrationsBatch(
  lines: ItemRegistrationLineInput[],
  receivedByDepartment: string,
  token: string,
) {
  const mutation = `
    mutation CreateItemRegistrationsBatch(
      $lines: [ItemRegistrationLineInput!]!
      $receivedByDepartment: String!
    ) {
      createItemRegistrationsBatch(
        lines: $lines
        receivedByDepartment: $receivedByDepartment
      ) {
        id
        name
        approvalStatus
        voucherNumber
        voucherDisplay
      }
    }
  `;
  const response = await api.post(
    API_URL,
    {
      query: mutation,
      variables: {
        lines: mapLinesToBatchVariables(lines),
        receivedByDepartment: String(receivedByDepartment).trim(),
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (response.data.errors?.length) {
    throw new Error(
      response.data.errors[0]?.message || "Failed to register items",
    );
  }
  const created = response.data.data?.createItemRegistrationsBatch as
    | {
        id: number;
        approvalStatus?: string;
        voucherNumber?: number | null;
        voucherDisplay?: string | null;
      }[]
    | undefined;
  if (!created?.length) {
    throw new Error("Item registrations were not saved by the server");
  }
  return created;
}

export async function createItemRegistrationsBatchApi(
  lines: ItemRegistrationLineInput[],
  hotelName: string,
  receivedByDepartment: string,
) {
  if (!lines.length) throw new Error("At least one line is required");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (!token) {
    toast.error("You are not logged in. Please Login again.");
    throw new Error("No authenticated token found");
  }

  let created:
    | {
        id: number;
        approvalStatus?: string;
        voucherNumber?: number | null;
        voucherDisplay?: string | null;
      }[]
    | null = null;

  try {
    created = await postItemRegistrationsBatch(
      lines,
      receivedByDepartment,
      token,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err ?? "");
    if (graphqlLooksLikeMissingBatchField(msg)) {
      created = await sequentialItemRegistrationsWithSharedVoucher(
        lines,
        hotelName,
      );
    } else if (
      graphqlLooksLikeBatchTimeout(msg) &&
      lines.length > REGISTRATION_BATCH_CHUNK_SIZE
    ) {
      const merged: NonNullable<typeof created> = [];
      for (let i = 0; i < lines.length; i += REGISTRATION_BATCH_CHUNK_SIZE) {
        const chunk = lines.slice(i, i + REGISTRATION_BATCH_CHUNK_SIZE);
        merged.push(
          ...(await postItemRegistrationsBatch(
            chunk,
            receivedByDepartment,
            token,
          )),
        );
      }
      created = merged;
    } else {
      throw err;
    }
  }

  if (!created?.length) {
    throw new Error("Item registrations were not saved by the server");
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
      const currentPityCash = findRowByTenantScope(pityCashList, hotelName);
      if (currentPityCash) {
        let runningBalance = currentPityCash.amount;
        for (const line of lines) {
          // Deduct only the cash actually paid out (capped at the owed total);
          // any credit balance stays in petty cash until later settlement.
          const owed = computeInventoryPaidAmountETB(
            line.amount,
            line.unitPrice,
            line.purchaseWithVat,
          );
          const paidFromPettyCash = Math.min(
            Math.max(0, Number(line.paidAmount) || 0),
            owed,
          );
          runningBalance -= paidFromPettyCash;
        }
        try {
          await UpdatePityDeduction(currentPityCash.id, runningBalance);
        } catch {
          toast.warning(
            "Items registered but failed to update petty cash balance",
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
          receivedByDepartment
          receivedByLeaderName
          financeDeptLeaderName
          gmDeptLeaderName
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

export async function fetchFreshBazaarArchives() {
  try {
    return await dedupeHotelListRead("freshBazaarArchives:list", async () => {
      const query = `
      query {
        freshBazaarArchives {
          id
          HotelName
          itemRegistrationId
          stockOutRequestId
          name
          imageUrl
          category
          amount
          measuredBy
          unitPrice
          purchaseWithVat
          paidAmount
          supplierName
          supplierPhone
          Address
          supplierTinNumber
          registrationDate
          archivedAt
        }
      }
      `;
      const response = await api.post(API_URL, { query });
      if (response.data.errors) {
        throw new Error(
          response.data.errors[0]?.message ||
            "Failed to fetch fresh bazaar archives",
        );
      }
      return response.data.data.freshBazaarArchives || [];
    });
  } catch (error: any) {
    toast.error("Failed to fetch fresh bazaar archives");
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
