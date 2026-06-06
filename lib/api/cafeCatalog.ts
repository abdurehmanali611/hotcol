/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from "sonner";
import { api, API_URL, dedupeHotelListRead, invalidateGraphqlListCache } from "./client";
import type {
  Item,
  CreateItemData,
  UpdateItemData,
  CreateCredentialData,
  UpdateCredentialData,
  UpdateAdminPasswordData,
  Waiter,
  CreateWaiterData,
  UpdateWaiterData,
  Table,
  CreateTableData,
  UpdateTableData,
} from "./types";

export async function fetchItems(): Promise<Item[]> {
  try {
    return await dedupeHotelListRead("catalog:items", async () => {
      const query = `
      query {
        items {
          id
          name
          price
          HotelName
          category
          type
          imageUrl
          showStationPrepQty
          createdAt
        }
      }
    `;

      const response = await api.post(API_URL, { query });

      if (response.data.errors) {
        throw new Error(
          response.data.errors[0]?.message || "Failed to fetch items",
        );
      }

      return response.data.data.items || [];
    });
  } catch (error: any) {
    toast.error("Unable to load menu items. Please refresh the page.");
    throw error;
  }
}

export async function createItem(itemData: CreateItemData) {
  try {
    const mutation = `
      mutation CreateItem($name: String!, $price: Float!, $category: String!, $imageUrl: String!, $type: String!) {
        CreateItem(name: $name, price: $price, category: $category, imageUrl: $imageUrl, type: $type) {
          id
          name
          price
          category
          type
          HotelName
          imageUrl
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: itemData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to create item",
      );
    }

    toast.success("Item created successfully");
    invalidateGraphqlListCache("catalog:items");
    return response.data.data.CreateItem;
  } catch (error: any) {
    toast.error(
      "Unable to create item. Please check all fields and try again.",
    );
    throw error;
  }
}

export async function updateItem(itemData: UpdateItemData) {
  try {
    const mutation = `
      mutation UpdateItem($id: Int!, $name: String!, $price: Float!, $category: String!, $imageUrl: String!, $type: String!) {
        UpdateItem(id: $id, name: $name, price: $price, category: $category, imageUrl: $imageUrl, type: $type) {
          id
          name
          price
          HotelName
          type
          category
          imageUrl
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: itemData,
    });
    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update item",
      );
    }

    return response.data;
  } catch (error: any) {
    toast.error("Unable to update item. Please try again.");
    throw error;
  }
}

export async function updateItemStationPrepQty(
  id: number,
  showStationPrepQty: boolean,
) {
  try {
    const mutation = `
      mutation UpdateItemStationPrepQty($id: Int!, $showStationPrepQty: Boolean!) {
        UpdateItemStationPrepQty(id: $id, showStationPrepQty: $showStationPrepQty) {
          id
          name
          showStationPrepQty
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id, showStationPrepQty },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message ||
          "Failed to update prep quantity display",
      );
    }

    invalidateGraphqlListCache("catalog:items");
    return response.data.data.UpdateItemStationPrepQty;
  } catch (error: any) {
    toast.error("Unable to update prep quantity display. Please try again.");
    throw error;
  }
}

export async function deleteItem(id: number) {
  try {
    const mutation = `
      mutation DeleteItem($id: Int!) {
        DeleteItem(id: $id) {
          id
          name
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { id },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to delete item",
      );
    }

    toast.success("Item deleted successfully");
    invalidateGraphqlListCache("catalog:items");
    return response.data.data.DeleteItem;
  } catch (error: any) {
    toast.error("Unable to delete item. Please try again.");
    throw error;
  }
}

export async function fetchCredentials(): Promise<Credential[]> {
  try {
    return await dedupeHotelListRead("auth:users", async () => {
      const query = `
      query {
        users {
          id
          UserName
          Role
          HotelName
          LogoUrl
        }
      }
    `;

      const response = await api.post(API_URL, { query });

      if (response.data.errors) {
        throw new Error(
          response.data.errors[0]?.message || "Failed to fetch credentials",
        );
      }

      return response.data.data.users || [];
    });
  } catch (error: any) {
    toast.error("Unable to load user credentials.");
    throw error;
  }
}

