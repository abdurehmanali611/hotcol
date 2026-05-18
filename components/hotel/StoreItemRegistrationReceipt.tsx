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
import { formatVoucherDisplay } from "@/lib/voucherFormat";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export type { ReceiptGroupItem } from "@/lib/receiptGrouping";

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
  const lines: ReceiptGroupItem[] = items?.length
    ? items
    : item
      ? [item]
      : [];
  const primary = lines[0];
  if (!primary) return null;

  const isMulti = lines.length > 1;
  const property = (propertyName || "Property").trim() || "Property";
  const tin = (propertyTin || "").trim();
  const totalOwed = lines.reduce((s, it) => s + lineOwedETB(it), 0);
  const totalPaid = lines.reduce((s, it) => s + (Number(it.paidAmount) || 0), 0);
  const prVoucher =
    lines.find((l) => l.purchaseRequestVoucher)?.purchaseRequestVoucher ?? null;

  return (
    <div className="bg-white text-zinc-900 max-w-[210mm] mx-auto font-sans print:text-black">
      <div className="px-8 pt-8 pb-5 print:px-6 print:pt-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
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
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-lg">
                {property.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                Goods receiving receipt
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 truncate">
                {property}
              </h1>
              {tin ? (
                <p className="text-xs text-zinc-600 mt-0.5">Property TIN: {tin}</p>
              ) : null}
              <p className="text-xs text-zinc-500 mt-1">
                {isMulti
                  ? `${lines.length} lines · ${primary.category}`
                  : `Registration #${primary.id} · ${primary.category}`}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
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
            <div className="text-right text-xs space-y-0.5">
              <p className="font-semibold text-zinc-800">
                {new Date(primary.registrationDate).toLocaleDateString(undefined, {
                  dateStyle: "long",
                })}
              </p>
              {prVoucher ? (
                <p className="text-zinc-600 font-mono">PR voucher {prVoucher}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-8 h-1 rounded-full bg-linear-to-r from-emerald-600 via-emerald-400 to-teal-500 print:mx-6" />

      {isMulti ? (
        <div className="px-8 py-6 print:px-6">
          <table className="w-full text-sm border-collapse">
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
                  <td className="py-2.5 pr-2 font-mono text-xs text-zinc-600">
                    {formatVoucherDisplay(line.voucherNumber, line.voucherDisplay)}
                  </td>
                  <td className="py-2.5 pr-2 font-medium">{line.name}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums text-zinc-600">
                    {formatQtyWithUnit(line.amount, line.measuredBy)}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {line.unitPrice.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-medium">
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
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-zinc-200 shadow-sm bg-white">
                {primary.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primary.imageUrl}
                    alt={primary.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-800 font-bold text-xl">
                    {primary.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <h2 className="text-2xl font-bold tracking-tight">{primary.name}</h2>
                <p className="text-sm text-zinc-600">
                  {formatQtyWithUnit(primary.amount, primary.measuredBy)} received at
                  ETB {primary.unitPrice.toLocaleString()} / {primary.measuredBy}
                </p>
                <p className="text-xs font-mono text-zinc-500">
                  Voucher{" "}
                  {formatVoucherDisplay(
                    primary.voucherNumber,
                    primary.voucherDisplay,
                  )}
                </p>
                <Badge
                  variant="outline"
                  className="w-fit mt-1 border-emerald-500/40 text-emerald-800 bg-emerald-50"
                >
                  {itemPaymentLabel(itemPaymentBucket(primary))}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="mx-8 bg-zinc-200 print:mx-6" />
        </>
      )}

      <div className="px-8 py-6 grid grid-cols-2 gap-8 text-sm print:px-6">
        <section className="space-y-2.5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Supplier
          </h3>
          <p className="font-semibold text-base">{primary.supplierName || "—"}</p>
          <p className="text-zinc-600">{primary.supplierPhone || "—"}</p>
          <p className="text-zinc-600 leading-snug">{primary.Address || "—"}</p>
          {(primary.supplierTinNumber || "").trim() ? (
            <p className="text-zinc-600 font-medium">
              TIN: {(primary.supplierTinNumber || "").trim()}
            </p>
          ) : null}
        </section>
        <section className="space-y-2.5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Financial summary
          </h3>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2">
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
              <p className="text-zinc-600 text-xs">
                Combined total for {lines.length} registration lines.
              </p>
            )}
            <Separator className="bg-zinc-200" />
            <div className="flex justify-between font-bold text-base">
              <span>{isMulti ? "Receipt total" : "Line total"}</span>
              <span className="tabular-nums text-emerald-800">
                ETB {totalOwed.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Amount paid</span>
              <span className="tabular-nums">ETB {totalPaid.toLocaleString()}</span>
            </div>
            {!isMulti ? (
              <div className="flex justify-between">
                <span className="text-zinc-600">Balance status</span>
                <span className="font-semibold text-zinc-900">
                  {itemPaymentLabel(itemPaymentBucket(primary))}
                </span>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mx-8 mb-8 rounded-xl border border-zinc-800 bg-zinc-900 text-white px-5 py-4 print:mx-6 print:mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
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
                className="text-xs text-zinc-300 hover:text-white underline-offset-2 hover:underline print:text-zinc-300"
              >
                {APEX_SOLUTION.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          </div>
          <div className="text-right text-[10px] text-zinc-400 max-w-[220px]">
            <p>Powered by {HOTCOL_SYSTEM.name} inventory</p>
            <p className="mt-0.5">Printed {new Date().toLocaleString()}</p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 mt-3 text-center border-t border-zinc-700/80 pt-3">
          Keep this receipt for audit, supplier reconciliation, and property records.
        </p>
      </div>
    </div>
  );
}
