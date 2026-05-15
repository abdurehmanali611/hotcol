"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
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

type MovementKind = "STOCK_OUT" | "WASTAGE" | "RETURN_SUPPLIER";

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
  const [movement, setMovement] = useState<MovementKind>("STOCK_OUT");
  const [stakeholder, setStakeholder] = useState("");
  const [reason, setReason] = useState("");
  const [qtyEach, setQtyEach] = useState<string>("1");
  const { isPending, run } = useConcurrentActions();
  const batchKey = "inventory-batch-movements";

  const resetForm = () => {
    setMovement("STOCK_OUT");
    setStakeholder("");
    setReason("");
    setQtyEach("1");
  };

  const handleSubmit = () => {
    const q = Number(qtyEach);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Enter a valid quantity for each line");
      return;
    }
    if (movement === "STOCK_OUT" && !stakeholder.trim()) {
      toast.error("Select or enter a stakeholder for stock-out");
      return;
    }
    if (
      (movement === "WASTAGE" || movement === "RETURN_SUPPLIER") &&
      !reason.trim()
    ) {
      toast.error("Enter a short reason / reference for each line");
      return;
    }
    const stakeOrReason =
      movement === "STOCK_OUT" ? stakeholder.trim() : reason.trim();

    void run(batchKey, async () => {
      let ok = 0;
      let failed = 0;
      const user =
        typeof window !== "undefined"
          ? (localStorage.getItem("user_name")?.trim() ?? "")
          : "";
      for (const row of selected) {
        try {
          if (row.amount - q < 1) {
            failed++;
            continue;
          }
          const result = await createStockOutRequestApi(
            {
              itemRegistrationId: row.id,
              movementType: movement,
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
              movement,
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
            ? "No requests were created. Check quantities (leave at least 1 unit on hand per item)."
            : "No requests were created.",
        );
      }
      tableRef.current?.resetRowSelection();
      resetForm();
      setOpen(false);
      if (ok > 0) refresh?.();
    });
  };

  if (selected.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-muted/25 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{selected.length}</span>{" "}
          inventory line{selected.length === 1 ? "" : "s"} selected
        </p>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Batch stock / wastage / return…
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => tableRef.current?.resetRowSelection()}
        >
          Clear selection
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Batch movement requests</DialogTitle>
            <DialogDescription>
              One request per selected item, same movement type and quantity per line.
              Cost control will approve each line separately. At least 1 unit must remain
              on hand per item after the movement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Movement</Label>
              <Select
                value={movement}
                onValueChange={(v) => setMovement(v as MovementKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK_OUT">Stock out (to station)</SelectItem>
                  <SelectItem value="WASTAGE">Wastage</SelectItem>
                  <SelectItem value="RETURN_SUPPLIER">
                    Return to supplier
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {movement === "STOCK_OUT" ? (
              <div className="space-y-2">
                <Label>Stakeholder / station</Label>
                <Select value={stakeholder} onValueChange={setStakeholder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Where stock is going" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOTEL_STORE_STOCK_OUT_STAKEHOLDERS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Reason / reference</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Short note for approvers"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Quantity per selected item</Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={qtyEach}
                onChange={(e) => setQtyEach(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Applied to each of the {selected.length} selected row
                {selected.length === 1 ? "" : "s"}.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <PendingButton pending={isPending(batchKey)} onClick={() => handleSubmit()}>
              Submit {selected.length} request{selected.length === 1 ? "" : "s"}
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
