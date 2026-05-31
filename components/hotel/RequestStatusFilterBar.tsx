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
  voucherFrom = "",
  voucherTo = "",
  onVoucherFromChange,
  onVoucherToChange,
  dateFromLabel = "Submitted from",
  dateToLabel = "Submitted to",
  searchPlaceholder = "Search voucher or item name…",
  showClear,
  onClear,
  children,
  footer,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  voucherFrom?: string;
  voucherTo?: string;
  onVoucherFromChange?: (v: string) => void;
  onVoucherToChange?: (v: string) => void;
  dateFromLabel?: string;
  dateToLabel?: string;
  searchPlaceholder?: string;
  showClear: boolean;
  onClear: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const showVoucherRange = Boolean(onVoucherFromChange && onVoucherToChange);

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
          {showVoucherRange ? (
            <>
              <div className="space-y-1.5 min-w-[120px]">
                <span className="text-xs font-medium text-muted-foreground">
                  Voucher from
                </span>
                <Input
                  value={voucherFrom}
                  onChange={(e) => onVoucherFromChange!(e.target.value)}
                  placeholder="0045"
                  className="h-10 bg-background font-mono tabular-nums"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5 min-w-[120px]">
                <span className="text-xs font-medium text-muted-foreground">
                  Voucher to
                </span>
                <Input
                  value={voucherTo}
                  onChange={(e) => onVoucherToChange!(e.target.value)}
                  placeholder="0065"
                  className="h-10 bg-background font-mono tabular-nums"
                  inputMode="numeric"
                />
              </div>
            </>
          ) : null}
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
                className="pl-9 h-10 bg-background"
              />
            </div>
          </div>
        </div>
        {children}
        {footer}
      </div>
    </ListPanelFilterBar>
  );
}