export async function createCredential(credentialData: CreateCredentialData) {
  try {
    const mutation = `
      mutation CreateCredential($UserName: String!, $Password: String!, $Role: String!, $HotelName: String!, $LogoUrl: String) {
        CreateCredential(UserName: $UserName, Password: $Password, Role: $Role, HotelName: $HotelName, LogoUrl: $LogoUrl) {
          id
          UserName
          HotelName
          tinNumber
          Password
          Role
          LogoUrl
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: credentialData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to create credential",
      );
    }

    toast.success("Credential granted successfully");
    return response.data.data.CreateCredential;
  } catch (error: any) {
    toast.error(
      "Unable to create user credential. Please check all fields and try again.",
    );
    throw error;
  }
}

export async function updateCredential(credentialData: UpdateCredentialData) {
  try {
    const mutation = `
      mutation UpdateCredential($UserName: String!, $Password: String!, $Role: String!) {
        UpdateCredential(UserName: $UserName, Password: $Password, Role: $Role) {
          id
          UserName
          Password
          HotelName
          Role
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: credentialData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update credential",
      );
    }

    toast.success("Credential updated successfully");
    return response.data.data.UpdateCredential;
  } catch (error: any) {
    toast.error("Unable to update credential. Please try again.");
    throw error;
  }
}

export async function deleteCredential(userName: string) {
  try {
    const mutation = `
      mutation DeleteCredential($UserName: String!) {
        DeleteCredential(UserName: $UserName)
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { UserName: userName },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to delete credential",
      );
    }

    toast.success("Staff account removed");
    return response.data.data.DeleteCredential;
  } catch (error: any) {
    toast.error(
      error?.message || "Unable to delete credential. Please try again.",
    );
    throw error;
  }
}

export async function updateAdminPassword(
  passwordData: UpdateAdminPasswordData,
): Promise<boolean> {
  try {
    const isValid = await verifyAdminPassword(
      passwordData.HotelName,
      passwordData.oldPassword,
    );
    if (!isValid) {
      toast.error("Old password is incorrect");
      return false;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return false;
    }

    const mutation = `
      mutation UpdateAdminCredential($Password: String!) {
        UpdateAdminCredential(Password: $Password) {
          id
          HotelName
          Password
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: {
        Password: passwordData.newPassword,
        HotelName: passwordData.HotelName,
      },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update admin password",
      );
    }

    toast.success("Admin password updated successfully");
    return true;
  } catch (error: any) {
    toast.error(
      `Unable to update password. Please verify your current password and try again. ${error.message}`,
    );
    console.error(error);
    return false;
  }
}

export async function verifyAdminPassword(
  HotelName: string,
  passwordInput: string,
): Promise<boolean> {
  try {
    const mutation = `
      mutation VerifyAdminPassword($HotelName: String!, $passwordInput: String!) {
        verifyAdminPassword(HotelName: $HotelName, passwordInput: $passwordInput)
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: { HotelName, passwordInput },
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Verification failed",
      );
    }

    return response.data.data.verifyAdminPassword;
  } catch (error: any) {
    throw error;
  }
}

export async function fetchWaiters(): Promise<Waiter[]> {
  return dedupeHotelListRead("cafe:waiters", async () => {
    const query = `
      query {
        waiters {
          id
          name
          HotelName
          age
          sex
          experience
          phoneNumber
          tablesServed
          price
          payment
          incomeAt
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to fetch waiters",
      );
    }

    return response.data.data.waiters || [];
  });
}

