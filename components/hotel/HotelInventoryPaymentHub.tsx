"use client";

import { useState } from "react";
import {
  HotelInventoryPaymentCategoryPanel,
  type PaymentCategoryMode,
} from "@/components/hotel/HotelInventoryPaymentCategoryPanel";
import type { FreshBazaarRow, ItemRegistration } from "@/lib/actions";
import { PAYMENT_CATEGORY_NAV } from "@/constants/hotelInventoryNav";
import { HOTEL_INVENTORY_COPY } from "@/lib/hotelDisplayLabels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function HotelInventoryPaymentHub({
  tenantLabel,
  inventoryItems,
  freshBazaarArchives = [],
  initialMode = "credit",
}: {
  tenantLabel: string;
  inventoryItems: ItemRegistration[];
  freshBazaarArchives?: FreshBazaarRow[];
  initialMode?: PaymentCategoryMode;
}) {
  const [mode, setMode] = useState<PaymentCategoryMode>(initialMode);

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 pb-4">
        <div className="space-y-1.5 min-w-[220px]">
          <Label className="text-xs text-muted-foreground">
            {HOTEL_INVENTORY_COPY.paymentAndTax}
          </Label>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as PaymentCategoryMode)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_CATEGORY_NAV.map((n) => (
                <SelectItem key={n.id} value={n.mode}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <HotelInventoryPaymentCategoryPanel
        mode={mode}
        tenantLabel={tenantLabel}
        inventoryItems={inventoryItems}
        freshBazaarArchives={freshBazaarArchives}
      />
    </div>
  );
}
