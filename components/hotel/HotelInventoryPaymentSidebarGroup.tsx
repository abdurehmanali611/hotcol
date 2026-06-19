"use client";

import { useEffect, useState } from "react";
import {
  PAYMENT_CATEGORY_NAV,
  isPaymentCategorySection,
} from "@/constants/hotelInventoryNav";
import { HOTEL_INVENTORY_COPY } from "@/lib/hotelDisplayLabels";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { ChevronRight, Receipt } from "lucide-react";

export function HotelInventoryPaymentSidebarGroup({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (sectionId: string) => void;
}) {
  const paymentActive = isPaymentCategorySection(activeSection);
  const [open, setOpen] = useState(paymentActive);

  useEffect(() => {
    if (paymentActive) setOpen(true);
  }, [paymentActive]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={HOTEL_INVENTORY_COPY.paymentAndTax}
            size="lg"
            className="h-10 cursor-pointer text-[13px]"
            isActive={paymentActive}
          >
            <Receipt className="opacity-80" />
            <span className="truncate">{HOTEL_INVENTORY_COPY.paymentAndTax}</span>
            <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {PAYMENT_CATEGORY_NAV.map(({ id, label }) => (
              <SidebarMenuSubItem key={id}>
                <SidebarMenuSubButton
                  asChild
                  isActive={activeSection === id}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    className="w-full"
                  >
                    {label}
                  </button>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
