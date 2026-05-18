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
  return "—";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex gap-1 text-[11px] leading-snug">
      <span className="text-slate-400 shrink-0">{label}:</span>
      <span className="font-medium text-slate-100">{value}</span>
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
      ? `${agreement.tierName} — ETB ${Number(agreement.creditLimit).toLocaleString()} · ${formatCreditCycle(
          agreement.timeInterval ?? 1,
          agreement.timeFrame ?? "MONTH",
        )}`
      : "—";

  return (
    <article className="flex-1 min-w-0 rounded-lg border border-dashed border-white/25 bg-slate-900/80 p-4 print:p-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
        Tear here — {title}
      </p>
      <header className="flex items-start gap-3 border-b border-white/15 pb-2 mb-3">
        {agreement.propertyLogo ? (
          <Image
            src={agreement.propertyLogo}
            alt=""
            width={40}
            height={40}
            className="rounded-md object-cover shrink-0"
          />
        ) : null}
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight">{agreement.propertyName}</p>
          {agreement.propertyTin ? (
            <p className="text-[10px] text-slate-400">TIN {agreement.propertyTin}</p>
          ) : null}
        </div>
      </header>
      <h3 className="text-xs font-semibold mb-2">Corporate meal agreement</h3>
      <dl className="space-y-1 text-[11px]">
        <div className="flex gap-1">
          <DetailRow label="Company" value={agreement.companyName} />
        </div>
        {agreement.companyTin ? (
          <div className="flex gap-1">
            <DetailRow label="Company TIN" value={agreement.companyTin} />
          </div>
        ) : null}
        <div className="flex gap-1">
          <DetailRow label="Phone" value={agreement.phone || "—"} />
        </div>
        <div className="flex gap-1">
          <DetailRow label="Email" value={agreement.email || "—"} />
        </div>
        <div className="flex gap-1">
          <DetailRow label="Credit tier" value={tierLine} />
        </div>
        <div className="flex gap-1">
          <DetailRow label="Payment" value={payTimingLabel(agreement.payTiming)} />
        </div>
      </dl>
      <p className="text-[10px] text-slate-400 mt-2 mb-1">Allowed menu</p>
      <ul className="list-disc pl-4 text-[10px] space-y-0.5 max-h-28 overflow-hidden">
        {agreement.allowedItems.length === 0 ? (
          <li className="text-slate-500">—</li>
        ) : (
          agreement.allowedItems.map((n) => <li key={`${title}-${n}`}>{n}</li>)
        )}
      </ul>
      {agreement.dealNotes?.trim() ? (
        <p className="text-[10px] text-slate-400 mt-2 italic">
          Notes: {agreement.dealNotes.trim()}
        </p>
      ) : null}
      <p className="text-[9px] text-slate-500 mt-3 pt-2 border-t border-white/10">
        Company rep. ______________ · {signRight} ______________ · Date _______
      </p>
    </article>
  );
}

export function CorporateMealAgreementDocument(
  props: CorporateMealAgreementProps,
) {
  return (
    <section className="corporate-meal-agreement text-slate-50 bg-slate-950 rounded-xl p-4 print:p-2 print:bg-white print:text-black">
      <div className="flex flex-col lg:flex-row gap-3 print:gap-2 relative">
        <span
          className="hidden lg:block absolute left-1/2 top-2 bottom-2 w-px border-l border-dashed border-white/30 print:border-black/30"
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
      <p className="text-[9px] text-center text-slate-500 mt-2 print:text-black/60">
        One page · perforated tear-off · authorized by hotel manager only
      </p>
    </section>
  );
}
