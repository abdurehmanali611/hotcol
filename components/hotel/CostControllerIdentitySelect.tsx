"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CostControllerProfileRow } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function CostControllerIdentitySelect({
  profiles,
  value,
  onValueChange,
  label = "Cost controller identity",
  placeholder = "Select your name",
  compact = false,
  className,
  id,
}: {
  profiles: CostControllerProfileRow[];
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-1.5",
        compact ? "min-w-[180px] flex-1 sm:max-w-[220px]" : "flex-1 min-w-[220px]",
        className,
      )}
    >
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          className={cn("bg-background w-full", !compact && "max-w-md")}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
