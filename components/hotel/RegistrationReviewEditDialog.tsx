"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import type { ItemRegistration } from "@/lib/actions";
import { UpdateItemRegistration, notifyApiFailure } from "@/lib/actions";
import { ItemRegistrationSchema } from "@/lib/validations";
import {
  computeInventoryPaidAmountETB,
  isVatEnabled,
} from "@/lib/hotelInventoryPayment";
import { INVENTORY_UNIT_SELECT_OPTIONS } from "@/lib/inventoryUnits";
import { formatVoucherDisplay } from "@/lib/voucherFormat";
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import {
  HotelFormSection,
} from "@/components/hotel/HotelTerminalInitFormLayout";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { RegistrationImageUploadField } from "@/components/hotel/RegistrationImageUploadField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

const PhoneInput = dynamic(
  () => import("@/components/phone-input").then((m) => m.PhoneInput),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
    ),
  },
);

const REGISTRATION_CATEGORIES = [
  "Food",
  "Beverage",
  "House Keeping",
  "Maintainance",
  "Office Supplies",
  "Others",
] as const;

type ItemRegForm = z.infer<typeof ItemRegistrationSchema>;

function normalizeCategory(
  value: string,
): (typeof REGISTRATION_CATEGORIES)[number] {
  const v = String(value ?? "").trim();
  if (v === "Maintenance") return "Maintainance";
  if ((REGISTRATION_CATEGORIES as readonly string[]).includes(v)) {
    return v as (typeof REGISTRATION_CATEGORIES)[number];
  }
  return "Others";
}

