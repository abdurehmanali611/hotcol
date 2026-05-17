"use client";

import {
  REQUEST_STATUS_NAV,
  type RequestStatusNavId,
} from "@/constants/hotelInventoryNav";
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
import { ChevronRight, ClipboardList } from "lucide-react";

export function isRequestStatusSection(
  section: string,
): section is RequestStatusNavId {
  return REQUEST_STATUS_NAV.some((n) => n.id === section);
}

export function HotelRequestStatusSidebarGroup({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (sectionId: RequestStatusNavId) => void;
}) {
  const open = isRequestStatusSection(activeSection);

  return (
    <Collapsible defaultOpen={open} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip="Request status"
            size="lg"
            className="h-10 cursor-pointer text-[13px]"
            isActive={open}
          >
            <ClipboardList className="opacity-80" />
            <span>Request status</span>
            <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {REQUEST_STATUS_NAV.map(({ id, label }) => (
              <SidebarMenuSubItem key={id}>
                <SidebarMenuSubButton
                  isActive={activeSection === id}
                  onClick={() => onSelect(id)}
                  className="cursor-pointer"
                >
                  {label}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
