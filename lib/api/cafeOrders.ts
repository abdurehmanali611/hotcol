/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from "sonner";
import {
  api,
  API_URL,
  dedupeHotelListRead,
  invalidateGraphqlListCache,
  refreshCafeOrdersFeed,
} from "./client";

import { rowHotelMatchesTenantScope, findRowByTenantScope } from "../tenantRowMatch";
import { isBarStationOrder, isKitchenStationOrder } from "../cafeOrderStation";
import { validateCreditUsageAmount } from "../creditLimits";
import { isSessionExpiredError } from "../sessionExpiry";
import { getCurrentUser } from "./auth";
import { fetchPityCash, fetchCreditRegistrations } from "./cafeCredit";
import type { Order, OrderCreationData, UpdateLiveOrderData, CreditRegistration } from "./types";


export const CAFE_LIVE_ORDERS_POLL_MS = 8_000;

export async function fetchOrders(options?: { fresh?: boolean }): Promise<Order[]> {
  if (options?.fresh) {
    invalidateGraphqlListCache("cafe:orders");
  }
  return dedupeHotelListRead("cafe:orders", async () => {
    const query = `
      query {
        orders {
          id
          title
          imageUrl
          orderAmount
          category
          type
          HotelName
          price
          tableNo
          waiterName
          status
          payment
          withBank
          credit
          credittorName
          creditAmount
          serviceCaption
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to fetch orders",
      );
    }

    return response.data.data.orders || [];
  });
}

export async function fetchLiveCafeOrders(): Promise<Order[]> {
  return fetchOrders({ fresh: true });
}

export async function updateLiveOrder(
  data: UpdateLiveOrderData,
  options?: { silent?: boolean; successMessage?: string },
) {
  try {
    const mutation = `
      mutation UpdateLiveOrder(
        $id: Int!
        $tableNo: Int
        $waiterName: String
        $orderAmount: Int
        $title: String
      ) {
        UpdateLiveOrder(
          id: $id
          tableNo: $tableNo
          waiterName: $waiterName
          orderAmount: $orderAmount
          title: $title
        ) {
          id
          title
          tableNo
          waiterName
          orderAmount
          status
          payment
          serviceCaption
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: data,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update order",
      );
    }

    if (!options?.silent) {
      toast.success(options?.successMessage ?? "Order updated successfully");
    }
    refreshCafeOrdersFeed();
    return response.data.data.UpdateLiveOrder;
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.[0]?.message ||
      error?.message ||
      "Failed to update order";
    if (!options?.silent) {
      toast.error(message);
    }
    throw error;
  }
}

async function postOrderCreation(orderData: OrderCreationData) {
  const mutation = `
    mutation OrderCreation(
      $title: String!
      $imageUrl: String!
      $tableNo: Int!
      $waiterName: String!
      $orderAmount: Int!
      $HotelName: String!
      $category: String!
      $type: String!
      $price: Float!
      $status: String
      $payment: String
    ) {
      OrderCreation(
        title: $title
        imageUrl: $imageUrl
        tableNo: $tableNo
        waiterName: $waiterName
        orderAmount: $orderAmount
        HotelName: $HotelName
        category: $category
        type: $type
        price: $price
        status: $status
        payment: $payment
      ) {
        id
        title
        imageUrl
        tableNo
        orderAmount
        category
        type
        HotelName
        price
        waiterName
        status
        payment
        createdAt
      }
    }
  `;

  const transformedData = {
    title: orderData.title || "",
    imageUrl: orderData.imageUrl || "",
    tableNo: Math.floor(Number(orderData.tableNo)),
    waiterName: orderData.waiterName || "",
    orderAmount: Math.floor(Number(orderData.orderAmount)),
    HotelName: orderData.HotelName || "",
    category: orderData.category || "",
    type: orderData.type || "",
    price: Number(orderData.price),
    status: orderData.status || "Pending",
    payment: orderData.payment || "Unpaid",
  };

  const response = await api.post(API_URL, {
    query: mutation,
    variables: transformedData,
  });

  if (response.data.errors) {
    throw new Error(
      response.data.errors[0]?.message || "Failed to create order",
    );
  }

  return response.data.data.OrderCreation;
}

export async function createOrder(orderData: OrderCreationData) {
  try {
    const result = await postOrderCreation(orderData);
    toast.success("Order sent successfully");
    refreshCafeOrdersFeed();
    return result;
  } catch (error: any) {
    if (error.code === "ECONNABORTED") {
      toast.error("Connection timeout. Please try again.");
    } else if (!error.response) {
      toast.error("Could not reach the API server. Check that the backend is running.");
    } else if (error.message) {
      toast.error(error.message);
    } else {
      toast.error("Failed to create order");
    }

    throw error;
  }
}

export async function createBatchOrders(orderDataArray: any[]) {
  try {
    const results = [];
    for (const o of orderDataArray) {
      results.push(
        await postOrderCreation({
          title: String(o.title),
          imageUrl: String(o.imageUrl || ""),
          tableNo: Math.floor(Number(o.tableNo)),
          orderAmount: Math.floor(Number(o.orderAmount)),
          HotelName: String(o.HotelName),
          category: String(o.category),
          type: String(o.type),
          price: parseFloat(Number(o.price).toFixed(2)),
          waiterName: String(o.waiterName),
          status: "Pending",
          payment: "Unpaid",
        }),
      );
    }

    toast.success(`${results.length} orders sent to kitchen!`);
    refreshCafeOrdersFeed();
    return results;
  } catch (error: any) {
    const message = error.response?.data?.errors?.[0]?.message || error.message;
    toast.error(message);
    throw error;
  }
}

export async function updateOrderStatus(
  id: number,
  status: string,
  options?: { silent?: boolean },
) {
  try {
    const mutation = `
      mutation UpdateStatus($id: Int!, $status: String) {
        UpdateStatus(id: $id, status: $status) {
          id
          status
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, status },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update status",
      );
    }

    if (!options?.silent) {
      toast.success("Status updated successfully");
    }
    refreshCafeOrdersFeed();
    return response.data.data.UpdateStatus;
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.[0]?.message ||
      error?.message ||
      "Failed to update status";
    if (!options?.silent) {
      toast.error(message);
    }
    throw new Error(message);
  }
}

/** Marks a live café order line as cancelled (cashier order-update remove). */
export async function cancelLiveOrder(id: number) {
  try {
    const mutation = `
      mutation UpdateStatus($id: Int!, $status: String) {
        UpdateStatus(id: $id, status: $status) {
          id
          status
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, status: "Cancelled" },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to remove item",
      );
    }

    toast.success("Item removed from table order");
    refreshCafeOrdersFeed();
    return response.data.data.UpdateStatus;
  } catch (error: any) {
    const message =
      error?.response?.data?.errors?.[0]?.message ||
      error?.message ||
      "Failed to remove item";
    toast.error(message);
    throw error;
  }
}

