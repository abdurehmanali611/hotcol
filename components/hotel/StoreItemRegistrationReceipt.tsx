"use client";

import Image from "next/image";
import { APEX_SOLUTION, HOTCOL_SYSTEM } from "@/constants/branding";
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import type { ItemRegistration } from "@/lib/actions";
import {
  itemPaymentBucket,
  itemPaymentLabel,
  lineOwedETB,
  summarizeReceiptFinancials,
} from "@/lib/hotelInventoryPayment";
import { formatVoucherRange } from "@/lib/voucherFormat";
import type { ReceiptBundle } from "@/lib/receiptGrouping";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

function signatureLabel(kind: ReceiptBundle["kind"]): string {
  return kind === "registration" ? "Received by" : "Requested by";
}

function receiptMetaLabel(bundle: ReceiptBundle): string {
  if (bundle.kind === "stock_movement") {
    return bundle.stockMovementVoucher
      ? `Movement voucher ${bundle.stockMovementVoucher}`
      : "Movement voucher -";
  }
  if (bundle.kind === "purchase_request") {
    return bundle.purchaseRequestVoucher
      ? `PR voucher ${bundle.purchaseRequestVoucher}`
      : "PR voucher -";
  }
  return bundle.registrationVoucher
    ? `Registration voucher ${bundle.registrationVoucher}`
    : "Registration voucher -";
}

function receiptCaption(bundle: ReceiptBundle): string {
  return bundle.title;
}

function legacyBundleFromItem(item: ItemRegistration): ReceiptBundle {
  const paymentLabel = itemPaymentLabel(itemPaymentBucket(item));
  return {
    key: `legacy-registration-${item.id}`,
    id: item.id,
    kind: "registration",
    title:
      paymentLabel === "On credit"
        ? "Credit Goods Receiving voucher"
        : "Cash Goods Receiving Voucher",
    date: new Date(item.registrationDate).toISOString().slice(0, 10),
    dateLabel: new Date(item.registrationDate).toLocaleDateString(undefined, {
      dateStyle: "medium",
    }),
    supplierName: item.supplierName || "-",
    supplierPhone: item.supplierPhone,
    supplierAddress: item.Address,
    supplierTinNumber: item.supplierTinNumber,
    totalETB: lineOwedETB(item),
    paymentLabel,
    purchaseRequestVoucher: item.purchaseRequestId
      ? String(item.purchaseRequestId)
      : null,
    registrationVoucher: formatVoucherRange([item]),
    lines: [
      {
        id: `legacy-line-${item.id}`,
        sourceId: item.id,
        sourceKind: "registration",
        voucherNumber: item.voucherNumber,
        voucherDisplay: item.voucherDisplay,
        name: item.name,
        quantity: Number(item.amount) || 0,
        measuredBy: item.measuredBy,
        unitPrice: Number(item.unitPrice) || 0,
        lineTotal: lineOwedETB(item),
        category: item.category,
        imageUrl: item.imageUrl,
        paymentLabel,
        purchaseWithVat: item.purchaseWithVat,
      },
    ],
    storeActorName: item.statusBy ?? null,
    ccActorName: item.ccActorName ?? null,
    financeActorName: item.financeActorName ?? null,
    managerActorName: item.managerActorName ?? null,
  };
}

