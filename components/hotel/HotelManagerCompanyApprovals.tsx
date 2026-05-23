"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  authorizeHotelCreditCompanyApi,
  fetchHotelCreditCompanies,
  fetchHotelCorporateCreditTiers,
  notifyApiFailure,
  rejectHotelCreditCompanyApi,
  type HotelCreditCompanyRow,
  type HotelCorporateCreditTierRow,
} from "@/lib/actions";
import { CorporateMealAgreementDocument } from "@/components/hotel/CorporateMealAgreementDocument";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { isCompanyAuthorized } from "@/lib/hotelApproval";

function parseAllowedNames(json: string): string[] {
  try {
    const arr = JSON.parse(json || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(x?.name ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function buildAgreementProps(
  company: HotelCreditCompanyRow,
  tierById: Map<number, HotelCorporateCreditTierRow>,
  propertyName: string,
  propertyLogo?: string | null,
  propertyTin?: string | null,
) {
  const tier = company.hotelCorporateCreditTierId
    ? tierById.get(company.hotelCorporateCreditTierId)
    : undefined;
  return {
    propertyName,
    propertyLogo,
    propertyTin,
    companyName: company.companyName,
    companyTin: company.companyTinNumber,
    phone: company.phoneNumber,
    email: company.email,
    tierName: tier?.name ?? company.creditLevel,
    creditLimit: tier ? Number(tier.creditCeiling) : company.creditLimit,
    timeInterval: tier?.timeInterval ?? company.timeInterval,
    timeFrame: tier?.timeFrame ?? company.timeFrame,
    payTiming: company.payTiming,
    dealNotes: company.dealNotes,
    allowedItems: parseAllowedNames(company.allowedMenuJson),
  };
}

export function HotelManagerCompanyApprovals({
  tenantScope,
  propertyName,
  propertyLogo,
  propertyTin,
  audience = "hotel-manager",
}: {
  tenantScope: string;
  propertyName: string;
  propertyLogo?: string | null;
  propertyTin?: string | null;
  /** Café: admin authorizes and prints; cashier does not print agreements. */
  audience?: "hotel-manager" | "cafe-admin";
}) {
  const isCafeAdmin = audience === "cafe-admin";
  const printOnPending = !isCafeAdmin;

  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<HotelCreditCompanyRow[]>([]);
  const [tiers, setTiers] = useState<HotelCorporateCreditTierRow[]>([]);
  const [printTarget, setPrintTarget] = useState<HotelCreditCompanyRow | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Corporate_meal_agreement",
  });
  const { isPending, run } = useConcurrentActions();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [co, tr] = await Promise.all([
        fetchHotelCreditCompanies(),
        fetchHotelCorporateCreditTiers(),
      ]);
      const t = String(tenantScope ?? "").trim();
      setCompanies(
        co.filter((c) => !t || rowHotelMatchesTenantScope(c.HotelName, t)),
      );
      setTiers(tr);
    } catch (e) {
      notifyApiFailure(e, "Could not load companies");
    } finally {
      setLoading(false);
    }
  }, [tenantScope]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(
    () => companies.filter((c) => c.approvalStatus === "PENDING_MANAGER"),
    [companies],
  );

  const authorized = useMemo(
    () => companies.filter((c) => isCompanyAuthorized(c.approvalStatus)),
    [companies],
  );

  const tierById = useMemo(() => {
    const m = new Map<number, HotelCorporateCreditTierRow>();
    for (const t of tiers) m.set(t.id, t);
    return m;
  }, [tiers]);

  const agreementProps = useMemo(() => {
    if (!printTarget) return null;
    return buildAgreementProps(
      printTarget,
      tierById,
      propertyName,
      propertyLogo,
      propertyTin,
    );
  }, [printTarget, propertyLogo, propertyName, propertyTin, tierById]);

  const triggerPrint = (company: HotelCreditCompanyRow) => {
    setPrintTarget(company);
    setTimeout(() => handlePrint(), 150);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Corporate company authorization</CardTitle>
          <CardDescription>
            {isCafeAdmin
              ? "Cashier registers company deals from the terminal. Authorize here, then print the corporate meal agreement for the customer — printing is not done on the cashier screen."
              : "Cashier registers deals; manager authorizes before usage and may print the one-page corporate meal agreement."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center">
              No companies awaiting authorization.
            </p>
          ) : (
            pending.map((c) => (
              <Card key={c.id}>
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    {c.companyName}
                    <Badge variant="secondary">Pending authorization</Badge>
                  </CardTitle>
                  <CardDescription>
                    {c.phoneNumber || "No phone"} · TIN {c.companyTinNumber || "—"} ·{" "}
                    {c.payTiming === "NOW" ? "Pay now" : "Pay after service"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 pb-4">
                  <PendingButton
                    pending={isPending(`auth-co-${c.id}`)}
                    onClick={() =>
                      void run(`auth-co-${c.id}`, async () => {
                        try {
                          await authorizeHotelCreditCompanyApi(c.id);
                          await load();
                        } catch (e) {
                          notifyApiFailure(e, "Authorization failed");
                        }
                      })
                    }
                  >
                    Authorize
                  </PendingButton>
                  <PendingButton
                    variant="outline"
                    className="text-destructive"
                    pending={isPending(`rej-co-${c.id}`)}
                    onClick={() =>
                      void run(`rej-co-${c.id}`, async () => {
                        try {
                          await rejectHotelCreditCompanyApi(
                            c.id,
                            isCafeAdmin ? "Rejected by admin" : "Rejected by manager",
                          );
                          await load();
                        } catch (e) {
                          notifyApiFailure(e, "Rejection failed");
                        }
                      })
                    }
                  >
                    Reject
                  </PendingButton>
                  {printOnPending ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => triggerPrint(c)}
                    >
                      <Printer className="h-4 w-4 mr-1.5" />
                      Print agreement
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {isCafeAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Print corporate meal agreements</CardTitle>
            <CardDescription>
              After you authorize a company, print the signed agreement here and give
              copies to the customer. Cashier staff record usage only — they do not
              print agreements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {authorized.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center">
                No authorized companies yet. Approve a pending deal above first.
              </p>
            ) : (
              authorized.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/80 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{c.companyName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      TIN {c.companyTinNumber || "—"} · ETB{" "}
                      {Number(c.creditLimit).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => triggerPrint(c)}
                  >
                    <Printer className="h-4 w-4" />
                    Print agreement
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {agreementProps ? (
        <div className="sr-only print:not-sr-only print:block">
          <div ref={printRef}>
            <CorporateMealAgreementDocument {...agreementProps} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
