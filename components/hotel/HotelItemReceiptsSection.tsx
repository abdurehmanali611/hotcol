"use client";

import { useMemo } from "react";
import type {
  ItemRegistration,
  ItemStatus,
  PurchaseRequestRow,
  StockOutRequestRow,
  FreshBazaarRow,
} from "@/lib/actions";
import {
  filterInventoryListRegistrations,
  filterPurchaseRequestsAuthorized,
  filterStockMovementsApproved,
} from "@/lib/hotelApproval";
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
  itemStatusHistory = [],
  freshBazaarArchives = [],
  propertyName,
  propertyTin,
  logoUrl,
}: {
  items: ItemRegistration[];
  purchaseRequests?: PurchaseRequestRow[];
  stockMovements?: StockOutRequestRow[];
  itemStatusHistory?: ItemStatus[];
  freshBazaarArchives?: FreshBazaarRow[];
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
}) {
  const tin =
    propertyTin ??
    (typeof window !== "undefined"
      ? localStorage.getItem("tin_number")?.trim() || null
      : null);

  const authorizedItems = useMemo(
    () => filterInventoryListRegistrations(items),
    [items],
  );
  const authorizedPurchases = useMemo(
    () => filterPurchaseRequestsAuthorized(purchaseRequests),
    [purchaseRequests],
  );
  const approvedStockMovements = useMemo(
    () => filterStockMovementsApproved(stockMovements),
    [stockMovements],
  );

  return (
    <Card className="border-primary/15 shadow-lg overflow-hidden bg-card/95">
      <div className="h-1 bg-linear-to-r from-primary/60 via-emerald-500/50 to-cyan-500/40" />
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Item receipts
        </CardTitle>
        <CardDescription className="max-w-2xl text-pretty">
          Expand a receipt type (purchase, registration, or stock movement), pick a
          voucher, then print from the preview when you are ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <StoreItemReceiptPrinting
          items={authorizedItems}
          purchaseRequests={authorizedPurchases}
          stockMovements={approvedStockMovements}
          itemStatusHistory={itemStatusHistory}
          freshBazaarArchives={freshBazaarArchives}
          propertyName={propertyName}
          propertyTin={tin}
          logoUrl={logoUrl}
        />
      </CardContent>
    </Card>
  );
}
