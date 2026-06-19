import { toast } from "sonner";
import axios from "axios";
import { api, API_URL, dedupeHotelListRead, invalidateGraphqlListCache } from "./client";
import { isSessionExpiredError } from "../sessionExpiry";
import { formatPoolFailures, runWithConcurrency } from "../parallelBatch";
import type {
  HotelMutationToastOptions,
  CostControllerProfileRow,
  KitchenBarBeginningRow,
  KitchenBarMonthlySnapshotRow,
  HotelCorporateCreditTierRow,
  HotelCreditCompanyRow,
  HotelCreditPartyRow,
  HotelCreditConsumptionRow,
} from "./types";


/* --- Hotel inventory workflow (GraphQL) --- */

export interface PurchaseRequestRow {
  id: number;
  HotelName: string;
  itemName: string;
  quantity: number;
  measuredBy: string;
  entranceDate?: string | null;
  notes: string;
  estimatedUnitPrice: number;
  supplierName: string;
  supplierPhone: string;
  category: string;
  purchaseWithVat?: boolean;
  status: string;
  storeUserName: string;
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
  ccProfileId?: number | null;
  ccActorName?: string | null;
  ccApprovedAt?: string | null;
  financeActorName?: string | null;
  financeApprovedAt?: string | null;
  managerActorName?: string | null;
  managerAuthorizedAt?: string | null;
  rejectionReason?: string | null;
  pendingUnitPrice?: number | null;
  unitPriceChangeStatus?: string | null;
  requestedByDepartment?: string | null;
  requestedByLeaderName?: string | null;
  requestedByDepartmentLabel?: string | null;
  preparedByLeaderName?: string | null;
  financeDeptLeaderName?: string | null;
  gmDeptLeaderName?: string | null;
  createdAt: string;
}

export interface StockOutRequestRow {
  id: number;
  HotelName: string;
  itemRegistrationId: number;
  /** From inventory registration; empty if row deleted */
  itemName: string;
  movementType: string;
  amount: number;
  stakeHolderOrReason: string;
  status: string;
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
  requestedByUserName: string;
  ccProfileId?: number | null;
  ccActorName?: string | null;
  ccCheckedAt?: string | null;
  financeActorName?: string | null;
  financeApprovedAt?: string | null;
  managerActorName?: string | null;
  managerAuthorizedAt?: string | null;
  decidedAt?: string | null;
  rejectionReason?: string | null;
  requestedByDepartment?: string | null;
  requestedByLeaderName?: string | null;
  requestedByDepartmentLabel?: string | null;
  preparedByLeaderName?: string | null;
  financeDeptLeaderName?: string | null;
  gmDeptLeaderName?: string | null;
  createdAt: string;
}

/** Fields to request after reject mutations (must match GraphQL `PurchaseRequest` type). */
const HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS = `
        id
        status
        HotelName
        itemName
        quantity
        measuredBy
        entranceDate
        notes
        estimatedUnitPrice
        supplierName
        supplierPhone
        category
        purchaseWithVat
        storeUserName
        ccProfileId
        ccActorName
        ccApprovedAt
        financeActorName
        financeApprovedAt
        rejectionReason
        createdAt
`;

/** Fields to request after stock-out reject (must match GraphQL `StockOutRequest` type). */
const HOTEL_STOCK_OUT_AFTER_REJECT_FIELDS = `
        id
        status
        HotelName
        itemRegistrationId
        itemName
        movementType
        amount
        stakeHolderOrReason
        requestedByUserName
        ccProfileId
        ccActorName
        decidedAt
        rejectionReason
        createdAt
`;

export async function fetchPurchaseRequests(): Promise<PurchaseRequestRow[]> {
  return dedupeHotelListRead("hotel:purchaseRequests", async () => {
    const query = `
    query {
      purchaseRequests {
        id
        HotelName
        itemName
        quantity
        measuredBy
        entranceDate
        notes
        estimatedUnitPrice
        supplierName
        supplierPhone
        category
        purchaseWithVat
        status
        storeUserName
        ccProfileId
        ccActorName
        ccApprovedAt
        financeActorName
        financeApprovedAt
        managerActorName
        managerAuthorizedAt
        voucherNumber
        voucherDisplay
        pendingUnitPrice
        unitPriceChangeStatus
        rejectionReason
        requestedByDepartment
        requestedByLeaderName
        requestedByDepartmentLabel
        preparedByLeaderName
        financeDeptLeaderName
        gmDeptLeaderName
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load purchase requests",
      );
    }
    return response.data.data.purchaseRequests || [];
  });
}

export async function fetchStockOutRequests(): Promise<StockOutRequestRow[]> {
  return dedupeHotelListRead("hotel:stockOutRequests", async () => {
    const query = `
    query {
      stockOutRequests {
        id
        HotelName
        itemRegistrationId
        itemName
        movementType
        amount
        stakeHolderOrReason
        status
        voucherNumber
        voucherDisplay
        requestedByUserName
        ccProfileId
        ccActorName
        ccCheckedAt
        financeActorName
        financeApprovedAt
        managerActorName
        managerAuthorizedAt
        decidedAt
        rejectionReason
        requestedByDepartment
        requestedByLeaderName
        requestedByDepartmentLabel
        preparedByLeaderName
        financeDeptLeaderName
        gmDeptLeaderName
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load stock-out requests",
      );
    }
    return response.data.data.stockOutRequests || [];
  });
}

export async function fetchCostControllerProfiles(): Promise<
  CostControllerProfileRow[]
> {
  return dedupeHotelListRead("hotel:costControllerProfiles", async () => {
    const query = `
    query {
      costControllerProfiles {
        id
        displayName
        HotelName
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load CC profiles",
      );
    }
    return response.data.data.costControllerProfiles || [];
  });
}

export async function fetchKitchenBarBeginnings(): Promise<
  KitchenBarBeginningRow[]
> {
  return dedupeHotelListRead("hotel:kitchenBarBeginnings", async () => {
    const query = `
    query {
      kitchenBarBeginnings {
        id
        HotelName
        station
        itemName
        amount
        measuredBy
        monthPeriod
        calendarDate
        stockOutDay
        managementTakenDay
        closingOnHand
        notes
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load beginnings",
      );
    }
    return response.data.data.kitchenBarBeginnings || [];
  });
}

export async function createPurchaseRequestApi(
  input: {
    itemName: string;
    quantity: number;
    measuredBy: string;
    entranceDate?: Date | string;
    notes?: string;
    estimatedUnitPrice?: number;
    supplierName?: string;
    supplierPhone?: string;
    category?: string;
  },
  options?: { suppressSuccessToast?: boolean },
) {
  const mutation = `
    mutation CreatePurchaseRequest(
      $itemName: String!
      $quantity: Float!
      $measuredBy: String!
      $entranceDate: DateTime
      $notes: String
      $estimatedUnitPrice: Float
      $supplierName: String
      $supplierPhone: String
      $category: String
    ) {
      createPurchaseRequest(
        itemName: $itemName
        quantity: $quantity
        measuredBy: $measuredBy
        entranceDate: $entranceDate
        notes: $notes
        estimatedUnitPrice: $estimatedUnitPrice
        supplierName: $supplierName
        supplierPhone: $supplierPhone
        category: $category
      ) {
        id
        status
        voucherNumber
        voucherDisplay
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Request failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Saved for your review — confirm under Review before send");
  }
  invalidateGraphqlListCache("hotel:purchaseRequests");
  return response.data.data.createPurchaseRequest;
}

export type PurchaseRequestLineInput = {
  itemName: string;
  quantity: number;
  measuredBy: string;
  entranceDate?: Date | string;
  notes?: string;
  estimatedUnitPrice?: number;
  supplierName?: string;
  supplierPhone?: string;
  category?: string;
  purchaseWithVat?: boolean;
};

/** Multiple purchase lines submitted together share one voucher number. */
async function runCreatePurchaseRequestsBatchMutation(
  lines: PurchaseRequestLineInput[],
  requestedByDepartment: string,
) {
  const mutation = `
    mutation CreatePurchaseRequestsBatch(
      $lines: [PurchaseRequestLineInput!]!
      $requestedByDepartment: String!
    ) {
      createPurchaseRequestsBatch(
        lines: $lines
        requestedByDepartment: $requestedByDepartment
      ) {
        id
        status
        voucherNumber
        voucherDisplay
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      lines,
      requestedByDepartment: String(requestedByDepartment).trim(),
    },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Request failed");
  }
  const rows = response.data.data.createPurchaseRequestsBatch as {
    id: number;
    status: string;
    voucherNumber?: number | null;
    voucherDisplay?: string | null;
  }[];
  if (!rows?.length) {
    throw new Error("Purchase requests were not saved by the server");
  }
  return rows;
}

