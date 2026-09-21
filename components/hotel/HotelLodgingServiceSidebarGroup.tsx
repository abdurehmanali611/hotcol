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
import { MANAGER_LODGING_NESTED_TAB_IDS } from "@/constants";
import { ChevronRight, MessageSquareWarning, Shirt } from "lucide-react";

const LAUNDRY_ITEMS = [
  { id: "lodging-laundry-add", label: "Add item" },
  { id: "lodging-laundry-items", label: "Menu items" },
] as const;

const GUEST_FEEDBACK_ITEMS = [
  { id: "lodging-guest-complaints", label: "Complaints" },
  { id: "lodging-guest-ratings", label: "Ratings" },
] as const;

/** Laundry + guest feedback nested tabs under Rooms. */
export const LODGING_SERVICE_NESTED_TAB_IDS = MANAGER_LODGING_NESTED_TAB_IDS;

export function isLodgingServiceNestedTab(id: string): boolean {
  return (LODGING_SERVICE_NESTED_TAB_IDS as readonly string[]).includes(id);
}

function NestedSidebarGroup({
  label,
  icon: Icon,
  items,
  activeSection,
  onSelect,
}: {
  label: string;
  icon: typeof Shirt;
  items: readonly { id: string; label: string }[];
  activeSection: string;
  onSelect: (sectionId: string) => void;
}) {
  const groupActive = items.some((i) => i.id === activeSection);

  return (
    <Collapsible defaultOpen={groupActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={label}
            size="lg"
            className="h-10 cursor-pointer text-[13px]"
            isActive={groupActive}
          >
            <Icon className="opacity-80" />
            <span className="truncate">{label}</span>
            <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map(({ id, label: itemLabel }) => (
              <SidebarMenuSubItem key={id}>
                <SidebarMenuSubButton asChild isActive={activeSection === id}>
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    className="w-full"
                  >
                    {itemLabel}
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

export function HotelLodgingServiceSidebarGroup({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (sectionId: string) => void;
}) {
  return (
    <>
      <NestedSidebarGroup
        label="Laundry"
        icon={Shirt}
        items={LAUNDRY_ITEMS}
        activeSection={activeSection}
        onSelect={onSelect}
      />
      <NestedSidebarGroup
        label="Guest feedback"
        icon={MessageSquareWarning}
        items={GUEST_FEEDBACK_ITEMS}
        activeSection={activeSection}
        onSelect={onSelect}
      />
    </>
  );
}
