"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { APEX_SOLUTION, HOTCOL_SYSTEM } from "@/constants/branding";
import type {
  AuditPrintFilterLine,
  AuditPrintSummaryRow,
} from "@/lib/brandedListPrint";
import { SUPPRESS_BROWSER_PRINT_CHROME } from "@/lib/suppressBrowserPrintChrome";

export type AuditPrintColumn<T> = {
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
};

export type AuditPrintSignatureBlock = {
  label: string;
  name?: string | null;
};

export function BrandedAuditListPrintActions<T>({
  rows,
  getRowKey,
  columns,
  filterLines,
  summaryRows,
  eyebrow,
  title,
  propertyName,
  propertyTin,
  logoUrl,
  documentTitle,
  buttonLabel,
  emptyMessage = "No records match the selected filters.",
  showSummary = true,
  signatureBlocks,
}: {
  rows: T[];
  getRowKey: (row: T) => string | number;
  columns: AuditPrintColumn<T>[];
  filterLines: AuditPrintFilterLine[];
  summaryRows: AuditPrintSummaryRow[];
  eyebrow: string;
  title: string;
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  documentTitle: string;
  buttonLabel?: string;
  emptyMessage?: string;
  showSummary?: boolean;
  /** Optional sign-off lines (e.g. Store / Cost Controller / Finance / Manager). */
  signatureBlocks?: AuditPrintSignatureBlock[];
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const printedAt = new Date().toLocaleString();
  const property = (propertyName || "Property").trim() || "Property";
  const tin = (propertyTin || "").trim();
  const hotelLogo = (logoUrl || "").trim();
  const resolvedButtonLabel =
    buttonLabel ?? `Print list (${rows.length})`;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle,
    pageStyle: SUPPRESS_BROWSER_PRINT_CHROME,
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
        {resolvedButtonLabel}
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
                  <p className="inactive-audit-print-eyebrow">{eyebrow}</p>
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
                  {columns.map((col) => (
                    <th key={col.header} className={col.className}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="inactive-audit-print-empty"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={getRowKey(row)}>
                      {columns.map((col) => (
                        <td key={col.header} className={col.className}>
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {showSummary && summaryRows.length > 0 ? (
              <div className="inactive-audit-print-summary">
                <h2 className="inactive-audit-print-summary-title">
                  Financial summary
                </h2>
                <div className="inactive-audit-print-summary-box">
                  {summaryRows.map((row, index) => (
                    <div
                      key={`${row.label}-${index}`}
                      className={
                        row.grand
                          ? "inactive-audit-print-summary-row inactive-audit-print-summary-row--grand"
                          : row.emphasis
                            ? "inactive-audit-print-summary-row inactive-audit-print-summary-row--emphasis"
                            : "inactive-audit-print-summary-row"
                      }
                    >
                      <span>{row.label}</span>
                      <span className="tabular-nums">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {signatureBlocks && signatureBlocks.length > 0 ? (
              <div className="inactive-audit-print-signatures">
                <p className="inactive-audit-print-signatures-title">
                  Signatures
                </p>
                <div className="inactive-audit-print-signatures-grid">
                  {signatureBlocks.map((entry, index) => (
                    <div
                      key={`${entry.label}-${entry.name ?? ""}-${index}`}
                      className="inactive-audit-print-signature-item"
                    >
                      <div className="inactive-audit-print-signature-meta">
                        <p className="inactive-audit-print-signature-label">
                          {entry.label}
                        </p>
                        <p className="inactive-audit-print-signature-name">
                          {(entry.name || "").trim() || "—"}
                        </p>
                      </div>
                      <div
                        className="inactive-audit-print-signature-line"
                        aria-label={`${entry.label} signature`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

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
                <p>
                  {rows.length} record{rows.length !== 1 ? "s" : ""}
                </p>
              </div>
            </footer>
          </section>
        </div>
      </div>
    </>
  );
}
