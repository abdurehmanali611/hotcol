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
import { encodeDepartmentLeaderValue } from "@/lib/departments";

export function DepartmentLeaderSelect({
  label,
  description,
  value,
  leaderName = "",
  onChange,
  allowedDepartments,
  /** When true (default), each registered leader is its own option for accountability. */
  expandLeaders = true,
  required = true,
  disabled = false,
  id,
  compact = false,
  className,
}: {
  label: string;
  description?: string;
  /** Department code (e.g. KITCHEN). */
  value: string;
  /** Selected accountable leader when expandLeaders is true. */
  leaderName?: string;
  onChange: (departmentCode: string, leaderName: string) => void;
  allowedDepartments: readonly string[];
  expandLeaders?: boolean;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  /** Matches inline form fields (item name, unit price row). */
  compact?: boolean;
  className?: string;
}) {
  const { options, loading } = useDepartmentLeaderSelectOptions(
    allowedDepartments,
    { perLeader: expandLeaders },
  );

  const selectValue = expandLeaders
    ? encodeDepartmentLeaderValue(value, leaderName) || undefined
    : value || undefined;

  useEffect(() => {
    if (value || options.length !== 1) return;
    const only = options[0]!;
    onChange(only.department, only.leaderName);
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
        value={selectValue}
        onValueChange={(raw) => {
          const opt = options.find((o) => o.value === raw);
          if (opt) {
            onChange(opt.department, opt.leaderName);
            return;
          }
          onChange(raw, "");
        }}
        disabled={disabled || loading || options.length === 0}
      >
        <SelectTrigger id={controlId} className="h-10 w-full">
          <SelectValue
            placeholder={
              loading
                ? "Loading departments…"
                : options.length === 0
                  ? "No leaders registered — ask manager to add them"
                  : expandLeaders
                    ? "Select department leader"
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
