"use client";

import type { ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type ManagerSidebarNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

export function ManagerCollapsibleSidebarGroup({
  label,
  icon: Icon,
  items,
  activeSection,
  isGroupActive,
  onSelect,
  children,
  layout = "sub",
}: {
  label: string;
  icon: LucideIcon;
  items: ManagerSidebarNavItem[];
  activeSection: string;
  isGroupActive: boolean;
  onSelect: (id: string) => void;
  children?: ReactNode;
  /** `flat` keeps nested sidebar menus (e.g. payment categories). */
  layout?: "sub" | "flat";
}) {
  if (items.length === 0 && !children) return null;

  return (
    <Collapsible
      key={isGroupActive ? `${label}-active` : `${label}-idle`}
      defaultOpen={isGroupActive}
      className="group/collapsible px-2"
    >
      <SidebarMenu>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={label}
              size="lg"
              className="h-10 cursor-pointer text-[13px]"
              isActive={isGroupActive}
            >
              <Icon className="opacity-80" />
              <span className="truncate">{label}</span>
              <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {layout === "flat" ? (
              <SidebarMenu className="gap-1 pl-2">
                {items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeSection === item.id}
                      onClick={() => onSelect(item.id)}
                      tooltip={item.label}
                      size="lg"
                      className="h-10 cursor-pointer text-[13px] data-[active=true]:shadow-sm"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {children}
              </SidebarMenu>
            ) : (
              <SidebarMenuSub>
                {items.map((item) => (
                  <SidebarMenuSubItem key={item.id}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={activeSection === item.id}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className="w-full"
                      >
                        <span className="flex items-center gap-2">
                          {item.icon}
                          <span>{item.label}</span>
                        </span>
                      </button>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
                {children}
              </SidebarMenuSub>
            )}
          </CollapsibleContent>
        </SidebarMenuItem>
      </SidebarMenu>
    </Collapsible>
  );
}
