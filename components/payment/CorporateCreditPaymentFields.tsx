"use client";

import dynamic from "next/dynamic";
import type { HotelCreditCompanyRow, HotelCreditPartyRow } from "@/lib/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCreditCycle } from "@/lib/creditCycleLabel";
import { ordersOffCompanyDeal } from "@/lib/corporateCreditPayment";
import type { Order } from "@/lib/actions";

const PhoneInput = dynamic(
  () => import("@/components/phone-input").then((m) => m.PhoneInput),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
    ),
  },
);

export function CorporateCreditPaymentFields({
  companies,
  parties,
  companyId,
  onCompanyIdChange,
  staffName,
  onStaffNameChange,
  staffPhone,
  onStaffPhoneChange,
  amountETB,
  ordersForDealCheck = [],
}: {
  companies: HotelCreditCompanyRow[];
  parties: HotelCreditPartyRow[];
  companyId: string;
  onCompanyIdChange: (id: string) => void;
  staffName: string;
  onStaffNameChange: (name: string) => void;
  staffPhone: string;
  onStaffPhoneChange: (phone: string) => void;
  amountETB: number;
  ordersForDealCheck?: Order[];
}) {
  const selectedCompany =
    companies.find((c) => String(c.id) === companyId) ?? null;
  const offDeal = ordersOffCompanyDeal(ordersForDealCheck, selectedCompany);

  return (
    <div className="space-y-4 rounded-lg border border-border/70 bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Select the corporate company, then enter the staff member using credit (name
        and phone), same as hotel cashier usage registration.
      </p>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Company
        </Label>
        <Select value={companyId} onValueChange={onCompanyIdChange}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select authorized company" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCompany ? (
        <div className="rounded-md border border-border/60 bg-card/80 px-3 py-2 text-xs text-muted-foreground space-y-1">
          <p>
            Deal limit:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              ETB {Number(selectedCompany.creditLimit).toLocaleString()}
            </span>
            {" · "}
            {formatCreditCycle(
              selectedCompany.timeInterval,
              selectedCompany.timeFrame,
            )}
          </p>
          <p>
            This payment:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              ETB {amountETB.toFixed(2)}
            </span>
          </p>
        </div>
      ) : null}

      {parties.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Known staff (optional)
          </Label>
          <Select
            value=""
            onValueChange={(v) => {
              const p = parties.find((x) => String(x.id) === v);
              if (p) {
                onStaffNameChange(p.displayName);
                onStaffPhoneChange(p.phoneNumber || "");
              }
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Pick existing staff or type below" />
            </SelectTrigger>
            <SelectContent>
              {parties.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.displayName}
                  {p.phoneNumber ? ` · ${p.phoneNumber}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="corp-staff-name">Staff name</Label>
          <Input
            id="corp-staff-name"
            value={staffName}
            onChange={(e) => onStaffNameChange(e.target.value)}
            placeholder="Staff / guest name"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="corp-staff-phone">Staff phone</Label>
          <PhoneInput
            id="corp-staff-phone"
            defaultCountry="ET"
            countryCallingCodeEditable
            international
            value={staffPhone || undefined}
            onChange={(v) => onStaffPhoneChange((v as string) || "")}
            className="w-full"
          />
        </div>
      </div>

      {offDeal.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">
            Not on company deal: {offDeal.join(", ")}. Payment will be rejected until
            items are allowed on the company deal.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