const STORE_DRAFT_BATCH_CHUNK_SIZE = 15;

/** Only retry large store-draft batches on timeouts / infra failures — not validation errors. */
function storeDraftBatchShouldChunkRetry(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /expired transaction|transaction was \d+ ms|P2028|ETIMEDOUT|ECONNABORTED|timeout exceeded|network error/i.test(
    msg,
  );
}

async function createPurchaseRequestsBatchWithChunkFallback(
  lines: PurchaseRequestLineInput[],
  requestedByDepartment: string,
) {
  try {
    return await runCreatePurchaseRequestsBatchMutation(
      lines,
      requestedByDepartment,
    );
  } catch (first) {
    if (
      lines.length <= STORE_DRAFT_BATCH_CHUNK_SIZE ||
      !storeDraftBatchShouldChunkRetry(first)
    ) {
      throw first;
    }
    const merged: Awaited<
      ReturnType<typeof runCreatePurchaseRequestsBatchMutation>
    > = [];
    for (let i = 0; i < lines.length; i += STORE_DRAFT_BATCH_CHUNK_SIZE) {
      const chunk = lines.slice(i, i + STORE_DRAFT_BATCH_CHUNK_SIZE);
      merged.push(
        ...(await runCreatePurchaseRequestsBatchMutation(
          chunk,
          requestedByDepartment,
        )),
      );
    }
    return merged;
  }
}

export async function createPurchaseRequestsBatchApi(
  lines: PurchaseRequestLineInput[],
  requestedByDepartment: string,
  options?: { suppressSuccessToast?: boolean },
) {
  if (!lines.length) throw new Error("At least one line is required");
  const rows = await createPurchaseRequestsBatchWithChunkFallback(
    lines,
    requestedByDepartment,
  );
  if (!options?.suppressSuccessToast) {
    toast.success("Saved for your review — confirm under Review before send");
  }
  invalidateGraphqlListCache("hotel:purchaseRequests");
  return rows;
}

export async function createStockOutRequestApi(
  input: {
    itemRegistrationId: number;
    movementType: string;
    amount: number;
    stakeHolderOrReason: string;
    requestedByDepartment: string;
  },
  options?: { suppressSuccessToast?: boolean },
) {
  const mutation = `
    mutation CreateStockOutRequest(
      $itemRegistrationId: Int!
      $movementType: String!
      $amount: Float!
      $stakeHolderOrReason: String!
      $requestedByDepartment: String!
    ) {
      createStockOutRequest(
        itemRegistrationId: $itemRegistrationId
        movementType: $movementType
        amount: $amount
        stakeHolderOrReason: $stakeHolderOrReason
        requestedByDepartment: $requestedByDepartment
      ) {
        id
        status
        voucherNumber
        voucherDisplay
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Request failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Saved for your review — confirm under Review before send");
  }
  invalidateGraphqlListCache([
    "hotel:stockOutRequests",
    "ItemRegistration:list",
  ]);
  return response.data.data.createStockOutRequest;
}

export type StockOutRequestLineInput = {
  itemRegistrationId: number;
  movementType: string;
  amount: number;
  stakeHolderOrReason: string;
};

/** Multiple stock movements submitted together share one voucher number. */
async function runCreateStockOutRequestsBatchMutation(
  lines: StockOutRequestLineInput[],
  requestedByDepartment: string,
) {
  const mutation = `
    mutation CreateStockOutRequestsBatch(
      $lines: [StockOutRequestLineInput!]!
      $requestedByDepartment: String!
    ) {
      createStockOutRequestsBatch(
        lines: $lines
        requestedByDepartment: $requestedByDepartment
      ) {
        id
        status
        voucherNumber
        voucherDisplay
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: {
      lines,
      requestedByDepartment: String(requestedByDepartment).trim(),
    },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Request failed");
  }
  const rows = response.data.data.createStockOutRequestsBatch as {
    id: number;
    status: string;
    voucherNumber?: number | null;
    voucherDisplay?: string | null;
  }[];
  if (!rows?.length) {
    throw new Error("Stock movement requests were not saved by the server");
  }
  return rows;
}

async function createStockOutRequestsBatchWithChunkFallback(
  lines: StockOutRequestLineInput[],
  requestedByDepartment: string,
) {
  try {
    return await runCreateStockOutRequestsBatchMutation(
      lines,
      requestedByDepartment,
    );
  } catch (first) {
    if (
      lines.length <= STORE_DRAFT_BATCH_CHUNK_SIZE ||
      !storeDraftBatchShouldChunkRetry(first)
    ) {
      throw first;
    }
    const merged: Awaited<
      ReturnType<typeof runCreateStockOutRequestsBatchMutation>
    > = [];
    for (let i = 0; i < lines.length; i += STORE_DRAFT_BATCH_CHUNK_SIZE) {
      const chunk = lines.slice(i, i + STORE_DRAFT_BATCH_CHUNK_SIZE);
      merged.push(
        ...(await runCreateStockOutRequestsBatchMutation(
          chunk,
          requestedByDepartment,
        )),
      );
    }
    return merged;
  }
}

export async function createStockOutRequestsBatchApi(
  lines: StockOutRequestLineInput[],
  requestedByDepartment: string,
  options?: { suppressSuccessToast?: boolean },
) {
  if (!lines.length) throw new Error("At least one line is required");
  const rows = await createStockOutRequestsBatchWithChunkFallback(
    lines,
    requestedByDepartment,
  );
  if (!options?.suppressSuccessToast) {
    toast.success("Saved for your review — confirm under Review before send");
  }
  invalidateGraphqlListCache([
    "hotel:stockOutRequests",
    "ItemRegistration:list",
  ]);
  return rows;
}

export async function approvePurchaseRequestCCApi(
  id: number,
  costControllerProfileId: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation ApproveCC($id: Int!, $costControllerProfileId: Int!) {
      approvePurchaseRequestCC(id: $id, costControllerProfileId: $costControllerProfileId) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, costControllerProfileId },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approval failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Checked — forwarded to finance");
  }
  invalidateGraphqlListCache("hotel:purchaseRequests");
  return response.data.data.approvePurchaseRequestCC;
}

export async function rejectPurchaseRequestCCApi(
  id: number,
  reason?: string,
  options?: HotelMutationToastOptions,
): Promise<PurchaseRequestRow> {
  const mutation = `
    mutation RejectCC($id: Int!, $reason: String) {
      rejectPurchaseRequestCC(id: $id, reason: $reason) {
        ${HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS}
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Request rejected");
  }
  const row = response.data.data.rejectPurchaseRequestCC as PurchaseRequestRow;
  const fb = options?.fallbackCcDisplayName?.trim();
  if (fb && !String(row.ccActorName ?? "").trim()) {
    return { ...row, ccActorName: fb };
  }
  return row;
}

export async function approvePurchaseRequestFinanceApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation ApproveFin($id: Int!) {
      approvePurchaseRequestFinance(id: $id) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approval failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Approved — forwarded to manager for authorization");
  }
  return response.data.data.approvePurchaseRequestFinance;
}

export async function authorizePurchaseRequestManagerApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation AuthMgr($id: Int!) {
      authorizePurchaseRequestManager(id: $id) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Purchase request authorized — store may receive goods");
  }
  return response.data.data.authorizePurchaseRequestManager;
}

export async function rejectPurchaseRequestManagerApi(
  id: number,
  reason?: string,
  options?: HotelMutationToastOptions,
): Promise<PurchaseRequestRow> {
  const mutation = `
    mutation RejectMgr($id: Int!, $reason: String) {
      rejectPurchaseRequestManager(id: $id, reason: $reason) {
        ${HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS}
        managerActorName
        managerAuthorizedAt
        voucherNumber
        voucherDisplay
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Request rejected");
  }
  return response.data.data.rejectPurchaseRequestManager as PurchaseRequestRow;
}

export async function submitPurchaseRequestUnitPriceChangeApi(
  id: number,
  proposedUnitPrice: number,
) {
  const mutation = `
    mutation SubmitPrPrice($id: Int!, $proposedUnitPrice: Float!) {
      submitPurchaseRequestUnitPriceChange(id: $id, proposedUnitPrice: $proposedUnitPrice) {
        id
        unitPriceChangeStatus
        pendingUnitPrice
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, proposedUnitPrice },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Submit failed");
  }
  toast.success("Unit price revision submitted for approval");
  return response.data.data.submitPurchaseRequestUnitPriceChange;
}

export async function checkPurchaseRequestUnitPriceCCApi(
  id: number,
  costControllerProfileId: number,
) {
  const mutation = `
    mutation CheckPrPriceCC($id: Int!, $costControllerProfileId: Int!) {
      checkPurchaseRequestUnitPriceCC(id: $id, costControllerProfileId: $costControllerProfileId) {
        id
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, costControllerProfileId },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Check failed");
  }
  toast.success("Price revision checked — forwarded to finance");
  return response.data.data.checkPurchaseRequestUnitPriceCC;
}

export async function approvePurchaseRequestUnitPriceFinanceApi(id: number) {
  const mutation = `
    mutation ApprovePrPriceFin($id: Int!) {
      approvePurchaseRequestUnitPriceFinance(id: $id) {
        id
        unitPriceChangeStatus
        estimatedUnitPrice
      }
    }
  `;
  const response = await api.post(API_URL, { query: mutation, variables: { id } });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approval failed");
  }
  toast.success("Price revision approved — forwarded to manager");
  return response.data.data.approvePurchaseRequestUnitPriceFinance;
}