export async function updateOrderPayment(
  id: number,
  payment: string,
  withBank: boolean,
  options?: { silent?: boolean },
) {
  try {
    const mutation = `
      mutation UpdatePayment($id: Int!, $payment: String, $withBank: Boolean) {
        UpdatePayment(id: $id, payment: $payment, withBank: $withBank) {
          id
          payment
          waiterName
          tableNo
          title
          orderAmount
          price
          withBank
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, payment, withBank },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update payment",
      );
    }

    refreshCafeOrdersFeed();
    if (!options?.silent) {
      toast.success("Payment updated successfully");
    }
    return response.data.data.UpdatePayment;
  } catch (error: any) {
    console.error("Payment update error:", error);
    if (!options?.silent) {
      toast.error("Failed to update payment");
    }
    throw error;
  }
}

export async function checkPityCashBalance(
  HotelName: string,
  requiredAmount: number,
): Promise<boolean> {
  try {
    const pityCashList = await fetchPityCash();
    const currentPityCash = findRowByTenantScope(pityCashList, HotelName);

    if (!currentPityCash) {
      toast.error("No pity cash found for this hotel");
      return false;
    }

    if (currentPityCash.amount < requiredAmount) {
      toast.error(
        `Insufficient pity cash balance. Available: ${currentPityCash.amount}, Required: ${requiredAmount}`,
      );
      return false;
    }

    if (currentPityCash.startDate > new Date()) {
      toast.error("Pity cash is not yet available");
      return false;
    }

    if (currentPityCash.endDate < new Date()) {
      toast.error("Pity cash has expired");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to check pity cash balance:", error);
    return false;
  }
}

export async function checkCreditRegistrantBalance(
  name: string,
  requiredAmount: number,
  HotelName: string,
): Promise<boolean> {
  try {
    const creditRegistrations = await fetchCreditRegistrations();
    const creditRegistrant = creditRegistrations.find(
      (reg: CreditRegistration) =>
        reg.name.toLowerCase() === name.toLowerCase() &&
        rowHotelMatchesTenantScope(reg.HotelName, HotelName),
    );

    if (!creditRegistrant) {
      toast.error("Credit registrant not found");
      return false;
    }

    const err = validateCreditUsageAmount(
      requiredAmount,
      creditRegistrant.amount,
    );
    if (err) {
      toast.error(`${name}: ${err}`);
      return false;
    }

    return true;
  } catch {
    toast.error("Could not verify credit balance");
    return false;
  }
}

export async function UpdatePityDeduction(id: number, amount: number) {
  try {
    const mutation = `
        mutation UpdatePityDeduction($id: Int!, $amount: Float!) {
          UpdatePityDeduction(id: $id, amount: $amount) {
           id 
           amount
           startDate
           endDate
           HotelName
          }
        }
      `;

    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, amount },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to Deduct the Pity Cash",
      );
    }

    toast.success("Successfully Deducted the Pity Cash");
    return response.data.data.UpdatePityDeduction;
  } catch (error: any) {
    console.error("UpdatePityDeduction error:", error);
    if (error.response?.data?.errors) {
      console.error("GraphQL Error details:", error.response.data.errors);
    }
    throw error;
  }
}

export function isCreditPayment(order: Order): boolean {
  return order.credit === true && order.withBank === null;
}

export function isCashPayment(order: Order): boolean {
  return order.withBank === false;
}

export function isBankPayment(order: Order): boolean {
  return order.withBank === true;
}

export function getPaymentMethod(order: Order): string {
  if (order.credit === true && order.withBank === null) return "Credit";
  if (order.withBank === true) return "Bank";
  if (order.withBank === false) return "Cash";
  return "Unknown";
}

async function UpdateCreditRegistrantDeduction(id: number, amount: number) {
  try {
    const mutation = `
      mutation UpdateCreditRegistrantDeduction($id: Int!, $amount: Float!) {
        UpdateCreditRegistrantDeduction(id: $id, amount: $amount) {
          id 
          amount
          name
          paidAmount
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, amount },
    });

    if (response.data.errors) {
      const errorMessage =
        response.data.errors[0]?.message ||
        "Failed to Deduct from Credit Registrant";
      throw new Error(errorMessage);
    }

    invalidateGraphqlListCache("finance:creditRegistrations");
    return response.data.data.UpdateCreditRegistrantDeduction;
  } catch (error: any) {
    toast.error("Failed to update credit registrant balance");
    throw error;
  }
}

