"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function RequestTypeCollapsibleSection({
  title,
  count,
  accentClassName = "bg-primary",
  accentBarClassName = "from-primary/50 via-violet-500/30 to-transparent",
  defaultOpen = false,
  summary,
  children,
}: {
  title: string;
  count: number;
  accentClassName?: string;
  accentBarClassName?: string;
  defaultOpen?: boolean;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/request-type"
    >
      <div
        className={cn(
          "rounded-xl border border-border/70 bg-card/95 overflow-hidden",
          "ring-1 ring-black/3 dark:ring-white/6 shadow-md",
          "hover:shadow-lg transition-shadow",
        )}
      >
        <div
          className={cn("h-1 bg-linear-to-r", accentBarClassName)}
          aria-hidden
        />
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full text-left px-4 py-4 sm:px-5 flex flex-wrap items-center gap-3",
              "hover:bg-muted/25 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                "group-data-[state=open]/request-type:rotate-180",
              )}
            />
            <div className={cn("h-9 w-1 rounded-full shrink-0", accentClassName)} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              {summary ? (
                <p className="text-xs text-muted-foreground line-clamp-2 text-pretty">
                  {summary}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic group-data-[state=open]/request-type:hidden">
                  Collapsed — expand to review all requests in this category
                </p>
              )}
            </div>
            <Badge variant="secondary" className="font-normal tabular-nums shrink-0">
              {count} line{count !== 1 ? "s" : ""}
            </Badge>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {open ? (
            <div className="px-4 pb-5 sm:px-5 pt-1 space-y-4 border-t border-border/50 bg-muted/5">
              {children}
            </div>
          ) : null}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
