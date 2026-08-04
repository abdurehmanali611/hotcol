/**
 * Injected into react-to-print iframes.
 * Zero @page margin is what Chromium/Edge use to omit browser headers/footers
 * (date, document title, URL, page number). Receipts keep their own padding.
 */
export const SUPPRESS_BROWSER_PRINT_CHROME = `
  @page {
    size: A4 portrait;
    margin: 0 !important;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;
