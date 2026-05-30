import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const lines = fs.readFileSync(path.join(root, "lib", "actions.ts.bak"), "utf8").split("\n");
const apiDir = path.join(root, "lib", "api");
fs.mkdirSync(apiDir, { recursive: true });

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

const typesParts = [
  slice(34, 449),
  slice(958, 977),
  slice(4012, 4105),
  slice(4346, 4353),
];
fs.writeFileSync(
  path.join(apiDir, "types.ts"),
  `/* eslint-disable @typescript-eslint/no-explicit-any */\n\n${typesParts.join("\n\n")}\n`,
);

const clientBody = `${slice(451, 557)}

export { invalidateGraphqlListCache } from "../graphqlListCache";

export function refreshCafeOrdersFeed() {
  invalidateGraphqlListCache("cafe:orders");
  bumpCafeOrdersFeed();
}

${slice(561, 587)}
`;
fs.writeFileSync(
  path.join(apiDir, "client.ts"),
  `import axios from "axios";
import {
  graphqlErrorsIndicateSessionExpiry,
  isSessionExpiredError,
  scheduleSessionExpiredRedirect,
  SessionExpiredError,
} from "../sessionExpiry";
import {
  invalidateGraphqlListCache,
  readListCache,
  writeListCache,
} from "../graphqlListCache";
import { bumpCafeOrdersFeed } from "../cafeOrdersSync";
import { toast } from "sonner";

${clientBody.replace("const GRAPHQL_TIMEOUT_MS", "export const GRAPHQL_TIMEOUT_MS")}
`,
);

const modules = [
  {
    file: "auth.ts",
    body: slice(589, 1080),
    imports: `
import { clearAuthStorage } from "../sessionExpiry";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { persistTenantSubscription, readTenantSubscriptionFromStorage } from "../tenantModules";
import { persistTenantAccessMode, type TenantPaymentKind } from "../tenantAccessMode";
import { parseModulesJson, roleAllowedForModules } from "../subscriptionModules";
import type { LoginCredentials, User, TenantFeedbackInbox } from "./types";
`,
    clientImports: ["api", "API_URL"],
  },
  {
    file: "cafeCatalog.ts",
    body: slice(1082, 1713),
    imports: `
import type {
  Item, CreateItemData, UpdateItemData, CreateCredentialData,
  UpdateCredentialData, UpdateAdminPasswordData, Waiter, CreateWaiterData,
  UpdateWaiterData, Table, CreateTableData, UpdateTableData,
} from "./types";
`,
    clientImports: ["api", "API_URL", "dedupeHotelListRead", "invalidateGraphqlListCache"],
  },
  {
    file: "cafeOrders.ts",
    body: slice(1722, 2623),
    imports: `
import { rowHotelMatchesTenantScope, findRowByTenantScope } from "../tenantRowMatch";
import { isBarStationOrder, isKitchenStationOrder } from "../cafeOrderStation";
import { validateCreditUsageAmount } from "../creditLimits";
import { isSessionExpiredError } from "../sessionExpiry";
import { getCurrentUser } from "./auth";
import { fetchPityCash, fetchCreditRegistrations } from "./cafeCredit";
import type { Order, OrderCreationData, UpdateLiveOrderData, CreditRegistration } from "./types";
`,
    clientImports: ["api", "API_URL", "dedupeHotelListRead", "invalidateGraphqlListCache", "refreshCafeOrdersFeed"],
    bodyPatch: (body) =>
      body.replace(
        "async function UpdatePityDeduction",
        "export async function UpdatePityDeduction",
      ),
  },
  {
    file: "reports.ts",
    body: slice(2625, 2919),
    imports: `
import { saveAs } from "file-saver";
import { UseFormReturn } from "react-hook-form";
import { rowHotelMatchesTenantScope } from "../tenantRowMatch";
import type {
  Order, ReportFilter, ExcelExportData, Waiter, Table, ReportData,
  cloudinarySuccessResult, Cashout,
} from "./types";

function calculateTotalSales(orders: Order[]): number {
  return orders.reduce((total, order) => total + order.price * order.orderAmount, 0);
}
`,
    clientImports: [],
    header: `import { toast } from "sonner";\n`,
  },
  {
    file: "cafeCredit.ts",
    body: slice(2921, 3449),
    imports: `
import type {
  CreateCreditLevel as CreateCreditLevelInput,
  UpdateCreditLevel as UpdateCreditLevelInput,
  CreatePityCash as CreatePityCashInput,
  UpdatePityCash as UpdatePityCashInput,
  pityCash,
  CreateCreditRegistration as CreateCreditRegistrationInput,
  UpdateCreditRegistration as UpdateCreditRegistrationInput,
} from "./types";
`,
    clientImports: ["api", "API_URL", "dedupeHotelListRead", "invalidateGraphqlListCache"],
    bodyPatch: (body) =>
      body
        .replace("values: CreateCreditLevel)", "values: CreateCreditLevelInput)")
        .replace("creditLevelData: UpdateCreditLevel)", "creditLevelData: UpdateCreditLevelInput)")
        .replace("values: CreatePityCash)", "values: CreatePityCashInput)")
        .replace("pityCashData: UpdatePityCash)", "pityCashData: UpdatePityCashInput)")
        .replace("values: CreateCreditRegistration,", "values: CreateCreditRegistrationInput,")
        .replace("creditRegData: UpdateCreditRegistration,", "creditRegData: UpdateCreditRegistrationInput,"),
  },
  {
    file: "hotelInventory.ts",
    body: slice(3451, 3914),
    imports: `
import { computeInventoryPaidAmountETB } from "../hotelInventoryPayment";
import { findRowByTenantScope, resolveCanonicalTenantKey } from "../tenantRowMatch";
import { fetchPityCash } from "./cafeCredit";
import { UpdatePityDeduction } from "./cafeOrders";
import type {
  createItemRegistration,
  UpdateItemRegistration as UpdateItemRegistrationInput,
  CreatingItemStatus,
} from "./types";
`,
    clientImports: ["api", "API_URL", "dedupeHotelListRead", "invalidateGraphqlListCache"],
    bodyPatch: (body) =>
      body.replace(
        "creditRegData: UpdateItemRegistration,",
        "creditRegData: UpdateItemRegistrationInput,",
      ),
  },
  {
    file: "hotelWorkflow.ts",
    body: slice(3916, lines.length),
    imports: `
import { isSessionExpiredError } from "../sessionExpiry";
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
`,
    clientImports: ["api", "API_URL", "dedupeHotelListRead", "invalidateGraphqlListCache"],
    bodyPatch: (body) => {
      const marker = "export type HotelMutationToastOptions";
      const idx = body.indexOf(marker);
      if (idx === -1) return body;
      const nextFn = body.indexOf("export async function approvePurchaseRequestCCApi", idx);
      return body.slice(0, idx) + body.slice(nextFn);
    },
  },
];

