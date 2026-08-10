"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PendingButton } from "@/components/ui/pending-button";
import {
  createStockOutRequestsBatchApi,
  type ItemRegistration,
  type StockOutRequestRow,
} from "@/lib/actions";
import { DepartmentLeaderSelect } from "@/components/hotel/DepartmentLeaderSelect";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import {
  REQUESTED_BY_DEPARTMENT_CODES,
  STOCK_OUT_STATION_OPTIONS,
} from "@/lib/departments";
import { toYmdLocal, ymdToRegistrationTimestamp } from "@/lib/hotelDateYmd";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildOptimisticStockOutRequestRow } from "@/lib/hotelOptimisticStock";
import type { DataTableRef } from "@/app/StoreItems/data-table";

type MovementKind = "STOCK_OUT" | "WASTAGE" | "RETURN_SUPPLIER";

type LineDraft = {
  registrationId: number;
  itemName: string;
  onHand: number;
  measuredBy: string;
  movement: MovementKind;
  amount: string;
  /** Stock-out: KITCHEN | BAR | ROOM */
  stakeholder: string;
  /** Stock-out: optional free-text override (legacy) */
  customStation: string;
  /** Wastage / return */
  reason: string;
};

function stockOutDestination(line: LineDraft): string {
  const custom = line.customStation.trim();
  if (custom) return custom;
  const code = line.stakeholder.trim().toUpperCase();
  if (code === "KITCHEN") return "Kitchen";
  if (code === "BAR") return "Bar";
  if (code === "ROOM") return "Room";
  return "";
}

function defaultAmountForRow(row: ItemRegistration): string {
  const onHand = Math.max(0, Number(row.amount) || 0);
  const def = Math.min(1, onHand);
  return def > 0 ? String(def) : "0";
}

function rowsToDrafts(selected: ItemRegistration[]): LineDraft[] {
  const seen = new Set<number>();
  const drafts: LineDraft[] = [];
  for (const row of selected) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    drafts.push({
      registrationId: row.id,
      itemName: row.name,
      onHand: Number(row.amount) || 0,
      measuredBy: row.measuredBy || "Piece",
      movement: "STOCK_OUT",
      amount: defaultAmountForRow(row),
      stakeholder: "",
      customStation: "",
      reason: "",
    });
  }
  return drafts;
}

