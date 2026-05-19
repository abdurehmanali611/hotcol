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
    <p className="flex gap-1 text-[11px] leading-snug">
      <span className="shrink-0 text-slate-400 print:text-stone-600">
        {label}:
      </span>
      <span className="font-medium text-slate-100 print:text-stone-950">
        {value}
      </span>
    </p>
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
      ? `${agreement.tierName} - ETB ${Number(agreement.creditLimit).toLocaleString()} - ${formatCreditCycle(
          agreement.timeInterval ?? 1,
          agreement.timeFrame ?? "MONTH",
        )}`
      : "-";

  return (
    <article className="min-w-0 flex-1 rounded-lg border border-dashed border-white/25 bg-slate-900/80 p-4 print:flex print:h-full print:min-h-0 print:overflow-hidden print:flex-col print:rounded-none print:border-stone-400/80 print:bg-stone-50 print:p-4">
      <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-slate-400 print:text-stone-600">
        Tear here - {title}
      </p>
      <header className="mb-4 flex items-start gap-3 border-b border-white/15 pb-3 print:mb-2 print:pb-2 print:border-stone-400/70">
        {agreement.propertyLogo ? (
          <Image
            src={agreement.propertyLogo}
            alt=""
            width={48}
            height={48}
            className="shrink-0 rounded-md object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight print:text-base print:text-stone-950">
            {agreement.propertyName}
          </p>
          {agreement.propertyTin ? (
            <p className="text-[10px] text-slate-400 print:text-stone-600">
              TIN {agreement.propertyTin}
            </p>
          ) : null}
        </div>
      </header>
      <h3 className="mb-3 text-sm font-semibold tracking-tight print:mb-1.5 print:text-stone-950">
        Corporate meal agreement
      </h3>
      <dl className="space-y-1.5 text-[11px] print:text-[11.5px]">
        <div className="flex gap-1">
          <DetailRow label="Company" value={agreement.companyName} />
        </div>
        {agreement.companyTin ? (
          <div className="flex gap-1">
            <DetailRow label="Company TIN" value={agreement.companyTin} />
          </div>
        ) : null}
        <div className="flex gap-1">
          <DetailRow label="Phone" value={agreement.phone || "-"} />
        </div>
        <div className="flex gap-1">
          <DetailRow label="Email" value={agreement.email || "-"} />
        </div>
        <div className="flex gap-1">
          <DetailRow label="Credit tier" value={tierLine} />
        </div>
        <div className="flex gap-1">
          <DetailRow label="Payment" value={payTimingLabel(agreement.payTiming)} />
        </div>
      </dl>
      <p className="mb-1.5 mt-4 text-[10px] uppercase tracking-[0.18em] text-slate-400 print:mt-2 print:text-stone-600">
        Allowed menu
      </p>
      <ul className="list-disc space-y-0.5 pl-4 text-[10px] print:min-h-0 print:flex-1 print:overflow-hidden print:text-[10px] print:text-stone-900">
        {agreement.allowedItems.length === 0 ? (
          <li className="text-slate-500 print:text-stone-500">-</li>
        ) : (
          agreement.allowedItems.map((n) => <li key={`${title}-${n}`}>{n}</li>)
        )}
      </ul>
      {agreement.dealNotes?.trim() ? (
        <p className="mt-3 text-[10px] italic text-slate-400 print:text-stone-600">
          Notes: {agreement.dealNotes.trim()}
        </p>
      ) : null}
      <div className="flex-1" />
      <p className="mt-4 shrink-0 border-t border-white/10 pt-3 text-[9px] text-slate-500 print:mt-2 print:pt-2 print:border-stone-300 print:text-[9px] print:text-stone-600">
        Company rep. ______________ - {signRight} ______________ - Date _______
      </p>
    </article>
  );
}

export function CorporateMealAgreementDocument(
  props: CorporateMealAgreementProps,
) {
  return (
    <section className="corporate-meal-agreement rounded-xl bg-slate-950 p-4 text-slate-50 print:m-0 print:flex print:h-[297mm] print:w-[210mm] print:flex-col print:overflow-hidden print:rounded-none print:border print:border-stone-300 print:bg-stone-100 print:p-[8mm] print:text-stone-950">
      <div className="relative flex min-h-0 flex-1 flex-col gap-3 print:grid print:grid-rows-2 print:gap-[6mm]">
        <span
          className="absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 border-t-2 border-dashed border-white/30 print:block print:border-stone-400/90"
          aria-hidden
        />
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
      <p className="mt-2 shrink-0 text-center text-[9px] text-slate-500 print:mt-2 print:text-[9px] print:text-stone-600">
        One page - perforated tear-off - authorized by hotel manager only
      </p>
    </section>
  );
}
