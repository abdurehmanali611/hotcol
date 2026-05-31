import type { ReceiptBundle } from "@/lib/receiptGrouping";

/** Printable A4 height in millimeters (portrait, zero @page margin). */
export const A4_PRINT_HEIGHT_MM = 297;

/** Maximum height for one receipt when two share a page. */
export const RECEIPT_HALF_PAGE_MM = A4_PRINT_HEIGHT_MM / 2;

/**
 * Rough height estimate for compact bulk-print layout.
 * Used to decide whether two receipts fit on one A4 sheet.
 */
export function estimateBulkReceiptHeightMm(bundle: ReceiptBundle): number {
  const lineCount = bundle.lines.length;
  const isMulti = lineCount > 1;

  const headerMm = isMulti ? 58 : 72;
  const footerMm = 42;
  const perLineMm = isMulti ? 6.5 : 0;
  const singleItemBlockMm = isMulti ? 0 : 28;

  return headerMm + footerMm + singleItemBlockMm + lineCount * perLineMm;
}

/** True when a receipt must occupy a full page (too tall for half-page slot). */
export function receiptNeedsFullPrintPage(bundle: ReceiptBundle): boolean {
  return estimateBulkReceiptHeightMm(bundle) > RECEIPT_HALF_PAGE_MM;
}

/**
 * Group authorized receipts onto A4 pages: up to two per page when both fit
 * in half a sheet; otherwise one receipt per page. Never splits a receipt.
 */
export function paginateBundlesForA4Print(
  bundles: ReceiptBundle[],
): ReceiptBundle[][] {
  const pages: ReceiptBundle[][] = [];
  let index = 0;

  while (index < bundles.length) {
    const first = bundles[index];

    if (receiptNeedsFullPrintPage(first)) {
      pages.push([first]);
      index += 1;
      continue;
    }

    if (index + 1 < bundles.length) {
      const second = bundles[index + 1];
      if (!receiptNeedsFullPrintPage(second)) {
        pages.push([first, second]);
        index += 2;
        continue;
      }
    }

    pages.push([first]);
    index += 1;
  }

  return pages;
}
