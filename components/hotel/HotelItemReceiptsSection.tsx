"use client";

import type {
  ItemRegistration,
  PurchaseRequestRow,
  StockOutRequestRow,
} from "@/lib/actions";
import { StoreItemReceiptPrinting } from "@/components/hotel/StoreItemReceiptPrinting";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Receipt } from "lucide-react";

export function HotelItemReceiptsSection({
  items,
  purchaseRequests = [],
  stockMovements = [],
  propertyName,
  propertyTin,
  logoUrl,
}: {
  items: ItemRegistration[];
  purchaseRequests?: PurchaseRequestRow[];
  stockMovements?: StockOutRequestRow[];
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
}) {
  const tin =
    propertyTin ??
    (typeof window !== "undefined"
      ? localStorage.getItem("tin_number")?.trim() || null
      : null);

  return (
    <Card className="border-primary/15 shadow-lg overflow-hidden bg-card/95">
      <div className="h-1 bg-linear-to-r from-primary/60 via-emerald-500/50 to-cyan-500/40" />
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Item receipts
        </CardTitle>
        <CardDescription className="max-w-2xl text-pretty">
          Print new registration, purchase request, and stock movement receipts
          with clear titles, voucher numbers, hotel TIN, payment status, and
          signature lines.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StoreItemReceiptPrinting
          items={items}
          purchaseRequests={purchaseRequests}
          stockMovements={stockMovements}
          propertyName={propertyName}
          propertyTin={tin}
          logoUrl={logoUrl}
        />
      </CardContent>
    </Card>
  );
}