function clientImportLine(names) {
  if (!names.length) return "";
  return `import { ${names.join(", ")} } from "./client";\n`;
}

for (const mod of modules) {
  let body = mod.bodyPatch ? mod.bodyPatch(mod.body) : mod.body;
  const header =
    (mod.header ?? `/* eslint-disable @typescript-eslint/no-explicit-any */\nimport { toast } from "sonner";\n`) +
    clientImportLine(mod.clientImports);
  fs.writeFileSync(path.join(apiDir, mod.file), `${header}${mod.imports}\n\n${body}\n`);
  console.log("Wrote", mod.file);
}

// Export cloudinarySuccessResult and ReportData from types
const typesPath = path.join(apiDir, "types.ts");
let typesContent = fs.readFileSync(typesPath, "utf8");
typesContent = typesContent
  .replace(/^interface cloudinarySuccessResult/m, "export interface cloudinarySuccessResult")
  .replace(/^interface ReportData/m, "export interface ReportData");
fs.writeFileSync(typesPath, typesContent);

fs.writeFileSync(
  path.join(apiDir, "index.ts"),
  `export * from "./types";
export * from "./client";
export * from "./auth";
export * from "./cafeCatalog";
export * from "./cafeOrders";
export * from "./reports";
export * from "./hotelWorkflow";

export {
  CreateCreditLevel,
  UpdateCreditLevel,
  DeleteCreditLevel,
  CreatePityCash,
  UpdatePityCash,
  DeletePityCash,
  CreateCreditRegistration,
  UpdateCreditRegistration,
  DeleteCreditRegistration,
  fetchCreditLevels,
  fetchPityCash,
  fetchCreditRegistrations,
  authorizeCreditRegistrationApi,
  rejectCreditRegistrationApi,
} from "./cafeCredit";

export {
  CreateItemRegistration,
  fetchItemRegistrations,
  UpdateItemRegistration,
  DeleteItemRegistration,
  CreateItemStatus,
  fetchItemStatus,
  DeleteItemStatus,
} from "./hotelInventory";
`,
);

fs.writeFileSync(
  path.join(root, "lib", "actions.ts"),
  '/** Re-exports all API modules. Prefer `@/lib/api/cafeOrders` etc. for route-level tree-shaking. */\nexport * from "./api";\n',
);

console.log("Split complete.");
