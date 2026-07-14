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
import { ChevronRight, Shirt } from "lucide-react";

const LAUNDRY_ITEMS = [
  { id: "lodging-laundry-add", label: "Add item" },
  { id: "lodging-laundry-items", label: "Menu items" },
] as const;

/** @deprecated F&B is managed under Cafe and Restaurant, not Rooms. */
export const LODGING_SERVICE_NESTED_TAB_IDS = [
  ...LAUNDRY_ITEMS.map((i) => i.id),
] as const;

export function isLodgingServiceNestedTab(id: string): boolean {
  return (LODGING_SERVICE_NESTED_TAB_IDS as readonly string[]).includes(id);
}

export function HotelLodgingServiceSidebarGroup({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (sectionId: string) => void;
}) {
  const laundryActive = LAUNDRY_ITEMS.some((i) => i.id === activeSection);

  return (
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
  );
}
