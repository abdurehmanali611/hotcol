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
import {
  expandLeaderSignatureBlocks,
  leadersByDepartment,
} from "@/lib/departments";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";

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
        const byDept = leadersByDepartment(
          leaders.filter((row) =>
            rowHotelMatchesTenantScope(row.HotelName, null),
          ),
        );
        const costControllers = ccProfiles
          .map((p) => String(p.displayName ?? "").trim())
          .filter(Boolean);
        setSignatureBlocks([
          ...expandLeaderSignatureBlocks(
            "Store",
            byDept.get("STORE")?.leaderName ?? "",
          ),
          ...(costControllers.length
            ? costControllers.map((name) => ({
                label: "Cost Controller",
                name,
              }))
            : [{ label: "Cost Controller", name: "" }]),
          ...expandLeaderSignatureBlocks(
            "Finance",
            byDept.get("FINANCE")?.leaderName ?? "",
          ),
          ...expandLeaderSignatureBlocks(
            "Manager",
            byDept.get("GM")?.leaderName ?? "",
          ),
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
