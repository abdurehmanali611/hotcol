"use client";

import { useMemo, useRef } from "react";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { APEX_SOLUTION, HOTCOL_SYSTEM } from "@/constants/branding";
import type { InactiveItemFilters, InactiveItemRow } from "@/lib/inactiveItemFilters";
import {
  formatInactiveEtb,
  inactiveFilterSummaryLines,
  inactiveRowActionDate,
  inactiveRowTotal,
  inactiveRowVoucher,
  summarizeInactiveAuditPrint,
} from "@/lib/inactiveAuditPrint";

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
  const printRef = useRef<HTMLDivElement>(null);
  const printedAt = new Date().toLocaleString();
  const property = (propertyName || "Property").trim() || "Property";
  const tin = (propertyTin || "").trim();
  const hotelLogo = (logoUrl || "").trim();

  const filterLines = inactiveFilterSummaryLines(
    filters,
    rows.length,
    totalCount,
  );
  const totals = useMemo(() => summarizeInactiveAuditPrint(rows), [rows]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Stock_Movement_Account_${property.replace(/\s+/g, "_")}`,
  });

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 shrink-0"
        disabled={rows.length === 0}
        onClick={() => handlePrint()}
      >
        <Printer className="h-3.5 w-3.5" />
        Print list ({rows.length})
      </Button>

      <div
        aria-hidden
        className="fixed left-[-9999px] top-0 h-0 w-0 overflow-hidden"
      >
        <div ref={printRef} className="inactive-audit-print-root">
          <section className="inactive-audit-print-sheet">
            <header className="inactive-audit-print-brand-header">
              <div className="inactive-audit-print-brand-left">
                {hotelLogo ? (
                  <div className="inactive-audit-print-hotel-logo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hotelLogo}
                      alt={`${property} logo`}
                      className="inactive-audit-print-hotel-logo-img"
                    />
                  </div>
                ) : (
                  <div className="inactive-audit-print-hotel-logo inactive-audit-print-hotel-logo--fallback">
                    {property.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="inactive-audit-print-brand-copy">
                  <p className="inactive-audit-print-eyebrow">
                    Stock movement account
                  </p>
                  <h1 className="inactive-audit-print-title">{title}</h1>
                  <p className="inactive-audit-print-property">{property}</p>
                  <p className="inactive-audit-print-tin">
                    Hotel TIN: {tin || "-"}
                  </p>
                </div>
              </div>

              <div className="inactive-audit-print-brand-right">
                <div className="inactive-audit-print-hotcol-badge">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HOTCOL_SYSTEM.logoPath}
                    alt={HOTCOL_SYSTEM.name}
                    className="inactive-audit-print-hotcol-logo"
                  />
                  <span className="inactive-audit-print-hotcol-name">
                    {HOTCOL_SYSTEM.name}
                  </span>
                </div>
                <p className="inactive-audit-print-meta">Printed {printedAt}</p>
              </div>
            </header>

            <div className="inactive-audit-print-divider" />

            <div className="inactive-audit-print-filters">
              <p className="inactive-audit-print-filters-title">Applied filters</p>
              <dl className="inactive-audit-print-filters-grid">
                {filterLines.map((line) => (
                  <div key={line.label} className="inactive-audit-print-filter-item">
                    <dt>{line.label}</dt>
                    <dd>{line.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <table className="inactive-audit-print-table">
              <thead>
                <tr>
                  <th>Voucher</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Unit price</th>
                  <th>Total</th>
                  <th>Provider</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="inactive-audit-print-empty">
                      No records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{inactiveRowVoucher(row)}</td>
                      <td>{row.name}</td>
                      <td>{row.category}</td>
                      <td className="tabular-nums">{row.amount}</td>
                      <td>{row.measuredBy}</td>
                      <td className="tabular-nums">
                        ETB {formatInactiveEtb(Number(row.unitPrice) || 0)}
                      </td>
                      <td className="tabular-nums">{inactiveRowTotal(row)}</td>
                      <td>{row.supplierName || "—"}</td>
                      <td>{row.movementDepartmentLabel || "—"}</td>
                      <td>{row.status}</td>
                      <td>{row.statusBy || "—"}</td>
                      <td>{inactiveRowActionDate(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="inactive-audit-print-summary">
              <h2 className="inactive-audit-print-summary-title">
                Financial summary
              </h2>
              <div className="inactive-audit-print-summary-box">
                <div className="inactive-audit-print-summary-row">
                  <span>Stock movement lines</span>
                  <span className="tabular-nums">{totals.movementLineCount}</span>
                </div>
                <div className="inactive-audit-print-summary-row inactive-audit-print-summary-row--emphasis">
                  <span>Stock movement account total</span>
                  <span className="tabular-nums">
                    ETB {formatInactiveEtb(totals.movementTotalEtb)}
                  </span>
                </div>
                {totals.otherLineCount > 0 ? (
                  <>
                    <div className="inactive-audit-print-summary-row">
                      <span>Other inactive lines</span>
                      <span className="tabular-nums">{totals.otherLineCount}</span>
                    </div>
                    <div className="inactive-audit-print-summary-row">
                      <span>Other inactive total</span>
                      <span className="tabular-nums">
                        ETB {formatInactiveEtb(totals.otherTotalEtb)}
                      </span>
                    </div>
                  </>
                ) : null}
                <div className="inactive-audit-print-summary-divider" />
                <div className="inactive-audit-print-summary-row inactive-audit-print-summary-row--grand">
                  <span>Report grand total</span>
                  <span className="tabular-nums">
                    ETB {formatInactiveEtb(totals.grandTotalEtb)}
                  </span>
                </div>
              </div>
            </div>

            <footer className="inactive-audit-print-apex-footer">
              <div className="inactive-audit-print-apex-left">
                <div className="inactive-audit-print-apex-logo-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={APEX_SOLUTION.logoPath}
                    alt={APEX_SOLUTION.name}
                    className="inactive-audit-print-apex-logo"
                  />
                </div>
                <div>
                  <p className="inactive-audit-print-apex-name">
                    {APEX_SOLUTION.name}
                  </p>
                  <p className="inactive-audit-print-apex-site">
                    {APEX_SOLUTION.website.replace(/^https?:\/\//, "")}
                  </p>
                </div>
              </div>
              <div className="inactive-audit-print-apex-right">
                <p>
                  Powered by{" "}
                  <span className="inactive-audit-print-hotcol-inline">
                    {HOTCOL_SYSTEM.name}
                  </span>{" "}
                  inventory
                </p>
                <p>{totals.lineCount} record{totals.lineCount !== 1 ? "s" : ""}</p>
              </div>
            </footer>
          </section>
        </div>
      </div>
    </>
  );
}