export function StoreItemRegistrationReceipt({
  bundle,
  item,
  propertyName,
  propertyTin,
  logoUrl,
}: {
  bundle?: ReceiptBundle;
  item?: ItemRegistration;
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
}) {
  const resolvedBundle = bundle ?? (item ? legacyBundleFromItem(item) : null);
  if (!resolvedBundle) return null;

  const lines = resolvedBundle.lines;
  const primary = lines[0];
  if (!primary) return null;

  const isMulti = lines.length > 1;
  const property = (propertyName || "Property").trim() || "Property";
  const tin = (propertyTin || "").trim();
  const totalPaidLabel = resolvedBundle.paymentLabel || "-";
  const isGoodsReceiving = resolvedBundle.kind === "registration";
  const financials = isGoodsReceiving
    ? summarizeReceiptFinancials(lines)
    : null;
  const formatEtb = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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
                {receiptCaption(resolvedBundle)}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                {resolvedBundle.title}
              </h1>
              <p className="text-sm font-semibold text-zinc-800 mt-1 tabular-nums">
                {property}
              </p>
              <p className="text-sm text-zinc-600 mt-0.5">Hotel TIN: {tin || "-"}</p>
              <p className="text-xs font-mono text-zinc-600 mt-1">
                {receiptMetaLabel(resolvedBundle)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {isMulti
                  ? `${lines.length} lines`
                  : `${primary.category || primary.name}`}
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
              <p className="font-semibold text-zinc-800">{resolvedBundle.dateLabel}</p>
              {resolvedBundle.paymentLabel ? (
                <p className="text-zinc-600">{resolvedBundle.paymentLabel}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-8 h-1 rounded-full bg-linear-to-r from-emerald-600 via-emerald-400 to-teal-500 print:mx-6" />

      {isMulti ? (
        <div className="px-8 py-6 print:px-6 space-y-3">
          <p className="text-sm font-mono font-medium text-zinc-800">
            {receiptMetaLabel(resolvedBundle)}
          </p>
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
                    {line.voucherDisplay || line.voucherNumber || "-"}
                  </td>
                  <td className="py-2.5 pr-2">
                    <p className="font-medium">{line.name}</p>
                    {line.notes ? (
                      <p className="text-[11px] text-zinc-500 mt-0.5">{line.notes}</p>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums text-zinc-600">
                    {formatQtyWithUnit(line.quantity, line.measuredBy)}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">
                    {line.unitPrice != null ? line.unitPrice.toLocaleString() : "-"}
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-medium">
                    {line.lineTotal != null ? line.lineTotal.toLocaleString() : "-"}
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
                  {formatQtyWithUnit(primary.quantity, primary.measuredBy)}
                  {primary.unitPrice != null
                    ? ` at ETB ${primary.unitPrice.toLocaleString()} / ${primary.measuredBy}`
                    : ""}
                </p>
                <p className="text-xs font-mono text-zinc-500">
                  {receiptMetaLabel(resolvedBundle)}
                </p>
                {primary.paymentLabel || primary.movementLabel ? (
                  <Badge
                    variant="outline"
                    className="w-fit mt-1 border-emerald-500/40 text-emerald-800 bg-emerald-50"
                  >
                    {primary.paymentLabel || primary.movementLabel}
                  </Badge>
                ) : null}
                {primary.notes ? (
                  <p className="text-xs text-zinc-500 mt-1">{primary.notes}</p>
                ) : null}
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
          <p className="font-semibold text-base">{resolvedBundle.supplierName || "-"}</p>
          <p className="text-zinc-600">{resolvedBundle.supplierPhone || "-"}</p>
          <p className="text-zinc-600 leading-snug">{resolvedBundle.supplierAddress || "-"}</p>
          {resolvedBundle.supplierTinNumber?.trim() ? (
            <p className="text-zinc-600 font-medium">
              TIN: {resolvedBundle.supplierTinNumber.trim()}
            </p>
          ) : null}
        </section>
        <section className="space-y-2.5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Financial summary
          </h3>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2">
            {!isMulti && primary.unitPrice != null ? (
              <div className="flex justify-between">
                <span className="text-zinc-600">Unit price</span>
                <span className="font-medium tabular-nums">
                  ETB {primary.unitPrice.toLocaleString()}
                </span>
              </div>
            ) : (
              <p className="text-zinc-600 text-xs">
                Combined total for {lines.length} line{lines.length !== 1 ? "s" : ""}.
              </p>
            )}
            <Separator className="bg-zinc-200" />
            {isGoodsReceiving && financials ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Subtotal</span>
                  <span className="font-medium tabular-nums">
                    ETB {formatEtb(financials.subtotalETB)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">VAT (15%)</span>
                  <span className="font-medium tabular-nums">
                    ETB {formatEtb(financials.vatETB)}
                  </span>
                </div>
                <Separator className="bg-zinc-200" />
                <div className="flex justify-between font-bold text-base">
                  <span>Grand total</span>
                  <span className="tabular-nums text-emerald-800">
                    ETB {formatEtb(financials.grandTotalETB)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between font-bold text-base">
                <span>Receipt total</span>
                <span className="tabular-nums text-emerald-800">
                  ETB {resolvedBundle.totalETB.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600">
              <span>Payment status</span>
              <span>{totalPaidLabel}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="px-8 pb-8 print:px-6 print:pb-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 border border-zinc-200 rounded-xl p-5">
          {[
            { label: signatureLabel(resolvedBundle.kind), name: resolvedBundle.storeActorName },
            { label: "Checked by", name: resolvedBundle.ccActorName },
            { label: "Approved by", name: resolvedBundle.financeActorName },
            { label: "Authorized by", name: resolvedBundle.managerActorName },
          ].map((entry) => (
            <div key={entry.label} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {entry.label}
              </p>
              <div className="pt-6 border-b border-zinc-400" />
              <p className="text-xs text-zinc-600 min-h-4">{entry.name || " "}</p>
            </div>
          ))}
        </div>
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
      </div>
    </div>
  );
}