export async function updateOrderCredit(
  id: number,
  credittorName: string,
  creditAmount: number,
) {
  try {
    console.log("updateOrderCredit called with:", {
      id,
      credittorName,
      creditAmount,
    });

    const currentUser = getCurrentUser();
    console.log("Current user:", currentUser);

    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    // Check if we have a token
    const token = localStorage.getItem("auth_token");
    console.log("Token exists:", !!token);

    const mutation = `
      mutation UpdateCredit($id: Int!, $credittorName: String!, $creditAmount: Float!) {
        UpdateCredit(id: $id, credittorName: $credittorName, creditAmount: $creditAmount) {
          id
          credittorName
          creditAmount
          HotelName
          title
        }
      }
    `;

    console.log("Sending mutation with variables:", {
      id,
      credittorName,
      creditAmount,
    });

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, credittorName, creditAmount },
    });

    console.log("Full API response:", response);
    console.log("Response data:", response.data);

    if (response.data.errors) {
      const errorMessage =
        response.data.errors[0]?.message || "Failed to update Credit";
      console.error("GraphQL Error details:", response.data.errors[0]);
      throw new Error(errorMessage);
    }

    const updatedOrder = response.data.data?.UpdateCredit;
    console.log("Updated order:", updatedOrder);

    if (!updatedOrder) {
      throw new Error("No data returned from update");
    }

    toast.success("Credit updated successfully for the Order");
    return updatedOrder;
  } catch (error: any) {
    console.error("updateOrderCredit error:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    toast.error(error.message || "Failed to update credit");
    throw error;
  }
}

