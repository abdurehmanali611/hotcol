"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BUSINESS_TYPES, type BusinessType } from "@/constants";
import {
  BUSINESS_TYPE_SIGNUP_DESCRIPTIONS,
  isBusinessTypeComingSoon,
} from "@/lib/subscriptionModules";
import { cn } from "@/lib/utils";

export function SignupBusinessTypeSelector({
  value,
  onChange,
}: {
  value: BusinessType;
  onChange: (next: BusinessType) => void;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => {
        if (isBusinessTypeComingSoon(next as BusinessType)) return;
        onChange(next as BusinessType);
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      {BUSINESS_TYPES.map((type) => {
        const comingSoon = isBusinessTypeComingSoon(type);
        const selected = value === type;

        return (
          <div
            key={type}
            className={cn(
              "relative flex gap-3 rounded-xl border p-4 transition-colors",
              comingSoon && "cursor-not-allowed opacity-75",
              selected && !comingSoon
                ? "border-primary/40 bg-primary/5 shadow-sm"
                : "border-border/80 bg-card/80",
            )}
          >
            <RadioGroupItem
              value={type}
              id={`signup-bt-${type}`}
              disabled={comingSoon}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Label
                  htmlFor={`signup-bt-${type}`}
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    !comingSoon && "cursor-pointer",
                    comingSoon && "text-muted-foreground",
                  )}
                >
                  {type}
                </Label>
                {comingSoon ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-wide"
                  >
                    Coming soon
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                {BUSINESS_TYPE_SIGNUP_DESCRIPTIONS[type]}
              </p>
            </div>
          </div>
        );
      })}
    </RadioGroup>
  );
}