export async function authorizePurchaseRequestUnitPriceManagerApi(id: number) {
  const mutation = `
    mutation AuthPrPriceMgr($id: Int!) {
      authorizePurchaseRequestUnitPriceManager(id: $id) {
        id
        unitPriceChangeStatus
        estimatedUnitPrice
      }
    }
  `;
  const response = await api.post(API_URL, { query: mutation, variables: { id } });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  toast.success("Unit price revision authorized");
  return response.data.data.authorizePurchaseRequestUnitPriceManager;
}

export async function rejectPurchaseRequestUnitPriceApi(id: number, reason?: string) {
  const mutation = `
    mutation RejectPrPrice($id: Int!, $reason: String) {
      rejectPurchaseRequestUnitPrice(id: $id, reason: $reason) {
        id
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Reject failed");
  }
  toast.success("Price revision rejected");
  return response.data.data.rejectPurchaseRequestUnitPrice;
}

export async function submitItemRegistrationUnitPriceChangeApi(
  id: number,
  proposedUnitPrice: number,
) {
  const mutation = `
    mutation SubmitInvPrice($id: Int!, $proposedUnitPrice: Float!) {
      submitItemRegistrationUnitPriceChange(id: $id, proposedUnitPrice: $proposedUnitPrice) {
        id
        pendingUnitPrice
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, proposedUnitPrice },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Submit failed");
  }
  toast.success("Unit price revision submitted");
  return response.data.data.submitItemRegistrationUnitPriceChange;
}

export async function checkItemRegistrationUnitPriceCCApi(
  id: number,
  costControllerProfileId: number,
) {
  const mutation = `
    mutation CheckInvPriceCC($id: Int!, $costControllerProfileId: Int!) {
      checkItemRegistrationUnitPriceCC(id: $id, costControllerProfileId: $costControllerProfileId) {
        id
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, costControllerProfileId },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Check failed");
  }
  toast.success("Unit price revision checked");
  return response.data.data.checkItemRegistrationUnitPriceCC;
}

export async function approveItemRegistrationUnitPriceFinanceApi(id: number) {
  const mutation = `
    mutation ApproveInvPriceFinance($id: Int!) {
      approveItemRegistrationUnitPriceFinance(id: $id) {
        id
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approve failed");
  }
  toast.success("Unit price revision approved");
  return response.data.data.approveItemRegistrationUnitPriceFinance;
}

export async function authorizeItemRegistrationUnitPriceManagerApi(id: number) {
  const mutation = `
    mutation AuthorizeInvPriceManager($id: Int!) {
      authorizeItemRegistrationUnitPriceManager(id: $id) {
        id
        unitPrice
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  toast.success("Unit price revision authorized");
  return response.data.data.authorizeItemRegistrationUnitPriceManager;
}

export async function rejectItemRegistrationUnitPriceApi(
  id: number,
  reason?: string,
) {
  const mutation = `
    mutation RejectInvPrice($id: Int!, $reason: String) {
      rejectItemRegistrationUnitPrice(id: $id, reason: $reason) {
        id
        unitPriceChangeStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Reject failed");
  }
  toast.success("Price revision rejected");
  return response.data.data.rejectItemRegistrationUnitPrice;
}

export async function checkItemRegistrationCCApi(
  id: number,
  costControllerProfileId: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation CheckRegCC($id: Int!, $costControllerProfileId: Int!) {
      checkItemRegistrationCC(id: $id, costControllerProfileId: $costControllerProfileId) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, costControllerProfileId },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Check failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Checked — forwarded to finance");
  }
  invalidateGraphqlListCache("ItemRegistration:list");
  return response.data.data.checkItemRegistrationCC;
}

export async function approveItemRegistrationFinanceApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation ApproveRegFin($id: Int!) {
      approveItemRegistrationFinance(id: $id) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approval failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Approved — forwarded to manager");
  }
  return response.data.data.approveItemRegistrationFinance;
}

export async function rejectItemRegistrationFinanceApi(
  id: number,
  reason?: string,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation RejectRegFin($id: Int!, $reason: String) {
      rejectItemRegistrationFinance(id: $id, reason: $reason) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Rejection failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Receipt voided — item will not appear in inventory");
  }
  return response.data.data.rejectItemRegistrationFinance;
}

