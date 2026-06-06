"use client";

import { useMemo } from "react";
import type { InactiveItemFilters, InactiveItemRow } from "@/lib/inactiveItemFilters";
import { BrandedAuditListPrintActions } from "@/components/hotel/BrandedAuditListPrint";
import {
  buildInactiveListPrintConfig,
} from "@/lib/inactiveAuditPrint";
import { printDocumentTitle } from "@/lib/requestStatusListPrint";

export function InactiveAuditPrintActions({
  rows,
  filters,
  propertyName,
  propertyTin,
  logoUrl,
  title = "Stock movement account report",
  totalCount,
}: {
  rows: InactiveItemRow[];
  filters: InactiveItemFilters;
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  title?: string;
  totalCount: number;
}) {
  const config = useMemo(
    () =>
      buildInactiveListPrintConfig(
        rows,
        filters,
        rows.length,
        totalCount,
        title,
      ),
    [rows, filters, totalCount, title],
  );

  return (
    <BrandedAuditListPrintActions
      rows={rows}
      getRowKey={(row) => row.id}
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
