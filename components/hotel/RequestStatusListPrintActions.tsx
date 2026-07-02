"use client";

import type { ReactElement } from "react";
import type {
  ItemRegistration,
  ItemStatus,
  PurchaseRequestRow,
  StockOutRequestRow,
  FreshBazaarRow,
} from "@/lib/actions";
import { BrandedAuditListPrintActions } from "@/components/hotel/BrandedAuditListPrint";
import {
  buildPurchaseListPrintConfig,
  buildRegistrationListPrintConfig,
  buildStockListPrintConfig,
  printDocumentTitle,
  type RequestStatusListPrintFilters,
} from "@/lib/requestStatusListPrint";

type RequestStatusListPrintVariant = "registration" | "purchase" | "stock";

type RequestStatusListPrintActionsProps = {
  variant: RequestStatusListPrintVariant;
  filters: RequestStatusListPrintFilters;
  filteredCount: number;
  totalCount: number;
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  linkedInventory?: ItemRegistration[];
  itemStatusHistory?: ItemStatus[];
  freshBazaarArchives?: FreshBazaarRow[];
};

export function RequestStatusListPrintActions(
  props: RequestStatusListPrintActionsProps & {
    variant: "registration";
    rows: ItemRegistration[];
  },
): ReactElement;
export function RequestStatusListPrintActions(
  props: RequestStatusListPrintActionsProps & {
    variant: "purchase";
    rows: PurchaseRequestRow[];
  },
): ReactElement;
export function RequestStatusListPrintActions(
  props: RequestStatusListPrintActionsProps & {
    variant: "stock";
    rows: StockOutRequestRow[];
    linkedInventory?: ItemRegistration[];
    itemStatusHistory?: ItemStatus[];
    freshBazaarArchives?: FreshBazaarRow[];
  },
): ReactElement;
export function RequestStatusListPrintActions({
  variant,
  rows,
  filters,
  filteredCount,
  totalCount,
  propertyName,
  propertyTin,
  logoUrl,
  linkedInventory = [],
  itemStatusHistory = [],
  freshBazaarArchives = [],
}: RequestStatusListPrintActionsProps & {
  variant: RequestStatusListPrintVariant;
  rows: ItemRegistration[] | PurchaseRequestRow[] | StockOutRequestRow[];
}) {
  if (variant === "registration") {
    const config = buildRegistrationListPrintConfig(
      rows as ItemRegistration[],
      filters,
      filteredCount,
      totalCount,
    );

    return (
      <BrandedAuditListPrintActions
        rows={rows as ItemRegistration[]}
        getRowKey={(row) => String(row.id ?? "")}
        columns={config.columns}
        filterLines={config.filterLines}
        summaryRows={config.summaryRows}
        eyebrow={config.eyebrow}
        title={config.title}
        propertyName={propertyName}
        propertyTin={propertyTin}
        logoUrl={logoUrl}
        documentTitle={printDocumentTitle(config.documentTitle, propertyName)}
      />
    );
  }

  if (variant === "purchase") {
    const config = buildPurchaseListPrintConfig(
      rows as PurchaseRequestRow[],
      filters,
      filteredCount,
      totalCount,
    );

    return (
      <BrandedAuditListPrintActions
        rows={rows as PurchaseRequestRow[]}
        getRowKey={(row) => String(row.id ?? "")}
        columns={config.columns}
        filterLines={config.filterLines}
        summaryRows={config.summaryRows}
        eyebrow={config.eyebrow}
        title={config.title}
        propertyName={propertyName}
        propertyTin={propertyTin}
        logoUrl={logoUrl}
        documentTitle={printDocumentTitle(config.documentTitle, propertyName)}
      />
    );
  }

  const config = buildStockListPrintConfig(
    rows as StockOutRequestRow[],
    linkedInventory,
    filters,
    filteredCount,
    totalCount,
    itemStatusHistory,
    freshBazaarArchives,
  );

  return (
    <BrandedAuditListPrintActions
      rows={rows as StockOutRequestRow[]}
      getRowKey={(row) => String(row.id ?? "")}
      columns={config.columns}
      filterLines={config.filterLines}
      summaryRows={config.summaryRows}
      eyebrow={config.eyebrow}
      title={config.title}
      propertyName={propertyName}
      propertyTin={propertyTin}
      logoUrl={logoUrl}
      documentTitle={printDocumentTitle(config.documentTitle, propertyName)}
    />
  );
}
