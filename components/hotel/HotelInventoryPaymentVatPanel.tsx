"use client";

import { useMemo, useState } from "react";
import type { ItemRegistration, ItemStatus, PurchaseRequestRow } from "@/lib/actions";
import {
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
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet } from "lucide-react";

type PayFilter = "all" | "credit" | "paid" | "none";
type VatFilter = "all" | "with" | "without";

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
      const withVat = r.purchaseWithVat === true;
      if (vatFilter === "with" && !withVat) return false;
      if (vatFilter === "without" && withVat) return false;
      return true;
    });
  }, [inventoryItems, payFilter, vatFilter]);

  const fileBase = `${tenantLabel || "property"}_inventory`;

  return (
    <div className="space-y-6">
      <Card className="border-primary/15 shadow-md overflow-hidden">
        <div className="h-0.5 bg-linear-to-r from-primary/60 to-violet-500/40" />
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl tracking-tight">
            {HOTEL_INVENTORY_COPY.paymentAndTax}
          </CardTitle>
          <CardDescription className="max-w-2xl text-pretty">
            See which {HOTEL_INVENTORY_COPY.inventoryItems.toLowerCase()} are fully paid,
            on credit, or have no balance, and whether the purchase was recorded with VAT.
            Export the tables below to Excel for accounting.
          </CardDescription>
        </CardHeader>
      </Card>

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
              className="h-8 rounded-full"
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
              className="h-8 rounded-full"
              onClick={() => setVatFilter(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="default"
          className="gap-2"
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
        <p className="text-xs text-muted-foreground w-full sm:w-auto sm:self-center">
          Includes {HOTEL_INVENTORY_COPY.inventoryItems.toLowerCase()},{" "}
          {HOTEL_INVENTORY_COPY.purchasePipeline.toLowerCase()}, inactive movements, and
          supplier payment / VAT columns.
        </p>
      </div>

      <div className="rounded-xl border border-border/80 bg-card/95 shadow-sm overflow-x-auto">
        <div className="border-b border-border/60 bg-muted/25 px-4 py-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filtered list ({filtered.length})
          </span>
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
                  purchase_includes_vat:
                    r.purchaseWithVat === true ? "With VAT" : "Without VAT",
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
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Item</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Line value (ETB)</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>VAT</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Supplier TIN</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No rows match these filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[200px]">{r.name}</TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatQtyWithUnit(r.amount, r.measuredBy)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {lineOwedETB(r).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {itemPaymentLabel(itemPaymentBucket(r))}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.purchaseWithVat === true ? "With VAT" : "Without VAT"}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {r.supplierName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(r.supplierTinNumber || "").trim() || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
