"use client";

import { useRef, useState } from "react";
import { cashoutSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Form } from "./ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { Button } from "./ui/button";
import { PendingButton } from "./ui/pending-button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { CreateCashout } from "@/lib/actions";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const UNIT_OPTIONS = [
  { id: 1, name: "Litre" },
  { id: 2, name: "Kilogram" },
  { id: 3, name: "Piece" },
  { id: 4, name: "Packet" },
  { id: 5, name: "Dozen" },
  { id: 6, name: "Other" },
] as const;

const LINE_GRID =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_100px_128px_132px_48px] lg:items-start lg:gap-x-3";

const FIELD_DESKTOP = {
  formItemClassName: "w-full min-w-0 gap-1.5",
  labelClassName: "text-xs font-medium text-muted-foreground lg:sr-only",
  inputClassName: "h-10 w-full !min-w-0 max-w-full",
} as const;

type CashoutValues = z.infer<typeof cashoutSchema>;

interface CashoutFormProps {
  tenantScope: string;
  propertyName?: string;
  onSuccess?: () => void;
}

function emptyFormValues(tenantScope: string): CashoutValues {
  return {
    prices: [],
    items: [],
    measuredBy: [],
    requiredAmount: [],
    HotelName: tenantScope,
  };
}

function CashoutColumnHeaders() {
  return (
    <div
      className={cn(
        LINE_GRID,
        "mb-0.5 hidden px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid",
      )}
    >
      <span>Item name</span>
      <span className="text-center">Qty</span>
      <span>Unit</span>
      <span>Unit price</span>
      <span className="sr-only">Remove</span>
    </div>
  );
}