export async function rejectItemRegistrationCCApi(
  id: number,
  reason: string,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation RejectRegCC($id: Int!, $reason: String) {
      rejectItemRegistrationCC(id: $id, reason: $reason) {
        id
        approvalStatus
        rejectionReason
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Rejection failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Registration rejected");
  }
  return response.data.data.rejectItemRegistrationCC;
}

export async function rejectItemRegistrationManagerApi(
  id: number,
  reason: string,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation RejectRegMgr($id: Int!, $reason: String) {
      rejectItemRegistrationManager(id: $id, reason: $reason) {
        id
        approvalStatus
        rejectionReason
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Rejection failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Registration rejected");
  }
  return response.data.data.rejectItemRegistrationManager;
}

export async function authorizeItemRegistrationManagerApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation AuthRegMgr($id: Int!) {
      authorizeItemRegistrationManager(id: $id) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Registration authorized — item is now in inventory");
  }
  invalidateGraphqlListCache("ItemRegistration:list");
  return response.data.data.authorizeItemRegistrationManager;
}

type ItemRegBatchRow = { id: number; approvalStatus: string };

async function sequentialCheckItemRegistrationsCC(
  unique: number[],
  costControllerProfileId: number,
): Promise<ItemRegBatchRow[]> {
  return fanOutByIds(
    unique,
    (id) =>
      checkItemRegistrationCCApi(id, costControllerProfileId, {
        suppressSuccessToast: true,
      }),
    {
      successMessage: (n) => `Checked ${n} registration(s) — forwarded to finance`,
      failureTitle: "Some checks failed",
    },
  );
}

export async function checkItemRegistrationsCCBatchApi(
  ids: number[],
  costControllerProfileId: number,
): Promise<ItemRegBatchRow[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (!unique.length) return [];
  if (unique.length === 1) {
    const one = await checkItemRegistrationCCApi(unique[0], costControllerProfileId);
    return [{ id: one.id, approvalStatus: one.approvalStatus }];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialCheckItemRegistrationsCC(unique, costControllerProfileId);
  }
  const mutation = `
    mutation CheckItemRegsCCBatch($ids: [Int!]!, $costControllerProfileId: Int!) {
      checkItemRegistrationsCCBatch(ids: $ids, costControllerProfileId: $costControllerProfileId) {
        id
        approvalStatus
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      checkItemRegistrationsCCBatch: ItemRegBatchRow[];
    }>(mutation, { ids: unique, costControllerProfileId });
    invalidateGraphqlListCache("ItemRegistration:list");
    toast.success(`Checked ${data.checkItemRegistrationsCCBatch.length} registration(s)`);
    return data.checkItemRegistrationsCCBatch;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialCheckItemRegistrationsCC(unique, costControllerProfileId);
  }
}

export async function rejectItemRegistrationsCCBatchApi(
  ids: number[],
  reason: string,
): Promise<ItemRegBatchRow[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (!unique.length) return [];
  if (unique.length === 1) {
    const one = await rejectItemRegistrationCCApi(unique[0], reason);
    return [{ id: one.id, approvalStatus: one.approvalStatus }];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return fanOutByIds(
      unique,
      (id) =>
        rejectItemRegistrationCCApi(id, reason, { suppressSuccessToast: true }),
      {
        successMessage: (n) => `Rejected ${n} registration(s)`,
        failureTitle: "Some rejections failed",
      },
    );
  }
  const mutation = `
    mutation RejectItemRegsCCBatch($ids: [Int!]!, $reason: String) {
      rejectItemRegistrationsCCBatch(ids: $ids, reason: $reason) {
        id
        approvalStatus
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      rejectItemRegistrationsCCBatch: ItemRegBatchRow[];
    }>(mutation, { ids: unique, reason });
    invalidateGraphqlListCache("ItemRegistration:list");
    toast.success(`Rejected ${data.rejectItemRegistrationsCCBatch.length} registration(s)`);
    return data.rejectItemRegistrationsCCBatch;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return fanOutByIds(
      unique,
      (id) =>
        rejectItemRegistrationCCApi(id, reason, { suppressSuccessToast: true }),
      {
        successMessage: (n) => `Rejected ${n} registration(s)`,
        failureTitle: "Some rejections failed",
      },
    );
  }
}

export async function approveItemRegistrationsFinanceBatchApi(
  ids: number[],
): Promise<ItemRegBatchRow[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (!unique.length) return [];
  if (unique.length === 1) {
    const one = await approveItemRegistrationFinanceApi(unique[0]);
    return [{ id: one.id, approvalStatus: one.approvalStatus }];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return fanOutByIds(
      unique,
      (id) =>
        approveItemRegistrationFinanceApi(id, { suppressSuccessToast: true }),
      {
        successMessage: (n) => `Approved ${n} registration(s)`,
        failureTitle: "Some approvals failed",
      },
    );
  }
  const mutation = `
    mutation ApproveItemRegsFinanceBatch($ids: [Int!]!) {
      approveItemRegistrationsFinanceBatch(ids: $ids) {
        id
        approvalStatus
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      approveItemRegistrationsFinanceBatch: ItemRegBatchRow[];
    }>(mutation, { ids: unique });
    invalidateGraphqlListCache("ItemRegistration:list");
    toast.success(`Approved ${data.approveItemRegistrationsFinanceBatch.length} registration(s)`);
    return data.approveItemRegistrationsFinanceBatch;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return fanOutByIds(
      unique,
      (id) =>
        approveItemRegistrationFinanceApi(id, { suppressSuccessToast: true }),
      {
        successMessage: (n) => `Approved ${n} registration(s)`,
        failureTitle: "Some approvals failed",
      },
    );
  }
}

export async function authorizeItemRegistrationsManagerBatchApi(
  ids: number[],
): Promise<ItemRegBatchRow[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (!unique.length) return [];
  if (unique.length === 1) {
    const one = await authorizeItemRegistrationManagerApi(unique[0]);
    return [{ id: one.id, approvalStatus: one.approvalStatus }];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return fanOutByIds(
      unique,
      (id) =>
        authorizeItemRegistrationManagerApi(id, { suppressSuccessToast: true }),
      {
        successMessage: (n) => `Authorized ${n} registration(s)`,
        failureTitle: "Some authorizations failed",
      },
    );
  }
  const mutation = `
    mutation AuthItemRegsManagerBatch($ids: [Int!]!) {
      authorizeItemRegistrationsManagerBatch(ids: $ids) {
        id
        approvalStatus
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      authorizeItemRegistrationsManagerBatch: ItemRegBatchRow[];
    }>(mutation, { ids: unique });
    invalidateGraphqlListCache("ItemRegistration:list");
    toast.success(
      `Authorized ${data.authorizeItemRegistrationsManagerBatch.length} registration(s)`,
    );
    return data.authorizeItemRegistrationsManagerBatch;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return fanOutByIds(
      unique,
      (id) =>
        authorizeItemRegistrationManagerApi(id, { suppressSuccessToast: true }),
      {
        successMessage: (n) => `Authorized ${n} registration(s)`,
        failureTitle: "Some authorizations failed",
      },
    );
  }
}

export async function rejectItemRegistrationsRoleBatchApi(
  ids: number[],
  reason: string,
  role: "CostControl" | "Finance" | "Manager",
): Promise<ItemRegBatchRow[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (!unique.length) return [];
  const runOne = async (id: number) => {
    if (role === "CostControl") {
      return rejectItemRegistrationCCApi(id, reason, { suppressSuccessToast: true });
    }
    if (role === "Finance") {
      return rejectItemRegistrationFinanceApi(id, reason, { suppressSuccessToast: true });
    }
    return rejectItemRegistrationManagerApi(id, reason, { suppressSuccessToast: true });
  };
  if (unique.length === 1) {
    const one = await runOne(unique[0]);
    return [{ id: one.id, approvalStatus: one.approvalStatus }];
  }
  const batchMutation =
    role === "CostControl"
      ? `mutation RejectItemRegsCCBatch($ids: [Int!]!, $reason: String) {
          rejectItemRegistrationsCCBatch(ids: $ids, reason: $reason) { id approvalStatus }
        }`
      : role === "Finance"
        ? `mutation RejectItemRegsFinanceBatch($ids: [Int!]!, $reason: String) {
            rejectItemRegistrationsFinanceBatch(ids: $ids, reason: $reason) { id approvalStatus }
          }`
        : `mutation RejectItemRegsManagerBatch($ids: [Int!]!, $reason: String) {
            rejectItemRegistrationsManagerBatch(ids: $ids, reason: $reason) { id approvalStatus }
          }`;
  const batchKey =
    role === "CostControl"
      ? "rejectItemRegistrationsCCBatch"
      : role === "Finance"
        ? "rejectItemRegistrationsFinanceBatch"
        : "rejectItemRegistrationsManagerBatch";
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return fanOutByIds(unique, runOne, {
      successMessage: (n) => `Rejected ${n} registration(s)`,
      failureTitle: "Some rejections failed",
    });
  }
  try {
    const data = await postHotelMutation<Record<string, ItemRegBatchRow[]>>(batchMutation, {
      ids: unique,
      reason,
    });
    const rows = data[batchKey];
    invalidateGraphqlListCache("ItemRegistration:list");
    toast.success(`Rejected ${rows.length} registration(s)`);
    return rows;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return fanOutByIds(unique, runOne, {
      successMessage: (n) => `Rejected ${n} registration(s)`,
      failureTitle: "Some rejections failed",
    });
  }
}

export async function checkStockOutRequestCCApi(
  id: number,
  costControllerProfileId: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation CheckSO($id: Int!, $costControllerProfileId: Int!) {
      checkStockOutRequestCC(id: $id, costControllerProfileId: $costControllerProfileId) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, costControllerProfileId },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Check failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Checked — forwarded to finance");
  }
  return response.data.data.checkStockOutRequestCC;
}

export async function approveStockOutRequestFinanceApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation ApproveSOFin($id: Int!) {
      approveStockOutRequestFinance(id: $id) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Approval failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Approved — forwarded to manager");
  }
  return response.data.data.approveStockOutRequestFinance;
}

export async function authorizeStockOutRequestManagerApi(
  id: number,
  options?: HotelMutationToastOptions,
) {
  const mutation = `
    mutation AuthSOMgr($id: Int!) {
      authorizeStockOutRequestManager(id: $id) {
        id
        status
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Movement authorized and applied to inventory");
  }
  return response.data.data.authorizeStockOutRequestManager;
}

export async function authorizeHotelCreditCompanyApi(id: number) {
  const mutation = `
    mutation AuthCo($id: Int!) {
      authorizeHotelCreditCompany(id: $id) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Authorization failed");
  }
  invalidateGraphqlListCache("hotel:creditCompanies");
  toast.success("Company authorized for corporate meals");
  return response.data.data.authorizeHotelCreditCompany;
}

