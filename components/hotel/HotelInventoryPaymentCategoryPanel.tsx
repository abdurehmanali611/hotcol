"use client";

import { useMemo, useState } from "react";
import type { FreshBazaarRow, ItemRegistration } from "@/lib/actions";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  creditAmountETB,
  formatPaymentSourceBreakdown,
  groupInventoryPaymentRowsByItem,
  isVatEnabled,
  itemPaymentBucket,
  itemPaymentLabel,
  lineOwedETB,
  lineVatETB,
  mergeInventoryPaymentRows,
  registeredAmountOf,
} from "@/lib/hotelInventoryPayment";
import type { InventoryPaymentRow } from "@/lib/hotelInventoryPayment";
import { buildInventoryPaymentGroupColumns } from "@/lib/dataTableColumns/inventoryPayment";
import { exportRowsExcel } from "@/lib/hotelInventoryExcelExport";
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import {
  matchesCreditAmountFilter,
  matchesRegistrationDateRange,
  rowRegistrationYmd,
  type CreditAmountFilter,
} from "@/lib/panelFilters";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { ListPanelFilterBar } from "@/components/hotel/ListPanelFilterBar";
import { Download, Filter, Receipt } from "lucide-react";
import { useDepartmentLeaderSelectOptions } from "@/hooks/useDepartmentLeaderSelectOptions";
import {
  REGISTRATION_RECEIVED_BY_CODES,
  matchesDepartmentLeaderFilter,
} from "@/lib/departments";
import { Label } from "@/components/ui/label";

export type PaymentCategoryMode =
  | "all"
  | "credit"
  | "paid"
  | "with-vat"
  | "without-vat";

const COPY: Record<
  PaymentCategoryMode,
  { title: string; description: string; sheet: string }
> = {
  all: {
    title: "All inventory payment & tax lines",
    description:
      "Items rolled into one row each — fresh bazaar, stocked-out, and in-store counts show under the name. Hover or click the item or supplier for line-level detail.",
    sheet: "All_payment_tax",
  },
  credit: {
    title: "Credit receiving vouchers",
    description:
      "Store inventory and fresh bazaar (fully stocked-out kitchen/bar) lines received on supplier credit — full or partial payment recorded.",
    sheet: "Credit_vouchers",
  },
  paid: {
    title: "Paid receiving items",
    description:
      "Store and fresh bazaar lines where the supplier has been paid in full at registration.",
    sheet: "Paid_receiving",
  },
  "with-vat": {
    title: "Items purchased with VAT",
    description:
      "Store and fresh bazaar registrations where unit price includes 15% VAT on the purchase.",
    sheet: "With_VAT",
  },
  "without-vat": {
    title: "Items purchased without VAT",
    description:
      "Store and fresh bazaar registrations recorded at net unit price without VAT.",
    sheet: "Without_VAT",
  },
};

const CREDIT_AMOUNT_OPTIONS: { id: CreditAmountFilter; label: string }[] = [
  { id: "all", label: "All credit" },
  { id: "under_10k", label: "Under 10k ETB" },
  { id: "10k_50k", label: "10k – 50k ETB" },
  { id: "over_50k", label: "Over 50k ETB" },
];

type VatFilter = "all" | "with" | "without";
type PayFilter = "all" | "credit" | "paid";
type SourceFilter = "all" | "store" | "fresh_bazaar";

const VAT_FILTER_OPTIONS: { id: VatFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "with", label: "With VAT" },
  { id: "without", label: "Without VAT" },
];

const PAY_FILTER_OPTIONS: { id: PayFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "paid", label: "Fully paid" },
  { id: "credit", label: "On credit" },
];

const SOURCE_FILTER_OPTIONS: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "Store + fresh bazaar" },
  { id: "store", label: "Store / stocked out (non-fresh)" },
  { id: "fresh_bazaar", label: "Fresh bazaar only (kitchen/bar)" },
];

const DEPARTMENT_SELECT_ALL = "__all_departments__";

function filterRowsByMode(
  items: InventoryPaymentRow[],
  mode: PaymentCategoryMode,
): InventoryPaymentRow[] {
  if (mode === "all") return items;
  return items.filter((r) => {
    if (mode === "credit") return itemPaymentBucket(r) === "credit";
    if (mode === "paid") return itemPaymentBucket(r) === "paid";
    if (mode === "with-vat") return isVatEnabled(r.purchaseWithVat);
    return !isVatEnabled(r.purchaseWithVat);
  });
}

