"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createKitchenBarBeginningApi,
  updateKitchenBarBeginningApi,
  notifyApiFailure,
  type KitchenBarBeginningRow,
  type StockOutRequestRow,
} from "@/lib/actions";
import {
  findPreviousDailyCountRow,
  findYesterdayDailyCountRow,
  HOTEL_DAILY_COUNT_STATIONS,
  normalizeKitchenBarStationKey,
  previousDayOnHandAmount,
  resolveDailyCountSalesQty,
  summarizeApprovedStockOutForDay,
} from "@/lib/hotelDailyStation";
import { inventoryUnitSelectValues } from "@/lib/inventoryUnits";
import {
  DailyCountFormulaStrip,
  DailyCountMetricTile,
  DailyCountStationPicker,
} from "@/components/hotel/DailyCountStationUi";
import {
  HotelFormFieldStack,
  HotelFormSection,
} from "@/components/hotel/HotelTerminalInitFormLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function newLineKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type DailyCountStoreItemOption = {
  name: string;
  measuredBy: string;
};

export type DailyCountLine = {
  key: string;
  itemName: string;
  amount: number;
  salesDay: number;
  managementTakenDay: number;
  invitationTakenDay: number;
  measuredBy: string;
};

function emptyLine(measuredBy = "Piece"): DailyCountLine {
  return {
    key: newLineKey(),
    itemName: "",
    amount: 0,
    salesDay: 0,
    managementTakenDay: 0,
    invitationTakenDay: 0,
    measuredBy,
  };
}

function stationFromRow(station: string): string {
  const key = normalizeKitchenBarStationKey(station);
  return HOTEL_DAILY_COUNT_STATIONS.some((s) => s.value === key)
    ? key
    : "KITCHEN";
}

function linePreview(
  line: DailyCountLine,
  station: string,
  calendarDate: string,
  stocks: StockOutRequestRow[],
) {
  const item = line.itemName.trim();
  const stockOut =
    item === ""
      ? 0
      : round2(
          summarizeApprovedStockOutForDay(
            stocks,
            normalizeKitchenBarStationKey(station),
            item,
            calendarDate,
          ),
        );
  const opening = round2(Number(line.amount) || 0);
  const total = round2(opening + stockOut);
  const sales = round2(Number(line.salesDay) || 0);
  const management = round2(Number(line.managementTakenDay) || 0);
  const invitation = round2(Number(line.invitationTakenDay) || 0);
  const onHandPreview = round2(total - sales - management - invitation);
  return { stockOut, total, sales, management, invitation, onHandPreview };
}

