"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import { Search } from "lucide-react";

export function RequestStatusFilterBar({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  searchQuery,
  onSearchQueryChange,
  dateFromLabel = "Submitted from",
  dateToLabel = "Submitted to",
  searchPlaceholder = "Search voucher or item name…",
  showClear,
  onClear,
  children,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  dateFromLabel?: string;
  dateToLabel?: string;
  searchPlaceholder?: string;
  showClear: boolean;
  onClear: () => void;
  children?: ReactNode;
}) {
  return (
    <ListPanelFilterBar showClear={showClear} onClear={onClear}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 items-end">
          <HotelDayPicker
            label={dateFromLabel}
            value={dateFrom}
            onChange={onDateFromChange}
            className="min-w-[200px]"
            placeholder="Any date"
          />
          <HotelDayPicker
            label={dateToLabel}
            value={dateTo}
            onChange={onDateToChange}
            className="min-w-[200px]"
            placeholder="Any date"
          />
          <div className="flex-1 min-w-[220px] max-w-md space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Voucher or item
            </span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 bg-background"
              />
            </div>
          </div>
        </div>
        {children}
      </div>
    </ListPanelFilterBar>
  );
}
