"use client";

import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useDepartmentLeaderSelectOptions } from "@/hooks/useDepartmentLeaderSelectOptions";

export function DepartmentLeaderSelect({
  label,
  description,
  value,
  onChange,
  allowedDepartments,
  required = true,
  disabled = false,
  id,
  compact = false,
  className,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (departmentCode: string) => void;
  allowedDepartments: readonly string[];
  required?: boolean;
  disabled?: boolean;
  id?: string;
  /** Matches inline form fields (item name, unit price row). */
  compact?: boolean;
  className?: string;
}) {
  const { options, loading } = useDepartmentLeaderSelectOptions(
    allowedDepartments,
  );

  useEffect(() => {
    if (!value && options.length === 1) {
      onChange(options[0]!.value);
    }
  }, [value, options, onChange]);

  const controlId = id ?? `dept-select-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className={className ?? (compact ? "space-y-1.5 min-w-0" : "space-y-2")}>
      <Label htmlFor={controlId} className={compact ? "text-sm" : undefined}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {description && !compact ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      <Select
        value={value || undefined}
        onValueChange={onChange}
        disabled={disabled || loading || options.length === 0}
      >
        <SelectTrigger id={controlId} className="h-10 w-full">
          <SelectValue
            placeholder={
              loading
                ? "Loading departments…"
                : options.length === 0
                  ? "No leaders registered — ask manager to add them"
                  : "Select department"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
