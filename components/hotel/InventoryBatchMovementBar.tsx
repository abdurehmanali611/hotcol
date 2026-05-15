"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  createStockOutRequestApi,
  type ItemRegistration,
  type StockOutRequestRow,
} from "@/lib/actions";
import { HOTEL_STORE_STOCK_OUT_STAKEHOLDERS } from "@/lib/hotelDailyStation";
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
  /** Stock-out: pick list value (may be empty if using customStation) */
  stakeholder: string;
  /** Stock-out: optional free-text station / destination */
  customStation: string;
  /** Wastage / return */
  reason: string;
};

function defaultAmountForRow(row: ItemRegistration): string {
  const maxMovable = Math.max(0, Number(row.amount) - 1);
  const def = Math.min(1, maxMovable || 0);
  return def > 0 ? String(def) : "0";
}

function rowsToDrafts(selected: ItemRegistration[]): LineDraft[] {
  return selected.map((row) => ({
    registrationId: row.id,
    itemName: row.name,
    onHand: Number(row.amount) || 0,
    measuredBy: row.measuredBy || "Piece",
    movement: "STOCK_OUT",
    amount: defaultAmountForRow(row),
    stakeholder: HOTEL_STORE_STOCK_OUT_STAKEHOLDERS[0] ?? "Kitchen",
    customStation: "",
    reason: "",
  }));
}

function stockOutDestination(line: LineDraft): string {
  const custom = line.customStation.trim();
  if (custom) return custom;
  return line.stakeholder.trim();
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
  const { isPending, run } = useConcurrentActions();
  const batchKey = "inventory-batch-movements";

  const selectedSig = useMemo(
    () =>
      [...selected]
        .map((r) => r.id)
        .sort((a, b) => a - b)
        .join(","),
    [selected],
  );

  const initSigRef = useRef("");

  // When nothing is selected, drop dialog drafts so a later selection never reuses old lines.
  useEffect(() => {
    if (selected.length === 0) {
      setOpen(false);
      setLines([]);
      initSigRef.current = "";
    }
  }, [selected.length]);

  useEffect(() => {
    if (!open) {
      initSigRef.current = "";
      return;
    }
    if (initSigRef.current === selectedSig) return;
    initSigRef.current = selectedSig;
    setLines(rowsToDrafts(selected));
  }, [open, selected, selectedSig]);

  const updateLine = useCallback((id: number, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((l) => (l.registrationId === id ? { ...l, ...patch } : l)),
    );
  }, []);

  const handleSubmit = () => {
    void run(batchKey, async () => {
      const user =
        typeof window !== "undefined"
          ? (localStorage.getItem("user_name")?.trim() ?? "")
          : "";
      const rowById = new Map(selected.map((r) => [r.id, r]));

      for (const line of lines) {
        const row = rowById.get(line.registrationId);
        if (!row) continue;
        const q = Number(line.amount);
        if (line.movement === "STOCK_OUT") {
          if (!stockOutDestination(line)) {
            toast.error(`Select or enter a station for “${line.itemName}”.`);
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
        if (row.amount - q < 1) {
          toast.error(
            `“${line.itemName}”: leave at least 1 unit on hand (reduce quantity).`,
          );
          return;
        }
      }

      let ok = 0;
      let failed = 0;

      for (const line of lines) {
        const row = rowById.get(line.registrationId);
        if (!row) {
          failed++;
          continue;
        }
        const q = Number(line.amount);
        const stakeOrReason =
          line.movement === "STOCK_OUT"
            ? stockOutDestination(line)
            : line.reason.trim();

        try {
          const result = await createStockOutRequestApi(
            {
              itemRegistrationId: line.registrationId,
              movementType: line.movement,
              amount: q,
              stakeHolderOrReason: stakeOrReason,
            },
            { suppressSuccessToast: true },
          );
          onHotelStockRequestCreated?.(
            buildOptimisticStockOutRequestRow(
              {
                id: row.id,
                name: row.name,
                HotelName: row.HotelName,
              },
              line.movement,
              q,
              stakeOrReason,
              result,
              user || "—",
            ),
          );
          ok++;
        } catch {
          failed++;
        }
      }

      if (ok > 0) {
        toast.success(
          `Submitted ${ok} movement request${ok === 1 ? "" : "s"}${
            failed ? ` (${failed} skipped or failed)` : ""
          }`,
        );
      } else {
        toast.error(
          failed
            ? "No requests were created. Some lines could not be sent."
            : "No requests were created.",
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
              onClick={() => setOpen(true)}
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
                        step={0.01}
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
                          value={line.stakeholder}
                          onValueChange={(v) =>
                            updateLine(line.registrationId, { stakeholder: v })
                          }
                        >
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Station" />
                          </SelectTrigger>
                          <SelectContent>
                            {HOTEL_STORE_STOCK_OUT_STAKEHOLDERS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
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
