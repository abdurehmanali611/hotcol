"use client";

import type { ItemRegistration } from "@/lib/actions";
import { useEffect, useState } from "react";
import {
  BrandedAuditListPrintActions,
  type AuditPrintSignatureBlock,
} from "@/components/hotel/BrandedAuditListPrint";
import type { InventoryListFilters } from "@/lib/inventoryListFilters";
import {
  buildInventoryListPrintConfig,
  printDocumentTitle,
} from "@/lib/requestStatusListPrint";
import { fetchDepartmentLeaders } from "@/lib/api/departmentLeaders";
import { fetchCostControllerProfiles } from "@/lib/api/hotelWorkflow";
import { leadersByDepartment, normalizeLeaderNames } from "@/lib/departments";

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
  const [signatureBlocks, setSignatureBlocks] = useState<
    AuditPrintSignatureBlock[]
  >([
    { label: "Store", name: "" },
    { label: "Cost Controller", name: "" },
    { label: "Finance", name: "" },
    { label: "Manager", name: "" },
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [leaders, ccProfiles] = await Promise.all([
          fetchDepartmentLeaders(),
          fetchCostControllerProfiles(),
        ]);
        if (cancelled) return;
        const byDept = leadersByDepartment(leaders);
        const store = normalizeLeaderNames(
          byDept.get("STORE")?.leaderName ?? "",
        );
        const finance = normalizeLeaderNames(
          byDept.get("FINANCE")?.leaderName ?? "",
        );
        const manager = normalizeLeaderNames(
          byDept.get("GM")?.leaderName ?? "",
        );
        const costControllers = ccProfiles
          .map((p) => String(p.displayName ?? "").trim())
          .filter(Boolean)
          .join(", ");
        setSignatureBlocks([
          { label: "Store", name: store },
          { label: "Cost Controller", name: costControllers },
          { label: "Finance", name: finance },
          { label: "Manager", name: manager },
        ]);
      } catch {
        /* keep blank signature lines */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      signatureBlocks={signatureBlocks}
    />
  );
}
