"use client";

import { Printer, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CAFE_ORDER_MODE_DESCRIPTIONS,
  CAFE_ORDER_MODE_LABELS,
  type CafeOrderMode,
} from "@/lib/cafeOrderMode";

const OPTIONS: { value: CafeOrderMode; icon: typeof Printer }[] = [
  { value: "digital", icon: MonitorSmartphone },
  { value: "analog", icon: Printer },
];

export function SignupCafeOrderModeSelector({
  value,
  onChange,
}: {
  value: CafeOrderMode;
  onChange: (next: CafeOrderMode) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {CAFE_ORDER_MODE_LABELS[option.value]}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {CAFE_ORDER_MODE_DESCRIPTIONS[option.value]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