export async function createWaiter(waiterData: CreateWaiterData) {
  try {
    const mutation = `
      mutation CreateWaiter($name: String!, $HotelName: String!, $sex: String!, $age: Int!, $experience: Int!, $phoneNumber: String!) {
        CreateWaiter(name: $name, HotelName: $HotelName, sex: $sex, age: $age, experience: $experience, phoneNumber: $phoneNumber) {
          id
          name
          HotelName
          age
          sex
          experience
          phoneNumber
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: waiterData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to create waiter",
      );
    }

    toast.success("Waiter added successfully");
    return response.data.data.CreateWaiter;
  } catch (error: any) {
    toast.error("Failed to create waiter");
    throw error;
  }
}

export async function updateWaiter(waiterData: UpdateWaiterData) {
  try {
    const mutation = `
      mutation UpdateWaiter($id: Int!, $name: String!, $age: Int!, $sex: String!, $experience: Int!, $phoneNumber: String!) {
        UpdateWaiter(id: $id, name: $name, age: $age, sex: $sex, experience: $experience, phoneNumber: $phoneNumber) {
          id
          name
          age
          sex
          experience
          phoneNumber
          HotelName
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: waiterData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update waiter",
      );
    }

    toast.success("Waiter updated successfully");
    return response.data.data.UpdateWaiter;
  } catch (error: any) {
    toast.error("Failed to update waiter");
    throw error;
  }
}

export async function deleteWaiter(id: number) {
  try {
    const mutation = `
      mutation DeleteWaiter($id: Int!) {
        DeleteWaiter(id: $id) {
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
        response.data.errors[0]?.message || "Failed to delete waiter",
      );
    }

    toast.success("Waiter deleted successfully");
    return response.data.data.DeleteWaiter;
  } catch (error: any) {
    toast.error("Failed to delete waiter");
    throw error;
  }
}

export async function fetchTables(): Promise<Table[]> {
  return dedupeHotelListRead("cafe:tables", async () => {
    const query = `
      query {
        tables {
          id
          tableNo
          HotelName
          capacity
          orderCaption
          price
          payment
          incomeAt
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, { query });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to fetch tables",
      );
    }

    return response.data.data.tables || [];
  });
}

export async function createTable(tableData: CreateTableData) {
  try {
    const mutation = `
      mutation CreateTable(
        $tableNo: Int!
        $HotelName: String!
        $capacity: Int!
        $orderCaption: String
      ) {
        CreateTable(
          tableNo: $tableNo
          HotelName: $HotelName
          capacity: $capacity
          orderCaption: $orderCaption
        ) {
          id
          tableNo
          HotelName
          capacity
          orderCaption
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: tableData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to create table",
      );
    }

    toast.success("Table created successfully");
    invalidateGraphqlListCache("cafe:tables");
    return response.data.data.CreateTable;
  } catch (error: any) {
    toast.error("Failed to create table");
    throw error;
  }
}

export async function updateTable(tableData: UpdateTableData) {
  try {
    const mutation = `
      mutation UpdateTable(
        $id: Int!
        $tableNo: Int!
        $capacity: Int!
        $orderCaption: String
      ) {
        UpdateTable(
          id: $id
          tableNo: $tableNo
          capacity: $capacity
          orderCaption: $orderCaption
        ) {
          id
          tableNo
          capacity
          orderCaption
          HotelName
          createdAt
        }
      }
    `;

    const response = await api.post(API_URL, {
      query: mutation,
      variables: tableData,
    });

    if (response.data.errors) {
      throw new Error(
        response.data.errors[0]?.message || "Failed to update table",
      );
    }

    toast.success("Table updated successfully");
    invalidateGraphqlListCache("cafe:tables");
    return response.data.data.UpdateTable;
  } catch (error: any) {
    toast.error("Failed to update table");
    throw error;
  }
}

export async function deleteTable(id: number) {
  try {
    const mutation = `
      mutation DeleteTable($id: Int!) {
        DeleteTable(id: $id) {
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
        response.data.errors[0]?.message || "Failed to delete table",
      );
    }

    toast.success("Table deleted successfully");
    invalidateGraphqlListCache("cafe:tables");
    return response.data.data.DeleteTable;
  } catch (error: any) {
    toast.error("Failed to delete table");
    throw error;
  }
}
