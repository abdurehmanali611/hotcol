import { api, API_URL, invalidateGraphqlListCache } from "./client";
import { toast } from "sonner";

export const PENDING_STORE_STATUS = "PENDING_STORE";

async function runMutation<T>(query: string, variables: object): Promise<T> {
  const response = await api.post(API_URL, { query, variables });
  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0]?.message || "Request failed");
  }
  return response.data.data as T;
}

export async function updatePurchaseRequestStoreDraftApi(
  id: number,
  input: {
    itemName?: string;
    quantity?: number;
    measuredBy?: string;
    entranceDate?: Date | string;
    notes?: string;
    estimatedUnitPrice?: number;
    supplierName?: string;
    supplierPhone?: string;
    category?: string;
    purchaseWithVat?: boolean;
  },
) {
  const data = await runMutation<{
    updatePurchaseRequestStoreDraft: { id: number; status: string };
  }>(
    `mutation UpdatePurchaseRequestStoreDraft(
      $id: Int!
      $itemName: String
      $quantity: Float
      $measuredBy: String
      $entranceDate: DateTime
      $notes: String
      $estimatedUnitPrice: Float
      $supplierName: String
      $supplierPhone: String
      $category: String
      $purchaseWithVat: Boolean
    ) {
      updatePurchaseRequestStoreDraft(
        id: $id
        itemName: $itemName
        quantity: $quantity
        measuredBy: $measuredBy
        entranceDate: $entranceDate
        notes: $notes
        estimatedUnitPrice: $estimatedUnitPrice
        supplierName: $supplierName
        supplierPhone: $supplierPhone
        category: $category
        purchaseWithVat: $purchaseWithVat
      ) {
        id
        status
        voucherNumber
        voucherDisplay
      }
    }`,
    { id, ...input },
  );
  invalidateGraphqlListCache("hotel:purchaseRequests");
  return data.updatePurchaseRequestStoreDraft;
}

export async function deletePurchaseRequestStoreDraftApi(id: number) {
  await runMutation<{ deletePurchaseRequestStoreDraft: boolean }>(
    `mutation DeletePurchaseRequestStoreDraft($id: Int!) {
      deletePurchaseRequestStoreDraft(id: $id)
    }`,
    { id },
  );
  invalidateGraphqlListCache("hotel:purchaseRequests");
}

export async function submitPurchaseRequestsToCostControlApi(ids: number[]) {
  const data = await runMutation<{
    submitPurchaseRequestsToCostControl: { id: number; status: string }[];
  }>(
    `mutation SubmitPurchaseRequestsToCostControl($ids: [Int!]!) {
      submitPurchaseRequestsToCostControl(ids: $ids) {
        id
        status
        voucherNumber
        voucherDisplay
      }
    }`,
    { ids },
  );
  invalidateGraphqlListCache("hotel:purchaseRequests");
  toast.success(
    `Sent ${data.submitPurchaseRequestsToCostControl.length} purchase line(s) to cost control`,
  );
  return data.submitPurchaseRequestsToCostControl;
}

export async function updateStockOutRequestStoreDraftApi(
  id: number,
  input: {
    movementType?: string;
    amount?: number;
    stakeHolderOrReason?: string;
  },
) {
  const data = await runMutation<{
    updateStockOutRequestStoreDraft: { id: number; status: string };
  }>(
    `mutation UpdateStockOutRequestStoreDraft(
      $id: Int!
      $movementType: String
      $amount: Float
      $stakeHolderOrReason: String
    ) {
      updateStockOutRequestStoreDraft(
        id: $id
        movementType: $movementType
        amount: $amount
        stakeHolderOrReason: $stakeHolderOrReason
      ) {
        id
        status
        voucherNumber
        voucherDisplay
      }
    }`,
    { id, ...input },
  );
  invalidateGraphqlListCache(["hotel:stockOutRequests", "ItemRegistration:list"]);
  return data.updateStockOutRequestStoreDraft;
}

export async function deleteStockOutRequestStoreDraftApi(id: number) {
  await runMutation<{ deleteStockOutRequestStoreDraft: boolean }>(
    `mutation DeleteStockOutRequestStoreDraft($id: Int!) {
      deleteStockOutRequestStoreDraft(id: $id)
    }`,
    { id },
  );
  invalidateGraphqlListCache("hotel:stockOutRequests");
}

export async function submitStockOutRequestsToCostControlApi(ids: number[]) {
  const data = await runMutation<{
    submitStockOutRequestsToCostControl: { id: number; status: string }[];
  }>(
    `mutation SubmitStockOutRequestsToCostControl($ids: [Int!]!) {
      submitStockOutRequestsToCostControl(ids: $ids) {
        id
        status
        voucherNumber
        voucherDisplay
      }
    }`,
    { ids },
  );
  invalidateGraphqlListCache(["hotel:stockOutRequests", "ItemRegistration:list"]);
  toast.success(
    `Sent ${data.submitStockOutRequestsToCostControl.length} movement line(s) to cost control`,
  );
  return data.submitStockOutRequestsToCostControl;
}

export async function submitItemRegistrationsToCostControlApi(ids: number[]) {
  const data = await runMutation<{
    submitItemRegistrationsToCostControl: { id: number; approvalStatus: string }[];
  }>(
    `mutation SubmitItemRegistrationsToCostControl($ids: [Int!]!) {
      submitItemRegistrationsToCostControl(ids: $ids) {
        id
        approvalStatus
        voucherNumber
        voucherDisplay
      }
    }`,
    { ids },
  );
  invalidateGraphqlListCache([
    "ItemRegistration:list",
    "hotel:purchaseRequests",
    "hotel:stockOutRequests",
  ]);
  toast.success(
    `Sent ${data.submitItemRegistrationsToCostControl.length} registration line(s) to cost control`,
  );
  return data.submitItemRegistrationsToCostControl;
}