export function InventoryBatchMovementBar({
  selected,
  tableRef,
  refresh,
  onHotelStockRequestCreated,
}: {
  selected: ItemRegistration[];
  tableRef: React.RefObject<DataTableRef | null>;
  refresh?: () => void;
  onHotelStockRequestCreated?: (row: StockOutRequestRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [requestedByDepartment, setRequestedByDepartment] = useState("");
  const [requestedByLeaderName, setRequestedByLeaderName] = useState("");
  const [defaultStockOutStation, setDefaultStockOutStation] = useState("");
  const [movementDateYmd, setMovementDateYmd] = useState(() =>
    toYmdLocal(new Date()),
  );
  const { isPending, run } = useConcurrentActions();
  const batchKey = "inventory-batch-movements";

  const updateLine = useCallback((id: number, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((l) => (l.registrationId === id ? { ...l, ...patch } : l)),
    );
  }, []);

  const applyDefaultStationToAll = useCallback((stationCode: string) => {
    setDefaultStockOutStation(stationCode);
    setLines((prev) =>
      prev.map((l) =>
        l.movement === "STOCK_OUT" ? { ...l, stakeholder: stationCode } : l,
      ),
    );
  }, []);

  const handleSubmit = () => {
    if (!requestedByDepartment.trim()) {
      toast.error("Select the requesting department");
      return;
    }
    if (!movementDateYmd.trim()) {
      toast.error("Select the movement date");
      return;
    }
    const movementDateIso =
      ymdToRegistrationTimestamp(movementDateYmd).toISOString();
    void run(batchKey, async () => {
      const user =
        typeof window !== "undefined"
          ? (localStorage.getItem("user_name")?.trim() ?? "")
          : "";
      const rowById = new Map(selected.map((r) => [r.id, r]));
      const batchSumByRegId = new Map<number, number>();

      for (const line of lines) {
        const row = rowById.get(line.registrationId);
        if (!row) continue;
        const q = Number(line.amount);
        if (line.movement === "STOCK_OUT") {
          if (!stockOutDestination(line)) {
            toast.error(
              `Select Kitchen, Bar, or Room for “${line.itemName}”`,
            );
            return;
          }
        } else if (!line.reason.trim()) {
          toast.error(`Enter a reason for “${line.itemName}”`);
          return;
        }
        if (!(q > 0)) {
          toast.error(`Enter a quantity for “${line.itemName}”`);
          return;
        }
        const prev = batchSumByRegId.get(line.registrationId) || 0;
        if (prev + q > Number(row.amount)) {
          toast.error(
            `Total quantity for “${line.itemName}” exceeds stock on hand.`,
          );
          return;
        }
        batchSumByRegId.set(line.registrationId, prev + q);
      }

      const batchPayload: {
        itemRegistrationId: number;
        movementType: string;
        amount: number;
        stakeHolderOrReason: string;
        row: ItemRegistration;
        line: (typeof lines)[0];
      }[] = [];

      for (const line of lines) {
        const row = rowById.get(line.registrationId);
        if (!row) continue;
        const q = Number(line.amount);
        batchPayload.push({
          itemRegistrationId: line.registrationId,
          movementType: line.movement,
          amount: q,
          stakeHolderOrReason:
            line.movement === "STOCK_OUT"
              ? stockOutDestination(line)
              : line.reason.trim(),
          row,
          line,
        });
      }

      let ok = 0;
      let failed = lines.length - batchPayload.length;
      let submitError: string | null = null;

      if (batchPayload.length > 0) {
        try {
          const results = await createStockOutRequestsBatchApi(
            batchPayload.map(
              ({
                itemRegistrationId,
                movementType,
                amount,
                stakeHolderOrReason,
              }) => ({
                itemRegistrationId,
                movementType,
                amount,
                stakeHolderOrReason,
                movementDate: movementDateIso,
              }),
            ),
            requestedByDepartment,
            {
              suppressSuccessToast: true,
              requestedByLeaderName,
            },
          );
          for (let i = 0; i < results.length; i++) {
            const { row, amount, stakeHolderOrReason, movementType } =
              batchPayload[i];
            const result = results[i];
            if (!result) continue;
            onHotelStockRequestCreated?.(
              buildOptimisticStockOutRequestRow(
                {
                  id: row.id,
                  name: row.name,
                  HotelName: row.HotelName,
                },
                movementType,
                amount,
                stakeHolderOrReason,
                result,
                user,
                movementDateIso,
                {
                  requestedByDepartment,
                  requestedByLeaderName,
                },
              ),
            );
            ok++;
          }
        } catch (e: unknown) {
          failed += batchPayload.length;
          submitError =
            e instanceof Error ? e.message : "Could not create stock movements";
          toast.error(submitError);
        }
      }

      if (ok > 0) {
        toast.success(
          `Created ${ok} stock movement request${ok === 1 ? "" : "s"}`,
        );
        setOpen(false);
        setLines([]);
        setRequestedByDepartment("");
        setRequestedByLeaderName("");
        setDefaultStockOutStation("");
        tableRef.current?.resetRowSelection();
        refresh?.();
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        className="gap-2"
        disabled={selected.length === 0}
        onClick={() => {
          setLines(rowsToDrafts(selected));
          setMovementDateYmd(toYmdLocal(new Date()));
          setOpen(true);
        }}
      >
        <Send className="h-4 w-4" />
        Stock movement ({selected.length})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-5">
            <DialogTitle>Batch stock movements</DialogTitle>
            <DialogDescription>
              Create stock-out, wastage, or return lines. Stock-out destination
              must be Kitchen, Bar, or Room so Cost Control daily counts can
              include them.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1 overflow-x-hidden">
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <DepartmentLeaderSelect
                id="stock-requested-by"
                label="Requested by"
                description="Who is requesting the movement (any department). Separate from Kitchen / Bar / Room destination."
                value={requestedByDepartment}
                leaderName={requestedByLeaderName}
                onChange={(dept, leader) => {
                  setRequestedByDepartment(dept);
                  setRequestedByLeaderName(leader);
                }}
                allowedDepartments={REQUESTED_BY_DEPARTMENT_CODES}
              />
              <HotelDayPicker
                id="batch-movement-date"
                label="Movement date"
                value={movementDateYmd}
                onChange={setMovementDateYmd}
                compact
              />
              {lines.some((l) => l.movement === "STOCK_OUT") ? (
                <div className="space-y-1.5 rounded-lg border border-dashed border-border/70 bg-muted/20 p-3">
                  <Label htmlFor="default-stock-out-station">
                    Apply station to all stock-out lines
                  </Label>
                  <Select
                    value={defaultStockOutStation || undefined}
                    onValueChange={applyDefaultStationToAll}
                  >
                    <SelectTrigger
                      id="default-stock-out-station"
                      className="h-10 w-full"
                    >
                      <SelectValue placeholder="Kitchen, Bar, or Room" />
                    </SelectTrigger>
                    <SelectContent>
                      {STOCK_OUT_STATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {lines.map((line) => (
                <div
                  key={line.registrationId}
                  className="rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm ring-1 ring-black/4 dark:ring-white/6"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2 gap-y-1">
                    <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
                      {line.itemName}
                    </p>
                    <Badge
                      variant="secondary"
                      className="shrink-0 tabular-nums font-normal"
                    >
                      {line.onHand} {line.measuredBy}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label htmlFor={`mov-${line.registrationId}`}>
                        Movement
                      </Label>
                      <Select
                        value={line.movement}
                        onValueChange={(v) =>
                          updateLine(line.registrationId, {
                            movement: v as MovementKind,
                          })
                        }
                      >
                        <SelectTrigger
                          id={`mov-${line.registrationId}`}
                          className="h-10 w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STOCK_OUT">Stock out</SelectItem>
                          <SelectItem value="WASTAGE">Wastage</SelectItem>
                          <SelectItem value="RETURN_SUPPLIER">
                            Return to supplier
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`qty-${line.registrationId}`}>
                        Quantity ({line.measuredBy})
                      </Label>
                      <Input
                        id={`qty-${line.registrationId}`}
                        type="number"
                        min={0.01}
                        step="any"
                        className="h-10 tabular-nums"
                        value={line.amount}
                        onChange={(e) =>
                          updateLine(line.registrationId, {
                            amount: e.target.value,
                          })
                        }
                      />
                    </div>

                    {line.movement === "STOCK_OUT" ? (
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Station (Kitchen / Bar / Room)</Label>
                        <Select
                          value={line.stakeholder || undefined}
                          onValueChange={(v) =>
                            updateLine(line.registrationId, {
                              stakeholder: v,
                              customStation: "",
                            })
                          }
                        >
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Select station" />
                          </SelectTrigger>
                          <SelectContent>
                            {STOCK_OUT_STATION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor={`reason-${line.registrationId}`}>
                          Reason
                        </Label>
                        <Input
                          id={`reason-${line.registrationId}`}
                          value={line.reason}
                          onChange={(e) =>
                            updateLine(line.registrationId, {
                              reason: e.target.value,
                            })
                          }
                          className="h-10"
                          placeholder="Short reason…"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="shrink-0 border-t px-4 py-3 sm:px-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending(batchKey)}
            >
              Cancel
            </Button>
            <PendingButton
              type="button"
              pending={isPending(batchKey)}
              onClick={handleSubmit}
            >
              Submit requests
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
