"use client";

import {
  isPaymentCategorySection,
} from "@/constants/hotelInventoryNav";
import { HOTEL_INVENTORY_COPY } from "@/lib/hotelDisplayLabels";
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Receipt } from "lucide-react";

/** Single sidebar entry; category is chosen inside the payment hub via dropdown. */
export function HotelInventoryPaymentSidebarGroup({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (sectionId: string) => void;
}) {
  const paymentOpen = isPaymentCategorySection(activeSection);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={HOTEL_INVENTORY_COPY.paymentAndTax}
        size="lg"
        className="h-10 cursor-pointer text-[13px]"
        isActive={paymentOpen}
        onClick={() => onSelect("payment-credit")}
      >
        <Receipt className="opacity-80" />
        <span className="truncate">{HOTEL_INVENTORY_COPY.paymentAndTax}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