export async function rejectHotelCreditCompanyApi(id: number, reason?: string) {
  const mutation = `
    mutation RejectCo($id: Int!, $reason: String) {
      rejectHotelCreditCompany(id: $id, reason: $reason) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Rejection failed");
  }
  invalidateGraphqlListCache("hotel:creditCompanies");
  toast.success("Company registration rejected");
  return response.data.data.rejectHotelCreditCompany;
}

export async function rejectPurchaseRequestFinanceApi(
  id: number,
  reason?: string,
  options?: HotelMutationToastOptions,
): Promise<PurchaseRequestRow> {
  const mutation = `
    mutation RejectFin($id: Int!, $reason: String) {
      rejectPurchaseRequestFinance(id: $id, reason: $reason) {
        ${HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS}
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Request rejected");
  }
  const row = response.data.data.rejectPurchaseRequestFinance as PurchaseRequestRow;
  const fb = options?.fallbackFinanceActorName?.trim();
  if (fb && !String(row.financeActorName ?? "").trim()) {
    return { ...row, financeActorName: fb };
  }
  return row;
}

export async function approveStockOutRequestApi(
  id: number,
  costControllerProfileId: number,
  options?: HotelMutationToastOptions,
) {
  return checkStockOutRequestCCApi(id, costControllerProfileId, options);
}

export async function rejectStockOutRequestApi(
  id: number,
  reason?: string,
  options?: HotelMutationToastOptions,
): Promise<StockOutRequestRow> {
  const mutation = `
    mutation RejectSO($id: Int!, $reason: String) {
      rejectStockOutRequest(id: $id, reason: $reason) {
        ${HOTEL_STOCK_OUT_AFTER_REJECT_FIELDS}
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id, reason },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  if (!options?.suppressSuccessToast) {
    toast.success("Request rejected");
  }
  const row = response.data.data.rejectStockOutRequest as StockOutRequestRow;
  const fb = options?.fallbackCcDisplayName?.trim();
  if (fb && !String(row.ccActorName ?? "").trim()) {
    return { ...row, ccActorName: fb };
  }
  return row;
}

function graphqlLooksLikeMissingBatchField(message: string): boolean {
  const m = String(message || "");
  return /Unknown field|Cannot query field|Unknown argument/i.test(m);
}

/** GraphQL `errors[].message` from an Axios error body (many gateways use HTTP 400). */
function graphqlMessagesFromAxiosError(e: unknown): string | null {
  if (!axios.isAxiosError(e)) return null;
  const data = e.response?.data as
    | { errors?: Array<{ message?: string }> }
    | undefined;
  const list = data?.errors;
  if (!Array.isArray(list) || !list.length) return null;
  const parts = list
    .map((x) => String(x?.message ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join("; ") : null;
}

/** Prefer GraphQL error text from the response body; otherwise the thrown message. */
function graphqlUserVisibleMessage(e: unknown): string {
  return (
    graphqlMessagesFromAxiosError(e) ??
    (e instanceof Error ? e.message : String(e ?? ""))
  );
}

/**
 * When a batch GraphQL mutation is missing or the gateway rejects the combined
 * request (common: HTTP 400), fall back to per-id mutations so cost control /
 * finance can still clear queues.
 */
function graphqlLooksLikeBatchShouldFallbackSequential(message: string): boolean {
  const m = String(message || "");
  return (
    graphqlLooksLikeMissingBatchField(m) ||
    /expired transaction|transaction was \d+ ms|P2028/i.test(m) ||
    /Invalid `prisma\./i.test(m)
  );
}

function hotelBatchMutationShouldFallbackToSequential(e: unknown): boolean {
  if (isSessionExpiredError(e)) return false;
  const msg = graphqlUserVisibleMessage(e);
  if (graphqlLooksLikeBatchShouldFallbackSequential(msg)) return true;
  if (axios.isAxiosError(e)) {
    const s = e.response?.status;
    if (typeof s === "number") {
      if (s === 401 || s === 403) return false;
      if (s >= 400 && s < 600) return true;
    }
  }
  const sc = msg.match(/request failed with status code\s*(\d{3})/i);
  if (sc) {
    const code = Number(sc[1]);
    if (code === 401 || code === 403) return false;
    if (code >= 400 && code < 600) return true;
  }
  return false;
}

async function postHotelMutation<T>(query: string, variables: object): Promise<T> {
  const response = await api.post(API_URL, { query, variables });
  if (response.data.errors?.length) {
    throw new Error(response.data.errors[0]?.message || "Request failed");
  }
  return response.data.data as T;
}

/**
 * When `NEXT_PUBLIC_HOTEL_BATCH_MUTATIONS` is `"false"`, skip batch GraphQL
 * mutations and use sequential fan-out only (avoids a failed batch round-trip
 * until the backend implements batch resolvers).
 */
function hotelBatchGraphqlAttemptsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HOTEL_BATCH_MUTATIONS !== "false";
}

async function fanOutByIds<T>(
  unique: number[],
  runOne: (id: number) => Promise<T>,
  opts: { successMessage: (n: number) => string; failureTitle: string },
): Promise<T[]> {
  const { ok, failed } = await runWithConcurrency(unique, (id) => runOne(id));
  if (ok.length) toast.success(opts.successMessage(ok.length));
  if (failed.length) {
    toast.error(`${opts.failureTitle} (${failed.length})`, {
      description: formatPoolFailures(failed),
    });
  }
  return ok;
}

async function sequentialApprovePurchaseRequestsFinance(
  unique: number[],
): Promise<{ id: number; status: string }[]> {
  return fanOutByIds(
    unique,
    (id) =>
      approvePurchaseRequestFinanceApi(id, { suppressSuccessToast: true }),
    {
      successMessage: (n) => `Approved ${n} payment(s)`,
      failureTitle: "Some approvals failed",
    },
  );
}

async function sequentialRejectPurchaseRequestsFinance(
  unique: number[],
  reason: string,
  fallbackFinanceActorName?: string,
): Promise<PurchaseRequestRow[]> {
  return fanOutByIds(
    unique,
    (id) =>
      rejectPurchaseRequestFinanceApi(id, reason, {
        suppressSuccessToast: true,
        fallbackFinanceActorName,
      }),
    {
      successMessage: (n) => `Rejected ${n} request(s)`,
      failureTitle: "Some rejections failed",
    },
  );
}

async function sequentialApprovePurchaseRequestsCC(
  unique: number[],
  costControllerProfileId: number,
): Promise<{ id: number; status: string }[]> {
  return fanOutByIds(
    unique,
    (id) =>
      approvePurchaseRequestCCApi(id, costControllerProfileId, {
        suppressSuccessToast: true,
      }),
    {
      successMessage: (n) => `Forwarded ${n} request(s) to finance`,
      failureTitle: "Some approvals failed",
    },
  );
}

async function sequentialRejectPurchaseRequestsCC(
  unique: number[],
  reason: string,
  fallbackCcDisplayName?: string,
): Promise<PurchaseRequestRow[]> {
  return fanOutByIds(
    unique,
    (id) =>
      rejectPurchaseRequestCCApi(id, reason, {
        suppressSuccessToast: true,
        fallbackCcDisplayName,
      }),
    {
      successMessage: (n) => `Rejected ${n} request(s)`,
      failureTitle: "Some rejections failed",
    },
  );
}

async function sequentialApproveStockOutRequests(
  unique: number[],
  costControllerProfileId: number,
): Promise<{ id: number; status: string }[]> {
  return fanOutByIds(
    unique,
    (id) =>
      approveStockOutRequestApi(id, costControllerProfileId, {
        suppressSuccessToast: true,
      }),
    {
      successMessage: (n) => `Applied ${n} movement(s) to inventory`,
      failureTitle: "Some approvals failed",
    },
  );
}

async function sequentialRejectStockOutRequests(
  unique: number[],
  reason: string,
  fallbackCcDisplayName?: string,
): Promise<StockOutRequestRow[]> {
  return fanOutByIds(
    unique,
    (id) =>
      rejectStockOutRequestApi(id, reason, {
        suppressSuccessToast: true,
        fallbackCcDisplayName,
      }),
    {
      successMessage: (n) => `Rejected ${n} movement(s)`,
      failureTitle: "Some rejections failed",
    },
  );
}

