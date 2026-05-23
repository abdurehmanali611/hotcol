"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  authorizeHotelCreditCompanyApi,
  fetchHotelCreditCompanies,
  fetchHotelCorporateCreditTiers,
  invalidateGraphqlListCache,
  notifyApiFailure,
  rejectHotelCreditCompanyApi,
  type HotelCreditCompanyRow,
  type HotelCorporateCreditTierRow,
} from "@/lib/actions";
import { CorporateMealAgreementDocument } from "@/components/hotel/CorporateMealAgreementDocument";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { isCompanyAuthorized } from "@/lib/hotelApproval";
import {
  normalizeAgreementCompanyLogo,
  normalizeAgreementTin,
  resolveAgreementVenueContext,
} from "@/lib/agreementVenueContext";

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
  venueSignLabel?: string,
  venueLabel?: string,
) {
  const tier = company.hotelCorporateCreditTierId
    ? tierById.get(company.hotelCorporateCreditTierId)
    : undefined;
  const venue = resolveAgreementVenueContext(propertyLogo, propertyTin);
  return {
    propertyName,
    propertyLogo: venue.propertyLogo,
    propertyTin: venue.propertyTin,
    companyName: company.companyName,
    companyLogo: normalizeAgreementCompanyLogo(company.imageUrl),
    companyTin: normalizeAgreementTin(company.companyTinNumber),
    phone: company.phoneNumber,
    email: company.email,
    tierName: tier?.name ?? company.creditLevel,
    creditLimit: tier ? Number(tier.creditCeiling) : company.creditLimit,
    timeInterval: tier?.timeInterval ?? company.timeInterval,
    timeFrame: tier?.timeFrame ?? company.timeFrame,
    payTiming: company.payTiming,
    dealNotes: company.dealNotes,
    allowedItems: parseAllowedNames(company.allowedMenuJson),
    venueSignLabel,
    venueLabel,
  };
}

function companyMetaLine(company: HotelCreditCompanyRow) {
  return `${company.phoneNumber || "No phone"} · TIN ${company.companyTinNumber || "—"} · ${
    company.payTiming === "NOW" ? "Pay now" : "Pay after service"
  } · ETB ${Number(company.creditLimit).toLocaleString()}`;
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
  audience?: "hotel-manager" | "cafe-admin";
}) {
  const isCafeAdmin = audience === "cafe-admin";
  const printOnPending = !isCafeAdmin;
  const venueSignLabel = isCafeAdmin ? "Café management" : "Hotel management";
  const venueLabel = isCafeAdmin ? "Café" : "Hotel";

  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<HotelCreditCompanyRow[]>([]);
  const [tiers, setTiers] = useState<HotelCorporateCreditTierRow[]>([]);
  const [printTarget, setPrintTarget] = useState<HotelCreditCompanyRow | null>(
    null,
  );
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Corporate_meal_agreement",
    onAfterPrint: () => setPrintTarget(null),
  });
  const { isPending: actionPending, run } = useConcurrentActions();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      invalidateGraphqlListCache("hotel:creditCompanies");
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

  const cafeCompanies = useMemo(() => {
    const active = companies.filter(
      (c) =>
        c.approvalStatus === "PENDING_MANAGER" ||
        isCompanyAuthorized(c.approvalStatus),
    );
    return [...active].sort((a, b) => {
      const aWait = a.approvalStatus === "PENDING_MANAGER" ? 0 : 1;
      const bWait = b.approvalStatus === "PENDING_MANAGER" ? 0 : 1;
      if (aWait !== bWait) return aWait - bWait;
      return a.companyName.localeCompare(b.companyName);
    });
  }, [companies]);

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
      venueSignLabel,
      venueLabel,
    );
  }, [
    printTarget,
    propertyLogo,
    propertyName,
    propertyTin,
    tierById,
    venueSignLabel,
    venueLabel,
  ]);

  const triggerPrint = (company: HotelCreditCompanyRow) => {
    if (!isCompanyAuthorized(company.approvalStatus)) return;
    setPrintTarget(company);
    window.setTimeout(() => handlePrint(), 200);
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
      {isCafeAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Corporate credit companies</CardTitle>
            <CardDescription>
              Authorize cashier-registered deals, then print the agreement for
              authorized companies only. Staff usage is recorded at payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cafeCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center">
                No company deals yet. Cashier registers deals from the terminal.
              </p>
            ) : (
              cafeCompanies.map((c) => {
                const awaitingAuth = c.approvalStatus === "PENDING_MANAGER";
                const canPrint = isCompanyAuthorized(c.approvalStatus);
                return (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/80 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.imageUrl}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-lg border object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-muted text-xs font-bold">
                          {c.companyName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{c.companyName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {companyMetaLine(c)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {awaitingAuth ? (
                        <>
                          <PendingButton
                            pending={actionPending(`auth-co-${c.id}`)}
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
                            pending={actionPending(`rej-co-${c.id}`)}
                            onClick={() =>
                              void run(`rej-co-${c.id}`, async () => {
                                try {
                                  await rejectHotelCreditCompanyApi(
                                    c.id,
                                    "Rejected by admin",
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
                        </>
                      ) : null}
                      {canPrint ? (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => triggerPrint(c)}
                        >
                          <Printer className="h-4 w-4" />
                          Print agreement
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Corporate company authorization</CardTitle>
              <CardDescription>
                Cashier registers deals; manager authorizes before usage and may
                print the one-page corporate meal agreement.
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
                      <CardTitle className="text-base">{c.companyName}</CardTitle>
                      <CardDescription>{companyMetaLine(c)}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2 pb-4">
                      <PendingButton
                        pending={actionPending(`auth-co-${c.id}`)}
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
                        pending={actionPending(`rej-co-${c.id}`)}
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

          {authorized.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Authorized companies</CardTitle>
                <CardDescription>
                  Reprint agreements for authorized corporate deals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {authorized.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{c.companyName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {companyMetaLine(c)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => triggerPrint(c)}
                    >
                      <Printer className="h-4 w-4" />
                      Print agreement
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {printTarget && agreementProps ? (
        <div
          aria-hidden
          className="pointer-events-none fixed left-[-10000px] top-0 h-0 w-0 overflow-hidden opacity-0 print:static print:left-auto print:top-auto print:h-auto print:w-auto print:overflow-visible print:opacity-100"
        >
          <div ref={printRef}>
            <CorporateMealAgreementDocument {...agreementProps} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

