"use client";

import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building } from "lucide-react";

export function HotelTerminalHeader({
  leading,
  logoUrl,
  displayName,
  pageTitle,
  badge,
  actions,
}: {
  leading?: ReactNode;
  logoUrl: string;
  displayName: string;
  pageTitle: string;
  badge: string;
  actions: ReactNode;
}) {
  return (
    <header className="app-chrome-header sticky top-0 z-30 border-b shadow-sm">
      <div className="w-full px-3 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center min-w-0">
          {leading && (
            <div className="-ml-1 mr-3 pr-3 flex items-center border-r border-border/60">
              {leading}
            </div>
          )}
          <div className="relative shrink-0">
            <Avatar className="h-14 w-14 border-2 border-primary/25 shadow-md ring-2 ring-primary/10">
              <AvatarImage
                src={logoUrl || ""}
                alt=""
                className="object-cover"
              />
              <AvatarFallback className="bg-muted">
                <Building className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background shadow-sm"
              aria-hidden
            />
          </div>
          <div className="min-w-0 ml-4 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {displayName}
              </p>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/20">
                {badge}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
              {pageTitle}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
          {actions}
        </div>
      </div>
    </header>
  );
}
