"use client";

import { Badge } from "@/components/ui/badge";
import {
  formatItemRegistrationStatus,
  formatPurchaseStatus,
  formatStockOutRequestStatus,
} from "@/lib/hotelDisplayLabels";
import { cn } from "@/lib/utils";

export function PurchaseLineStatusBadge({ status }: { status: string }) {
  const code = String(status || "").trim();
  const variant =
    code.startsWith("REJECTED")
      ? "destructive"
      : code === "AUTHORIZED" || code === "APPROVED_FINANCE"
        ? "default"
        : "secondary";
  return (
    <Badge variant={variant} className="text-[10px] font-normal shrink-0">
      {formatPurchaseStatus(code)}
    </Badge>
  );
}

export function RegistrationLineStatusBadge({
  approvalStatus,
}: {
  approvalStatus: string;
}) {
  const code = String(approvalStatus || "").trim();
  const variant =
    code.startsWith("REJECTED")
      ? "destructive"
      : code === "AUTHORIZED"
        ? "default"
        : "secondary";
  return (
    <Badge variant={variant} className="text-[10px] font-normal shrink-0">
      {formatItemRegistrationStatus(code)}
    </Badge>
  );
}

export function StockLineStatusBadge({ status }: { status: string }) {
  const code = String(status || "").trim();
  const variant =
    code === "REJECTED"
      ? "destructive"
      : code === "APPROVED"
        ? "default"
        : "secondary";
  return (
    <Badge
      variant={variant}
      className={cn("text-[10px] font-normal shrink-0")}
    >
      {formatStockOutRequestStatus(code)}
    </Badge>
  );
}
