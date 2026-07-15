"use client";

import { APEX_SOLUTION, HOTCOL_SYSTEM } from "@/constants/branding";
import type { LodgingBillLine, LodgingStay } from "@/lib/api/lodgingRooms";
import { stripCafeOrderMarker } from "@/lib/lodgingRoomService";
import { cn } from "@/lib/utils";

function guestName(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "Guest";
  return `${g.firstName} ${g.lastName}`.trim() || "Guest";
}

function formatMoney(n: number) {
  return `ETB ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function roomsLine(stay: LodgingStay) {
  return (
    stay.rooms
      ?.map((r) => r.room?.roomNumber)
      .filter(Boolean)
      .join(", ") || "—"
  );
}

export type StayPaymentSplit = {
  cashETB: number;
  bankETB: number;
};

export function LodgingStayDepartureReceipt({
  stay,
  payment,
  className,
}: {
  stay: LodgingStay;
  payment?: StayPaymentSplit | null;
  className?: string;
}) {
  const lines: LodgingBillLine[] = stay.bill?.lines ?? [];
  const total = Number(stay.bill?.totalETB ?? 0);
  const cash = payment?.cashETB ?? total;
  const bank = payment?.bankETB ?? 0;
  const printedAt = new Date().toLocaleString();

  return (
    <div
      className={cn(
        "lodging-departure-receipt mx-auto w-full max-w-[210mm] bg-white text-zinc-900 print:max-w-none",
        className,
      )}
    >
      <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm print:shadow-none print:border-zinc-300">
        <div className="bg-linear-to-r from-emerald-700 via-emerald-600 to-teal-600 px-8 py-6 text-white print:px-6 print:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-100">
                {HOTCOL_SYSTEM.name} lodging
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight print:text-4xl">
                Departure receipt
              </h1>
              <p className="mt-2 text-base text-emerald-50">
                Guest checkout summary
              </p>
            </div>
            <div className="rounded-lg bg-white/95 px-3 py-2 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HOTCOL_SYSTEM.logoPath}
                alt={HOTCOL_SYSTEM.name}
                width={56}
                height={56}
                className="h-12 w-12 object-contain"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 px-8 py-6 print:space-y-5 print:px-6 print:py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Guest
              </p>
              <p className="mt-1 text-xl font-semibold print:text-2xl">
                {guestName(stay)}
              </p>
              <p className="mt-1 text-base tabular-nums text-zinc-600">
                {stay.guest?.phone || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Stay reference
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums print:text-2xl">
                {stay.voucherCode}
              </p>
              <p className="mt-1 text-base text-zinc-600">
                Receipt {stay.bill?.receiptNumber || "—"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-base sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Checked in
              </p>
              <p className="mt-1 font-medium">
                {new Date(stay.arrivalAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Checked out
              </p>
              <p className="mt-1 font-medium">
                {new Date(stay.departureAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Rooms
              </p>
              <p className="mt-1 font-medium tabular-nums">{roomsLine(stay)}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-base print:text-lg">
              <thead>
                <tr className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-600">
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 text-right font-semibold">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold">Unit</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-zinc-500"
                    >
                      No bill lines
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line.id} className="border-t border-zinc-100">
                      <td className="px-4 py-3">
                        <p className="font-medium leading-snug">
                          {stripCafeOrderMarker(line.description)}
                        </p>
                        <p className="text-sm capitalize text-zinc-500">
                          {line.kind.replace(/_/g, " ")}
                          {line.roomNumber ? ` · Rm ${line.roomNumber}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {line.quantity}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {Number(line.unitPriceETB).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {Number(line.amountETB).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1 text-base">
              <p>
                Cash paid:{" "}
                <span className="font-semibold tabular-nums">
                  {formatMoney(cash)}
                </span>
              </p>
              <p>
                Bank paid:{" "}
                <span className="font-semibold tabular-nums">
                  {formatMoney(bank)}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">
                Grand total
              </p>
              <p className="text-3xl font-bold tabular-nums text-emerald-950 print:text-4xl">
                {formatMoney(total)}
              </p>
            </div>
          </div>
        </div>

        {/* Dark strip so apex-logo-dark-bg.png is visible when printing */}
        <div className="border-t border-zinc-200 bg-zinc-950 px-5 py-4 text-white print:px-5 print:py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/apex-logo-dark-bg.png"
                alt={APEX_SOLUTION.name}
                width={140}
                height={48}
                className="h-10 w-auto max-w-[140px] shrink-0 object-contain print:h-9"
              />
              <div className="min-w-0 leading-tight">
                <p className="text-sm font-semibold">{APEX_SOLUTION.name}</p>
                <p className="text-xs text-zinc-300">
                  Hospitality software · inventory, lodging &amp; reporting
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-right text-xs leading-snug text-zinc-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HOTCOL_SYSTEM.logoPath}
                alt={HOTCOL_SYSTEM.name}
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded object-cover"
              />
              <div>
                <p>
                  Powered by{" "}
                  <span className="font-medium text-zinc-100">
                    {HOTCOL_SYSTEM.name}
                  </span>
                </p>
                <p className="mt-0.5">Thank you for staying with us.</p>
                <p className="mt-0.5 tabular-nums">{printedAt}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
