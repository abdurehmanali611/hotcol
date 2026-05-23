import type {
  ItemRegistration,
  PurchaseRequestRow,
  StockOutRequestRow,
} from "@/lib/actions";
import { purchaseApprovalBucket } from "@/lib/panelFilters";
import { normalizeInventoryItemName } from "@/lib/tenantRowMatch";

export type InventoryNotificationAudience =
  | "cafe-admin"
  | "cafe-store"
  | "hotel-manager"
  | "hotel-cost-control"
  | "hotel-finance"
  | "hotel-store";

export type InventoryAlertSeverity = "critical" | "warning" | "info";

export type InventoryAlertKind =
  | "expired"
  | "expiring_soon"
  | "expiring_upcoming"
  | "out_of_stock"
  | "low_stock"
  | "moderate_stock"
  | "pending_cc"
  | "pending_finance"
  | "pending_manager"
  | "request_approved"
  | "request_rejected";

export type InventoryNotificationSource =
  | "item_registration"
  | "purchase_request"
  | "stock_movement"
  | "unit_price_inventory"
  | "unit_price_purchase";

export type InventoryNotification = {
  id: string;
  sourceType: InventoryNotificationSource;
  sourceId: number;
  itemName: string;
  category: string;
  severity: InventoryAlertSeverity;
  kind: InventoryAlertKind;
  title: string;
  message: string;
  entityLabel: string;
  amount?: number;
  measuredBy?: string;
  expireDate?: string;
  daysUntilExpiry?: number;
  approvalStatus?: string;
  voucherDisplay?: string | null;
};

export type InventoryNotificationInput = {
  items?: ItemRegistration[];
  purchaseRequests?: PurchaseRequestRow[];
  stockMovements?: StockOutRequestRow[];
};

export const INVENTORY_ALERT_THRESHOLDS = {
  expiryCriticalDays: 3,
  expiryWarningDays: 14,
  expiryInfoDays: 30,
  stockCriticalMax: 0,
  stockWarningMax: 8,
  stockInfoMax: 20,
} as const;

export const SOURCE_TYPE_LABELS: Record<InventoryNotificationSource, string> = {
  item_registration: "Item registration",
  purchase_request: "Purchase request",
  stock_movement: "Stock movement",
  unit_price_inventory: "Inventory unit price",
  unit_price_purchase: "Purchase unit price",
};

