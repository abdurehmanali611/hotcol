/** User-facing labels for hotel inventory workflow codes */

export function formatMovementType(code: string): string {
  switch (code) {
    case "STOCK_OUT":
      return "Stock out";
    case "WASTAGE":
      return "Wastage";
    case "RETURN_SUPPLIER":
      return "Return to supplier";
    default:
      return code;
  }
}

export function formatPurchaseStatus(status: string): string {
  switch (status) {
    case "PENDING_CC":
      return "Awaiting cost control";
    case "PENDING_FINANCE":
      return "Awaiting finance";
    case "APPROVED_CC":
      return "Approved by cost control";
    case "APPROVED_FINANCE":
      return "Approved by finance (awaiting store receipt)";
    case "REJECTED_CC":
      return "Rejected by cost control";
    case "REJECTED_FINANCE":
      return "Rejected by finance";
    default:
      return status;
  }
}

export function formatStockOutRequestStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "Awaiting cost control";
    case "APPROVED":
      return "Applied to inventory";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}