function CashoutLineRow({
  index,
  form,
  onRemove,
  lineTotal,
}: {
  index: number;
  form: ReturnType<typeof useForm<CashoutValues>>;
  onRemove: () => void;
  lineTotal: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-card via-card to-muted/20 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-foreground lg:hidden">
            Expense line
          </span>
          <span className="hidden text-sm font-medium text-muted-foreground lg:inline">
            Line {index + 1}
          </span>
        </div>
        <Badge
          variant="secondary"
          className="border-primary/20 bg-primary/5 font-semibold tabular-nums text-primary"
        >
          {lineTotal} ETB
        </Badge>
      </div>

      <div className={cn(LINE_GRID, "p-4 pt-3")}>
        <div className="min-w-0 sm:col-span-2 lg:col-span-1">
          <CustomFormField
            name={`items.${index}`}
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Item name"
            placeholder="Flour, sugar, oil…"
            {...FIELD_DESKTOP}
          />
        </div>

        <div className="min-w-0">
          <CustomFormField
            name={`requiredAmount.${index}`}
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Quantity"
            placeholder="0"
            type="number"
            {...FIELD_DESKTOP}
          />
        </div>

        <div className="min-w-0">
          <CustomFormField
            name={`measuredBy.${index}`}
            control={form.control}
            fieldType={formFieldTypes.SELECT}
            label="Unit"
            placeholder="Select unit"
            listdisplay={[...UNIT_OPTIONS]}
            {...FIELD_DESKTOP}
          />
        </div>

        <div className="min-w-0">
          <CustomFormField
            name={`prices.${index}`}
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Unit price (ETB)"
            placeholder="0.00"
            type="number"
            {...FIELD_DESKTOP}
          />
        </div>

        <div className="flex items-end sm:col-span-2 lg:col-span-1 lg:justify-center lg:pb-0.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="h-10 w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive lg:h-9 lg:w-9 lg:px-0"
            aria-label={`Remove line ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
            <span className="lg:sr-only">Remove</span>
            <span className="lg:hidden">Remove line</span>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function CashoutForm({
  tenantScope,
  propertyName,
  onSuccess,
}: CashoutFormProps) {
  const rowIdRef = useRef(0);
  const [rowKeys, setRowKeys] = useState<string[]>([]);
  const venueLabel = propertyName?.trim() || tenantScope || "Café";

  const form = useForm<CashoutValues>({
    resolver: zodResolver(cashoutSchema),
    defaultValues: emptyFormValues(tenantScope),
  });

  const items = form.watch("items");
  const prices = form.watch("prices");
  const measuredBy = form.watch("measuredBy");
  const requiredAmount = form.watch("requiredAmount");
  const submitting = form.formState.isSubmitting;

  const addNewItem = () => {
    rowIdRef.current += 1;
    setRowKeys((keys) => [...keys, `line-${rowIdRef.current}`]);
    form.setValue("items", [...items, ""]);
    form.setValue("measuredBy", [...measuredBy, ""]);
    form.setValue("prices", [...prices, 0]);
    form.setValue("requiredAmount", [...requiredAmount, 0]);
  };

  const removeItem = (index: number) => {
    setRowKeys((keys) => keys.filter((_, i) => i !== index));
    form.setValue(
      "items",
      items.filter((_, i) => i !== index),
    );
    form.setValue(
      "measuredBy",
      measuredBy.filter((_, i) => i !== index),
    );
    form.setValue(
      "prices",
      prices.filter((_, i) => i !== index),
    );
    form.setValue(
      "requiredAmount",
      requiredAmount.filter((_, i) => i !== index),
    );
  };

  const calculateItemTotal = (index: number) => {
    const price = Number(prices[index]) || 0;
    const amount = Number(requiredAmount[index]) || 0;
    return (price * amount).toFixed(2);
  };

  const calculateGrandTotal = () => {
    let total = 0;
    const count = Math.min(prices.length, requiredAmount.length);
    for (let i = 0; i < count; i++) {
      total += (Number(prices[i]) || 0) * (Number(requiredAmount[i]) || 0);
    }
    return total.toFixed(2);
  };

  const resetForm = () => {
    rowIdRef.current = 0;
    setRowKeys([]);
    form.reset(emptyFormValues(tenantScope));
  };

  const onSubmit = async (values: CashoutValues) => {
    try {
      await CreateCashout({
        ...values,
        HotelName: tenantScope,
        totalCalc: parseFloat(calculateGrandTotal()),
      });
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error(error);
    }
  };

  const grandTotal = calculateGrandTotal();
  const hasLines = rowKeys.length > 0;

  return (
    <Form {...form}>
      <form
        className={cn("flex w-full flex-col", hasLines && "pb-28 md:pb-0")}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {!hasLines ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/15 px-6 py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Receipt className="h-7 w-7 text-primary/70" />
            </div>
            <p className="text-lg font-semibold">Add expense lines</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Enter item name, quantity, unit, and unit price for each
              petty-cash purchase. Totals sync to Admin reports for{" "}
              <span className="font-medium text-foreground">{venueLabel}</span>.
            </p>
            <Button
              type="button"
              variant="default"
              size="lg"
              className="mt-6 gap-2 shadow-sm"
              onClick={addNewItem}
            >
              <Plus className="h-4 w-4" />
              Add first line
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Expense lines</p>
                <Badge variant="secondary">{rowKeys.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Property:{" "}
                <span className="font-medium text-foreground">{venueLabel}</span>
              </p>
            </div>

            <CashoutColumnHeaders />

            <ScrollArea className="h-[min(58vh,560px)]">
              <div className="space-y-3 pr-3">
                {rowKeys.map((key, index) => (
                  <CashoutLineRow
                    key={key}
                    index={index}
                    form={form}
                    onRemove={() => removeItem(index)}
                    lineTotal={calculateItemTotal(index)}
                  />
                ))}
              </div>
            </ScrollArea>

            <Button
              type="button"
              variant="outline"
              onClick={addNewItem}
              className="mt-3 w-full border-dashed sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add another line
            </Button>
          </>
        )}

        {hasLines ? (
          <div
            className={cn(
              "border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80",
              "fixed inset-x-0 bottom-0 z-20 border-border/80 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]",
              "md:static md:mt-5 md:rounded-2xl md:border md:px-5 md:py-4 md:shadow-sm",
            )}
          >
            <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Grand total
                </p>
                <p className="text-2xl font-bold tracking-tight text-primary">
                  {grandTotal} ETB
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {rowKeys.length} line{rowKeys.length !== 1 ? "s" : ""} ready
                </p>
              </div>
              <PendingButton
                type="submit"
                pending={submitting}
                size="lg"
                className="w-full shrink-0 shadow-sm sm:w-auto sm:min-w-[200px]"
              >
                {submitting ? "Saving…" : "Submit cashout"}
              </PendingButton>
            </div>
          </div>
        ) : null}
      </form>
    </Form>
  );
}