const SEVERITY_RANK: Record<InventoryAlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const STOCK_EXPIRY_KINDS = new Set<InventoryAlertKind>([
  "expired",
  "expiring_soon",
  "expiring_upcoming",
  "out_of_stock",
  "low_stock",
  "moderate_stock",
]);

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntil(expireDate: Date, now = new Date()): number {
  const ms =
    startOfDay(expireDate).getTime() - startOfDay(now).getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function worstSeverity(
  a: InventoryAlertSeverity,
  b: InventoryAlertSeverity,
): InventoryAlertSeverity {
  return SEVERITY_RANK[a] <= SEVERITY_RANK[b] ? a : b;
}

function normalizeInput(
  input: InventoryNotificationInput | ItemRegistration[],
): InventoryNotificationInput {
  return Array.isArray(input) ? { items: input } : input;
}

function isAuthorizedHotelStock(row: ItemRegistration): boolean {
  const s = String(row.approvalStatus ?? "").trim().toUpperCase();
  return !s || s === "AUTHORIZED";
}

type WorkflowStage = "pending_cc" | "pending_finance" | "pending_manager";

function workflowStageFromStatus(raw: string): WorkflowStage | null {
  const s = String(raw ?? "").trim().toUpperCase();
  if (!s || s === "AUTHORIZED" || s.startsWith("APPROVED") || s.startsWith("REJECTED")) {
    return null;
  }
  if (s === "PENDING_CC" || s === "PENDING") return "pending_cc";
  if (s === "PENDING_FINANCE") return "pending_finance";
  if (s === "PENDING_MANAGER") return "pending_manager";
  return null;
}

const WORKFLOW_KINDS = new Set<InventoryAlertKind>([
  "pending_cc",
  "pending_finance",
  "pending_manager",
  "request_approved",
  "request_rejected",
]);

function audienceAllowsKind(
  audience: InventoryNotificationAudience,
  kind: InventoryAlertKind,
): boolean {
  const stockExpiry = STOCK_EXPIRY_KINDS.has(kind);
  const workflow = WORKFLOW_KINDS.has(kind);

  switch (audience) {
    case "cafe-admin":
    case "cafe-store":
      return stockExpiry;
    case "hotel-store":
      return stockExpiry || workflow;
    case "hotel-cost-control":
      return kind === "pending_cc" || stockExpiry;
    case "hotel-finance":
      return kind === "pending_finance" || stockExpiry;
    case "hotel-manager":
      return workflow || stockExpiry;
    default:
      return false;
  }
}

function workflowOutcomeFromStatus(
  raw: string,
): "approved" | "rejected" | null {
  const s = String(raw ?? "").trim().toUpperCase();
  if (!s) return null;
  if (s === "APPROVED" || s === "AUTHORIZED") return "approved";
  if (s === "REJECTED" || s.startsWith("REJECTED_")) return "rejected";
  const bucket = purchaseApprovalBucket(s);
  if (bucket === "approved") return "approved";
  if (bucket === "rejected") return "rejected";
  return null;
}

function workflowMeta(
  stage: WorkflowStage,
  entityLabel: string,
  itemName: string,
  detail: string,
  audience: InventoryNotificationAudience,
): Pick<InventoryNotification, "severity" | "kind" | "title" | "message"> {
  if (audience === "hotel-store") {
    if (stage === "pending_cc") {
      return {
        severity: "warning",
        kind: "pending_cc",
        title: "With cost control",
        message: `Your ${entityLabel.toLowerCase()} for ${itemName} is awaiting cost control. ${detail}`,
      };
    }
    if (stage === "pending_finance") {
      return {
        severity: "warning",
        kind: "pending_finance",
        title: "With finance",
        message: `Your ${entityLabel.toLowerCase()} for ${itemName} is awaiting finance. ${detail}`,
      };
    }
    return {
      severity: "warning",
      kind: "pending_manager",
      title: "With manager",
      message: `Your ${entityLabel.toLowerCase()} for ${itemName} is awaiting manager approval. ${detail}`,
    };
  }

  if (stage === "pending_cc") {
    return {
      severity: "critical",
      kind: "pending_cc",
      title: "Awaiting cost control",
      message: `${entityLabel}: ${itemName} — ${detail}`,
    };
  }
  if (stage === "pending_finance") {
    return {
      severity: "warning",
      kind: "pending_finance",
      title: "Awaiting finance",
      message: `${entityLabel}: ${itemName} — ${detail}`,
    };
  }
  return {
    severity: "warning",
    kind: "pending_manager",
    title: "Awaiting manager",
    message: `${entityLabel}: ${itemName} — ${detail}`,
  };
}

function outcomeMeta(
  outcome: "approved" | "rejected",
  entityLabel: string,
  itemName: string,
  detail: string,
): Pick<InventoryNotification, "severity" | "kind" | "title" | "message"> {
  if (outcome === "approved") {
    return {
      severity: "info",
      kind: "request_approved",
      title: "Request approved",
      message: `Your ${entityLabel.toLowerCase()} for ${itemName} was approved. ${detail}`,
    };
  }
  return {
    severity: "critical",
    kind: "request_rejected",
    title: "Request rejected",
    message: `Your ${entityLabel.toLowerCase()} for ${itemName} was rejected. ${detail}`,
  };
}

function makeWorkflowNotification(
  sourceType: InventoryNotificationSource,
  sourceId: number,
  itemName: string,
  category: string,
  stage: WorkflowStage,
  entityLabel: string,
  detail: string,
  audience: InventoryNotificationAudience,
  extra?: Partial<InventoryNotification>,
): InventoryNotification {
  const meta = workflowMeta(stage, entityLabel, itemName, detail, audience);
  return {
    id: `wf-${sourceType}-${stage}-${sourceId}`,
    sourceType,
    sourceId,
    itemName,
    category: category || "—",
    entityLabel,
    approvalStatus: stage.toUpperCase().replace("pending_", "PENDING_"),
    ...meta,
    ...extra,
  };
}

function makeOutcomeNotification(
  sourceType: InventoryNotificationSource,
  sourceId: number,
  itemName: string,
  category: string,
  outcome: "approved" | "rejected",
  entityLabel: string,
  detail: string,
  statusRaw: string,
  extra?: Partial<InventoryNotification>,
): InventoryNotification {
  const meta = outcomeMeta(outcome, entityLabel, itemName, detail);
  return {
    id: `wf-${sourceType}-${outcome}-${sourceId}`,
    sourceType,
    sourceId,
    itemName,
    category: category || "—",
    entityLabel,
    approvalStatus: statusRaw,
    ...meta,
    ...extra,
  };
}

function itemRegistrationWorkflowAlerts(
  row: ItemRegistration,
  audience: InventoryNotificationAudience,
): InventoryNotification[] {
  const alerts: InventoryNotification[] = [];
  const label = SOURCE_TYPE_LABELS.item_registration;

  const regStage = workflowStageFromStatus(String(row.approvalStatus ?? ""));
  if (regStage) {
    alerts.push(
      makeWorkflowNotification(
        "item_registration",
        row.id,
        row.name,
        row.category,
        regStage,
        label,
        "registration must be authorized before stock is live",
        audience,
        {
          amount: row.amount,
          measuredBy: row.measuredBy,
          voucherDisplay: row.voucherDisplay,
          approvalStatus: String(row.approvalStatus ?? ""),
        },
      ),
    );
  } else if (audience === "hotel-store") {
    const regOutcome = workflowOutcomeFromStatus(String(row.approvalStatus ?? ""));
    if (regOutcome) {
      alerts.push(
        makeOutcomeNotification(
          "item_registration",
          row.id,
          row.name,
          row.category,
          regOutcome,
          label,
          regOutcome === "approved"
            ? "Stock will appear in inventory when fully processed."
            : "Check rejection notes and resubmit if needed.",
          String(row.approvalStatus ?? ""),
          {
            amount: row.amount,
            measuredBy: row.measuredBy,
            voucherDisplay: row.voucherDisplay,
          },
        ),
      );
    }
  }

  const priceStage = workflowStageFromStatus(
    String(row.unitPriceChangeStatus ?? ""),
  );
  if (priceStage && row.pendingUnitPrice != null) {
    alerts.push(
      makeWorkflowNotification(
        "unit_price_inventory",
        row.id,
        row.name,
        row.category,
        priceStage,
        SOURCE_TYPE_LABELS.unit_price_inventory,
        `unit price change to ETB ${Number(row.pendingUnitPrice).toLocaleString()} (was ${Number(row.unitPrice).toLocaleString()})`,
        audience,
        {
          amount: row.amount,
          measuredBy: row.measuredBy,
          voucherDisplay: row.voucherDisplay,
          approvalStatus: String(row.unitPriceChangeStatus ?? ""),
        },
      ),
    );
  } else if (audience === "hotel-store") {
    const priceOutcome = workflowOutcomeFromStatus(
      String(row.unitPriceChangeStatus ?? ""),
    );
    if (priceOutcome && row.pendingUnitPrice != null) {
      alerts.push(
        makeOutcomeNotification(
          "unit_price_inventory",
          row.id,
          row.name,
          row.category,
          priceOutcome,
          SOURCE_TYPE_LABELS.unit_price_inventory,
          `ETB ${Number(row.pendingUnitPrice).toLocaleString()} (was ${Number(row.unitPrice).toLocaleString()})`,
          String(row.unitPriceChangeStatus ?? ""),
          {
            amount: row.amount,
            measuredBy: row.measuredBy,
            voucherDisplay: row.voucherDisplay,
          },
        ),
      );
    }
  }

  return alerts;
}

function purchaseRequestWorkflowAlerts(
  row: PurchaseRequestRow,
  audience: InventoryNotificationAudience,
): InventoryNotification[] {
  const alerts: InventoryNotification[] = [];
  const label = SOURCE_TYPE_LABELS.purchase_request;
  const base = {
    amount: row.quantity,
    measuredBy: row.measuredBy,
    voucherDisplay: row.voucherDisplay,
  };

  const prStage = workflowStageFromStatus(row.status);
  if (prStage) {
    const bucket = purchaseApprovalBucket(row.status);
    const detail =
      bucket === "pending_cc"
        ? `qty ${row.quantity} ${row.measuredBy} — needs cost control`
        : bucket === "pending_finance"
          ? `qty ${row.quantity} ${row.measuredBy} — needs finance`
          : `qty ${row.quantity} ${row.measuredBy} — needs manager`;
    alerts.push(
      makeWorkflowNotification(
        "purchase_request",
        row.id,
        row.itemName,
        row.category,
        prStage,
        label,
        detail,
        audience,
        { ...base, approvalStatus: row.status },
      ),
    );
  } else if (audience === "hotel-store") {
    const prOutcome = workflowOutcomeFromStatus(row.status);
    if (prOutcome) {
      alerts.push(
        makeOutcomeNotification(
          "purchase_request",
          row.id,
          row.itemName,
          row.category,
          prOutcome,
          label,
          prOutcome === "approved"
            ? `Qty ${row.quantity} ${row.measuredBy} — you can register stock when goods arrive.`
            : `Qty ${row.quantity} ${row.measuredBy} — review and resubmit if needed.`,
          row.status,
          { ...base, approvalStatus: row.status },
        ),
      );
    }
  }

  const priceStage = workflowStageFromStatus(
    String(row.unitPriceChangeStatus ?? ""),
  );
  if (priceStage && row.pendingUnitPrice != null) {
    alerts.push(
      makeWorkflowNotification(
        "unit_price_purchase",
        row.id,
        row.itemName,
        row.category,
        priceStage,
        SOURCE_TYPE_LABELS.unit_price_purchase,
        `estimated unit price → ETB ${Number(row.pendingUnitPrice).toLocaleString()} (was ${Number(row.estimatedUnitPrice).toLocaleString()})`,
        audience,
        {
          ...base,
          approvalStatus: String(row.unitPriceChangeStatus ?? ""),
        },
      ),
    );
  } else if (audience === "hotel-store") {
    const priceOutcome = workflowOutcomeFromStatus(
      String(row.unitPriceChangeStatus ?? ""),
    );
    if (priceOutcome && row.pendingUnitPrice != null) {
      alerts.push(
        makeOutcomeNotification(
          "unit_price_purchase",
          row.id,
          row.itemName,
          row.category,
          priceOutcome,
          SOURCE_TYPE_LABELS.unit_price_purchase,
          `ETB ${Number(row.pendingUnitPrice).toLocaleString()} (was ${Number(row.estimatedUnitPrice).toLocaleString()})`,
          String(row.unitPriceChangeStatus ?? ""),
          { ...base, approvalStatus: String(row.unitPriceChangeStatus ?? "") },
        ),
      );
    }
  }

  return alerts;
}

function stockMovementWorkflowAlerts(
  row: StockOutRequestRow,
  audience: InventoryNotificationAudience,
): InventoryNotification[] {
  const alerts: InventoryNotification[] = [];
  const label = SOURCE_TYPE_LABELS.stock_movement;
  const itemName = row.itemName || `Item #${row.itemRegistrationId}`;
  const detail = `${row.movementType} · ${row.amount} units · ${row.stakeHolderOrReason}`;
  const base = {
    amount: row.amount,
    measuredBy: "units",
    voucherDisplay: row.voucherDisplay,
    approvalStatus: row.status,
  };

  const stage = workflowStageFromStatus(row.status);
  if (stage) {
    alerts.push(
      makeWorkflowNotification(
        "stock_movement",
        row.id,
        itemName,
        "Stock",
        stage,
        label,
        detail,
        audience,
        base,
      ),
    );
  } else if (audience === "hotel-store") {
    const outcome = workflowOutcomeFromStatus(row.status);
    if (outcome) {
      alerts.push(
        makeOutcomeNotification(
          "stock_movement",
          row.id,
          itemName,
          "Stock",
          outcome,
          label,
          detail,
          row.status,
          base,
        ),
      );
    }
  }

  return alerts;
}

function itemOwnedByStoreUser(
  row: ItemRegistration,
  storeUserName: string,
): boolean {
  return (
    String(row.statusBy ?? "").trim() === storeUserName.trim()
  );
}

function stockExpiryAlerts(
  row: ItemRegistration,
  now = new Date(),
): InventoryNotification[] {
  const alerts: InventoryNotification[] = [];
  const amount = Number(row.amount) || 0;
  const base = {
    sourceType: "item_registration" as const,
    sourceId: row.id,
    itemName: row.name,
    category: row.category,
    entityLabel: SOURCE_TYPE_LABELS.item_registration,
    amount,
    measuredBy: row.measuredBy,
    approvalStatus: row.approvalStatus,
    voucherDisplay: row.voucherDisplay,
  };

  if (amount <= INVENTORY_ALERT_THRESHOLDS.stockCriticalMax) {
    alerts.push({
      ...base,
      id: `stock-out-${row.id}`,
      severity: "critical",
      kind: "out_of_stock",
      title: "Out of stock",
      message: `No quantity left (${amount} ${row.measuredBy}).`,
    });
  } else if (amount <= INVENTORY_ALERT_THRESHOLDS.stockWarningMax) {
    alerts.push({
      ...base,
      id: `stock-low-${row.id}`,
      severity: "warning",
      kind: "low_stock",
      title: "Low stock",
      message: `Only ${amount} ${row.measuredBy} remaining.`,
    });
  } else if (amount <= INVENTORY_ALERT_THRESHOLDS.stockInfoMax) {
    alerts.push({
      ...base,
      id: `stock-mod-${row.id}`,
      severity: "info",
      kind: "moderate_stock",
      title: "Moderate stock",
      message: `${amount} ${row.measuredBy} left — consider reordering.`,
    });
  }

  const exp = row.expireDate ? new Date(row.expireDate) : null;
  if (exp && !Number.isNaN(exp.getTime())) {
    const days = daysUntil(exp, now);
    const expireIso = exp.toISOString();
    if (days < 0) {
      alerts.push({
        ...base,
        id: `exp-past-${row.id}`,
        severity: "critical",
        kind: "expired",
        title: "Expired",
        message: `Expired ${Math.abs(days)} day(s) ago.`,
        expireDate: expireIso,
        daysUntilExpiry: days,
      });
    } else if (days <= INVENTORY_ALERT_THRESHOLDS.expiryCriticalDays) {
      alerts.push({
        ...base,
        id: `exp-crit-${row.id}`,
        severity: "critical",
        kind: "expiring_soon",
        title: "Expires very soon",
        message:
          days === 0 ? "Expires today." : `Expires in ${days} day(s).`,
        expireDate: expireIso,
        daysUntilExpiry: days,
      });
    } else if (days <= INVENTORY_ALERT_THRESHOLDS.expiryWarningDays) {
      alerts.push({
        ...base,
        id: `exp-warn-${row.id}`,
        severity: "warning",
        kind: "expiring_soon",
        title: "Expiring soon",
        message: `Expires in ${days} day(s).`,
        expireDate: expireIso,
        daysUntilExpiry: days,
      });
    } else if (days <= INVENTORY_ALERT_THRESHOLDS.expiryInfoDays) {
      alerts.push({
        ...base,
        id: `exp-info-${row.id}`,
        severity: "info",
        kind: "expiring_upcoming",
        title: "Expiry upcoming",
        message: `Expires in ${days} day(s).`,
        expireDate: expireIso,
        daysUntilExpiry: days,
      });
    }
  }

  return alerts;
}

function sortNotifications(
  list: InventoryNotification[],
): InventoryNotification[] {
  return [...list].sort((a, b) => {
    const sd = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sd !== 0) return sd;
    const ed = a.entityLabel.localeCompare(b.entityLabel);
    if (ed !== 0) return ed;
    return a.itemName.localeCompare(b.itemName);
  });
}

