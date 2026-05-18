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

function parseAllowedNames(json: string): string[] {
  try {
    const arr = JSON.parse(json || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(x?.name ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function HotelManagerCompanyApprovals({
  tenantScope,
  propertyName,
  propertyLogo,
  propertyTin,
}: {
  tenantScope: string;
  propertyName: string;
  propertyLogo?: string | null;
  propertyTin?: string | null;
}) {
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

  const tierById = useMemo(() => {
    const m = new Map<number, HotelCorporateCreditTierRow>();
    for (const t of tiers) m.set(t.id, t);
    return m;
  }, [tiers]);

  const agreementProps = useMemo(() => {
    if (!printTarget) return null;
    const tier = printTarget.hotelCorporateCreditTierId
      ? tierById.get(printTarget.hotelCorporateCreditTierId)
      : undefined;
    return {
      propertyName,
      propertyLogo,
      propertyTin,
      companyName: printTarget.companyName,
      companyTin: printTarget.companyTinNumber,
      phone: printTarget.phoneNumber,
      email: printTarget.email,
      tierName: tier?.name ?? printTarget.creditLevel,
      creditLimit: tier ? Number(tier.creditCeiling) : printTarget.creditLimit,
      timeInterval: tier?.timeInterval ?? printTarget.timeInterval,
      timeFrame: tier?.timeFrame ?? printTarget.timeFrame,
      payTiming: printTarget.payTiming,
      dealNotes: printTarget.dealNotes,
      allowedItems: parseAllowedNames(printTarget.allowedMenuJson),
    };
  }, [printTarget, propertyLogo, propertyName, propertyTin, tierById]);

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
            Cashier registers deals; manager authorizes before usage and prints the
            one-page corporate meal agreement.
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
                    <Badge variant="secondary">Pending manager</Badge>
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
                            "Rejected by manager",
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPrintTarget(c);
                      setTimeout(() => handlePrint(), 150);
                    }}
                  >
                    <Printer className="h-4 w-4 mr-1.5" />
                    Print agreement
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

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
