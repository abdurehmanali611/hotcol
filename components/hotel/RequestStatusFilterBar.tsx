"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { departmentLabel, formatDepartmentFilterLabel } from "@/lib/departments";
import { cn } from "@/lib/utils";
import { Building2, Hash } from "lucide-react";

const DEPARTMENT_SELECT_ALL = "all";

export type RequestStatusDepartmentOption = {
  value: string;
  label: string;
};

export function RequestStatusFilterBar({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  department = "",
  onDepartmentChange,
  departmentCodes = [],
  departmentOptions,
  voucherFrom = "",
  voucherTo = "",
  onVoucherFromChange,
  onVoucherToChange,
  dateFromLabel = "Submitted from",
  dateToLabel = "Submitted to",
  departmentLabelText = "Department",
  filteredCount,
  totalCount,
  helperText = "Filter by date, voucher range, and department.",
  title = "Filter records",
  showClear,
  onClear,
  children,
  printAction,
  className,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  department?: string;
  onDepartmentChange?: (v: string) => void;
  /** @deprecated Prefer departmentOptions for per-leader filters. */
  departmentCodes?: readonly string[];
  /** Prefer this: each leader is its own filter option when applicable. */
  departmentOptions?: readonly RequestStatusDepartmentOption[];
  voucherFrom?: string;
  voucherTo?: string;
  onVoucherFromChange?: (v: string) => void;
  onVoucherToChange?: (v: string) => void;
  dateFromLabel?: string;
  dateToLabel?: string;
  departmentLabelText?: string;
  filteredCount?: number;
  totalCount?: number;
  helperText?: string;
  title?: string;
  showClear: boolean;
  onClear: () => void;
  children?: ReactNode;
  printAction?: ReactNode;
  className?: string;
}) {
  const baseId = useId();
  const showVoucherRange = Boolean(onVoucherFromChange && onVoucherToChange);
  const showDepartment = Boolean(onDepartmentChange);
  const departmentSelectValue = department || DEPARTMENT_SELECT_ALL;
  const showCounts =
    typeof filteredCount === "number" && typeof totalCount === "number";
  const resolvedOptions: RequestStatusDepartmentOption[] =
    departmentOptions && departmentOptions.length > 0
      ? [...departmentOptions]
      : departmentCodes.map((code) => ({
          value: code,
          label: departmentLabel(code),
        }));

  return (
    <ListPanelFilterBar
      title={title}
      showClear={showClear}
      onClear={onClear}
      className={cn("shadow-sm", className)}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 items-end">
          <HotelDayPicker
            id={`${baseId}-date-from`}
            label={dateFromLabel}
            value={dateFrom}
            onChange={onDateFromChange}
            placeholder="Any date"
            compact
          />
          <HotelDayPicker
            id={`${baseId}-date-to`}
            label={dateToLabel}
            value={dateTo}
            onChange={onDateToChange}
            placeholder="Any date"
            compact
          />
          {showDepartment ? (
            <div className="space-y-1.5 min-w-0 sm:col-span-2 xl:col-span-1">
              <Label htmlFor={`${baseId}-department`}>{departmentLabelText}</Label>
              <Select
                value={departmentSelectValue}
                onValueChange={(value) =>
                  onDepartmentChange!(value === DEPARTMENT_SELECT_ALL ? "" : value)
                }
              >
                <SelectTrigger
                  id={`${baseId}-department`}
                  className="h-10 w-full gap-2 border-border/80 bg-background shadow-sm"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent align="end" className="max-h-72">
                  <SelectItem value={DEPARTMENT_SELECT_ALL}>
                    All departments
                  </SelectItem>
                  {resolvedOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        {showVoucherRange ? (
          <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-3">
            <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Hash className="h-3 w-3" aria-hidden />
              Voucher range
            </p>
            <div className="grid gap-3 sm:grid-cols-2 items-end">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor={`${baseId}-voucher-from`}>From voucher</Label>
                <Input
                  id={`${baseId}-voucher-from`}
                  value={voucherFrom}
                  onChange={(e) => onVoucherFromChange!(e.target.value)}
                  placeholder="e.g. 0045"
                  className="h-10 border-border/80 bg-background font-mono tabular-nums shadow-sm"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor={`${baseId}-voucher-to`}>To voucher</Label>
                <Input
                  id={`${baseId}-voucher-to`}
                  value={voucherTo}
                  onChange={(e) => onVoucherToChange!(e.target.value)}
                  placeholder="e.g. 0065"
                  className="h-10 border-border/80 bg-background font-mono tabular-nums shadow-sm"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>
        ) : null}

        {printAction ? (
          <div className="pt-1">{printAction}</div>
        ) : null}

        {children ? (
          <div className="border-t border-border/50 pt-3">{children}</div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground text-pretty min-w-0">
            {helperText}
          </p>
          {showCounts ? (
            <Badge variant="secondary" className="font-normal tabular-nums shrink-0">
              {filteredCount} of {totalCount}
            </Badge>
          ) : null}
        </div>
      </div>
    </ListPanelFilterBar>
  );
}

/** Kept for callers that format filter chips elsewhere. */
export { formatDepartmentFilterLabel };
