"use client";

import { useMemo, useState } from "react";
import type { ItemRegistration, ItemStatus, PurchaseRequestRow } from "@/lib/actions";
import {
  creditAmountETB,
  isVatEnabled,
  itemPaymentBucket,
  itemPaymentLabel,
  lineOwedETB,
} from "@/lib/hotelInventoryPayment";
import {
  exportHotelInventoryWorkbook,
  exportRowsExcel,
} from "@/lib/hotelInventoryExcelExport";
import {
  formatQtyWithUnit,
  HOTEL_INVENTORY_COPY,
} from "@/lib/hotelDisplayLabels";
import { ActiveInventoryPaymentSummary } from "@/components/hotel/ActiveInventoryPaymentSummary";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

type PayFilter = "all" | "credit" | "paid" | "none";
type VatFilter = "all" | "with" | "without";

function paymentBadgeClass(bucket: ReturnType<typeof itemPaymentBucket>) {
  if (bucket === "paid")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (bucket === "credit")
    return "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  if (bucket === "none")
    return "border-border/70 bg-muted/50 text-muted-foreground";
  return "font-normal";
}

export function HotelInventoryPaymentVatPanel({
  tenantLabel,
  inventoryItems,
  purchasePipeline,
  inactiveItems,
}: {
  tenantLabel: string;
  inventoryItems: ItemRegistration[];
  purchasePipeline: PurchaseRequestRow[];
  inactiveItems: ItemStatus[];
}) {
  const [payFilter, setPayFilter] = useState<PayFilter>("all");
  const [vatFilter, setVatFilter] = useState<VatFilter>("all");

  const filtered = useMemo(() => {
    return inventoryItems.filter((r) => {
      const bucket = itemPaymentBucket(r);
      if (payFilter !== "all" && bucket !== payFilter) return false;
      const withVat = isVatEnabled(r.purchaseWithVat);
      if (vatFilter === "with" && !withVat) return false;
      if (vatFilter === "without" && withVat) return false;
      return true;
    });
  }, [inventoryItems, payFilter, vatFilter]);

  const filteredLineTotal = useMemo(
    () => filtered.reduce((sum, r) => sum + lineOwedETB(r), 0),
    [filtered],
  );

  const fileBase = `${tenantLabel || "property"}_inventory`;

  return (
    <div className="space-y-6">
      <Card className="border-primary/15 shadow-lg overflow-hidden bg-card/95 ring-1 ring-black/3 dark:ring-white/6">
        <div className="h-1 bg-linear-to-r from-primary/60 via-violet-500/45 to-cyan-500/40" />
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg sm:text-xl tracking-tight">
                {HOTEL_INVENTORY_COPY.paymentAndTax}
              </CardTitle>
              <CardDescription className="max-w-2xl text-pretty">
                See which {HOTEL_INVENTORY_COPY.inventoryItems.toLowerCase()} are fully
                paid, on credit, or have no balance, and whether the purchase was
                recorded with VAT. Export the tables below to Excel for accounting.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <ActiveInventoryPaymentSummary items={inventoryItems} />

      <Card className="border-border/80 bg-card/95 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/20 py-4">
          <CardTitle className="text-sm font-semibold">Filters</CardTitle>
          <CardDescription>
            Narrow the table by supplier payment status and VAT recording.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-muted-foreground self-center mr-1">
                Supplier payment:
              </span>
              {(
                [
                  ["all", "All"],
                  ["credit", "On credit"],
                  ["paid", "Fully paid"],
                  ["none", "No balance"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={payFilter === id ? "default" : "outline"}
                  className="h-8 rounded-full px-3.5"
                  onClick={() => setPayFilter(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-muted-foreground self-center mr-1">
                VAT:
              </span>
              {(
                [
                  ["all", "All"],
                  ["with", "With VAT"],
                  ["without", "Without VAT"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={vatFilter === id ? "secondary" : "outline"}
                  className="h-8 rounded-full px-3.5"
                  onClick={() => setVatFilter(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/50">
            <Button
              type="button"
              variant="default"
              className="gap-2 shadow-sm"
              onClick={() =>
                exportHotelInventoryWorkbook(fileBase, {
                  inventoryItems,
                  purchasePipeline,
                  inactiveItems,
                })
              }
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export full workbook (Excel)
            </Button>
            <p className="text-xs text-muted-foreground text-pretty max-w-xl">
              Includes {HOTEL_INVENTORY_COPY.inventoryItems.toLowerCase()},{" "}
              {HOTEL_INVENTORY_COPY.purchasePipeline.toLowerCase()}, inactive
              movements, and supplier payment / VAT columns.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border/80 bg-card/95 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
        <div className="border-b border-border/60 bg-muted/25 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Filtered list
            </span>
            <p className="text-sm font-medium tabular-nums mt-0.5">
              {filtered.length} line{filtered.length !== 1 ? "s" : ""}
              <span className="text-muted-foreground font-normal">
                {" "}
                · {filteredLineTotal.toLocaleString()} ETB total value
              </span>
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 h-8"
            onClick={() => {
              exportRowsExcel(
                `${fileBase}_payment_vat_filtered`,
                "Filtered",
                filtered.map((r) => ({
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
                })),
              );
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Export this filter
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Line value (ETB)</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Credit amount (ETB)</TableHead>
                <TableHead>VAT</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Supplier TIN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-14"
                  >
                    No rows match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const bucket = itemPaymentBucket(r);
                  const withVat = isVatEnabled(r.purchaseWithVat);
                  return (
                    <TableRow
                      key={r.id}
                      className="hover:bg-muted/25 transition-colors"
                    >
                      <TableCell className="font-medium max-w-[200px]">
                        {r.name}
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap text-muted-foreground">
                        {formatQtyWithUnit(r.amount, r.measuredBy)}
                      </TableCell>
                      <TableCell className="tabular-nums text-right font-medium">
                        {lineOwedETB(r).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("font-normal", paymentBadgeClass(bucket))}
                        >
                          {itemPaymentLabel(bucket)}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-right">
                        {bucket === "credit"
                          ? creditAmountETB(r).toLocaleString()
                          : "0"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={withVat ? "secondary" : "outline"}
                          className={cn(
                            "font-normal",
                            withVat &&
                              "bg-violet-500/10 text-violet-800 dark:text-violet-200 border-violet-500/25",
                          )}
                        >
                          {withVat ? "With VAT" : "Without VAT"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">
                        {r.supplierName || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {(r.supplierTinNumber || "").trim() || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