/** Batch finance approve — uses server transaction when the backend exposes it; otherwise falls back to sequential calls. */
export async function approvePurchaseRequestsFinanceBatchApi(
  ids: number[],
): Promise<{ id: number; status: string }[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await approvePurchaseRequestFinanceApi(unique[0]);
    return [{ id: one.id, status: one.status }];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialApprovePurchaseRequestsFinance(unique);
  }
  const mutation = `
    mutation ApprovePurchaseRequestsFinanceBatch($ids: [Int!]!) {
      approvePurchaseRequestsFinanceBatch(ids: $ids) {
        id
        status
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      approvePurchaseRequestsFinanceBatch: { id: number; status: string }[];
    }>(mutation, { ids: unique });
    const rows = data.approvePurchaseRequestsFinanceBatch;
    toast.success(`Approved ${rows.length} payment(s)`);
    return rows;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialApprovePurchaseRequestsFinance(unique);
  }
}

export async function rejectPurchaseRequestsFinanceBatchApi(
  ids: number[],
  reason = "Rejected by finance",
  fallbackFinanceActorName?: string,
): Promise<PurchaseRequestRow[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await rejectPurchaseRequestFinanceApi(unique[0], reason, {
      fallbackFinanceActorName,
    });
    return [one];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialRejectPurchaseRequestsFinance(
      unique,
      reason,
      fallbackFinanceActorName,
    );
  }
  const mutation = `
    mutation RejectPurchaseRequestsFinanceBatch($ids: [Int!]!, $reason: String) {
      rejectPurchaseRequestsFinanceBatch(ids: $ids, reason: $reason) {
        ${HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS}
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      rejectPurchaseRequestsFinanceBatch: PurchaseRequestRow[];
    }>(mutation, { ids: unique, reason });
    const rows = data.rejectPurchaseRequestsFinanceBatch;
    const fb = fallbackFinanceActorName?.trim();
    const merged = fb
      ? rows.map((r) =>
          String(r.financeActorName ?? "").trim()
            ? r
            : { ...r, financeActorName: fb },
        )
      : rows;
    toast.success(`Rejected ${merged.length} request(s)`);
    return merged;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialRejectPurchaseRequestsFinance(
      unique,
      reason,
      fallbackFinanceActorName,
    );
  }
}

export async function approvePurchaseRequestsCCBatchApi(
  ids: number[],
  costControllerProfileId: number,
): Promise<{ id: number; status: string }[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await approvePurchaseRequestCCApi(
      unique[0],
      costControllerProfileId,
    );
    return [{ id: one.id, status: one.status }];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialApprovePurchaseRequestsCC(unique, costControllerProfileId);
  }
  const mutation = `
    mutation ApprovePurchaseRequestsCCBatch($ids: [Int!]!, $costControllerProfileId: Int!) {
      approvePurchaseRequestsCCBatch(ids: $ids, costControllerProfileId: $costControllerProfileId) {
        id
        status
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      approvePurchaseRequestsCCBatch: { id: number; status: string }[];
    }>(mutation, { ids: unique, costControllerProfileId });
    const rows = data.approvePurchaseRequestsCCBatch;
    invalidateGraphqlListCache("hotel:purchaseRequests");
    toast.success(`Forwarded ${rows.length} request(s) to finance`);
    return rows;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialApprovePurchaseRequestsCC(unique, costControllerProfileId);
  }
}

export async function rejectPurchaseRequestsCCBatchApi(
  ids: number[],
  reason = "Rejected by cost control",
  fallbackCcDisplayName?: string,
): Promise<PurchaseRequestRow[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await rejectPurchaseRequestCCApi(unique[0], reason, {
      fallbackCcDisplayName,
    });
    return [one];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialRejectPurchaseRequestsCC(
      unique,
      reason,
      fallbackCcDisplayName,
    );
  }
  const mutation = `
    mutation RejectPurchaseRequestsCCBatch($ids: [Int!]!, $reason: String) {
      rejectPurchaseRequestsCCBatch(ids: $ids, reason: $reason) {
        ${HOTEL_PURCHASE_REQUEST_AFTER_REJECT_FIELDS}
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      rejectPurchaseRequestsCCBatch: PurchaseRequestRow[];
    }>(mutation, { ids: unique, reason });
    const rows = data.rejectPurchaseRequestsCCBatch;
    const fb = fallbackCcDisplayName?.trim();
    const merged = fb
      ? rows.map((r) =>
          String(r.ccActorName ?? "").trim()
            ? r
            : { ...r, ccActorName: fb },
        )
      : rows;
    toast.success(`Rejected ${merged.length} request(s)`);
    return merged;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialRejectPurchaseRequestsCC(
      unique,
      reason,
      fallbackCcDisplayName,
    );
  }
}

export async function approveStockOutRequestsBatchApi(
  ids: number[],
  costControllerProfileId: number,
): Promise<{ id: number; status: string }[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await approveStockOutRequestApi(
      unique[0],
      costControllerProfileId,
    );
    return [{ id: one.id, status: one.status }];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialApproveStockOutRequests(unique, costControllerProfileId);
  }
  const mutation = `
    mutation ApproveStockOutRequestsBatch($ids: [Int!]!, $costControllerProfileId: Int!) {
      approveStockOutRequestsBatch(ids: $ids, costControllerProfileId: $costControllerProfileId) {
        id
        status
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      approveStockOutRequestsBatch: { id: number; status: string }[];
    }>(mutation, { ids: unique, costControllerProfileId });
    const rows = data.approveStockOutRequestsBatch;
    toast.success(`Applied ${rows.length} movement(s) to inventory`);
    return rows;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialApproveStockOutRequests(unique, costControllerProfileId);
  }
}

export async function rejectStockOutRequestsBatchApi(
  ids: number[],
  reason = "Rejected by cost control",
  fallbackCcDisplayName?: string,
): Promise<StockOutRequestRow[]> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    const one = await rejectStockOutRequestApi(unique[0], reason, {
      fallbackCcDisplayName,
    });
    return [one];
  }
  if (!hotelBatchGraphqlAttemptsEnabled()) {
    return sequentialRejectStockOutRequests(
      unique,
      reason,
      fallbackCcDisplayName,
    );
  }
  const mutation = `
    mutation RejectStockOutRequestsBatch($ids: [Int!]!, $reason: String) {
      rejectStockOutRequestsBatch(ids: $ids, reason: $reason) {
        ${HOTEL_STOCK_OUT_AFTER_REJECT_FIELDS}
      }
    }
  `;
  try {
    const data = await postHotelMutation<{
      rejectStockOutRequestsBatch: StockOutRequestRow[];
    }>(mutation, { ids: unique, reason });
    const rows = data.rejectStockOutRequestsBatch;
    const fb = fallbackCcDisplayName?.trim();
    const merged = fb
      ? rows.map((r) =>
          String(r.ccActorName ?? "").trim()
            ? r
            : { ...r, ccActorName: fb },
        )
      : rows;
    toast.success(`Rejected ${merged.length} movement(s)`);
    return merged;
  } catch (e: unknown) {
    if (!hotelBatchMutationShouldFallbackToSequential(e)) throw e;
    return sequentialRejectStockOutRequests(
      unique,
      reason,
      fallbackCcDisplayName,
    );
  }
}

export async function createCostControllerProfileApi(displayName: string) {
  const mutation = `
    mutation Ccp($displayName: String!) {
      createCostControllerProfile(displayName: $displayName) {
        id
        displayName
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { displayName },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Failed to add profile");
  }
  toast.success("Cost controller identity added");
  return response.data.data.createCostControllerProfile;
}

