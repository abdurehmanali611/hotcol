"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ListPanelFilterBar({
  title = "Filters",
  children,
  onClear,
  showClear,
  className,
}: {
  title?: string;
  children: ReactNode;
  onClear?: () => void;
  showClear?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-muted/20 px-4 py-3 space-y-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {showClear && onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs cursor-pointer"
            onClick={onClear}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function FilterChipGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Button
            key={opt.id}
            type="button"
            size="sm"
            variant={value === opt.id ? "default" : "outline"}
            className={cn(
              "h-8 rounded-full px-3.5 text-xs cursor-pointer transition-colors",
              value === opt.id
                ? "shadow-sm"
                : "border-border/70 bg-background/80 hover:bg-muted/50",
            )}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