function DailyCountItemNameField({
  id,
  value,
  options,
  onPick,
}: {
  id: string;
  value: string;
  options: { name: string; source: "store" | "previous" }[];
  onPick: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return options.slice(0, 100);
    return options
      .filter((opt) => opt.name.toLowerCase().includes(query))
      .slice(0, 100);
  }, [options, query]);

  const exactMatch = options.some(
    (opt) => opt.name.toLowerCase() === query && query.length > 0,
  );
  const canAddNew = Boolean(search.trim()) && !exactMatch;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSearch(value);
        else setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between border-border/80 bg-background px-3 font-normal shadow-sm"
        >
          <span
            className={cn(
              "min-w-0 truncate text-left",
              value.trim() ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {value.trim() || "Select or add item…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type a new item…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!filtered.length && !canAddNew ? (
              <CommandEmpty>No items yet — type a name to add one.</CommandEmpty>
            ) : null}
            {canAddNew ? (
              <CommandGroup heading="Add new">
                <CommandItem
                  value={`add-new-${search.trim()}`}
                  onSelect={() => {
                    onPick(search.trim());
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">
                    Add “{search.trim()}”
                  </span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            {filtered.length ? (
              <CommandGroup heading="Items">
                {filtered.map((opt) => (
                  <CommandItem
                    key={`${opt.source}-${opt.name}`}
                    value={`${opt.source}-${opt.name}`}
                    onSelect={() => {
                      onPick(opt.name);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value.trim().toLowerCase() === opt.name.toLowerCase()
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{opt.name}</span>
                    <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {opt.source === "store" ? "Store" : "Prior"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function DailyCountBatchForm({
  calendarDate,
  stocks,
  storeItems = [],
  existingRows = [],
  editingRow,
  onClearEdit,
  onSaved,
  variant = "card",
}: {
  calendarDate: string;
  stocks: StockOutRequestRow[];
  storeItems?: DailyCountStoreItemOption[];
  existingRows?: KitchenBarBeginningRow[];
  editingRow: KitchenBarBeginningRow | null;
  onClearEdit: () => void;
  onSaved: () => void | Promise<void>;
  /** `plain` for embedding inside a Dialog (no card chrome). */
  variant?: "card" | "plain";
}) {
  const day = String(calendarDate || "").slice(0, 10);
  const [station, setStation] = useState("KITCHEN");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DailyCountLine[]>([emptyLine()]);
  const [savePending, setSavePending] = useState(false);

  const editingId = editingRow?.id ?? null;

  const itemOptions = useMemo(() => {
    const seen = new Map<string, { name: string; source: "store" | "previous" }>();
    for (const row of existingRows) {
      const name = String(row.itemName || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, { name, source: "previous" });
    }
    for (const item of storeItems) {
      const name = String(item.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      // Prefer store label when both exist.
      seen.set(key, { name, source: "store" });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [existingRows, storeItems]);

  const measuredByForItem = useCallback(
    (itemName: string): string | null => {
      const key = itemName.trim().toLowerCase();
      if (!key) return null;
      const store = storeItems.find(
        (item) => item.name.trim().toLowerCase() === key,
      );
      if (store?.measuredBy) return store.measuredBy;
      const prior = existingRows.find(
        (row) => row.itemName.trim().toLowerCase() === key,
      );
      return prior?.measuredBy || null;
    },
    [storeItems, existingRows],
  );

  const applyItemDefaults = useCallback(
    (
      lineKey: string,
      itemName: string,
      opts?: { forceBeginning?: boolean },
    ) => {
      // Only carry forward when the same station+item (case-insensitive) was
      // counted yesterday — older gaps do not auto-fill Beginning.
      const yesterdayRow = findYesterdayDailyCountRow(
        existingRows,
        station,
        itemName,
        day,
      );
      const yesterdayOnHand = previousDayOnHandAmount(yesterdayRow);
      const unit = measuredByForItem(itemName);
      setLines((prevLines) =>
        prevLines.map((line) => {
          if (line.key !== lineKey) return line;
          const shouldSetBeginning =
            yesterdayOnHand != null &&
            (opts?.forceBeginning ||
              !Number.isFinite(Number(line.amount)) ||
              Number(line.amount) === 0);
          return {
            ...line,
            itemName,
            amount: shouldSetBeginning ? yesterdayOnHand! : line.amount,
            measuredBy: unit || line.measuredBy,
          };
        }),
      );
    },
    [existingRows, station, day, measuredByForItem],
  );

  useEffect(() => {
    if (!editingRow) return;
    const prev = findPreviousDailyCountRow(
      existingRows,
      editingRow.station,
      editingRow.itemName,
      editingRow.calendarDate,
    );
    const derivedSales = resolveDailyCountSalesQty(editingRow, prev);
    setStation(stationFromRow(editingRow.station));
    setNotes(editingRow.notes || "");
    setLines([
      {
        key: newLineKey(),
        itemName: editingRow.itemName,
        amount: Number(editingRow.amount) || 0,
        salesDay:
          editingRow.salesDay != null
            ? Number(editingRow.salesDay) || 0
            : derivedSales ?? 0,
        managementTakenDay: Number(editingRow.managementTakenDay ?? 0),
        invitationTakenDay: Number(editingRow.invitationTakenDay ?? 0),
        measuredBy: editingRow.measuredBy || "Piece",
      },
    ]);
  }, [editingRow, existingRows]);

  // When date/station changes on create, refresh beginning from yesterday on hand.
  useEffect(() => {
    if (editingId != null) return;
    setLines((prevLines) =>
      prevLines.map((line) => {
        const item = line.itemName.trim();
        if (!item) return line;
        const yesterdayRow = findYesterdayDailyCountRow(
          existingRows,
          station,
          item,
          day,
        );
        const yesterdayOnHand = previousDayOnHandAmount(yesterdayRow);
        if (yesterdayOnHand == null) return line;
        return { ...line, amount: yesterdayOnHand };
      }),
    );
  }, [day, station, existingRows, editingId]);

  const validLines = useMemo(
    () => lines.filter((l) => l.itemName.trim().length >= 1),
    [lines],
  );

  const batchPreview = useMemo(() => {
    let stockOut = 0;
    let total = 0;
    let sales = 0;
    let management = 0;
    let invitation = 0;
    let onHandPreview = 0;
    for (const line of validLines) {
      const p = linePreview(line, station, day, stocks);
      stockOut += p.stockOut;
      total += p.total;
      sales += p.sales;
      management += p.management;
      invitation += p.invitation;
      onHandPreview += p.onHandPreview;
    }
    return {
      stockOut: round2(stockOut),
      total: round2(total),
      sales: round2(sales),
      management: round2(management),
      invitation: round2(invitation),
      onHandPreview: round2(onHandPreview),
      lineCount: validLines.length,
    };
  }, [validLines, station, day, stocks]);

  const updateLine = useCallback(
    (key: string, patch: Partial<DailyCountLine>) => {
      setLines((prev) =>
        prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
      );
    },
    [],
  );

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((l) => l.key !== key),
    );
  }, []);

  const resetCreateForm = useCallback(() => {
    setStation("KITCHEN");
    setNotes("");
    setLines([emptyLine()]);
  }, []);

  const handleCancelEdit = useCallback(() => {
    onClearEdit();
    resetCreateForm();
  }, [onClearEdit, resetCreateForm]);

  const handleSave = useCallback(async () => {
    if (!day) {
      toast.error("Pick a calendar day in the grid below");
      return;
    }
    if (validLines.length === 0) {
      toast.error("Add at least one line with an item name");
      return;
    }

    setSavePending(true);
    try {
      const shared = {
        station,
        calendarDate: day,
        monthPeriod: day.slice(0, 7),
        notes: notes.trim(),
      };

      if (editingId != null) {
        const line = validLines[0];
        await updateKitchenBarBeginningApi(
          {
            id: editingId,
            ...shared,
            itemName: line.itemName.trim(),
            amount: round2(Number(line.amount) || 0),
            measuredBy: line.measuredBy,
            managementTakenDay: round2(Number(line.managementTakenDay) || 0),
            invitationTakenDay: round2(Number(line.invitationTakenDay) || 0),
            salesDay: round2(Number(line.salesDay) || 0),
          },
          { quiet: true },
        );
        toast.success("Updated");
        onClearEdit();
        resetCreateForm();
        await onSaved();
        return;
      }

      let ok = 0;
      let failed = 0;
      const seen = new Set<string>();
      for (const line of validLines) {
        const item = line.itemName.trim();
        const dupKey = `${normalizeKitchenBarStationKey(station)}\t${item.toLowerCase()}`;
        if (seen.has(dupKey)) {
          failed += 1;
          toast.error(`Duplicate item in this batch: ${item}`);
          continue;
        }
        seen.add(dupKey);
        try {
          await createKitchenBarBeginningApi(
            {
              ...shared,
              itemName: item,
              amount: round2(Number(line.amount) || 0),
              measuredBy: line.measuredBy,
              managementTakenDay: round2(Number(line.managementTakenDay) || 0),
              invitationTakenDay: round2(Number(line.invitationTakenDay) || 0),
              salesDay: round2(Number(line.salesDay) || 0),
            },
            { quiet: true },
          );
          ok += 1;
        } catch (e: unknown) {
          failed += 1;
          notifyApiFailure(e, `Could not save “${item}”`);
        }
      }

      if (ok > 0) {
        toast.success(
          `Saved ${ok} daily count${ok === 1 ? "" : "s"}${
            failed ? ` (${failed} failed)` : ""
          }`,
        );
        resetCreateForm();
        await onSaved();
      }
    } catch (e: unknown) {
      notifyApiFailure(e, "Could not save daily rows");
    } finally {
      setSavePending(false);
    }
  }, [
    day,
    validLines,
    station,
    notes,
    editingId,
    onClearEdit,
    resetCreateForm,
    onSaved,
  ]);

  const formBody = (
    <div className={variant === "plain" ? "space-y-6" : "space-y-6 pt-1 pb-8 px-5 sm:px-6"}>
        <DailyCountFormulaStrip />

        <HotelFormSection
          title="Station"
          description="Applies to every line below. Date comes from the day picker on the grid."
        >
          <DailyCountStationPicker value={station} onChange={setStation} />
          <p className="text-xs text-muted-foreground pt-1">
            Calendar day:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {day || "—"}
            </span>
          </p>
        </HotelFormSection>

        <HotelFormSection
          title={editingId != null ? "Item & counts" : "Item lines"}
          description={
            editingId != null
              ? "Edit beginning, sales, management, and invitation for this item."
              : "One card per item. Add as many lines as you need for this station and day."
          }
        >
          <div className="space-y-4">
            {lines.map((line, index) => {
              const preview = linePreview(line, station, day, stocks);
              const unitOptions = inventoryUnitSelectValues(line.measuredBy);
              const yesterdayOnHand = previousDayOnHandAmount(
                findYesterdayDailyCountRow(
                  existingRows,
                  station,
                  line.itemName,
                  day,
                ),
              );
              return (
                <div
                  key={line.key}
                  className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Line {index + 1}
                    </p>
                    {editingId == null ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-destructive hover:text-destructive"
                        disabled={lines.length <= 1}
                        onClick={() => removeLine(line.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    ) : null}
                  </div>

                  <HotelFormFieldStack>
                    <Label htmlFor={`kb-item-${line.key}`}>Item</Label>
                    <DailyCountItemNameField
                      id={`kb-item-${line.key}`}
                      value={line.itemName}
                      options={itemOptions}
                      onPick={(name) =>
                        applyItemDefaults(line.key, name, {
                          forceBeginning: true,
                        })
                      }
                    />
                    {yesterdayOnHand != null ? (
                      <p className="text-xs text-muted-foreground">
                        Yesterday on hand:{" "}
                        <span className="tabular-nums font-medium text-foreground">
                          {yesterdayOnHand.toFixed(2)}
                        </span>
                      </p>
                    ) : null}
                  </HotelFormFieldStack>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <HotelFormFieldStack>
                      <Label htmlFor={`kb-bb-${line.key}`}>Beginning (BB)</Label>
                      <Input
                        id={`kb-bb-${line.key}`}
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.amount}
                        onChange={(e) =>
                          updateLine(line.key, {
                            amount: Number.isFinite(Number(e.target.value))
                              ? Number(e.target.value)
                              : 0,
                          })
                        }
                        onBlur={() =>
                          updateLine(line.key, {
                            amount: round2(Number(line.amount) || 0),
                          })
                        }
                        className="h-10 tabular-nums border-border/80 shadow-sm"
                      />
                    </HotelFormFieldStack>
                    <HotelFormFieldStack>
                      <Label htmlFor={`kb-sales-${line.key}`}>Sales</Label>
                      <Input
                        id={`kb-sales-${line.key}`}
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.salesDay}
                        onChange={(e) =>
                          updateLine(line.key, {
                            salesDay: Number.isFinite(Number(e.target.value))
                              ? Number(e.target.value)
                              : 0,
                          })
                        }
                        onBlur={() =>
                          updateLine(line.key, {
                            salesDay: round2(Number(line.salesDay) || 0),
                          })
                        }
                        className="h-10 tabular-nums border-sky-500/30 bg-sky-500/5 shadow-sm"
                      />
                    </HotelFormFieldStack>
                    <HotelFormFieldStack>
                      <Label htmlFor={`kb-mgmt-${line.key}`}>Management</Label>
                      <Input
                        id={`kb-mgmt-${line.key}`}
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.managementTakenDay}
                        onChange={(e) =>
                          updateLine(line.key, {
                            managementTakenDay: Number.isFinite(
                              Number(e.target.value),
                            )
                              ? Number(e.target.value)
                              : 0,
                          })
                        }
                        className="h-10 tabular-nums border-violet-500/30 bg-violet-500/5 shadow-sm"
                      />
                    </HotelFormFieldStack>
                    <HotelFormFieldStack>
                      <Label htmlFor={`kb-inv-${line.key}`}>Invitation</Label>
                      <Input
                        id={`kb-inv-${line.key}`}
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.invitationTakenDay}
                        onChange={(e) =>
                          updateLine(line.key, {
                            invitationTakenDay: Number.isFinite(
                              Number(e.target.value),
                            )
                              ? Number(e.target.value)
                              : 0,
                          })
                        }
                        className="h-10 tabular-nums border-rose-500/30 bg-rose-500/5 shadow-sm"
                      />
                    </HotelFormFieldStack>
                    <HotelFormFieldStack>
                      <Label>Unit</Label>
                      <Select
                        value={line.measuredBy}
                        onValueChange={(v) =>
                          updateLine(line.key, { measuredBy: v })
                        }
                      >
                        <SelectTrigger className="h-10 w-full border-border/80 shadow-sm">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitOptions.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HotelFormFieldStack>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <DailyCountMetricTile
                      label="Store"
                      value={preview.stockOut.toFixed(2)}
                      hint="Approved stock-outs"
                    />
                    <DailyCountMetricTile
                      label="Total"
                      value={preview.total.toFixed(2)}
                      hint="Beginning + Store"
                      tone="primary"
                    />
                    <DailyCountMetricTile
                      label="On Hand preview"
                      value={preview.onHandPreview.toFixed(2)}
                      hint="Total − Sales − Issues"
                      tone="onhand"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {editingId == null ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-2 font-medium"
              onClick={addLine}
            >
              <Plus className="h-4 w-4" />
              Add line
            </Button>
          ) : null}
        </HotelFormSection>

        {editingId == null && validLines.length > 1 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DailyCountMetricTile
              label="Batch Store"
              value={batchPreview.stockOut.toFixed(2)}
              hint={`${batchPreview.lineCount} lines`}
            />
            <DailyCountMetricTile
              label="Batch Total"
              value={batchPreview.total.toFixed(2)}
              hint="All beginnings + store"
              tone="primary"
            />
            <DailyCountMetricTile
              label="Batch Sales"
              value={batchPreview.sales.toFixed(2)}
              hint="Entered sales"
              tone="management"
            />
            <DailyCountMetricTile
              label="Batch On Hand"
              value={batchPreview.onHandPreview.toFixed(2)}
              hint="After sales & issues"
              tone="onhand"
            />
          </div>
        ) : null}

        <HotelFormSection
          title="Notes"
          description="Optional — applies to every line in this save."
        >
          <HotelFormFieldStack>
            <Label htmlFor="kb-notes">Notes</Label>
            <Textarea
              id="kb-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional detail"
              className="min-h-22 resize-y border-border/80 shadow-sm"
            />
          </HotelFormFieldStack>
        </HotelFormSection>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
          <PendingButton
            type="button"
            className="shadow-sm"
            pending={savePending}
            onClick={() => void handleSave()}
          >
            {editingId != null
              ? "Save changes"
              : validLines.length > 1
                ? `Add ${validLines.length} daily rows`
                : "Add daily row"}
          </PendingButton>
          {editingId != null ? (
            <Button type="button" variant="ghost" onClick={handleCancelEdit}>
              Cancel
            </Button>
          ) : null}
        </div>
    </div>
  );

  if (variant === "plain") {
    return formBody;
  }

  return (
    <Card className="border-border/80 shadow-md bg-card/95 overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
      <div className="h-1 bg-linear-to-r from-amber-500/50 via-sky-500/40 to-emerald-500/50" />
      <CardHeader>
        <CardTitle className="text-lg">Register a day</CardTitle>
        <CardDescription>
          Shared station and date for the whole batch. Open the item selector to
          search store or prior names, or type a new name to add it. If that item
          was counted yesterday (any casing), Beginning fills with yesterday’s on
          hand.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">{formBody}</CardContent>
    </Card>
  );
}
