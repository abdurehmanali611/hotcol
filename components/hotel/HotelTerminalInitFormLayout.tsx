"use client";

import { cn } from "@/lib/utils";

type SectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Shared layout for **hotel purchase-request initialization** (`PurchaseRequestsTab`)
 * and **chef/bar beginning registration** (Cost control → beginnings tab) only.
 * Store register, approvals, and other screens use their own markup.
 */
export function HotelFormSection({
  title,
  description,
  children,
  className,
}: SectionProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-muted/25 dark:bg-muted/10 p-4 sm:p-5 space-y-4 shadow-[inset_0_1px_0_0_hsl(var(--border)/0.35)]",
        className,
      )}
    >
      <div className="space-y-1 pb-3 border-b border-border/60">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function HotelFormFieldStack({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}
