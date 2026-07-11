"use client";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  aggregateInventoryByItemName,
  isAggregatedInventoryRow,
} from "@/lib/inventoryAggregation";
import type { items } from "./columns";
import { fetchItemRegistrations, ItemRegistration, type StockOutRequestRow } from "@/lib/actions";
import { filterInventoryListRegistrations } from "@/lib/hotelApproval";
import {
  effectiveTenantScopeForHotelTerminal,
  rowHotelMatchesTenantScope,
} from "@/lib/tenantRowMatch";
import { DataTableClientWrapper } from "./DataTableClientWrapper";
import type { DataTableRef } from "./data-table";
import { InventoryBatchMovementBar } from "@/components/hotel/InventoryBatchMovementBar";
import { CafeInventoryBatchMovementBar } from "@/components/cafe/CafeInventoryBatchMovementBar";
import UpdateStock from "@/components/UpdateStock";
import { StoreInventoryOverview } from "@/components/store/StoreInventoryOverview";
import { ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import { InventoryListPrintActions } from "@/components/hotel/InventoryListPrintActions";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_INVENTORY_LIST_FILTERS,
  filterInventoryRegistrations,
  inventoryListFiltersActive,
  type InventoryListFilters,
} from "@/lib/inventoryListFilters";
import {
  mergeAccountabilityFilterOptions,
  REGISTRATION_RECEIVED_BY_CODES,
} from "@/lib/departments";
import { useDepartmentLeaderSelectOptions } from "@/hooks/useDepartmentLeaderSelectOptions";
import { Building2, LayoutGrid } from "lucide-react";