function supplierKey(name: string | null | undefined): string {
  return String(name ?? "").trim();
}

export function HotelInventoryPaymentCategoryPanel({
  mode,
  tenantLabel,
  inventoryItems,
  freshBazaarArchives = [],
  stockOutMovements = [],
}: {
  mode: PaymentCategoryMode;
  tenantLabel: string;
  inventoryItems: ItemRegistration[];
  /** Fully stocked-out kitchen/bar-received lines archived as fresh bazaar. */
  freshBazaarArchives?: FreshBazaarRow[];
  /** Approved stock movements — used to sum registered qty and classify fresh bazaar. */
  stockOutMovements?: {
    itemRegistrationId: number;
    amount: number;
    status: string;
    movementType?: string | null;
    requestedByDepartment?: string | null;
    stakeHolderOrReason?: string | null;
  }[];
}) {
  const meta = COPY[mode];
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [creditAmountFilter, setCreditAmountFilter] =
    useState<CreditAmountFilter>("all");
  const [vatFilter, setVatFilter] = useState<VatFilter>("all");
  const [payFilter, setPayFilter] = useState<PayFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  /** Empty = all suppliers; otherwise case-insensitive contains match. */
  const [supplierQuery, setSupplierQuery] = useState("");
  /** Empty = all departments. Shown for credit / fully paid modes. */
  const [departmentFilter, setDepartmentFilter] = useState("");

  const { options: departmentFilterOptions } = useDepartmentLeaderSelectOptions(
    REGISTRATION_RECEIVED_BY_CODES,
  );

  const showDepartmentFilter =
    mode === "credit" ||
    mode === "paid" ||
    mode === "with-vat" ||
    mode === "without-vat";
  const inventoryGroupColumns = useMemo(
    () =>
      buildInventoryPaymentGroupColumns({
        showVatAmountColumns: mode === "with-vat",
      }),
    [mode],
  );

  const paymentRows = useMemo(
    () =>
      mergeInventoryPaymentRows(
        inventoryItems,
        freshBazaarArchives,
        stockOutMovements,
      ),
    [inventoryItems, freshBazaarArchives, stockOutMovements],
  );

  const supplierOptions = useMemo(() => {
    const names = new Set<string>();
    for (const r of paymentRows) {
      const s = supplierKey(r.supplierName);
      if (s) names.add(s);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [paymentRows]);

  const supplierQueryNormalized = supplierQuery.trim().toLowerCase();

  const matchedSupplierOptions = useMemo(() => {
    if (!supplierQueryNormalized) return supplierOptions;
    return supplierOptions.filter((name) =>
      name.toLowerCase().includes(supplierQueryNormalized),
    );
  }, [supplierOptions, supplierQueryNormalized]);

  const sourceCounts = useMemo(() => {
    let store = 0;
    let fresh = 0;
    let depleted = 0;
    const freshSuppliers = new Set<string>();
    for (const r of paymentRows) {
      if (r.paymentSource === "fresh_bazaar") {
        fresh += 1;
        const s = supplierKey(r.supplierName);
        if (s) freshSuppliers.add(s);
      } else if (r.paymentSource === "depleted") {
        depleted += 1;
      } else store += 1;
    }
    return {
      store,
      fresh,
      depleted,
      freshSupplierCount: freshSuppliers.size,
    };
  }, [paymentRows]);

  // Credit/Paid submenus offer a VAT filter; the VAT submenus offer a supplier
  // payment-status (fully paid / on credit) filter. "All" offers both.
  const showVatFilter =
    mode === "all" || mode === "credit" || mode === "paid";
  const showPayFilter =
    mode === "all" || mode === "with-vat" || mode === "without-vat";

  const filtered = useMemo(() => {
    return filterRowsByMode(paymentRows, mode)
      .filter((r) => {
        if (sourceFilter === "store" && r.paymentSource === "fresh_bazaar") {
          return false;
        }
        if (
          sourceFilter === "fresh_bazaar" &&
          r.paymentSource !== "fresh_bazaar"
        ) {
          return false;
        }
        if (
          supplierQueryNormalized &&
          !supplierKey(r.supplierName)
            .toLowerCase()
            .includes(supplierQueryNormalized)
        ) {
          return false;
        }
        if (!matchesRegistrationDateRange(r.registrationDate, dateFrom, dateTo)) {
          return false;
        }
        if (
          mode === "credit" &&
          !matchesCreditAmountFilter(r, creditAmountFilter, null, null)
        ) {
          return false;
        }
        if (showVatFilter && vatFilter !== "all") {
          const withVat = isVatEnabled(r.purchaseWithVat);
          if (vatFilter === "with" && !withVat) return false;
          if (vatFilter === "without" && withVat) return false;
        }
        if (showPayFilter && payFilter !== "all") {
          if (itemPaymentBucket(r) !== payFilter) return false;
        }
        if (
          showDepartmentFilter &&
          departmentFilter &&
          !matchesDepartmentLeaderFilter(
            r.receivedByDepartment,
            r.receivedByLeaderName,
            departmentFilter,
          )
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const sup = supplierKey(a.supplierName).localeCompare(
          supplierKey(b.supplierName),
        );
        if (sup !== 0) return sup;
        const src =
          (a.paymentSource === "fresh_bazaar" ? 1 : 0) -
          (b.paymentSource === "fresh_bazaar" ? 1 : 0);
        if (src !== 0) return src;
        return String(a.name).localeCompare(String(b.name));
      });
  }, [
    paymentRows,
    mode,
    sourceFilter,
    supplierQueryNormalized,
    dateFrom,
    dateTo,
    creditAmountFilter,
    vatFilter,
    payFilter,
    showVatFilter,
    showPayFilter,
    showDepartmentFilter,
    departmentFilter,
  ]);

  const totalValue = useMemo(
    () => filtered.reduce((s, r) => s + lineOwedETB(r), 0),
    [filtered],
  );

  const totalVatValue = useMemo(
    () => filtered.reduce((s, r) => s + lineVatETB(r), 0),
    [filtered],
  );

  const totalPaidValue = useMemo(
    () => filtered.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0),
    [filtered],
  );

  const filteredBreakdown = useMemo(() => {
    let freshLines = 0;
    let freshQty = 0;
    let depletedLines = 0;
    let depletedQty = 0;
    let storeLines = 0;
    let storeQty = 0;
    for (const r of filtered) {
      const q = registeredAmountOf(r);
      if (r.paymentSource === "fresh_bazaar") {
        freshLines += 1;
        freshQty += q;
      } else if (r.paymentSource === "depleted") {
        depletedLines += 1;
        depletedQty += q;
      } else {
        storeLines += 1;
        storeQty += q;
      }
    }
    return {
      freshLines,
      freshQty,
      depletedLines,
      depletedQty,
      storeLines,
      storeQty,
    };
  }, [filtered]);

  const grouped = useMemo(
    () => groupInventoryPaymentRowsByItem(filtered),
    [filtered],
  );
  const totalCredit = useMemo(
    () => filtered.reduce((s, r) => s + creditAmountETB(r), 0),
    [filtered],
  );
  const fileBase = `${tenantLabel || "property"}_inventory`;

  const modeCount = useMemo(
    () => filterRowsByMode(paymentRows, mode).length,
    [paymentRows, mode],
  );

  const hasActiveFilters =
    dateFrom !== "" ||
    dateTo !== "" ||
    sourceFilter !== "all" ||
    supplierQueryNormalized !== "" ||
    (mode === "credit" && creditAmountFilter !== "all") ||
    (showVatFilter && vatFilter !== "all") ||
    (showPayFilter && payFilter !== "all") ||
    (showDepartmentFilter && departmentFilter !== "");

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setCreditAmountFilter("all");
    setVatFilter("all");
    setPayFilter("all");
    setSourceFilter("all");
    setSupplierQuery("");
    setDepartmentFilter("");
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
              <p className="text-xs text-muted-foreground pt-1 tabular-nums">
                Loaded: {sourceCounts.store} store · {sourceCounts.fresh} fresh
                bazaar ({sourceCounts.freshSupplierCount} supplier
                {sourceCounts.freshSupplierCount !== 1 ? "s" : ""})
                {sourceCounts.depleted > 0
                  ? ` · ${sourceCounts.depleted} stocked out (non-fresh)`
                  : ""}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0">
          <p className="text-sm tabular-nums">
            <span className="font-semibold">{grouped.length}</span> item
            {grouped.length !== 1 ? "s" : ""} · {filtered.length} of {modeCount}{" "}
            line{modeCount !== 1 ? "s" : ""}
            <span className="text-muted-foreground">
              {" "}
              · {totalValue.toLocaleString()} ETB line value
              {mode === "credit" ? ` · ${totalCredit.toLocaleString()} ETB credit` : ""}
            </span>
          </p>
          {(filteredBreakdown.freshLines > 0 ||
            filteredBreakdown.depletedLines > 0 ||
            filteredBreakdown.storeLines > 0) && (
            <p className="w-full text-xs text-muted-foreground tabular-nums">
              Across lines:{" "}
              {formatPaymentSourceBreakdown({
                freshBazaarLines: filteredBreakdown.freshLines,
                depletedLines: filteredBreakdown.depletedLines,
                storeLines: filteredBreakdown.storeLines,
              })}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 cursor-pointer"
            disabled={!filtered.length}
            onClick={() => {
              const rows = grouped.map((g) => {
                const fullyPaid = g.paymentBucket === "paid";
                return {
                  item_name: g.name,
                  line_count: g.lineCount,
                  source: formatPaymentSourceBreakdown(g),
                  quantity_with_unit: formatQtyWithUnit(
                    g.totalQty,
                    g.measuredBy,
                  ),
                  line_value_etb: g.totalLineValue,
                  vat_amount_etb: g.totalVat,
                  payment_status:
                    g.paymentBucket === "mixed"
                      ? "Mixed"
                      : itemPaymentLabel(g.paymentBucket),
                  // Fully paid → exact 0 credit (never float dust)
                  credit_amount_etb: fullyPaid ? 0 : g.totalCredit,
                  // Fully paid → paid equals line value so Excel SUM matches Total price
                  paid_etb: fullyPaid ? g.totalLineValue : g.totalPaid,
                  purchase_includes_vat:
                    g.vatMode === "with"
                      ? "With VAT"
                      : g.vatMode === "without"
                        ? "Without VAT"
                        : "Mixed",
                  supplier_name: g.supplierLabel,
                  registered_from: g.registrationFrom
                    ? rowRegistrationYmd(g.registrationFrom)
                    : "",
                  registered_to: g.registrationTo
                    ? rowRegistrationYmd(g.registrationTo)
                    : "",
                };
              });
              rows.push({
                item_name: "TOTAL",
                line_count: filtered.length,
                source: "",
                quantity_with_unit: "",
                line_value_etb: totalValue,
                vat_amount_etb: totalVatValue,
                payment_status: "",
                credit_amount_etb: totalCredit,
                paid_etb:
                  totalCredit <= 0.01 ? totalValue : totalPaidValue,
                purchase_includes_vat: "",
                supplier_name: "",
                registered_from: "",
                registered_to: "",
              });
              void exportRowsExcel(
                `${fileBase}_${meta.sheet}`,
                meta.sheet,
                rows,
              );
            }}
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
              className="min-w-42.5"
              placeholder="Any date"
            />
            <HotelDayPicker
              label="Registered to"
              value={dateTo}
              onChange={setDateTo}
              className="min-w-42.5"
              placeholder="Any date"
            />
          </div>
          {showDepartmentFilter ? (
            <div className="flex flex-col gap-1.5 min-w-50">
              <Label
                htmlFor={`payment-dept-${mode}`}
                className="text-[10px] font-bold uppercase text-muted-foreground ml-1"
              >
                Department
              </Label>
              <Select
                value={departmentFilter || DEPARTMENT_SELECT_ALL}
                onValueChange={(value) =>
                  setDepartmentFilter(
                    value === DEPARTMENT_SELECT_ALL ? "" : value,
                  )
                }
              >
                <SelectTrigger
                  id={`payment-dept-${mode}`}
                  className="h-10 w-full min-w-50 max-w-xs bg-background border-dashed border-2 hover:border-primary/50 transition-all shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Filter size={14} className="text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All departments" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl">
                  <SelectGroup>
                    <SelectLabel>Department</SelectLabel>
                    <SelectItem
                      value={DEPARTMENT_SELECT_ALL}
                      className="cursor-pointer"
                    >
                      All departments
                    </SelectItem>
                    {departmentFilterOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="cursor-pointer"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5 min-w-42.5">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
              Source
            </span>
            <Select
              value={sourceFilter}
              onValueChange={(v) => setSourceFilter(v as SourceFilter)}
            >
              <SelectTrigger className="h-10 w-full min-w-42.5 max-w-xs bg-background border-dashed border-2 hover:border-primary/50 transition-all shadow-sm cursor-pointer">
                <div className="flex items-center gap-2 min-w-0">
                  <Filter size={14} className="text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All sources" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-2xl">
                <SelectGroup>
                  <SelectLabel>Source</SelectLabel>
                  {SOURCE_FILTER_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.id}
                      value={opt.id}
                      className="cursor-pointer"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-50 max-w-sm">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
              Supplier
            </span>
            <Input
              value={supplierQuery}
              onChange={(e) => setSupplierQuery(e.target.value)}
              placeholder="Type to filter, e.g. mola"
              className="h-10 bg-background border-dashed border-2"
              list="payment-tax-supplier-suggestions"
            />
            <datalist id="payment-tax-supplier-suggestions">
              {matchedSupplierOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {supplierQueryNormalized && matchedSupplierOptions.length === 0 ? (
              <p className="text-[10px] text-amber-700 dark:text-amber-400 px-1">
                No supplier matches “{supplierQuery.trim()}”. Try part of the
                name as saved (e.g. mola). Known:{" "}
                {supplierOptions.slice(0, 4).join(", ")}
                {supplierOptions.length > 4 ? "…" : ""}
              </p>
            ) : null}
          </div>
          {mode === "credit" ? (
            <div className="flex flex-col gap-1.5 min-w-42.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                Credit amount (ETB)
              </span>
              <Select
                value={creditAmountFilter}
                onValueChange={(v) =>
                  setCreditAmountFilter(v as CreditAmountFilter)
                }
              >
                <SelectTrigger className="h-10 w-full min-w-42.5 max-w-xs bg-background border-dashed border-2 hover:border-primary/50 transition-all shadow-sm cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    <Filter size={14} className="text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All credit" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl">
                  <SelectGroup>
                    <SelectLabel>Credit amount</SelectLabel>
                    {CREDIT_AMOUNT_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.id}
                        value={opt.id}
                        className="cursor-pointer"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {showVatFilter ? (
            <div className="flex flex-col gap-1.5 min-w-42.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                VAT
              </span>
              <Select
                value={vatFilter}
                onValueChange={(v) => setVatFilter(v as VatFilter)}
              >
                <SelectTrigger className="h-10 w-full min-w-42.5 max-w-xs bg-background border-dashed border-2 hover:border-primary/50 transition-all shadow-sm cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    <Filter size={14} className="text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl">
                  <SelectGroup>
                    <SelectLabel>VAT recording</SelectLabel>
                    {VAT_FILTER_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.id}
                        value={opt.id}
                        className="cursor-pointer"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {showPayFilter ? (
            <div className="flex flex-col gap-1.5 min-w-42.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                Supplier payment
              </span>
              <Select
                value={payFilter}
                onValueChange={(v) => setPayFilter(v as PayFilter)}
              >
                <SelectTrigger className="h-10 w-full min-w-42.5 max-w-xs bg-background border-dashed border-2 hover:border-primary/50 transition-all shadow-sm cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    <Filter size={14} className="text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl">
                  <SelectGroup>
                    <SelectLabel>Supplier payment</SelectLabel>
                    {PAY_FILTER_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.id}
                        value={opt.id}
                        className="cursor-pointer"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </ListPanelFilterBar>

      <div className="rounded-xl border bg-card shadow-md overflow-hidden">
        <DataTable
          columns={inventoryGroupColumns}
          data={grouped}
          getRowId={(row) => row.groupKey}
          searchColumnId="name"
          searchPlaceholder="Search item name…"
          pageSize={50}
          emptyMessage="No rows match these filters."
          footerSummary={() => {
            return (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs">
                  <span className="font-medium text-muted-foreground">
                    {mode === "with-vat"
                      ? "Total paid incl. VAT"
                      : "Total price"}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {totalValue.toLocaleString()} ETB
                  </span>
                </span>
                {mode === "with-vat" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs">
                    <span className="font-medium text-violet-700 dark:text-violet-400">
                      Total VAT
                    </span>
                    <span className="font-semibold tabular-nums text-violet-800 dark:text-violet-300">
                      {totalVatValue.toLocaleString()} ETB
                    </span>
                  </span>
                ) : null}
                {totalCredit > 0.01 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs">
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      Outstanding credit
                    </span>
                    <span className="font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                      {totalCredit.toLocaleString()} ETB
                    </span>
                  </span>
                ) : null}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
