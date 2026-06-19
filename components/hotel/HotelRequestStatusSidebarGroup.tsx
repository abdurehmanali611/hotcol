"use client";

import { useEffect, useState } from "react";
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
  const requestActive = isRequestStatusSection(activeSection);
  const [open, setOpen] = useState(requestActive);

  useEffect(() => {
    if (requestActive) setOpen(true);
  }, [requestActive]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip="Request status"
            size="lg"
            className="h-10 cursor-pointer text-[13px]"
            isActive={requestActive}
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