export async function deleteCostControllerProfileApi(id: number) {
  const mutation = `
    mutation Dcp($id: Int!) {
      deleteCostControllerProfile(id: $id)
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Delete failed");
  }
  toast.success("Profile removed");
}

export async function createKitchenBarBeginningApi(vars: {
  station: string;
  itemName: string;
  amount: number;
  measuredBy: string;
  managementTakenDay?: number;
  monthPeriod?: string;
  calendarDate: string;
  notes?: string;
}) {
  const mutation = `
    mutation Kbb(
      $station: String!
      $itemName: String!
      $amount: Float!
      $measuredBy: String!
      $managementTakenDay: Float
      $monthPeriod: String
      $calendarDate: String!
      $notes: String
    ) {
      createKitchenBarBeginning(
        station: $station
        itemName: $itemName
        amount: $amount
        measuredBy: $measuredBy
        managementTakenDay: $managementTakenDay
        monthPeriod: $monthPeriod
        calendarDate: $calendarDate
        notes: $notes
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, { query: mutation, variables: vars });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Save failed");
  }
  toast.success("Beginning recorded");
  return response.data.data.createKitchenBarBeginning;
}

export async function updateKitchenBarBeginningApi(vars: {
  id: number;
  station: string;
  itemName: string;
  amount: number;
  measuredBy: string;
  managementTakenDay?: number;
  monthPeriod?: string;
  calendarDate: string;
  notes?: string;
}) {
  const mutation = `
    mutation Ukbb(
      $id: Int!
      $station: String!
      $itemName: String!
      $amount: Float!
      $measuredBy: String!
      $managementTakenDay: Float
      $monthPeriod: String
      $calendarDate: String!
      $notes: String
    ) {
      updateKitchenBarBeginning(
        id: $id
        station: $station
        itemName: $itemName
        amount: $amount
        measuredBy: $measuredBy
        managementTakenDay: $managementTakenDay
        monthPeriod: $monthPeriod
        calendarDate: $calendarDate
        notes: $notes
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, { query: mutation, variables: vars });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  toast.success("Updated");
  return response.data.data.updateKitchenBarBeginning;
}

export async function deleteKitchenBarBeginningApi(id: number) {
  const mutation = `
    mutation Dkbb($id: Int!) {
      deleteKitchenBarBeginning(id: $id)
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Delete failed");
  }
  toast.success("Removed");
}

export async function fetchKitchenBarRollupSnapshots(
  fromYmd: string,
  toYmd: string,
): Promise<KitchenBarMonthlySnapshotRow[]> {
  const key = `hotel:kitchenBarRollupSnapshots:${fromYmd}:${toYmd}`;
  return dedupeHotelListRead(key, async () => {
    const query = `
    query RollupSnap($fromYmd: String!, $toYmd: String!) {
      kitchenBarRollupSnapshots(fromYmd: $fromYmd, toYmd: $toYmd) {
        id
        HotelName
        station
        itemName
        monthPeriod
        periodFrom
        periodTo
        totalImpliedSales
        lastDayClosingOnHand
        syncedAt
      }
    }
  `;
    const response = await api.post(API_URL, {
      query,
      variables: { fromYmd, toYmd },
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load roll-up snapshots",
      );
    }
    return response.data.data.kitchenBarRollupSnapshots || [];
  });
}

const KITCHEN_BAR_ROLLUP_SYNC_SELECTION = `
        id
        itemName
        station
        totalImpliedSales
        lastDayClosingOnHand
        syncedAt
`;