/** Build role-aware alerts: stock/expiry from items; hotel workflow from PR, stock-out, registrations, unit prices. */
export function buildInventoryNotifications(
  input: InventoryNotificationInput | ItemRegistration[],
  audience: InventoryNotificationAudience,
  options?: {
    now?: Date;
    hotelLodging?: boolean;
    /** When audience is hotel-store, only workflow alerts for this user's submissions. */
    storeUserName?: string;
  },
): InventoryNotification[] {
  const { items = [], purchaseRequests = [], stockMovements = [] } =
    normalizeInput(input);
  const now = options?.now ?? new Date();
  const hotelLodging =
    options?.hotelLodging ?? audience.startsWith("hotel");
  const storeUser = options?.storeUserName?.trim() ?? "";

  const scopedPurchases =
    audience === "hotel-store" && storeUser
      ? purchaseRequests.filter((p) => p.storeUserName === storeUser)
      : purchaseRequests;
  const scopedStocks =
    audience === "hotel-store" && storeUser
      ? stockMovements.filter((s) => s.requestedByUserName === storeUser)
      : stockMovements;

  const out: InventoryNotification[] = [];

  for (const row of items) {
    if (hotelLodging) {
      const includeItemWorkflow =
        audience !== "hotel-store" ||
        (storeUser && itemOwnedByStoreUser(row, storeUser));
      if (includeItemWorkflow) {
        for (const a of itemRegistrationWorkflowAlerts(row, audience)) {
          if (audienceAllowsKind(audience, a.kind)) out.push(a);
        }
      }
    }

    const includeStockExpiry = !hotelLodging || isAuthorizedHotelStock(row);
    if (includeStockExpiry) {
      for (const a of stockExpiryAlerts(row, now)) {
        if (audienceAllowsKind(audience, a.kind)) out.push(a);
      }
    }
  }

  if (hotelLodging && (audience !== "hotel-store" || storeUser)) {
    for (const pr of scopedPurchases) {
      for (const a of purchaseRequestWorkflowAlerts(pr, audience)) {
        if (audienceAllowsKind(audience, a.kind)) out.push(a);
      }
    }
    for (const st of scopedStocks) {
      for (const a of stockMovementWorkflowAlerts(st, audience)) {
        if (audienceAllowsKind(audience, a.kind)) out.push(a);
      }
    }
  }

  return sortNotifications(out);
}

