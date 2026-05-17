"use client";

import type { ItemRegistration } from "@/lib/actions";
import {
  isVatEnabled,
  itemPaymentLabel,
  itemPaymentBucket,
  lineOwedETB,
} from "@/lib/hotelInventoryPayment";
import { formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function StoreItemRegistrationReceipt({
  item,
  propertyName,
  logoUrl,
}: {
  item: ItemRegistration;
  propertyName: string;
  logoUrl?: string | null;
}) {
  const owed = lineOwedETB(item);
  const paid = Number(item.paidAmount) || 0;
  const vatOn = isVatEnabled(item.purchaseWithVat);

  return (
    <div className="bg-white text-zinc-900 p-8 max-w-[210mm] mx-auto font-sans print:p-6">
      <div className="flex items-start justify-between gap-6 border-b-2 border-emerald-600 pb-5">
        <div className="flex items-center gap-4 min-w-0">
          {logoUrl ? (
            <Avatar className="h-14 w-14 border-2 border-emerald-600/30">
              <AvatarImage src={logoUrl} className="object-cover" />
              <AvatarFallback>HC</AvatarFallback>
            </Avatar>
          ) : null}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
              Goods receiving receipt
            </p>
            <h1 className="text-xl font-bold tracking-tight truncate">
              {propertyName}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Registration #{item.id}
            </p>
          </div>
        </div>
        <div className="text-right text-xs shrink-0 space-y-0.5">
          <p className="font-semibold">
            {new Date(item.registrationDate).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </p>
          <p className="text-zinc-500">
            Expires{" "}
            {new Date(item.expireDate).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-5">
        <Avatar className="h-24 w-24 rounded-xl border shadow-sm">
          <AvatarImage src={item.imageUrl} className="object-cover" />
          <AvatarFallback className="rounded-xl bg-emerald-50 text-emerald-800 font-bold">
            {item.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{item.name}</h2>
          <p className="text-sm text-zinc-600">{item.category}</p>
          <p className="text-lg font-semibold text-emerald-800 mt-2">
            {formatQtyWithUnit(item.amount, item.measuredBy)} received
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-2 gap-6 text-sm">
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Supplier
          </h3>
          <p className="font-semibold">{item.supplierName || "—"}</p>
          <p className="text-zinc-600">{item.supplierPhone || "—"}</p>
          <p className="text-zinc-600">{item.Address || "—"}</p>
          {(item.supplierTinNumber || "").trim() ? (
            <p className="text-zinc-600">
              TIN: {(item.supplierTinNumber || "").trim()}
            </p>
          ) : null}
        </section>
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Financials
          </h3>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>Unit price</span>
              <span className="font-medium tabular-nums">
                ETB {item.unitPrice.toLocaleString()}
              </span>
            </div>
            {!item.dutyFee ? null : (
              <div className="flex justify-between">
                <span>Duty fee</span>
                <span className="font-medium tabular-nums">
                  ETB {item.dutyFee.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>VAT recording</span>
              <span className="font-medium">
                {vatOn ? "With VAT (15%)" : "Without VAT"}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Line total</span>
              <span className="tabular-nums text-emerald-800">
                ETB {owed.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Amount paid</span>
              <span className="tabular-nums">ETB {paid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment status</span>
              <span className="font-semibold">
                {itemPaymentLabel(itemPaymentBucket(item))}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-dashed text-center text-[10px] text-zinc-400">
        <p>Generated from HotCol Store · {new Date().toLocaleString()}</p>
        <p className="mt-1">
          Keep this receipt for audit and supplier reconciliation.
        </p>
      </div>
    </div>
  );
}
