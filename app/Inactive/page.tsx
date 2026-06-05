"use client";

import {
  fetchItemStatus,
  fetchStockOutRequests,
  type ItemStatus,
  type StockOutRequestRow,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { DataTableClientWrapper } from "./DataTableClientWrapper";
import { useState, useEffect, useMemo, useCallback } from "react";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import {
  filterInactiveItems,
  inactiveFiltersActive,
  type InactiveItemFilters,
} from "@/lib/inactiveItemFilters";
import {
  departmentLabel,
  REQUESTED_BY_DEPARTMENT_CODES,
} from "@/lib/departments";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { InactiveAuditPrintActions } from "@/components/hotel/InactiveAuditPrintSheet";

const DEFAULT_FILTERS: InactiveItemFilters = {
  dateFrom: "",
  dateTo: "",
  department: "",
};

const DEPARTMENT_SELECT_ALL = "all";

export default function Inactive({
  items = [],
  admin = false,
  hotelName = null,
  embedded = false,
  stockMovements,
  logoUrl: logoUrlProp,
  propertyTin: propertyTinProp,
}: {
  items?: ItemStatus[];
  admin?: boolean;
  hotelName?: string | null;
  embedded?: boolean;
  /** When omitted, stock movements are fetched for department filters on stocked-out rows. */
  stockMovements?: StockOutRequestRow[];
  logoUrl?: string | null;
  propertyTin?: string | null;
}) {
  const [refreshedData, setRefreshedData] = useState<ItemStatus[] | null>(null);
  const [fetchedStocks, setFetchedStocks] = useState<StockOutRequestRow[]>([]);
  const [filters, setFilters] = useState<InactiveItemFilters>(DEFAULT_FILTERS);

  const data = useMemo(
    () => refreshedData ?? items ?? [],
    [refreshedData, items],
  );
  const stocks = stockMovements ?? fetchedStocks;

  const displayName = useMemo(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hotel_display_name")?.trim();
      if (stored) return stored;
    }
    return hotelName || "";
  }, [hotelName]);

  const logoUrl = useMemo(() => {
    if (logoUrlProp != null && String(logoUrlProp).trim()) {
      return String(logoUrlProp).trim();
    }
    if (typeof window !== "undefined") {
      return localStorage.getItem("logo_url")?.trim() || "";
    }
    return "";
  }, [logoUrlProp]);

  const propertyTin = useMemo(() => {
    if (propertyTinProp != null && String(propertyTinProp).trim()) {
      return String(propertyTinProp).trim();
    }
    if (typeof window !== "undefined") {
      return localStorage.getItem("tin_number")?.trim() || "";
    }
    return "";
  }, [propertyTinProp]);

  useEffect(() => {
    if (stockMovements != null) return;
    let cancelled = false;
    void fetchStockOutRequests()
      .then((rows) => {
        if (cancelled) return;
        const scoped = rows.filter((r) =>
          rowHotelMatchesTenantScope(r.HotelName, hotelName ?? ""),
        );
        setFetchedStocks(scoped);
      })
      .catch(() => {
        if (!cancelled) setFetchedStocks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [hotelName, stockMovements]);

  const refreshData = useCallback(async () => {
    try {
      const [statusResponse, stockResponse] = await Promise.all([
        fetchItemStatus(),
        stockMovements == null
          ? fetchStockOutRequests()
          : Promise.resolve(fetchedStocks),
      ]);
      if (Array.isArray(statusResponse)) {
        const hotelItems = statusResponse.filter((item) =>
          rowHotelMatchesTenantScope(item.HotelName, hotelName ?? ""),
        );
        setRefreshedData(hotelItems);
      }
      if (stockMovements == null && Array.isArray(stockResponse)) {
        setFetchedStocks(
          stockResponse.filter((r) =>
            rowHotelMatchesTenantScope(r.HotelName, hotelName ?? ""),
          ),
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [hotelName, stockMovements, fetchedStocks]);

  const filteredData = useMemo(
    () => filterInactiveItems(data, stocks, filters),
    [data, stocks, filters],
  );

  const showClear = inactiveFiltersActive(filters);
  const departmentSelectValue = filters.department || DEPARTMENT_SELECT_ALL;

  return (
    <div
      className={`flex flex-col ${embedded ? "gap-4" : "gap-8"} animate-in fade-in duration-700`}
    >
      <div
        className={`flex flex-col gap-4 ${embedded ? "" : "md:flex-row md:items-start md:justify-between"}`}
      >
        {!embedded && (
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Historical Audit Logs
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tracking movement and payments for {displayName || hotelName}.
            </p>
          </div>
        )}

        <ListPanelFilterBar
          title="Filter records"
          className={embedded ? "w-full" : "w-full md:max-w-3xl"}
          showClear={showClear}
          onClear={() => setFilters(DEFAULT_FILTERS)}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 items-end">
            <HotelDayPicker
              label="From"
              id="inactive-date-from"
              value={filters.dateFrom}
              onChange={(v) => setFilters((f) => ({ ...f, dateFrom: v }))}
              placeholder="Any date"
              compact
            />
            <HotelDayPicker
              label="To"
              id="inactive-date-to"
              value={filters.dateTo}
              onChange={(v) => setFilters((f) => ({ ...f, dateTo: v }))}
              placeholder="Any date"
              compact
            />
            <div className="space-y-1.5 min-w-0 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="inactive-department">Department</Label>
              <Select
                value={departmentSelectValue}
                onValueChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    department:
                      value === DEPARTMENT_SELECT_ALL ? "" : value,
                  }))
                }
              >
                <SelectTrigger
                  id="inactive-department"
                  className="h-10 w-full gap-2 border-border/80 bg-background shadow-sm"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent align="end" className="max-h-72">
                  <SelectItem value={DEPARTMENT_SELECT_ALL}>
                    All departments
                  </SelectItem>
                  {REQUESTED_BY_DEPARTMENT_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {departmentLabel(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
            <p className="text-xs text-muted-foreground min-w-0">
              {filters.department
                ? "Department applies to stocked-out and movement lines"
                : "Filter by action date and requesting department"}
            </p>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge variant="secondary" className="font-normal tabular-nums">
                {filteredData.length} of {data.length}
              </Badge>
              <InactiveAuditPrintActions
                rows={filteredData}
                filters={filters}
                propertyName={displayName || hotelName || "Property"}
                propertyTin={propertyTin}
                logoUrl={logoUrl}
                title="Stock movement account report"
                totalCount={data.length}
              />
            </div>
          </div>
        </ListPanelFilterBar>
      </div>

      <div
        className={
          embedded
            ? "rounded-xl border border-border/60 bg-card/80 shadow-inner overflow-hidden"
            : "bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden"
        }
      >
        <DataTableClientWrapper
          data={filteredData}
          admin={admin}
          refresh={refreshData}
        />
      </div>
    </div>
  );
}
