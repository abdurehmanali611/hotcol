"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
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
  stockOutDestinationTextFromDepartmentCode,
} from "@/lib/departments";
import { toYmdLocal, ymdToRegistrationTimestamp } from "@/lib/hotelDateYmd";
import { useDepartmentLeaderSelectOptions } from "@/hooks/useDepartmentLeaderSelectOptions";
import { buildOptimisticStockOutRequestRow } from "@/lib/hotelOptimisticStock";
import type { DataTableRef } from "@/app/StoreItems/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";

type MovementKind = "STOCK_OUT" | "WASTAGE" | "RETURN_SUPPLIER";

type LineDraft = {
  registrationId: number;
  itemName: string;
  onHand: number;
  measuredBy: string;
  movement: MovementKind;
  amount: string;
  /** Stock-out: department code (same options as requested by) */
  stakeholder: string;
  /** Stock-out: optional free-text station / destination */
  customStation: string;
  /** Wastage / return */
  reason: string;
};

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

function stockOutDestination(line: LineDraft): string {
  const custom = line.customStation.trim();
  if (custom) return custom;
  const code = line.stakeholder.trim();
  if (!code) return "";
  return stockOutDestinationTextFromDepartmentCode(code);
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
  const [movementDateYmd, setMovementDateYmd] = useState(() => toYmdLocal(new Date()));
  const { options: destinationOptions, loading: destinationLoading } =
    useDepartmentLeaderSelectOptions(REQUESTED_BY_DEPARTMENT_CODES, {
      perLeader: false,
    });
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
    const movementDateIso = ymdToRegistrationTimestamp(movementDateYmd).toISOString();
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
              `Select or enter a station for “${line.itemName}”, or use “Apply station to all” above.`,
            );
            return;
          }
        } else if (!line.reason.trim()) {
          toast.error(`Enter a reason for “${line.itemName}” (wastage / return).`);
          return;
        }
        if (!Number.isFinite(q) || q <= 0) {
          toast.error(`Enter a valid quantity for “${line.itemName}”.`);
          return;
        }
        const regId = line.registrationId;
        const nextSum = (batchSumByRegId.get(regId) || 0) + q;
        batchSumByRegId.set(regId, nextSum);
        if (nextSum > row.amount) {
          toast.error(
            `“${line.itemName}”: total quantity cannot exceed ${row.amount} on hand.`,
          );
          return;
        }
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
              ({ itemRegistrationId, movementType, amount, stakeHolderOrReason }) => ({
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
            e instanceof Error ? e.message : "Batch stock movement request failed";
        }
      }

      if (ok > 0) {
        toast.success(
          `Saved ${ok} movement line${ok === 1 ? "" : "s"} for your review${
            failed ? ` (${failed} skipped or failed)` : ""
          }. Open Review before send to confirm.`,
        );
      } else {
        toast.error(
          submitError ??
            (failed
              ? "No requests were created. Check quantities, stations, and stock on hand."
              : "No requests were created."),
        );
      }
      tableRef.current?.resetRowSelection();
      setOpen(false);
      if (ok > 0) refresh?.();
    });
  };

  if (selected.length === 0) return null;

  return (
    <>
      <div className="border-b border-border/60 bg-muted/25 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-sm text-muted-foreground min-w-0">
            <span className="font-semibold tabular-nums text-foreground">
              {selected.length}
            </span>{" "}
            line{selected.length === 1 ? "" : "s"} selected. Open the editor to set movement,
            quantity, and destination per item.
          </p>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              className="gap-2 font-semibold shadow-sm"
              onClick={() => {
                setLines(rowsToDrafts(selected));
                setDefaultStockOutStation("");
                setMovementDateYmd(toYmdLocal(new Date()));
                setOpen(true);
              }}
            >
              <Send className="size-4 shrink-0" aria-hidden />
              Review and submit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-muted-foreground"
              onClick={() => tableRef.current?.resetRowSelection()}
            >
              Clear selection
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="flex max-h-[min(92vh,720px)] w-full max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        >
          <div className="shrink-0 border-b border-border/60 bg-linear-to-b from-muted/40 to-muted/10 px-5 pt-5 pb-4 pr-12">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-base font-semibold tracking-tight sm:text-lg">
                Batch movement requests
              </DialogTitle>
              <DialogDescription className="text-sm text-pretty leading-relaxed">
                Each card is one request. Choose movement and quantity, then either a station
                (stock-out) or a reason (wastage / return). Cost control reviews lines
                separately.
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="min-h-0 flex-1 overflow-x-hidden">
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <DepartmentLeaderSelect
                id="stock-requested-by"
                label="Requested by"
                description="House Keeping (Room) and House Keeping (Public) are separate departments. When a department has multiple leaders, pick the accountable one — receipts print that name."
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
                    disabled={destinationLoading || destinationOptions.length === 0}
                  >
                    <SelectTrigger id="default-stock-out-station" className="h-10 w-full">
                      <SelectValue
                        placeholder={
                          destinationLoading
                            ? "Loading departments…"
                            : destinationOptions.length === 0
                              ? "No leaders registered"
                              : "Select once — applies to every stock-out line"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Use this when sending many items to the same kitchen, bar, or
                    department. You can still override any line below.
                  </p>
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
                    <Badge variant="secondary" className="shrink-0 tabular-nums font-normal">
                      {line.onHand} {line.measuredBy}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label htmlFor={`mov-${line.registrationId}`}>Movement</Label>
                      <Select
                        value={line.movement}
                        onValueChange={(v) =>
                          updateLine(line.registrationId, {
                            movement: v as MovementKind,
                          })
                        }
                      >
                        <SelectTrigger id={`mov-${line.registrationId}`} className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STOCK_OUT">Stock out</SelectItem>
                          <SelectItem value="WASTAGE">Wastage</SelectItem>
                          <SelectItem value="RETURN_SUPPLIER">Return to supplier</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label htmlFor={`qty-${line.registrationId}`}>Quantity</Label>
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
                        <Label>Station or destination</Label>
                        <Select
                          value={line.stakeholder || undefined}
                          onValueChange={(v) =>
                            updateLine(line.registrationId, { stakeholder: v })
                          }
                          disabled={destinationLoading || destinationOptions.length === 0}
                        >
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue
                              placeholder={
                                destinationLoading
                                  ? "Loading departments…"
                                  : destinationOptions.length === 0
                                    ? "No leaders registered — ask manager to add them"
                                    : "Select department"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {destinationOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="h-10 text-sm"
                          placeholder="Optional: custom destination"
                          value={line.customStation}
                          onChange={(e) =>
                            updateLine(line.registrationId, {
                              customStation: e.target.value,
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor={`reason-${line.registrationId}`}>
                          Reason (required)
                        </Label>
                        <Input
                          id={`reason-${line.registrationId}`}
                          className="h-10"
                          placeholder="e.g. spoilage, wrong delivery…"
                          value={line.reason}
                          onChange={(e) =>
                            updateLine(line.registrationId, {
                              reason: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="shrink-0 flex-col gap-3 border-t border-border/60 bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-muted-foreground order-2 sm:order-1 sm:max-w-[55%]">
              Stock-out needs a station or custom destination. Wastage and returns need a
              reason.
            </p>
            <div className="flex w-full flex-col-reverse gap-2 order-1 sm:order-2 sm:w-auto sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <PendingButton
                pending={isPending(batchKey)}
                onClick={() => handleSubmit()}
                className="gap-2 min-w-40 font-semibold"
              >
                <Send className="size-4 shrink-0" aria-hidden />
                Submit {lines.length} request{lines.length === 1 ? "" : "s"}
              </PendingButton>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