export type InventoryNotificationSummary = {
  total: number;
  critical: number;
  warning: number;
  info: number;
  uniqueItems: number;
  workflowCount: number;
  stockExpiryCount: number;
};

export function summarizeInventoryNotifications(
  notifications: InventoryNotification[],
): InventoryNotificationSummary {
  const itemKeys = new Set<string>();
  let critical = 0;
  let warning = 0;
  let info = 0;
  let workflowCount = 0;
  let stockExpiryCount = 0;

  for (const n of notifications) {
    itemKeys.add(
      normalizeInventoryItemName(n.itemName) || `id-${n.sourceId}`,
    );
    if (n.severity === "critical") critical++;
    else if (n.severity === "warning") warning++;
    else info++;
    if (STOCK_EXPIRY_KINDS.has(n.kind)) stockExpiryCount++;
    else if (WORKFLOW_KINDS.has(n.kind)) workflowCount++;
  }

  return {
    total: notifications.length,
    critical,
    warning,
    info,
    uniqueItems: itemKeys.size,
    workflowCount,
    stockExpiryCount,
  };
}

export function filterNotificationsBySeverity(
  notifications: InventoryNotification[],
  severity: InventoryAlertSeverity | "all",
): InventoryNotification[] {
  if (severity === "all") return notifications;
  return notifications.filter((n) => n.severity === severity);
}

