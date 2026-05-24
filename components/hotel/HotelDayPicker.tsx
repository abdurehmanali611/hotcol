"use client";

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
}: {
  label?: string;
  id?: string;
  value: string;
  onChange: (ymd: string) => void;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const selected = parseYmdToDate(value);

  return (
    <div className={cn(label && "space-y-1.5", className)}>
      {label ? (
        id ? (
          <Label htmlFor={id}>{label}</Label>
        ) : (
          <Label>{label}</Label>
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
              "h-10 w-full min-w-[170px] justify-start border-border/80 px-3 text-left font-normal shadow-sm",
              buttonClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            {selected ? format(selected, "PPP") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
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
