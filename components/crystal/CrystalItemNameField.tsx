"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CrystalNameSelector } from "@/components/crystal/CrystalNameSelector";
import {
  composeCrystalItemName,
  crystalBaseLabel,
  parseCrystalItemName,
} from "@/lib/crystalItemName";

type CrystalItemNameFieldProps = {
  id?: string;
  value: string;
  onChange: (itemName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** registration | purchase | recipe | other — sent with Add-as-new proposals */
  source?: string;
};

/**
 * Crystal name selector + optional note on one row.
 * Saved as `Amharic|Romanized(note)|English` e.g. Fosoliya(staff).
 */
export function CrystalItemNameField({
  id,
  value,
  onChange,
  placeholder = "Search crystal name…",
  disabled = false,
  className,
  source = "registration",
}: CrystalItemNameFieldProps) {
  const parsed = useMemo(() => parseCrystalItemName(value), [value]);
  const baseValue = useMemo(() => crystalBaseLabel(value), [value]);
  const qualifier = parsed?.qualifier ?? "";

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={id}>Item name</Label>
        <CrystalNameSelector
          id={id}
          value={baseValue}
          onChange={(base) => onChange(composeCrystalItemName(base, qualifier))}
          placeholder={placeholder}
          disabled={disabled}
          className="h-10 w-full min-w-0"
          source={source}
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label
          htmlFor={id ? `${id}-note` : undefined}
          className="text-muted-foreground"
        >
          Note{" "}
          <span className="font-normal text-muted-foreground/80">(optional)</span>
        </Label>
        <Input
          id={id ? `${id}-note` : undefined}
          value={qualifier}
          disabled={disabled}
          placeholder="staff"
          className="h-10"
          onChange={(e) => {
            const nextQ = e.target.value.replace(/[()]/g, "");
            onChange(composeCrystalItemName(baseValue, nextQ));
          }}
          aria-label="Optional name note, e.g. staff"
        />
      </div>
    </div>
  );
}
