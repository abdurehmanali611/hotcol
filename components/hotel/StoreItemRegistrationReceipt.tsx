"use client";

import Image from "next/image";
import type { ItemRegistration } from "@/lib/actions";
import type { ReceiptGroupItem } from "@/lib/receiptGrouping";
import { APEX_SOLUTION, HOTCOL_SYSTEM } from "@/constants/branding";
import {
  isVatEnabled,
  itemPaymentLabel,
  itemPaymentBucket,
  lineOwedETB,
} from "@/lib/hotelInventoryPayment";
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import {
  formatVoucherDisplay,
  formatVoucherRange,
} from "@/lib/voucherFormat";
import { amountToWordsETB } from "@/lib/amountInWords";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export type { ReceiptGroupItem } from "@/lib/receiptGrouping";

function formatCategoryLabel(category: string | null | undefined): string {
  const value = String(category || "").trim();
  if (!value) return "Uncategorized item";
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function StoreItemRegistrationReceipt({
  item,
  items,
  propertyName,
  propertyTin,
  logoUrl,
}: {
  item?: ItemRegistration;
  items?: ReceiptGroupItem[];
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
}) {
  const lines: ReceiptGroupItem[] = items?.length ? items : item ? [item] : [];
  const primary = lines[0];
  if (!primary) return null;

  const isMulti = lines.length > 1;
  const property = (propertyName || "Property").trim() || "Property";
  const tin = (propertyTin || "").trim();
  const totalOwed = lines.reduce((s, it) => s + lineOwedETB(it), 0);
  const totalPaid = lines.reduce((s, it) => s + (Number(it.paidAmount) || 0), 0);
  const totalBalance = Math.max(0, totalOwed - totalPaid);
  const prVoucher =
    lines.find((l) => l.purchaseRequestVoucher)?.purchaseRequestVoucher ?? null;
  const registrationVoucher = formatVoucherRange(lines);
  const categoryLabel = formatCategoryLabel(primary.category);

  return (
    <div className="mx-auto max-w-[210mm] bg-white font-sans text-zinc-900 print:text-black">
      <div className="px-8 pb-5 pt-8 print:px-6 print:pt-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            {logoUrl ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-600/25 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={`${property} logo`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-lg font-bold text-emerald-800">
                {property.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                Goods receiving receipt
              </p>
              <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-900">
                {property}
              </h1>
              <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-800">
                Hotel TIN: {tin || "-"}
              </p>
              <p className="mt-0.5 text-xs font-mono text-zinc-600">
                Voucher {registrationVoucher}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {isMulti ? `${lines.length} lines - ${categoryLabel}` : categoryLabel}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
              <Image
                src={HOTCOL_SYSTEM.logoPath}
                alt={HOTCOL_SYSTEM.name}
                width={28}
                height={28}
                className="rounded-md object-cover"
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {HOTCOL_SYSTEM.name}
              </span>
            </div>
            <div className="space-y-0.5 text-right text-xs">
              <p className="font-semibold text-zinc-800">
                {new Date(primary.registrationDate).toLocaleDateString(undefined, {
                  dateStyle: "long",
                })}
              </p>
              {prVoucher ? (
                <p className="font-mono text-zinc-600">PR voucher {prVoucher}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-8 h-1 rounded-full bg-linear-to-r from-emerald-600 via-emerald-400 to-teal-500 print:mx-6" />

      {isMulti ? (
        <div className="space-y-3 px-8 py-6 print:px-6">
          <p className="text-sm font-medium font-mono text-zinc-800">
            Registration vouchers: {registrationVoucher}
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="py-2 pr-2">Voucher</th>
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2 text-right">Qty</th>
                <th className="py-2 pr-2 text-right">Unit</th>
                <th className="py-2 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b border-zinc-100">
                  <td className="py-2.5 pr-2 text-xs font-mono text-zinc-600">
                    {formatVoucherDisplay(line.voucherNumber, line.voucherDisplay)}
                  </td>
                  <td className="py-2.5 pr-2 font-medium">{line.name}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums text-zinc-600">
                    {formatQtyWithUnit(line.amount, line.measuredBy)}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {line.unitPrice.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-medium tabular-nums">
                    {lineOwedETB(line).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="px-8 py-6 print:px-6">
            <div className="flex gap-5 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                {primary.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primary.imageUrl}
                    alt={primary.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-xl font-bold text-emerald-800">
                    {primary.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                <h2 className="text-2xl font-bold tracking-tight">{primary.name}</h2>
                <p className="text-sm text-zinc-600">
                  {formatQtyWithUnit(primary.amount, primary.measuredBy)} received at ETB{" "}
                  {primary.unitPrice.toLocaleString()} / {primary.measuredBy}
                </p>
                <p className="text-xs font-mono text-zinc-500">
                  Voucher {registrationVoucher}
                </p>
                <Badge
                  variant="secondary"
                  className="w-fit border-transparent bg-zinc-100 text-zinc-700"
                >
                  {categoryLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className="mt-1 w-fit border-emerald-500/40 bg-emerald-50 text-emerald-800"
                >
                  {itemPaymentLabel(itemPaymentBucket(primary))}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="mx-8 bg-zinc-200 print:mx-6" />
        </>
      )}

      <div className="grid grid-cols-2 gap-8 px-8 py-6 text-sm print:px-6">
        <section className="space-y-2.5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Supplier
          </h3>
          <p className="text-base font-semibold">{primary.supplierName || "-"}</p>
          <p className="text-zinc-600">{primary.supplierPhone || "-"}</p>
          <p className="leading-snug text-zinc-600">{primary.Address || "-"}</p>
          {(primary.supplierTinNumber || "").trim() ? (
            <p className="font-medium text-zinc-600">
              TIN: {(primary.supplierTinNumber || "").trim()}
            </p>
          ) : null}
        </section>
        <section className="space-y-2.5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Financial summary
          </h3>
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3">
            {!isMulti ? (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Unit price</span>
                  <span className="font-medium tabular-nums">
                    ETB {primary.unitPrice.toLocaleString()}
                  </span>
                </div>
                {primary.dutyFee ? (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Duty fee</span>
                    <span className="font-medium tabular-nums">
                      ETB {primary.dutyFee.toLocaleString()}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-zinc-600">VAT recording</span>
                  <span className="font-medium">
                    {isVatEnabled(primary.purchaseWithVat)
                      ? "With VAT (15%)"
                      : "Without VAT"}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-600">
                Combined total for {lines.length} registration lines.
              </p>
            )}
            <Separator className="bg-zinc-200" />
            <div className="flex justify-between text-base font-bold">
              <span>{isMulti ? "Receipt total" : "Line total"}</span>
              <span className="tabular-nums text-emerald-800">
                ETB {totalOwed.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-zinc-500">In words: {amountToWordsETB(totalOwed)}</p>
            <div className="flex justify-between text-zinc-600">
              <span>Amount paid</span>
              <span className="tabular-nums">ETB {totalPaid.toLocaleString()}</span>
            </div>
            <p className="text-xs text-zinc-500">
              Paid in words: {amountToWordsETB(totalPaid)}
            </p>
            {!isMulti ? (
              <>
                <div className="flex justify-between text-zinc-600">
                  <span>Balance</span>
                  <span className="tabular-nums">ETB {totalBalance.toLocaleString()}</span>
                </div>
                <p className="text-xs text-zinc-500">
                  Balance in words: {amountToWordsETB(totalBalance)}
                </p>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Balance status</span>
                  <span className="font-semibold text-zinc-900">
                    {itemPaymentLabel(itemPaymentBucket(primary))}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mx-8 mb-8 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-white print:mx-6 print:mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src={APEX_SOLUTION.logoPath}
              alt={APEX_SOLUTION.name}
              width={120}
              height={40}
              className="h-9 w-auto object-contain"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{APEX_SOLUTION.name}</p>
              <a
                href={APEX_SOLUTION.website}
                className="text-xs text-zinc-300 underline-offset-2 hover:text-white hover:underline print:text-zinc-300"
              >
                {APEX_SOLUTION.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          </div>
          <div className="max-w-[220px] text-right text-[10px] text-zinc-400">
            <p>Powered by {HOTCOL_SYSTEM.name} inventory</p>
            <p className="mt-0.5">Printed {new Date().toLocaleString()}</p>
          </div>
        </div>
        <p className="mt-3 border-t border-zinc-700/80 pt-3 text-center text-[10px] text-zinc-500">
          Keep this receipt for audit, supplier reconciliation, and property records.
        </p>
      </div>
    </div>
  );
}
