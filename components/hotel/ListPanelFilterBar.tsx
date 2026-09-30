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
        "space-y-3 rounded-2xl border border-primary/12 bg-linear-to-br from-primary/4 via-muted/10 to-sky-500/3 px-4 py-3.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-800/60 dark:text-teal-300/65">
          {title}
        </span>
        {showClear && onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-teal-800/80 hover:bg-primary/8 dark:text-teal-200"
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
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-primary/12 bg-background/90 p-1">
        {options.map((opt) => (
          <Button
            key={opt.id}
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 rounded-lg px-3.5 text-xs font-medium transition-colors",
              value === opt.id
                ? "bg-primary/90 text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                : "text-muted-foreground hover:bg-primary/8 hover:text-foreground",
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