export default function StoreItems({
  items = [],
  hotelStockApprovals = false,
  tenantScope = null,
  embedded = false,
  readOnly = false,
  showPaymentSummary = false,
  /**
   * Merge rows with the same item name (sum qty, list suppliers). Defaults to
   * false so each registration stays its own row — separate registration dates,
   * expiry, and supplier batches must remain individually visible.
   */
  aggregateInventory = false,
  adminEditDelete = false,
  onHotelStockRequestCreated,
  onExternalRefresh,
  movementCount,
  pettyCashBalance,
}: {
  items?: ItemRegistration[];
  hotelStockApprovals?: boolean;
  /** When set, fetched rows are limited to this property (same as Store terminal). */
  tenantScope?: string | null;
  /** Nested under another page (e.g. cost control): compact chrome; parent loads initial rows. */
  embedded?: boolean;
  /** Hide row actions (e.g. finance read-only view). */
  readOnly?: boolean;
  /** Show paid vs on-credit counts above the table. */
  showPaymentSummary?: boolean;
  aggregateInventory?: boolean;
  /** Admin oversight: allow edit/delete of inventory lines regardless of terminal role. */
  adminEditDelete?: boolean;
  onHotelStockRequestCreated?: (row: StockOutRequestRow) => void;
  /** When embedded, delegate refresh to the parent to avoid duplicate fetches. */
  onExternalRefresh?: () => void | Promise<void>;
  movementCount?: number;
  pettyCashBalance?: number | null;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemRegistration | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filters, setFilters] = useState<InventoryListFilters>(
    DEFAULT_INVENTORY_LIST_FILTERS,
  );
  const [data, setData] = useState<ItemRegistration[]>(
    Array.isArray(items) ? items : [],
  );
  const tableRef = useRef<DataTableRef>(null);
  const [batchSelected, setBatchSelected] = useState<ItemRegistration[]>([]);
  const [userRole] = useState(
    () =>
      (typeof window !== "undefined" &&
        localStorage.getItem("user_role")) ||
      "",
  );
  const isStoreTerminalUser = userRole === "Store";
  const isManagerUser = userRole === "Manager";

  /** Stock out, wastage, return, and batch selection — hotel/café store terminal only. */
  const showStoreMovementActions = !readOnly && isStoreTerminalUser;
  /** Edit/delete master inventory lines — hotel manager only (not store staff). */
  const showManagerEditDelete =
    !readOnly && hotelStockApprovals && isManagerUser;
  /** Café store (non-hotel) keeps edit/delete on the store terminal. */
  const showStoreEditDelete =
    !readOnly && isStoreTerminalUser && !hotelStockApprovals;
  /** Admin dashboard oversight: edit/delete granted by the parent, not by role. */
  const showAdminEditDelete = !readOnly && adminEditDelete;
  const allowEditDelete =
    showManagerEditDelete || showStoreEditDelete || showAdminEditDelete;

  const scopeRows = useCallback(
    (rows: ItemRegistration[]) => {
      const eff = effectiveTenantScopeForHotelTerminal(tenantScope, {
        requireHotelTerminal: hotelStockApprovals,
      });
      let scoped = rows;
      if (!eff) {
        scoped = hotelStockApprovals ? [] : rows;
      } else {
        scoped = rows.filter((it) => rowHotelMatchesTenantScope(it.HotelName, eff));
      }
      if (hotelStockApprovals) {
        return filterInventoryListRegistrations(scoped);
      }
      return scoped;
    },
    [tenantScope, hotelStockApprovals],
  );

  const refresh = useCallback(async () => {
    try {
      const freshData = await fetchItemRegistrations();
      setData(scopeRows(freshData));
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  }, [scopeRows]);

  const refreshTable = useCallback(async () => {
    if (embedded && onExternalRefresh) {
      await onExternalRefresh();
      return;
    }
    await refresh();
  }, [embedded, onExternalRefresh, refresh]);

  useEffect(() => {
    // Embedded views get initial rows from the parent; skip remote fetch on first paint only.
    if (embedded && refreshTrigger === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch mutates local table state
    void refresh();
  }, [refresh, refreshTrigger, embedded]);

  // Keep local table in sync when parent passes new `items` (prop-driven refresh).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror props into editable list state
    setData(scopeRows(Array.isArray(items) ? items : []));
  }, [items, scopeRows]);

  const handleEdit = (item: ItemRegistration) => {
    if (readOnly || !allowEditDelete) return;
    setSelectedItem(item);
    setIsEditOpen(true);
  };

  const handleUpdateSuccess = useCallback(() => {
    if (embedded && onExternalRefresh) {
      void onExternalRefresh();
      return;
    }
    setRefreshTrigger((prev) => prev + 1);
  }, [embedded, onExternalRefresh]);

  const filteredData = useMemo(
    () => filterInventoryRegistrations(data, filters),
    [data, filters],
  );

  const { options: registryDeptOptions } = useDepartmentLeaderSelectOptions(
    REGISTRATION_RECEIVED_BY_CODES,
  );
  const departmentFilterOptions = useMemo(
    () =>
      mergeAccountabilityFilterOptions(
        registryDeptOptions,
        data
          .filter((r) => rowHotelMatchesTenantScope(r.HotelName, null))
          .map((r) => ({
            department: r.receivedByDepartment,
            leaderName: r.receivedByLeaderName,
          })),
      ),
    [registryDeptOptions, data],
  );

  const tableData = useMemo(() => {
    const rows = filteredData as items[];
    if (!aggregateInventory) return rows;
    return aggregateInventoryByItemName(rows);
  }, [filteredData, aggregateInventory]);

  const expandSelection = useCallback((selected: ItemRegistration[]) => {
    const expanded: ItemRegistration[] = [];
    for (const row of selected as items[]) {
      if (isAggregatedInventoryRow(row)) {
        expanded.push(...row.registrationLines);
      } else {
        expanded.push(row);
      }
    }
    return expanded;
  }, []);

  const Root = embedded ? "div" : "main";
  const shellClass = embedded
    ? "w-full min-w-0 space-y-4 animate-in fade-in duration-300"
    : "w-full max-w-[min(100vw-1.5rem,112rem)] mx-auto py-8 px-3 sm:px-4 md:px-8 space-y-8 animate-in fade-in duration-500";

  const showClearFilters = inventoryListFiltersActive(filters);
  const departmentSelectValue = filters.department || "all";

  const propertyName = useMemo(() => {
    if (typeof window === "undefined") return "Property";
    return localStorage.getItem("hotel_display_name")?.trim() || "Property";
  }, []);

  const logoUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("logo_url")?.trim() || "";
  }, []);

  const propertyTin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("tin_number")?.trim() || "";
  }, []);

  const headerBlock = (
    <div
      className={
        embedded
          ? "flex flex-col gap-4 border-b border-border/60 pb-4"
          : "flex flex-col gap-6 border-b pb-6"
      }
    >
      {!embedded && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <LayoutGrid size={24} />
            <h1 className="text-3xl font-extrabold tracking-tight">Master Inventory</h1>
          </div>
          <p className="text-muted-foreground font-medium">
            Live stock tracking and supplier verification for {propertyName}.
          </p>
        </div>
      )}

      <ListPanelFilterBar
        title="Filter inventory"
        className="w-full"
        showClear={showClearFilters}
        onClear={() => setFilters(DEFAULT_INVENTORY_LIST_FILTERS)}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 items-end">
          <HotelDayPicker
            label="Registered from"
            id="inventory-date-from"
            value={filters.dateFrom}
            onChange={(v) => setFilters((f) => ({ ...f, dateFrom: v }))}
            placeholder="Any date"
            compact
          />
          <HotelDayPicker
            label="Registered to"
            id="inventory-date-to"
            value={filters.dateTo}
            onChange={(v) => setFilters((f) => ({ ...f, dateTo: v }))}
            placeholder="Any date"
            compact
          />
          {hotelStockApprovals && (
            <div className="space-y-1.5 min-w-0 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="inventory-department">Received by</Label>
              <Select
                value={departmentSelectValue}
                onValueChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    department: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger
                  id="inventory-department"
                  className="h-10 w-full gap-2 border-border/80 bg-background shadow-sm"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent align="end" className="max-h-72">
                  <SelectItem value="all">All departments</SelectItem>
                  {departmentFilterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <InventoryListPrintActions
            rows={filteredData}
            filters={filters}
            filteredCount={filteredData.length}
            totalCount={data.length}
            propertyName={propertyName}
            propertyTin={propertyTin}
            logoUrl={logoUrl}
          />
          <Badge variant="secondary" className="font-normal tabular-nums">
            {filteredData.length} of {data.length}
          </Badge>
        </div>
      </ListPanelFilterBar>
    </div>
  );

  const tableShell = embedded
    ? "rounded-xl border border-border/60 bg-card/80 shadow-inner w-full min-w-0 overflow-x-auto"
    : "bg-card rounded-2xl border border-border/60 shadow-xl shadow-black/2 w-full min-w-0 overflow-x-auto";

  return (
    <Root className={shellClass}>
      {headerBlock}

      {showPaymentSummary && (
        <StoreInventoryOverview
          items={filteredData}
          movementCount={movementCount}
          pettyCashBalance={pettyCashBalance}
          showPaymentBreakdown
        />
      )}

      <div className={tableShell}>
        {hotelStockApprovals && showStoreMovementActions && (
          <InventoryBatchMovementBar
            selected={batchSelected}
            tableRef={tableRef}
            refresh={refreshTable}
            onHotelStockRequestCreated={onHotelStockRequestCreated}
          />
        )}
        {!hotelStockApprovals && showStoreMovementActions && (
          <CafeInventoryBatchMovementBar
            selected={batchSelected}
            tableRef={tableRef}
            refresh={refreshTable}
          />
        )}
        <DataTableClientWrapper
          ref={tableRef}
          data={tableData}
          onEdit={handleEdit}
          refresh={refreshTable}
          hotelStockApprovals={hotelStockApprovals}
          readOnly={readOnly}
          allowEditDelete={allowEditDelete}
          showStoreMovementActions={showStoreMovementActions}
          aggregateInventory={aggregateInventory}
          onHotelStockRequestCreated={onHotelStockRequestCreated}
          enableRowSelection={showStoreMovementActions}
          onRowSelectionChange={
            showStoreMovementActions
              ? (rows) => setBatchSelected(expandSelection(rows))
              : undefined
          }
        />
      </div>

      {allowEditDelete && (
        <UpdateStock
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          item={selectedItem}
          hotelInventory={hotelStockApprovals}
          onUpdateSuccess={handleUpdateSuccess}
        />
      )}
    </Root>
  );
}