/** True when the server rejected the primary sync for role/policy reasons (retry alt). */
function rollupSyncRoleDenied(message: string): boolean {
  const m = String(message || "").toLowerCase();
  return (
    /not authorized/.test(m) ||
    /unauthorized/.test(m) ||
    /forbidden/.test(m) ||
    /permission denied/.test(m) ||
    /cost control/.test(m) ||
    /cost controller/.test(m) ||
    /\bonly\b.*\b(cost control|cost controller)\b/.test(m) ||
    /\b(cost control|cost controller)\b.*\bonly\b/.test(m) ||
    (/administrator/.test(m) &&
      /permission|grant|allowed|authorize|access|role/.test(m)) ||
    /(do not|don't) have permission/.test(m) ||
    /insufficient privilege/.test(m) ||
    /not allowed to perform/.test(m)
  );
}

/**
 * Alternate roll-up sync mutation tried after `syncKitchenBarRollup` returns a role error.
 * Defaults to `syncKitchenBarRollupForManager` when unset. Set
 * `NEXT_PUBLIC_HOTEL_MANAGER_KITCHEN_BAR_ROLLUP_SYNC_FIELD` to override the name, or to
 * `false` to disable the retry (only the primary mutation is used).
 */
function managerKitchenBarRollupSyncGraphqlField(): string | null {
  const raw = process.env.NEXT_PUBLIC_HOTEL_MANAGER_KITCHEN_BAR_ROLLUP_SYNC_FIELD;
  if (raw != null && String(raw).trim().toLowerCase() === "false") return null;
  if (raw != null) {
    const trimmed = String(raw).trim();
    return trimmed.length ? trimmed : null;
  }
  return "syncKitchenBarRollupForManager";
}

async function postKitchenBarRollupSyncField(
  fieldName: string,
  fromYmd: string,
  toYmd: string,
): Promise<unknown> {
  const mutation = `
    mutation SyncKitchenBarRollupDyn($fromYmd: String!, $toYmd: String!) {
      ${fieldName}(fromYmd: $fromYmd, toYmd: $toYmd) {
        ${KITCHEN_BAR_ROLLUP_SYNC_SELECTION}
      }
    }
  `;
  try {
    const response = await api.post(API_URL, {
      query: mutation,
      variables: { fromYmd, toYmd },
    });
    if (response.data.errors?.length) {
      throw new Error(
        response.data.errors[0]?.message || "Sync failed",
      );
    }
    const data = response.data.data as Record<string, unknown>;
    return data[fieldName];
  } catch (e: unknown) {
    const gql = graphqlMessagesFromAxiosError(e);
    if (gql) throw new Error(gql);
    throw e;
  }
}

/**
 * Rebuilds kitchen/bar monthly roll-up snapshot rows from daily beginning rows for
 * [fromYmd, toYmd]. Calls `syncKitchenBarRollup` first; on a role/permission denial,
 * retries using `NEXT_PUBLIC_HOTEL_MANAGER_KITCHEN_BAR_ROLLUP_SYNC_FIELD` or the
 * default `syncKitchenBarRollupForManager` when that resolver exists for Manager.
 */
export async function syncKitchenBarRollupApi(
  fromYmd: string,
  toYmd: string,
  options?: { quiet?: boolean },
) {
  const quiet = options?.quiet;
  const altField = managerKitchenBarRollupSyncGraphqlField();

  const finish = () => {
    if (!quiet) {
      toast.success("Roll-up synced from daily rows for selected dates");
    }
  };

  try {
    const rows = await postKitchenBarRollupSyncField(
      "syncKitchenBarRollup",
      fromYmd,
      toYmd,
    );
    finish();
    return rows;
  } catch (first: unknown) {
    const msg = graphqlUserVisibleMessage(first);
    if (!altField || !rollupSyncRoleDenied(msg)) {
      throw first;
    }
    try {
      const rows = await postKitchenBarRollupSyncField(altField, fromYmd, toYmd);
      finish();
      return rows;
    } catch (second: unknown) {
      const inner = graphqlUserVisibleMessage(second);
      if (graphqlLooksLikeMissingBatchField(inner)) {
        throw first;
      }
      throw second;
    }
  }
}

export async function fetchHotelCreditCompanies(): Promise<
  HotelCreditCompanyRow[]
> {
  return dedupeHotelListRead("hotel:creditCompanies", async () => {
    const query = `
    query {
      hotelCreditCompanies {
        id
        HotelName
        companyName
        companyTinNumber
        contactName
        phoneNumber
        email
        payTiming
        approvalStatus
        managerActorName
        managerAuthorizedAt
        rejectionReason
        creditLevel
        creditLimit
        timeInterval
        timeFrame
        hotelCorporateCreditTierId
        allowedMenuJson
        dealNotes
        imageUrl
        paidAmount
        createdAt
      }
    }
  `;
  const response = await api.post(API_URL, { query });
  if (response.data.errors) {
    throw new Error(
      response.data.errors[0]?.message || "Failed to load companies",
    );
  }
  return response.data.data.hotelCreditCompanies || [];
  });
}

export async function fetchHotelCorporateCreditTiers(): Promise<
  HotelCorporateCreditTierRow[]
> {
  return dedupeHotelListRead("hotel:corporateCreditTiers", async () => {
    const query = `
    query {
      hotelCorporateCreditTiers {
        id
        HotelName
        name
        creditCeiling
        timeInterval
        timeFrame
        sortOrder
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, { query });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load credit tiers",
      );
    }
    return response.data.data.hotelCorporateCreditTiers || [];
  });
}

export async function fetchHotelCreditParties(
  companyId: number,
): Promise<HotelCreditPartyRow[]> {
  return dedupeHotelListRead(`hotel:creditParties:${companyId}`, async () => {
    const query = `
    query Hcp($companyId: Int!) {
      hotelCreditParties(companyId: $companyId) {
        id
        HotelName
        companyId
        displayName
        phoneNumber
        sex
        notes
        createdAt
      }
    }
  `;
    const response = await api.post(API_URL, {
      query,
      variables: { companyId },
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load parties",
      );
    }
    return response.data.data.hotelCreditParties || [];
  });
}

export async function fetchHotelCreditConsumptions(
  fromIso: string,
  toIso: string,
): Promise<HotelCreditConsumptionRow[]> {
  const key = `hotel:creditConsumptions:${fromIso}:${toIso}`;
  return dedupeHotelListRead(key, async () => {
    const query = `
    query Hcc($from: DateTime!, $to: DateTime!) {
      hotelCreditConsumptions(from: $from, to: $to) {
        id
        HotelName
        companyId
        partyId
        linesJson
        totalAmount
        occurredAt
        recordedBy
      }
    }
  `;
    const response = await api.post(API_URL, {
      query,
      variables: { from: fromIso, to: toIso },
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to load consumptions",
      );
    }
    return response.data.data.hotelCreditConsumptions || [];
  });
}

export async function createHotelCreditCompanyApi(input: {
  companyName: string;
  companyTinNumber?: string;
  contactName?: string;
  phoneNumber?: string;
  email?: string;
  payTiming?: string;
  hotelCorporateCreditTierId: number;
  allowedMenuJson: string;
  dealNotes?: string;
  imageUrl?: string;
  creditLimit: number;
  paidAmount?: number;
}) {
  const mutation = `
    mutation HccCreate(
      $companyName: String!
      $companyTinNumber: String
      $contactName: String
      $phoneNumber: String
      $email: String
      $payTiming: String
      $hotelCorporateCreditTierId: Int!
      $allowedMenuJson: String!
      $dealNotes: String
      $imageUrl: String
      $creditLimit: Float
      $paidAmount: Float
    ) {
      createHotelCreditCompany(
        companyName: $companyName
        companyTinNumber: $companyTinNumber
        contactName: $contactName
        phoneNumber: $phoneNumber
        email: $email
        payTiming: $payTiming
        hotelCorporateCreditTierId: $hotelCorporateCreditTierId
        allowedMenuJson: $allowedMenuJson
        dealNotes: $dealNotes
        imageUrl: $imageUrl
        creditLimit: $creditLimit
        paidAmount: $paidAmount
      ) {
        id
        approvalStatus
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Save failed");
  }
  invalidateGraphqlListCache("hotel:creditCompanies");
  toast.success("Company submitted — awaiting authorization");
  return response.data.data.createHotelCreditCompany;
}

export async function updateHotelCreditCompanyApi(input: {
  id: number;
  companyName: string;
  companyTinNumber?: string;
  contactName?: string;
  phoneNumber?: string;
  email?: string;
  payTiming?: string;
  hotelCorporateCreditTierId?: number | null;
  allowedMenuJson: string;
  dealNotes?: string;
  imageUrl?: string;
  creditLimit?: number;
  paidAmount?: number;
}) {
  const mutation = `
    mutation HccUp(
      $id: Int!
      $companyName: String!
      $companyTinNumber: String
      $contactName: String
      $phoneNumber: String
      $email: String
      $payTiming: String
      $hotelCorporateCreditTierId: Int
      $allowedMenuJson: String!
      $dealNotes: String
      $imageUrl: String
      $creditLimit: Float
      $paidAmount: Float
    ) {
      updateHotelCreditCompany(
        id: $id
        companyName: $companyName
        companyTinNumber: $companyTinNumber
        contactName: $contactName
        phoneNumber: $phoneNumber
        email: $email
        payTiming: $payTiming
        hotelCorporateCreditTierId: $hotelCorporateCreditTierId
        allowedMenuJson: $allowedMenuJson
        dealNotes: $dealNotes
        imageUrl: $imageUrl
        creditLimit: $creditLimit
        paidAmount: $paidAmount
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  invalidateGraphqlListCache("hotel:creditCompanies");
  toast.success("Company updated");
  return response.data.data.updateHotelCreditCompany;
}

export async function deleteHotelCreditCompanyApi(id: number) {
  const mutation = `
    mutation HccDel($id: Int!) {
      deleteHotelCreditCompany(id: $id)
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Delete failed");
  }
  invalidateGraphqlListCache("hotel:creditCompanies");
  toast.success("Company removed");
}

export async function createHotelCorporateCreditTierApi(input: {
  name: string;
  creditCeiling: number;
  timeInterval: number;
  timeFrame: string;
  sortOrder?: number;
}) {
  const mutation = `
    mutation HtCreate(
      $name: String!
      $creditCeiling: Float!
      $timeInterval: Int!
      $timeFrame: String!
      $sortOrder: Int
    ) {
      createHotelCorporateCreditTier(
        name: $name
        creditCeiling: $creditCeiling
        timeInterval: $timeInterval
        timeFrame: $timeFrame
        sortOrder: $sortOrder
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Save failed");
  }
  invalidateGraphqlListCache("hotel:corporateCreditTiers");
  toast.success("Credit tier saved");
  return response.data.data.createHotelCorporateCreditTier;
}

export async function updateHotelCorporateCreditTierApi(input: {
  id: number;
  name: string;
  creditCeiling: number;
  timeInterval: number;
  timeFrame: string;
  sortOrder?: number;
}) {
  const mutation = `
    mutation HtUp(
      $id: Int!
      $name: String!
      $creditCeiling: Float!
      $timeInterval: Int!
      $timeFrame: String!
      $sortOrder: Int
    ) {
      updateHotelCorporateCreditTier(
        id: $id
        name: $name
        creditCeiling: $creditCeiling
        timeInterval: $timeInterval
        timeFrame: $timeFrame
        sortOrder: $sortOrder
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Update failed");
  }
  invalidateGraphqlListCache("hotel:corporateCreditTiers");
  toast.success("Tier updated");
  return response.data.data.updateHotelCorporateCreditTier;
}

export async function deleteHotelCorporateCreditTierApi(id: number) {
  const mutation = `
    mutation HtDel($id: Int!) {
      deleteHotelCorporateCreditTier(id: $id)
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: { id },
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Delete failed");
  }
  invalidateGraphqlListCache("hotel:corporateCreditTiers");
  toast.success("Tier removed");
}

export async function createHotelCreditPartyApi(input: {
  companyId: number;
  displayName: string;
  phoneNumber?: string;
  sex?: string;
  notes?: string;
}) {
  const mutation = `
    mutation HcpCreate(
      $companyId: Int!
      $displayName: String!
      $phoneNumber: String
      $sex: String
      $notes: String
    ) {
      createHotelCreditParty(
        companyId: $companyId
        displayName: $displayName
        phoneNumber: $phoneNumber
        sex: $sex
        notes: $notes
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Save failed");
  }
  toast.success("Guest / staff registered");
  return response.data.data.createHotelCreditParty;
}

export async function createHotelCreditConsumptionApi(input: {
  companyId: number;
  partyId?: number;
  guestName?: string;
  guestPhone?: string;
  linesJson: string;
  totalAmount: number;
  occurredAt?: string;
  suppressSuccessToast?: boolean;
}) {
  const mutation = `
    mutation Hccon(
      $companyId: Int!
      $partyId: Int
      $guestName: String
      $guestPhone: String
      $linesJson: String!
      $totalAmount: Float!
      $occurredAt: DateTime
    ) {
      createHotelCreditConsumption(
        companyId: $companyId
        partyId: $partyId
        guestName: $guestName
        guestPhone: $guestPhone
        linesJson: $linesJson
        totalAmount: $totalAmount
        occurredAt: $occurredAt
      ) {
        id
      }
    }
  `;
  const response = await api.post(API_URL, {
    query: mutation,
    variables: input,
  });
  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Could not save usage");
  }
  if (!input.suppressSuccessToast) {
    toast.success("Consumption recorded");
  }
  return response.data.data.createHotelCreditConsumption;
}