export async function deductFromCreditRegistrant(
  credittorName: string,
  amountToDeduct: number,
) {
  try {
    const creditRegistrations = await fetchCreditRegistrations();
    const cu = getCurrentUser();
    const creditRegistrant = creditRegistrations.find(
      (reg: any) =>
        reg.name.toLowerCase() === credittorName.toLowerCase() &&
        rowHotelMatchesTenantScope(reg.HotelName, cu?.HotelName ?? ""),
    );

    if (creditRegistrant) {
      const newAmount = creditRegistrant.amount - amountToDeduct;
      await UpdateCreditRegistrantDeduction(creditRegistrant.id, newAmount);
    } else {
      throw new Error("Credit registrant not found");
    }
  } catch (error: any) {
    console.error("Failed to deduct from credit registrant:", error);
    toast.error(error.message || "Failed to deduct from credit registrant");
    throw error;
  }
}

export async function updateWaiterPayment(data: {
  id: number;
  payment: string[];
  price: number[];
  tablesServed: number[];
  incomeAt: string[];
  HotelName: string;
}) {
  try {
    const mutation = `
      mutation UpdatePaymentWaiter(
        $id: Int!, 
        $payment: JSON!, 
        $price: JSON!, 
        $tablesServed: JSON!,
        $incomeAt: JSON!
      ) {
        UpdatePaymentWaiter(
          id: $id, 
          payment: $payment, 
          price: $price, 
          tablesServed: $tablesServed,
          incomeAt: $incomeAt
        ) {
          id
          HotelName
          payment
          tablesServed
          price
          incomeAt
        }
      }
    `;
    if (data.payment.length === 0) return null

    const response = await api.post(API_URL, {
      query: mutation,
      variables: {
        id: data.id,
        payment: data.payment,
        price: data.price,
        tablesServed: data.tablesServed,
        incomeAt: data.incomeAt,
      },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update waiter payment",
      );
    }

    toast.success("Waiter payment updated successfully");
    return response.data.data.UpdatePaymentWaiter;
  } catch (error: any) {
    toast.error("Failed to update waiter payment");
    throw error;
  }
}

export async function updateTablePayment(data: {
  id: number;
  payment: string[];
  price: number[];
  incomeAt: string[];
  HotelName: string;
}) {
  try {
    const mutation = `
      mutation UpdatePaymentTable(
        $id: Int!, 
        $payment: JSON!, 
        $price: JSON!,
        $incomeAt: JSON!
      ) {
        UpdatePaymentTable(
          id: $id, 
          payment: $payment, 
          price: $price,
          incomeAt: $incomeAt
        ) {
          id
          HotelName
          payment
          price
          incomeAt
        }
      }
    `;

    if (data.payment.length === 0) return null

    const response = await api.post(API_URL, {
      query: mutation,
      variables: {
        id: data.id,
        payment: data.payment,
        price: data.price,
        incomeAt: data.incomeAt,
      },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update table payment",
      );
    }

    toast.success("Table payment updated successfully");
    return response.data.data.UpdatePaymentTable;
  } catch (error: any) {
    toast.error("Failed to update table payment");
    throw error;
  }
}

