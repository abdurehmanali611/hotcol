"use client";

import { APEX_SOLUTION, HOTCOL_SYSTEM } from "@/constants/branding";
import type { LodgingStay } from "@/lib/api/lodgingRooms";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-zinc-900 wrap-break-word">
        {value?.trim() || "—"}
      </p>
    </div>
  );
}

/** Branded guest registration card for Reception print-at-check-in. */
export function LodgingRegistrationCard({
  stay,
  propertyName,
  logoUrl,
  tinNumber,
}: {
  stay: LodgingStay;
  propertyName?: string;
  logoUrl?: string | null;
  tinNumber?: string | null;
}) {
  const property =
    (propertyName || stay.HotelName || "Property").trim() || "Property";
  const tin = (tinNumber || "").trim();
  const logo = (logoUrl || "").trim();
  const guest = stay.guest;
  const guestName = guest
    ? `${guest.firstName || ""} ${guest.lastName || ""}`.trim() || "Guest"
    : "Guest";
  const rooms =
    stay.rooms
      ?.map((r) => r.room?.roomNumber)
      .filter(Boolean)
      .join(", ") || "—";
  const roomTypes = [
    ...new Set(
      (stay.rooms || []).map((r) => r.roomType || r.room?.roomType).filter(Boolean),
    ),
  ].join(", ");
  const isEthiopian = guest?.isEthiopian !== false;
  const idLabel = isEthiopian ? "National ID / Fayda" : "Passport";
  const idValue = isEthiopian
    ? guest?.nationalId || ""
    : guest?.passportNumber || guest?.nationalId || "";
  const expectedNights = stay.expectedNights || stay.nights || 1;
  const expectedDeparture = stay.expectedDepartureAt || stay.departureAt || null;
  const rate =
    stay.rooms?.[0]?.room?.pricePerNightETB != null
      ? `ETB ${Number(stay.rooms[0].room.pricePerNightETB).toLocaleString()}/night`
      : "—";
  const printedAt = formatWhen(new Date().toISOString());

  return (
    <div className="lodging-registration-card mx-auto max-w-[210mm] bg-white font-sans text-zinc-900 print:text-black">
      <div className="px-6 pb-4 pt-6 sm:px-8 sm:pt-8 print:px-6 print:pt-6">
        <div className="flex items-start justify-between gap-4 sm:gap-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {logo ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-600/25 shadow-sm sm:h-16 sm:w-16">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo}
                  alt={`${property} logo`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-lg font-bold text-emerald-800 sm:h-16 sm:w-16">
                {property.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                Guest registration
              </p>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
                Registration card
              </h1>
              <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-800">
                {property}
              </p>
              <p className="mt-0.5 text-sm text-zinc-600">
                Hotel TIN: {tin || "—"}
              </p>
              <p className="mt-1 font-mono text-xs text-zinc-600">
                Voucher {stay.voucherCode || "—"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HOTCOL_SYSTEM.logoPath}
                alt={HOTCOL_SYSTEM.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-cover"
              />
              <div className="leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  System
                </p>
                <p className="text-sm font-semibold text-zinc-800">
                  {HOTCOL_SYSTEM.name}
                </p>
              </div>
            </div>
            <p className="text-right text-xs font-semibold tabular-nums text-zinc-800">
              {printedAt}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-6 h-1 rounded-full bg-linear-to-r from-emerald-600 via-emerald-400 to-teal-500 sm:mx-8 print:mx-6" />

      <div className="space-y-5 px-6 py-5 sm:px-8 print:px-6">
        <section className="space-y-2.5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Guest
          </h3>
          <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 sm:grid-cols-2">
            <Field label="Full name" value={guestName} className="sm:col-span-2" />
            <Field label="Phone" value={guest?.phone || ""} />
            <Field label="Email" value={guest?.email || ""} />
            <Field label="Nationality" value={guest?.country || ""} />
            <Field
              label="Guest type"
              value={isEthiopian ? "Ethiopian" : "Foreign"}
            />
            <Field label={idLabel} value={idValue} className="sm:col-span-2" />
          </div>
        </section>

        <section className="space-y-2.5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Stay
          </h3>
          <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 sm:grid-cols-2">
            <Field label="Room(s)" value={rooms} />
            <Field label="Room type" value={roomTypes} />
            <Field label="Arrival" value={formatWhen(stay.arrivalAt)} />
            <Field
              label="Expected departure"
              value={formatWhen(expectedDeparture)}
            />
            <Field label="Expected nights" value={String(expectedNights)} />
            <Field label="Nightly rate" value={rate} />
            <Field label="Adults" value={String(stay.adults ?? 1)} />
            <Field label="Children" value={String(stay.children ?? 0)} />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">
            Signatures
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Guest
              </p>
              <div className="relative h-20 rounded-xl border-2 border-dashed border-zinc-500 bg-zinc-50 print:border-zinc-700">
                <div className="absolute inset-x-5 bottom-5 border-b border-zinc-400 print:border-zinc-600" />
                <p className="absolute bottom-1.5 left-5 text-[9px] font-medium uppercase tracking-wider text-zinc-400">
                  Guest signature
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Hotel representative
              </p>
              <div className="relative h-20 rounded-xl border-2 border-dashed border-zinc-500 bg-zinc-50 print:border-zinc-700">
                <div className="absolute inset-x-5 bottom-5 border-b border-zinc-400 print:border-zinc-600" />
                <p className="absolute bottom-1.5 left-5 text-[9px] font-medium uppercase tracking-wider text-zinc-400">
                  Staff signature
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-zinc-200 bg-zinc-950 px-6 py-4 text-white sm:px-8 print:px-6 print:py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={APEX_SOLUTION.logoPath}
              alt={APEX_SOLUTION.name}
              width={140}
              height={48}
              className="h-9 w-auto max-w-[140px] shrink-0 object-contain print:h-8"
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
              <p className="mt-0.5 tabular-nums">{printedAt}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
