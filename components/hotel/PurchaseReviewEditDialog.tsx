"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type { PurchaseRequestRow } from "@/lib/actions";
import { notifyApiFailure } from "@/lib/actions";
import { updatePurchaseRequestStoreDraftApi } from "@/lib/api/storeRequestDraft";
import {
  updatePurchaseRequestApi,
  type PurchaseRequestUpdateInput,
} from "@/lib/api/hotelWorkflow";
import { ymdWithTimeOf } from "@/lib/hotelDateYmd";
import { formatVoucherDisplay } from "@/lib/voucherFormat";
import { inventoryUnitSelectValues } from "@/lib/inventoryUnits";
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
import { Textarea } from "@/components/ui/textarea";
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
import { PendingButton } from "@/components/ui/pending-button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { isVatEnabled } from "@/lib/hotelInventoryPayment";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";

const PhoneInput = dynamic(
  () => import("@/components/phone-input").then((m) => m.PhoneInput),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
    ),
  },
);

const PURCHASE_CATEGORIES = [
  "Food",
  "Beverage",
  "House Keeping",
  "Others",
] as const;

const DEFAULT_INVENTORY_UNIT = "Litre";

function PurchaseReviewEditDialogForm({
  row,
  onSaved,
  onDismiss,
  isPending,
  run,
  variant = "store-draft",
}: {
  row: PurchaseRequestRow;
  onSaved: () => void;
  onDismiss: () => void;
  isPending: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => void;
  variant?: "store-draft" | "authorized";
}) {
  const [itemName, setItemName] = useState(row.itemName);
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [measuredBy, setMeasuredBy] = useState(
    row.measuredBy?.trim() || DEFAULT_INVENTORY_UNIT,
  );
  const [entranceDate, setEntranceDate] = useState(
    row.entranceDate
      ? new Date(row.entranceDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState(row.notes || "");
  const [estimatedUnitPrice, setEstimatedUnitPrice] = useState(
    String(row.estimatedUnitPrice ?? 0),
  );
  const [supplierName, setSupplierName] = useState(row.supplierName || "");
  const [supplierPhone, setSupplierPhone] = useState(row.supplierPhone || "");
  const [category, setCategory] = useState<string>(row.category || "Others");
  const [purchaseWithVat, setPurchaseWithVat] = useState(
    isVatEnabled(row.purchaseWithVat),
  );

  const unitOptions = useMemo(
    () => inventoryUnitSelectValues(measuredBy),
    [measuredBy],
  );

  const voucherLabel = formatVoucherDisplay(
    row.voucherNumber,
    row.voucherDisplay,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DialogHeader className="px-6 pt-6 pb-4 space-y-3 border-b border-border/60 bg-muted/15 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono tabular-nums text-xs">
            Voucher {voucherLabel}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {variant === "authorized" ? "Authorized" : "Store review"}
          </Badge>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10">
            <Send className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="space-y-1 min-w-0">
            <DialogTitle className="text-lg tracking-tight">
              Edit purchase request line
            </DialogTitle>
            <DialogDescription className="text-pretty leading-relaxed">
              {variant === "authorized"
                ? "Correct item, supplier, quantity, or VAT details for this manager-authorized purchase line."
                : "Update item, entrance date, quantity, supplier, and notes before sending to cost control."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-6 py-5 space-y-6">
          <HotelFormSection
            title="Item & quantity"
            description="What you are requesting to purchase. Entrance date is when stock is expected to arrive."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pr-edit-item">Item name</Label>
                <Input
                  id="pr-edit-item"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr-edit-qty">Quantity</Label>
                <Input
                  id="pr-edit-qty"
                  type="number"
                  min={0}
                  step="any"
                  className="h-10 tabular-nums"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={measuredBy} onValueChange={setMeasuredBy}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr-edit-price">Est. unit price (ETB)</Label>
                <Input
                  id="pr-edit-price"
                  type="number"
                  min={0}
                  step="any"
                  className="h-10 tabular-nums"
                  value={estimatedUnitPrice}
                  onChange={(e) => setEstimatedUnitPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PURCHASE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <HotelDayPicker
                id="pr-edit-entrance-date"
                label="Entrance date"
                compact
                value={entranceDate}
                onChange={setEntranceDate}
                className="sm:col-span-2"
                buttonClassName="min-w-0"
              />
              <div className="flex items-center gap-3 sm:col-span-2 rounded-lg border border-dashed border-border/80 bg-muted/20 p-3">
                <Switch
                  id="pr-edit-vat"
                  checked={purchaseWithVat}
                  onCheckedChange={setPurchaseWithVat}
                />
                <Label htmlFor="pr-edit-vat" className="cursor-pointer font-normal">
                  Estimated price includes VAT (15%)
                </Label>
              </div>
            </div>
          </HotelFormSection>

          <HotelFormSection
            title="Supplier"
            description="Who will supply this purchase line."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pr-edit-supplier">Supplier name</Label>
                <Input
                  id="pr-edit-supplier"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Supplier phone</Label>
                <PhoneInput
                  defaultCountry="ET"
                  international
                  countryCallingCodeEditable
                  value={supplierPhone}
                  onChange={setSupplierPhone}
                  className="h-10"
                />
              </div>
            </div>
          </HotelFormSection>

          <HotelFormSection title="Notes" description="Optional context for approvers.">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none min-h-[80px]"
              placeholder="Delivery instructions, urgency, etc."
            />
          </HotelFormSection>
        </div>
      </div>

      <Separator className="shrink-0" />
      <DialogFooter className="shrink-0 border-t border-border/60 px-6 py-4 gap-2 sm:gap-2 bg-muted/10">
        <Button type="button" variant="outline" onClick={onDismiss}>
          Cancel
        </Button>
        <PendingButton
          type="button"
          pending={isPending(`save-pr-${row.id}`)}
          className="gap-2 shadow-sm min-w-[140px]"
          onClick={() =>
            void run(`save-pr-${row.id}`, async () => {
              try {
                const payload: PurchaseRequestUpdateInput = {
                  itemName: itemName.trim(),
                  quantity: Number(quantity),
                  measuredBy,
                  entranceDate: ymdWithTimeOf(
                    entranceDate,
                    row.entranceDate || row.createdAt,
                  ),
                  notes,
                  estimatedUnitPrice: Number(estimatedUnitPrice) || 0,
                  supplierName,
                  supplierPhone,
                  category,
                  purchaseWithVat,
                };
                if (variant === "authorized") {
                  await updatePurchaseRequestApi(row.id, payload);
                } else {
                  await updatePurchaseRequestStoreDraftApi(row.id, payload);
                }
                toast.success("Purchase line updated");
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
    </div>
  );
}

export function PurchaseReviewEditDialog({
  row,
  open,
  onOpenChange,
  onSaved,
  isPending,
  run,
  variant = "store-draft",
}: {
  row: PurchaseRequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  isPending: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => void;
  variant?: "store-draft" | "authorized";
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,720px)] max-w-2xl flex-col overflow-hidden p-0 gap-0 border-border/80 shadow-2xl sm:max-w-2xl">
        <div className="h-1 shrink-0 bg-linear-to-r from-sky-500/70 via-cyan-500/55 to-teal-400/45" />
        {open && row ? (
          <PurchaseReviewEditDialogForm
            key={row.id}
            row={row}
            onSaved={onSaved}
            onDismiss={() => onOpenChange(false)}
            isPending={isPending}
            run={run}
            variant={variant}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
