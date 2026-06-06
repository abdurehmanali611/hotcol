"use client";

import type { ItemRegistration } from "@/lib/actions";
import { BrandedAuditListPrintActions } from "@/components/hotel/BrandedAuditListPrint";
import type { InventoryListFilters } from "@/lib/inventoryListFilters";
import {
  buildInventoryListPrintConfig,
  printDocumentTitle,
} from "@/lib/requestStatusListPrint";

export function InventoryListPrintActions({
  rows,
  filters,
  filteredCount,
  totalCount,
  propertyName,
  propertyTin,
  logoUrl,
}: {
  rows: ItemRegistration[];
  filters: InventoryListFilters;
  filteredCount: number;
  totalCount: number;
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
}) {
  const config = buildInventoryListPrintConfig(
    rows,
    filters,
    filteredCount,
    totalCount,
  );

  return (
    <BrandedAuditListPrintActions
      rows={rows}
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
