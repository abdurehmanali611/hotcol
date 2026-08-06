"use client";

import type * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { parseYmdToDate, toYmdLocal } from "@/lib/hotelDateYmd";

export function HotelMultiDayPicker({
  label,
  id,
  values,
  onChange,
  className,
  buttonClassName,
  placeholder = "Pick dates",
  disabled,
  disabledDays,
  popoverAlign = "start",
}: {
  label?: string;
  id?: string;
  values: string[];
  onChange: (ymds: string[]) => void;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  disabledDays?: React.ComponentProps<typeof Calendar>["disabled"];
  popoverAlign?: React.ComponentProps<typeof PopoverContent>["align"];
}) {
  const selected = values
    .map((ymd) => parseYmdToDate(ymd))
    .filter((d): d is Date => Boolean(d));

  const summary =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? format(selected[0]!, "MMM d, yyyy")
        : `${values.length} days selected`;

  return (
    <div className={cn(label && "space-y-1.5 min-w-0", className)}>
      {label ? (
        id ? (
          <Label htmlFor={id} className="text-sm">
            {label}
          </Label>
        ) : (
          <Label className="text-sm">{label}</Label>
        )
      ) : null}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-start border-border/80 px-3 text-left text-sm font-normal shadow-sm",
              buttonClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">{summary}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={popoverAlign}>
          <Calendar
            mode="multiple"
            selected={selected}
            captionLayout="dropdown"
            disabled={disabledDays}
            onSelect={(days) => {
              const next = (days || [])
                .map((d) => toYmdLocal(d))
                .sort();
              onChange(next);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