export async function CreateCashout(data: any) {
  try {
    const mutation = `
      mutation CreateCashout(
        $items: JSON, 
        $prices: JSON, 
        $measuredBy: JSON, 
        $requiredAmount: JSON, 
        $totalCalc: Float!
      ) {
        CreateCashout(
          items: $items, 
          prices: $prices, 
          measuredBy: $measuredBy, 
          requiredAmount: $requiredAmount, 
          totalCalc: $totalCalc
        ) {
          id
          items
          prices
          measuredBy
          totalCalc
          requiredAmount
          HotelName
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: data,
    });

    if (response.data.errors) {
      const errorMessage =
        response.data.errors[0]?.message || "Failed to create cashout";

      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    toast.success("Cashout created successfully");
    invalidateGraphqlListCache("finance:cashouts");
    return response.data.data.CreateCashout;
  } catch (error: any) {
    if (isSessionExpiredError(error)) throw error;
    if (error.response?.data?.errors) {
      const graphqlErrors = error.response.data.errors;
      const errorMessages = graphqlErrors
        .map((err: any) => {
          if (err.extensions?.validation) {
            return Object.values(err.extensions.validation).flat().join(", ");
          }
          return err.message;
        })
        .join("\n");
      toast.error(`GraphQL Error: ${errorMessages}`);
    } else if (error.response?.status === 400) {
      toast.error("Bad request. Please check the data you're sending.");
    } else if (error.message) {
      toast.error(error.message);
    } else {
      toast.error("Failed to create cashout. Please try again.");
    }

    throw error;
  }
}

export async function fetchCashout(HotelName?: string) {
  try {
    const currentUser = getCurrentUser();
    const hotel = HotelName || currentUser?.HotelName;

    if (!hotel) {
      toast.error("Hotel name is required");
      throw new Error("Hotel name is required");
    }

    return await dedupeHotelListRead(`finance:cashouts:${hotel}`, async () => {
      const query = `
      query fetchCashouts {
        cashouts {
          id
          items
          prices
          measuredBy
          totalCalc
          requiredAmount
          createdAt
          HotelName
        }
      }
    `;

      const response = await api.post(API_URL, {
        query: query,
        variables: {
          HotelName: hotel,
        },
      });

      if (response.data.errors) {
        const errorMessage =
          response.data.errors[0]?.message || "Failed to fetch cashouts";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const cashouts = response.data.data.cashouts || [];
      return cashouts;
    });
  } catch (error: any) {
    if (isSessionExpiredError(error)) throw error;
    toast.error("Failed to fetch cashout: " + (error.message || "Unknown error"));

    throw error;
  }
}

export function filterBaristaOrders(
  orders: Order[],
  hotelName: string,
): Order[] {
  return orders.filter((order) => {
    const isSameHotel = rowHotelMatchesTenantScope(order.HotelName, hotelName);
    const isPending = order.status === null || order.status === "Pending";
    return isSameHotel && isPending && isBarStationOrder(order);
  });
}

export function filterChefOrders(orders: Order[], hotelName: string): Order[] {
  return orders.filter((order) => {
    const isSameHotel = rowHotelMatchesTenantScope(order.HotelName, hotelName);
    const isPending = order.status === null || order.status === "Pending";
    return isSameHotel && isPending && isKitchenStationOrder(order);
  });
}

export function filterUnpaidOrders(
  orders: Order[],
  hotelName: string,
): Order[] {
  return orders.filter((order) => {
    const isSameHotel = rowHotelMatchesTenantScope(order.HotelName, hotelName);
    const isUnpaid = order.payment !== "Paid";

    const notCancelled = order.status?.toLowerCase() !== "cancelled";

    return isSameHotel && isUnpaid && notCancelled;
  });
}
