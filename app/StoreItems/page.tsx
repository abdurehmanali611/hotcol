"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { fetchItemRegistrations, ItemRegistration, type StockOutRequestRow } from "@/lib/actions";
import {
  effectiveTenantScopeForHotelTerminal,
  rowHotelMatchesTenantScope,
} from "@/lib/tenantRowMatch";
import { DataTableClientWrapper } from "./DataTableClientWrapper";
import type { DataTableRef } from "./data-table";
import { InventoryBatchMovementBar } from "@/components/hotel/InventoryBatchMovementBar";
import UpdateStock from "@/components/UpdateStock";
import { ActiveInventoryPaymentSummary } from "@/components/hotel/ActiveInventoryPaymentSummary";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, LayoutGrid } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

export default function StoreItems({
  items = [],
  hotelStockApprovals = false,
  tenantScope = null,
  embedded = false,
  readOnly = false,
  showPaymentSummary = false,
  onHotelStockRequestCreated,
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
  onHotelStockRequestCreated?: (row: StockOutRequestRow) => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemRegistration | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [data, setData] = useState<ItemRegistration[]>(
    Array.isArray(items) ? items : [],
  );
  const tableRef = useRef<DataTableRef>(null);
  const [batchSelected, setBatchSelected] = useState<ItemRegistration[]>([]);

  const scopeRows = useCallback(
    (rows: ItemRegistration[]) => {
      const eff = effectiveTenantScopeForHotelTerminal(tenantScope, {
        requireHotelTerminal: hotelStockApprovals,
      });
      if (!eff) return hotelStockApprovals ? [] : rows;
      return rows.filter((it) => rowHotelMatchesTenantScope(it.HotelName, eff));
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
    if (readOnly) return;
    setSelectedItem(item);
    setIsEditOpen(true);
  };

  const handleUpdateSuccess = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const filteredData = date !== undefined
    ? data.filter(
        (item) =>
          new Date(item.registrationDate).toDateString() === date.toDateString()
      )
    : data;

  const Root = embedded ? "div" : "main";
  const shellClass = embedded
    ? "w-full space-y-4 animate-in fade-in duration-300"
    : "container mx-auto py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500";

  const headerBlock = (
    <div
      className={
        embedded
          ? "flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-4"
          : "flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-6"
      }
    >
      {!embedded && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <LayoutGrid size={24} />
            <h1 className="text-3xl font-extrabold tracking-tight">Master Inventory</h1>
          </div>
          <p className="text-muted-foreground font-medium">
            Live stock tracking and supplier verification for Apex Solutions.
          </p>
        </div>
      )}

      <div
        className={`flex items-center gap-3 ${embedded ? "w-full sm:w-auto sm:ml-auto" : ""}`}
      >
        {!embedded && <div className="h-10 w-px bg-border mx-2 hidden md:block" />}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
            Filter by Arrival
          </span>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={
                  embedded
                    ? "w-full sm:w-56 justify-between border-dashed border-primary/25 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm"
                    : "w-56 justify-between border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm"
                }
              >
                <span className="flex items-center gap-2 font-semibold">
                  <CalendarIcon size={14} className="text-primary" />
                  {date ? date.toLocaleDateString() : "All Historical Data"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setOpen(false);
                }}
                initialFocus
                className="rounded-xl border bg-card"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );

  const tableShell = embedded
    ? "rounded-xl border border-border/60 bg-card/80 shadow-inner overflow-hidden"
    : "bg-card rounded-2xl border border-border/60 shadow-xl shadow-black/2 overflow-hidden";

  return (
    <Root className={shellClass}>
      {headerBlock}

      {showPaymentSummary && (
        <ActiveInventoryPaymentSummary items={filteredData} />
      )}

      <div className={tableShell}>
        {hotelStockApprovals && !readOnly && (
          <InventoryBatchMovementBar
            selected={batchSelected}
            tableRef={tableRef}
            refresh={refresh}
            onHotelStockRequestCreated={onHotelStockRequestCreated}
          />
        )}
        <DataTableClientWrapper
          ref={tableRef}
          data={filteredData}
          onEdit={handleEdit}
          refresh={refresh}
          hotelStockApprovals={hotelStockApprovals}
          readOnly={readOnly}
          onHotelStockRequestCreated={onHotelStockRequestCreated}
          enableRowSelection={hotelStockApprovals && !readOnly}
          onRowSelectionChange={
            hotelStockApprovals && !readOnly ? setBatchSelected : undefined
          }
        />
      </div>

      {!readOnly && (
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
