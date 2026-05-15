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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-muted/30 px-4 py-3.5">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {selected.length}
          </span>{" "}
          line{selected.length === 1 ? "" : "s"} selected — configure each movement below.
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="shadow-sm"
          onClick={() => setOpen(true)}
        >
          Review & submit movements…
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => tableRef.current?.resetRowSelection()}
        >
          Clear selection
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0 sm:rounded-xl">
          <div className="border-b border-border/60 bg-muted/20 px-6 py-4">
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle className="text-lg">Batch movement requests</DialogTitle>
              <DialogDescription className="text-pretty leading-relaxed">
                Each row is a separate request. Set <strong>movement</strong>,{" "}
                <strong>quantity</strong>, and either a <strong>station</strong> (stock-out) or{" "}
                <strong>reason</strong> (wastage / return) per item. Cost control approves each
                line on its own.
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="max-h-[min(70vh,520px)] px-2 sm:px-4">
            <div className="py-3">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="min-w-[140px] whitespace-normal">
                      Item
                    </TableHead>
                    <TableHead className="w-20 text-right whitespace-normal">
                      On hand
                    </TableHead>
                    <TableHead className="w-[130px] whitespace-normal">
                      Movement
                    </TableHead>
                    <TableHead className="w-24 text-right whitespace-normal">
                      Qty
                    </TableHead>
                    <TableHead className="min-w-[200px] whitespace-normal">
                      Station / custom
                    </TableHead>
                    <TableHead className="min-w-[160px] whitespace-normal">
                      Reason (wastage / return)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow
                      key={line.registrationId}
                      className="border-border/50 align-top"
                    >
                      <TableCell className="py-3 font-medium leading-snug">
                        {line.itemName}
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums text-muted-foreground">
                        {line.onHand}{" "}
                        <span className="text-xs font-normal">{line.measuredBy}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Select
                          value={line.movement}
                          onValueChange={(v) =>
                            updateLine(line.registrationId, {
                              movement: v as MovementKind,
                            })
                          }
                        >
                          <SelectTrigger className="h-9 text-left">
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
                      </TableCell>
                      <TableCell className="py-3">
                        <Input
                          type="number"
                          min={0.01}
                          step={0.01}
                          className="h-9 tabular-nums text-right"
                          value={line.amount}
                          onChange={(e) =>
                            updateLine(line.registrationId, {
                              amount: e.target.value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="py-3 space-y-2">
                        <Select
                          value={line.stakeholder}
                          onValueChange={(v) =>
                            updateLine(line.registrationId, { stakeholder: v })
                          }
                          disabled={line.movement !== "STOCK_OUT"}
                        >
                          <SelectTrigger className="h-9">
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
                          className="h-9 text-sm"
                          placeholder="Or type a custom destination…"
                          value={line.customStation}
                          disabled={line.movement !== "STOCK_OUT"}
                          onChange={(e) =>
                            updateLine(line.registrationId, {
                              customStation: e.target.value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <Input
                          className="h-9"
                          placeholder="Required for wastage / return"
                          value={line.reason}
                          disabled={line.movement === "STOCK_OUT"}
                          onChange={(e) =>
                            updateLine(line.registrationId, {
                              reason: e.target.value,
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 border-t border-border/60 bg-muted/15 px-6 py-4 sm:justify-between">
            <p className="text-xs text-muted-foreground self-center max-sm:hidden">
              Stock-out uses the dropdown and/or custom destination; other movements use the
              reason column.
            </p>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <PendingButton
                pending={isPending(batchKey)}
                onClick={() => handleSubmit()}
                className="min-w-[160px]"
              >
                Submit {lines.length} request{lines.length === 1 ? "" : "s"}
              </PendingButton>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
