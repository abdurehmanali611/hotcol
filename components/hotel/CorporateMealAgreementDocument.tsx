"use client";

import Image from "next/image";
import { formatCreditCycle } from "@/lib/creditCycleLabel";

export type CorporateMealAgreementProps = {
  propertyName: string;
  propertyLogo?: string | null;
  propertyTin?: string | null;
  companyName: string;
  companyTin?: string | null;
  phone?: string | null;
  email?: string | null;
  tierName?: string | null;
  creditLimit?: number;
  timeInterval?: number;
  timeFrame?: string;
  payTiming?: string | null;
  dealNotes?: string | null;
  allowedItems: string[];
};

function payTimingLabel(v?: string | null) {
  if (v === "NOW") return "Pay now (before service)";
  if (v === "AFTER_SERVICE") return "Pay after service";
  return "-";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-medium text-zinc-500">{label}</dt>
      <dd className="font-semibold text-zinc-900">{value}</dd>
    </>
  );
}

function SignatureField({ label }: { label: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[8px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <div className="h-5 border-b border-zinc-400/90" />
    </div>
  );
}

function CopyBlock({
  title,
  signRight,
  agreement,
}: {
  title: string;
  signRight: string;
  agreement: CorporateMealAgreementProps;
}) {
  const tierLine =
    agreement.tierName && agreement.creditLimit != null
      ? `${agreement.tierName} · ETB ${Number(agreement.creditLimit).toLocaleString()} · ${formatCreditCycle(
          agreement.timeInterval ?? 1,
          agreement.timeFrame ?? "MONTH",
        )}`
      : "-";

  const copyLabel =
    title === "Management copy" ? "Management copy" : "Creditor copy";

  return (
    <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-dashed border-zinc-300 bg-white shadow-sm print:rounded-md print:shadow-none">
      <div className="border-b border-dashed border-zinc-300 bg-linear-to-r from-zinc-50 via-emerald-50/60 to-zinc-50 px-3 py-1.5 text-center print:py-1">
        <p className="text-[8.5px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Tear here — {copyLabel}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-3 print:px-4 print:py-3">
        <header className="flex items-start gap-3">
          {agreement.propertyLogo ? (
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 border-emerald-600/20 shadow-sm print:h-10 print:w-10">
              <Image
                src={agreement.propertyLogo}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-emerald-600/20 bg-emerald-50 text-[10px] font-bold text-emerald-800 print:h-10 print:w-10"
              aria-hidden
            >
              {agreement.propertyName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-tight tracking-tight text-zinc-900 print:text-[14px]">
              {agreement.propertyName}
            </p>
            {agreement.propertyTin ? (
              <p className="mt-0.5 text-[9px] font-medium text-zinc-500">
                TIN {agreement.propertyTin}
              </p>
            ) : null}
          </div>
        </header>

        <div
          className="my-2 h-0.5 shrink-0 rounded-full bg-linear-to-r from-emerald-700 via-emerald-500 to-teal-400 print:my-1.5"
          aria-hidden
        />

        <h3 className="text-[12px] font-bold tracking-tight text-emerald-900 print:text-[11.5px]">
          Corporate meal agreement
        </h3>

        <dl className="mt-2 grid grid-cols-[minmax(72px,88px)_1fr] gap-x-2 gap-y-1 text-[10px] leading-snug print:mt-1.5 print:gap-y-0.5 print:text-[10.5px]">
          <DetailRow label="Company" value={agreement.companyName} />
          {agreement.companyTin ? (
            <DetailRow label="Company TIN" value={agreement.companyTin} />
          ) : null}
          <DetailRow label="Phone" value={agreement.phone || "-"} />
          <DetailRow label="Email" value={agreement.email || "-"} />
          <DetailRow label="Credit tier" value={tierLine} />
          <DetailRow label="Payment" value={payTimingLabel(agreement.payTiming)} />
        </dl>

        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-zinc-200 bg-zinc-50/90 print:mt-1.5">
          <p className="border-b border-zinc-200 bg-emerald-800/[0.07] px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.16em] text-emerald-900">
            Allowed menu
          </p>
          <ul className="min-h-0 flex-1 overflow-hidden px-2.5 py-1.5 text-[9.5px] leading-relaxed text-zinc-800 print:py-1 print:text-[9.5px]">
            {agreement.allowedItems.length === 0 ? (
              <li className="list-none text-zinc-400">No items listed</li>
            ) : (
              agreement.allowedItems.map((n) => (
                <li
                  key={`${title}-${n}`}
                  className="relative pl-3 before:absolute before:left-0 before:top-[0.45em] before:h-1 before:w-1 before:rounded-full before:bg-emerald-600"
                >
                  {n}
                </li>
              ))
            )}
          </ul>
        </div>

        {agreement.dealNotes?.trim() ? (
          <p className="mt-1.5 line-clamp-2 text-[9px] italic leading-snug text-zinc-600 print:mt-1">
            <span className="font-semibold not-italic text-zinc-700">Notes:</span>{" "}
            {agreement.dealNotes.trim()}
          </p>
        ) : null}

        <div className="mt-auto shrink-0 border-t border-zinc-200 pt-2 print:pt-1.5">
          <div className="grid grid-cols-3 gap-2">
            <SignatureField label="Company representative" />
            <SignatureField label={signRight} />
            <SignatureField label="Date" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function CorporateMealAgreementDocument(
  props: CorporateMealAgreementProps,
) {
  return (
    <section className="corporate-meal-agreement mx-auto flex h-[297mm] w-[210mm] flex-col overflow-hidden bg-white p-[7mm] font-sans text-zinc-900 shadow-lg print:m-0 print:shadow-none">
      <div className="relative grid min-h-0 flex-1 grid-rows-2 gap-[5mm]">
        <div
          className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2"
          aria-hidden
        >
          <div className="h-0 border-t-2 border-dashed border-zinc-400" style={{ flex: 1 }} />
          <span className="shrink-0 rounded-full border border-zinc-300 bg-white px-2.5 py-0.5 text-[7.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500 shadow-sm">
            Tear along line
          </span>
          <div className="h-0 border-t-2 border-dashed border-zinc-400" style={{ flex: 1 }} />
        </div>

        <CopyBlock
          title="Management copy"
          signRight="Hotel management"
          agreement={props}
        />
        <CopyBlock
          title="Creditor copy"
          signRight="Creditor representative"
          agreement={props}
        />
      </div>

      <footer className="mt-[3mm] shrink-0 border-t border-zinc-200 pt-2 text-center">
        <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
          Authorized corporate meal agreement
        </p>
        <p className="mt-0.5 text-[8px] leading-relaxed text-zinc-500">
          One page · perforated tear-off · valid only when signed by hotel
          management
        </p>
      </footer>
    </section>
  );
}
