"use client";

import { useMemo, useState } from "react";
import type { ItemRegistration } from "@/lib/actions";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  creditAmountETB,
  isVatEnabled,
  itemPaymentBucket,
  itemPaymentLabel,
  lineOwedETB,
} from "@/lib/hotelInventoryPayment";
import { buildInventoryPaymentColumns } from "@/lib/dataTableColumns/inventoryPayment";
import { exportRowsExcel } from "@/lib/hotelInventoryExcelExport";
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import {
  matchesCreditAmountFilter,
  matchesRegistrationDateRange,
  rowRegistrationYmd,
  type CreditAmountFilter,
} from "@/lib/panelFilters";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import {
  FilterChipGroup,
  ListPanelFilterBar,
} from "@/components/hotel/ListPanelFilterBar";
import { Download, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentCategoryMode =
  | "credit"
  | "paid"
  | "with-vat"
  | "without-vat";

const COPY: Record<
  PaymentCategoryMode,
  { title: string; description: string; sheet: string }
> = {
  credit: {
    title: "Credit receiving vouchers",
    description:
      "Inventory items received on supplier credit — full or partial payment recorded.",
    sheet: "Credit_vouchers",
  },
  paid: {
    title: "Paid receiving items",
    description:
      "Inventory lines where the supplier has been paid in full at registration.",
    sheet: "Paid_receiving",
  },
  "with-vat": {
    title: "Items purchased with VAT",
    description:
      "Registrations where unit price includes 15% VAT on the purchase.",
    sheet: "With_VAT",
  },
  "without-vat": {
    title: "Items purchased without VAT",
    description: "Registrations recorded at net unit price without VAT.",
    sheet: "Without_VAT",
  },
};

const CREDIT_AMOUNT_OPTIONS: { id: CreditAmountFilter; label: string }[] = [
  { id: "all", label: "All credit" },
  { id: "under_10k", label: "Under 10k ETB" },
  { id: "10k_50k", label: "10k – 50k ETB" },
  { id: "over_50k", label: "Over 50k ETB" },
];

const inventoryColumns = buildInventoryPaymentColumns();

function filterRowsByMode(
  items: ItemRegistration[],
  mode: PaymentCategoryMode,
): ItemRegistration[] {
  return items.filter((r) => {
    if (mode === "credit") return itemPaymentBucket(r) === "credit";
    if (mode === "paid") return itemPaymentBucket(r) === "paid";
    if (mode === "with-vat") return isVatEnabled(r.purchaseWithVat);
    return !isVatEnabled(r.purchaseWithVat);
  });
}

export function HotelInventoryPaymentCategoryPanel({
  mode,
  tenantLabel,
  inventoryItems,
}: {
  mode: PaymentCategoryMode;
  tenantLabel: string;
  inventoryItems: ItemRegistration[];
}) {
  const meta = COPY[mode];
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [creditAmountFilter, setCreditAmountFilter] =
    useState<CreditAmountFilter>("all");
  const [creditMin, setCreditMin] = useState("");
  const [creditMax, setCreditMax] = useState("");

  const creditMinNum = creditMin.trim() ? Number(creditMin) : null;
  const creditMaxNum = creditMax.trim() ? Number(creditMax) : null;

  const filtered = useMemo(() => {
    return filterRowsByMode(inventoryItems, mode).filter((r) => {
      if (!matchesRegistrationDateRange(r.registrationDate, dateFrom, dateTo)) {
        return false;
      }
      if (mode === "credit") {
        return matchesCreditAmountFilter(
          r,
          creditAmountFilter,
          creditMinNum != null && Number.isFinite(creditMinNum)
            ? creditMinNum
            : null,
          creditMaxNum != null && Number.isFinite(creditMaxNum)
            ? creditMaxNum
            : null,
        );
      }
      return true;
    });
  }, [
    inventoryItems,
    mode,
    dateFrom,
    dateTo,
    creditAmountFilter,
    creditMinNum,
    creditMaxNum,
  ]);

  const totalValue = useMemo(
    () => filtered.reduce((s, r) => s + lineOwedETB(r), 0),
    [filtered],
  );
  const totalCredit = useMemo(
    () => filtered.reduce((s, r) => s + creditAmountETB(r), 0),
    [filtered],
  );
  const fileBase = `${tenantLabel || "property"}_inventory`;

  const modeCount = useMemo(
    () => filterRowsByMode(inventoryItems, mode).length,
    [inventoryItems, mode],
  );

  const hasActiveFilters =
    dateFrom !== "" ||
    dateTo !== "" ||
    (mode === "credit" &&
      (creditAmountFilter !== "all" || creditMin !== "" || creditMax !== ""));

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setCreditAmountFilter("all");
    setCreditMin("");
    setCreditMax("");
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/15 shadow-md overflow-hidden bg-card/95">
        <div className="h-1 bg-linear-to-r from-primary/50 via-violet-500/40 to-cyan-500/35" />
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{meta.title}</CardTitle>
              <CardDescription className="max-w-2xl text-pretty">
                {meta.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0">
          <p className="text-sm tabular-nums">
            <span className="font-semibold">{filtered.length}</span> of{" "}
            {modeCount} line{modeCount !== 1 ? "s" : ""} shown
            <span className="text-muted-foreground">
              {" "}
              · {totalValue.toLocaleString()} ETB line value
              {mode === "credit" ? ` · ${totalCredit.toLocaleString()} ETB credit` : ""}
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 cursor-pointer"
            disabled={!filtered.length}
            onClick={() =>
              exportRowsExcel(
                `${fileBase}_${meta.sheet}`,
                meta.sheet,
                filtered.map((r) => ({
                  id: r.id,
                  item_name: r.name,
                  quantity_with_unit: formatQtyWithUnit(r.amount, r.measuredBy),
                  line_value_etb: lineOwedETB(r),
                  payment_status: itemPaymentLabel(itemPaymentBucket(r)),
                  credit_amount_etb: creditAmountETB(r),
                  purchase_includes_vat: isVatEnabled(r.purchaseWithVat)
                    ? "With VAT"
                    : "Without VAT",
                  supplier_name: r.supplierName,
                  supplier_phone: r.supplierPhone,
                  supplier_tin: (r.supplierTinNumber || "").trim(),
                  paid_etb: r.paidAmount,
                  registered_on: rowRegistrationYmd(r.registrationDate),
                })),
              )
            }
          >
            <Download className="h-3.5 w-3.5" />
            Export to Excel
          </Button>
        </CardContent>
      </Card>

      <ListPanelFilterBar showClear={hasActiveFilters} onClear={clearFilters}>
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex flex-wrap gap-3 items-end">
            <HotelDayPicker
              label="Registered from"
              value={dateFrom}
              onChange={setDateFrom}
              className="min-w-[200px]"
              placeholder="Any date"
            />
            <HotelDayPicker
              label="Registered to"
              value={dateTo}
              onChange={setDateTo}
              className="min-w-[200px]"
              placeholder="Any date"
            />
          </div>
          {mode === "credit" ? (
            <div className="flex flex-col gap-3 flex-1 min-w-[240px]">
              <FilterChipGroup
                label="Credit amount (ETB)"
                value={creditAmountFilter}
                onChange={setCreditAmountFilter}
                options={CREDIT_AMOUNT_OPTIONS}
              />
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="credit-min" className="text-xs">
                    Min credit (ETB)
                  </Label>
                  <Input
                    id="credit-min"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={creditMin}
                    onChange={(e) => setCreditMin(e.target.value)}
                    className="h-9 w-32 tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="credit-max" className="text-xs">
                    Max credit (ETB)
                  </Label>
                  <Input
                    id="credit-max"
                    type="number"
                    min={0}
                    placeholder="Any"
                    value={creditMax}
                    onChange={(e) => setCreditMax(e.target.value)}
                    className="h-9 w-32 tabular-nums"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </ListPanelFilterBar>

      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable
          columns={inventoryColumns}
          data={filtered}
          hideToolbar
          searchColumnId="name"
          emptyMessage="No rows match these filters."
        />
      </div>
    </div>
  );
}