/** Stock/expiry: one alert per item name; workflow: keep every pending row. */
export function prepareNotificationsForDisplay(
  notifications: InventoryNotification[],
): InventoryNotification[] {
  const workflow = notifications.filter((n) => WORKFLOW_KINDS.has(n.kind));
  const stock = notifications.filter((n) => STOCK_EXPIRY_KINDS.has(n.kind));

  const byKey = new Map<string, InventoryNotification>();
  for (const n of stock) {
    const key =
      normalizeInventoryItemName(n.itemName) || `id-${n.sourceId}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, n);
      continue;
    }
    byKey.set(key, {
      ...n,
      severity: worstSeverity(prev.severity, n.severity),
    });
  }

  return sortNotifications([...workflow, ...byKey.values()]);
}

/** @deprecated Use prepareNotificationsForDisplay */
export function dedupeNotificationsByItem(
  notifications: InventoryNotification[],
): InventoryNotification[] {
  return prepareNotificationsForDisplay(notifications);
}

export function audienceLabel(audience: InventoryNotificationAudience): string {
  switch (audience) {
    case "cafe-admin":
      return "Café admin";
    case "cafe-store":
      return "Café store";
    case "hotel-manager":
      return "Hotel manager";
    case "hotel-cost-control":
      return "Cost control";
    case "hotel-finance":
      return "Finance";
    case "hotel-store":
      return "Hotel store";
    default:
      return "Inventory";
  }
}
