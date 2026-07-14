"use client";

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
import { ChevronRight, Shirt, UtensilsCrossed } from "lucide-react";

const FNB_ITEMS = [
  { id: "services-fnb-order", label: "Order" },
  { id: "services-fnb-update", label: "Order update" },
] as const;

const LAUNDRY_ITEMS = [
  { id: "services-laundry-order", label: "Order" },
  { id: "services-laundry-update", label: "Order update" },
] as const;

export const RECEPTION_SERVICE_NESTED_TAB_IDS = [
  ...FNB_ITEMS.map((i) => i.id),
  ...LAUNDRY_ITEMS.map((i) => i.id),
] as const;

export type ReceptionServiceNestedTabId =
  (typeof RECEPTION_SERVICE_NESTED_TAB_IDS)[number];

export function isReceptionServiceNestedTab(
  id: string,
): id is ReceptionServiceNestedTabId {
  return (RECEPTION_SERVICE_NESTED_TAB_IDS as readonly string[]).includes(id);
}

export function receptionServiceSectionMeta(id: string): {
  title: string;
  description: string;
} | null {
  switch (id) {
    case "services-fnb-order":
      return {
        title: "Food & drink · Order",
        description: "Place F&B charges on an occupied room’s stay.",
      };
    case "services-fnb-update":
      return {
        title: "Food & drink · Order update",
        description: "Edit F&B bill lines on an active stay.",
      };
    case "services-laundry-order":
      return {
        title: "Laundry · Order",
        description: "Charge laundry catalog items to an occupied room.",
      };
    case "services-laundry-update":
      return {
        title: "Laundry · Order update",
        description: "Edit laundry bill lines on an active stay.",
      };
    default:
      return null;
  }
}

export function ReceptionServicesSidebarGroup({
  activeSection,
  onSelect,
  showFoodDrink = true,
}: {
  activeSection: string;
  onSelect: (sectionId: string) => void;
  /** When false, Food & drink is hidden (no Cafe and Restaurant module). */
  showFoodDrink?: boolean;
}) {
  const fnbActive = FNB_ITEMS.some((i) => i.id === activeSection);
  const laundryActive = LAUNDRY_ITEMS.some((i) => i.id === activeSection);

  return (
    <>
      {showFoodDrink ? (
        <Collapsible defaultOpen={fnbActive} className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip="Food & drink"
                size="lg"
                className="h-10 cursor-pointer text-[13px]"
                isActive={fnbActive}
              >
                <UtensilsCrossed className="opacity-80" />
                <span className="truncate">Food & drink</span>
                <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {FNB_ITEMS.map(({ id, label }) => (
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
      ) : null}

      <Collapsible defaultOpen={laundryActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip="Laundry"
              size="lg"
              className="h-10 cursor-pointer text-[13px]"
              isActive={laundryActive}
            >
              <Shirt className="opacity-80" />
              <span className="truncate">Laundry</span>
              <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {LAUNDRY_ITEMS.map(({ id, label }) => (
                <SidebarMenuSubItem key={id}>
                  <SidebarMenuSubButton asChild isActive={activeSection === id}>
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
    </>
  );
}
