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

export function HotelDayPicker({
  label,
  id,
  value,
  onChange,
  className,
  buttonClassName,
  placeholder = "Pick a date",
  disabled,
  disabledDays,
  popoverAlign = "start",
  compact = false,
}: {
  label?: string;
  id?: string;
  value: string;
  onChange: (ymd: string) => void;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  disabledDays?: React.ComponentProps<typeof Calendar>["disabled"];
  popoverAlign?: React.ComponentProps<typeof PopoverContent>["align"];
  /** Shorter label + date text for dense inline form grids. */
  compact?: boolean;
}) {
  const selected = parseYmdToDate(value);
  const dateFormat = compact ? "MMM d, yyyy" : "PPP";

  return (
    <div className={cn(label && "space-y-1.5 min-w-0", className)}>
      {label ? (
        id ? (
          <Label htmlFor={id} className={compact ? "text-sm" : undefined}>
            {label}
          </Label>
        ) : (
          <Label className={compact ? "text-sm" : undefined}>{label}</Label>
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
              "h-10 w-full justify-start border-border/80 px-3 text-left font-normal shadow-sm",
              compact ? "min-w-0 truncate text-sm" : "min-w-42.5",
              buttonClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">
              {selected ? format(selected, dateFormat) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={popoverAlign}>
          <Calendar
            mode="single"
            selected={selected}
            captionLayout="dropdown"
            disabled={disabledDays}
            onSelect={(d) => {
              if (!d) return;
              onChange(toYmdLocal(d));
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
