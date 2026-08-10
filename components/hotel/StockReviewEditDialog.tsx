"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import type { ItemRegistration, StockOutRequestRow } from "@/lib/actions";
import { notifyApiFailure } from "@/lib/actions";
import { updateStockOutRequestStoreDraftApi } from "@/lib/api/storeRequestDraft";
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import { formatVoucherDisplay } from "@/lib/voucherFormat";
import {
  formatStockMovementDestination,
  parseStockMovementDestination,
  type StockMovementKind,
} from "@/lib/stockMovementDraftForm";
import { STOCK_OUT_STATION_OPTIONS } from "@/lib/departments";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { toYmdLocal, ymdWithTimeOf } from "@/lib/hotelDateYmd";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PendingButton } from "@/components/ui/pending-button";
import { Separator } from "@/components/ui/separator";

const DEFAULT_INVENTORY_UNIT = "Litre";

function StockReviewEditDialogForm({
  row,
  inventoryItems,
  onSaved,
  onDismiss,
  isPending,
  run,
}: {
  row: StockOutRequestRow;
  inventoryItems: ItemRegistration[];
  onSaved: () => void;
  onDismiss: () => void;
  isPending: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => void;
}) {
  const kind = (row.movementType || "STOCK_OUT") as StockMovementKind;
  const parsed = parseStockMovementDestination(
    kind,
    row.stakeHolderOrReason || "",
  );
  const [movementType, setMovementType] = useState<StockMovementKind>(kind);
  const [amount, setAmount] = useState(String(row.amount));
  const [movementDateYmd, setMovementDateYmd] = useState(() =>
    row.movementDate
      ? toYmdLocal(new Date(row.movementDate))
      : toYmdLocal(new Date()),
  );
  const [stakeholder, setStakeholder] = useState<string>(parsed.stakeholder);
  const [customStation, setCustomStation] = useState(parsed.customStation);
  const [reason, setReason] = useState(parsed.reason);

  const linkedItem = useMemo(
    () => inventoryItems.find((i) => i.id === row.itemRegistrationId),
    [inventoryItems, row.itemRegistrationId],
  );

  const measuredBy =
    linkedItem?.measuredBy?.trim() || DEFAULT_INVENTORY_UNIT;
  const onHand = linkedItem ? Number(linkedItem.amount) || 0 : null;
  const voucherLabel = formatVoucherDisplay(
    row.voucherNumber,
    row.voucherDisplay,
  );

  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-4 space-y-3 border-b border-border/60 bg-muted/15 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono tabular-nums text-xs">
            Voucher {voucherLabel}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-normal">
            Store review
          </Badge>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
            <ArrowRightLeft className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1 min-w-0">
            <DialogTitle className="text-lg tracking-tight">
              Edit stock movement line
            </DialogTitle>
            <DialogDescription className="text-pretty leading-relaxed">
              Adjust movement type, quantity, and destination before sending to
              cost control.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <ScrollArea className="max-h-[min(62vh,520px)]">
        <div className="px-6 py-5 space-y-6">
          <HotelFormSection
            title="Linked item"
            description="Inventory line this movement applies to."
          >
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 space-y-1">
              <p className="font-medium text-sm">
                {row.itemName?.trim() || linkedItem?.name || "Unknown item"}
              </p>
              {onHand != null ? (
                <p className="text-xs text-muted-foreground">
                  On hand: {formatQtyWithUnit(onHand, measuredBy)}
                </p>
              ) : null}
            </div>
          </HotelFormSection>

          <HotelFormSection
            title="Movement details"
            description="Type and quantity leaving store inventory."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Movement type</Label>
                <Select
                  value={movementType}
                  onValueChange={(v) => setMovementType(v as StockMovementKind)}
                >
                  <SelectTrigger className="h-10 w-full">
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="so-edit-qty">Quantity ({measuredBy})</Label>
                <Input
                  id="so-edit-qty"
                  type="number"
                  min={0.01}
                  step="any"
                  className="h-10 tabular-nums"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <HotelDayPicker
                  id="so-edit-movement-date"
                  label="Movement date"
                  value={movementDateYmd}
                  onChange={setMovementDateYmd}
                  compact
                />
              </div>
            </div>
          </HotelFormSection>

          <HotelFormSection
            title={
              movementType === "STOCK_OUT"
                ? "Destination"
                : "Reason"
            }
            description={
              movementType === "STOCK_OUT"
                ? "Where stock is going."
                : "Why this movement is recorded."
            }
          >
            {movementType === "STOCK_OUT" ? (
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label>Station (Kitchen / Bar / Room)</Label>
                  <Select
                    value={stakeholder || undefined}
                    onValueChange={setStakeholder}
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
                <div className="space-y-1.5">
                  <Label htmlFor="so-edit-custom">Custom destination (optional)</Label>
                  <Input
                    id="so-edit-custom"
                    className="h-10"
                    placeholder="e.g. Banquet hall prep"
                    value={customStation}
                    onChange={(e) => setCustomStation(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="so-edit-reason">Reason (required)</Label>
                <Input
                  id="so-edit-reason"
                  className="h-10"
                  placeholder="e.g. spoilage, wrong delivery…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            )}
          </HotelFormSection>
        </div>
      </ScrollArea>

      <Separator />
      <DialogFooter className="px-6 py-4 gap-2 sm:gap-2 bg-muted/10 shrink-0">
        <Button type="button" variant="outline" onClick={onDismiss}>
          Cancel
        </Button>
        <PendingButton
          pending={isPending(`save-so-${row.id}`)}
          className="gap-2 shadow-sm min-w-35"
          onClick={() =>
            void run(`save-so-${row.id}`, async () => {
              const stakeHolderOrReason = formatStockMovementDestination(
                movementType,
                stakeholder,
                customStation,
                reason,
              );
              if (movementType === "STOCK_OUT" && !stakeHolderOrReason) {
                toast.error("Select or enter a station / destination");
                return;
              }
              if (movementType !== "STOCK_OUT" && !stakeHolderOrReason) {
                toast.error("Enter a reason for this movement");
                return;
              }
              try {
                await updateStockOutRequestStoreDraftApi(row.id, {
                  movementType,
                  amount: Number(amount),
                  stakeHolderOrReason,
                  movementDate: ymdWithTimeOf(
                    movementDateYmd,
                    row.movementDate || row.createdAt,
                  ).toISOString(),
                });
                toast.success("Movement updated");
                onSaved();
              } catch (e) {
                notifyApiFailure(e, "Could not save");
              }
            })
          }
        >
          Save changes
        </PendingButton>
      </DialogFooter>
    </>
  );
}

export function StockReviewEditDialog({
  row,
  inventoryItems,
  open,
  onOpenChange,
  onSaved,
  isPending,
  run,
}: {
  row: StockOutRequestRow | null;
  inventoryItems: ItemRegistration[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  isPending: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden p-0 gap-0 border-border/80 shadow-2xl">
        <div className="h-1 bg-linear-to-r from-amber-500/70 via-orange-500/55 to-rose-400/45 shrink-0" />
        {open && row ? (
          <StockReviewEditDialogForm
            key={row.id}
            row={row}
            inventoryItems={inventoryItems}
            onSaved={onSaved}
            onDismiss={() => onOpenChange(false)}
            isPending={isPending}
            run={run}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