function toYmd(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function RegistrationReviewEditDialogForm({
  row,
  onSaved,
  onDismiss,
  isPending,
  run,
}: {
  row: ItemRegistration & { id: number };
  onSaved: () => void;
  onDismiss: () => void;
  isPending: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => void;
}) {
  const [regDateYmd, setRegDateYmd] = useState(() =>
    toYmd(row.registrationDate),
  );
  const [expDateYmd, setExpDateYmd] = useState(() => toYmd(row.expireDate));
  const lastAutoPaidRef = useRef<number | null>(null);

  const form = useForm<ItemRegForm>({
    resolver: zodResolver(ItemRegistrationSchema) as Resolver<ItemRegForm>,
    defaultValues: {
      name: row.name,
      imageUrl: row.imageUrl,
      category: normalizeCategory(row.category),
      amount: row.amount,
      measuredBy: row.measuredBy?.trim() || "Litre",
      unitPrice: row.unitPrice,
      registrationDate: new Date(row.registrationDate),
      expireDate: new Date(row.expireDate),
      supplierName: row.supplierName,
      supplierPhone: row.supplierPhone,
      Address: row.Address,
      purchaseWithVat: isVatEnabled(row.purchaseWithVat),
      supplierTinNumber: (row.supplierTinNumber ?? "").trim(),
      paidAmount: row.paidAmount,
      HotelName: row.HotelName,
    },
  });

  const amount = useWatch({ control: form.control, name: "amount" });
  const unitPrice = useWatch({ control: form.control, name: "unitPrice" });
  const purchaseWithVat = useWatch({
    control: form.control,
    name: "purchaseWithVat",
  });
  const itemName = useWatch({ control: form.control, name: "name" });
  const measuredBy = useWatch({ control: form.control, name: "measuredBy" });

  useEffect(() => {
    form.setValue("registrationDate", new Date(regDateYmd), {
      shouldValidate: true,
    });
  }, [regDateYmd, form]);

  useEffect(() => {
    form.setValue("expireDate", new Date(expDateYmd), { shouldValidate: true });
  }, [expDateYmd, form]);

  useEffect(() => {
    const autoPaid = computeInventoryPaidAmountETB(
      amount,
      unitPrice,
      purchaseWithVat,
    );
    const current = Number(form.getValues("paidAmount")) || 0;
    const paidState = form.getFieldState("paidAmount");
    const canAuto =
      !paidState.isDirty || current === lastAutoPaidRef.current;
    if (canAuto) {
      form.setValue("paidAmount", autoPaid, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
    lastAutoPaidRef.current = autoPaid;
  }, [amount, unitPrice, purchaseWithVat, form]);

  const voucherLabel = useMemo(
    () => formatVoucherDisplay(row.voucherNumber, row.voucherDisplay),
    [row.voucherNumber, row.voucherDisplay],
  );

  const onSubmit = (values: ItemRegForm) => {
    void run(`save-reg-${row.id}`, async () => {
      try {
        await UpdateItemRegistration({ ...values, id: row.id });
        toast.success(`${values.name.trim()} updated`);
        onSaved();
      } catch (e) {
        notifyApiFailure(e, "Could not save registration line");
      }
    });
  };

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
            <PackagePlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-1 min-w-0">
            <DialogTitle className="text-lg tracking-tight">
              Edit registration line
            </DialogTitle>
            <DialogDescription className="text-pretty leading-relaxed">
              Update what you entered before sending to cost control. All fields
              match the registration form — image is required.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <ScrollArea className="max-h-[min(62vh,520px)]">
        <Form {...form}>
          <form
            id={`registration-review-edit-${row.id}`}
            onSubmit={form.handleSubmit(onSubmit)}
            className="px-6 py-5 space-y-6"
          >
            <HotelFormSection
              title="Item details"
              description="Name, category, quantity, and pricing for this line."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Item name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Product name"
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REGISTRATION_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="measuredBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INVENTORY_UNIT_SELECT_OPTIONS.map((u) => (
                            <SelectItem key={u.id} value={u.name}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="h-10 tabular-nums"
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit price (ETB)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="h-10 tabular-nums"
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </HotelFormSection>

            <HotelFormSection
              title="Dates & payment"
              description="Registration and expiry dates, VAT, and paid amount."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <HotelDayPicker
                  label="Registration date"
                  value={regDateYmd}
                  onChange={setRegDateYmd}
                  className="min-w-0"
                />
                <HotelDayPicker
                  label="Expiry date"
                  value={expDateYmd}
                  onChange={setExpDateYmd}
                  className="min-w-0"
                />
                <FormField
                  control={form.control}
                  name="purchaseWithVat"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2 flex flex-row items-center justify-between rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">
                          Price includes VAT
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Affects the auto-calculated paid amount
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paidAmount"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Paid amount (ETB)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="h-10 tabular-nums"
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </HotelFormSection>

            <HotelFormSection
              title="Supplier"
              description="Shared supplier details for this registration batch."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="supplierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier name</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplierPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier phone</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplierTinNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier TIN (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10 font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="Address"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Address / note</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={2}
                          className="resize-none min-h-[72px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </HotelFormSection>

            <HotelFormSection
              title="Item image"
              description="Required — same as when you first registered this line."
            >
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <RegistrationImageUploadField
                      value={field.value}
                      onChange={field.onChange}
                      itemLabel={itemName}
                      hint={`${formatQtyWithUnit(amount, measuredBy)} · ETB ${Number(unitPrice || 0).toLocaleString()} / unit`}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </HotelFormSection>
          </form>
        </Form>
      </ScrollArea>

      <Separator />
      <DialogFooter className="px-6 py-4 gap-2 sm:gap-2 bg-muted/10 shrink-0">
        <Button type="button" variant="outline" onClick={onDismiss}>
          Cancel
        </Button>
        <PendingButton
          type="submit"
          form={`registration-review-edit-${row.id}`}
          pending={isPending(`save-reg-${row.id}`)}
          className="gap-2 shadow-sm min-w-[140px]"
        >
          Save changes
        </PendingButton>
      </DialogFooter>
    </>
  );
}

export function RegistrationReviewEditDialog({
  row,
  open,
  onOpenChange,
  onSaved,
  isPending,
  run,
}: {
  row: (ItemRegistration & { id: number }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  isPending: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden p-0 gap-0 border-border/80 shadow-2xl">
        <div className="h-1 bg-linear-to-r from-emerald-500/70 via-green-500/55 to-teal-400/45 shrink-0" />
        {open && row ? (
          <RegistrationReviewEditDialogForm
            key={row.id}
            row={row}
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
