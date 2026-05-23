"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  authorizeCreditRegistrationApi,
  fetchCreditRegistrations,
  rejectCreditRegistrationApi,
  type CreditRegistration,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import {
  cafeCreditApprovalLabel,
  isCafeCreditRegistrationActive,
} from "@/lib/creditRegistrationStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";

export function CafeCreditorApprovals({ tenantScope }: { tenantScope: string }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CreditRegistration[]>([]);
  const { isPending, run } = useConcurrentActions();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchCreditRegistrations();
      const t = String(tenantScope ?? "").trim();
      setRows(
        all.filter(
          (r: CreditRegistration) =>
            !t || rowHotelMatchesTenantScope(r.HotelName, t),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [tenantScope]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(
    () =>
      rows.filter(
        (r) =>
          String(r.approvalStatus ?? "").toUpperCase() === "PENDING_ADMIN",
      ),
    [rows],
  );

  const authorized = useMemo(
    () => rows.filter((r) => isCafeCreditRegistrationActive(r)),
    [rows],
  );

  return (
    <Card className="border-primary/20 shadow-md mb-8">
      <CardHeader>
        <CardTitle>Creditor authorization</CardTitle>
        <CardDescription>
          Company and staff credit registrations submitted by the cashier must be
          approved before they appear at payment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending registrations. {authorized.length} active creditor
            {authorized.length === 1 ? "" : "s"} on file.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold truncate">{r.name}</span>
                    <Badge variant="outline">
                      {r.registrantType === "COMPANY" ? "Company" : "Staff"}
                    </Badge>
                    <Badge variant="secondary">
                      {cafeCreditApprovalLabel(r.approvalStatus)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.phoneNumber}
                    {r.companyTinNumber
                      ? ` · TIN ${r.companyTinNumber}`
                      : ""}
                    {r.affiliatedCompany
                      ? ` · ${r.affiliatedCompany}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.creditLevel} · ETB {Number(r.amount).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <PendingButton
                    size="sm"
                    pending={isPending(`auth-${r.id}`)}
                    onClick={() =>
                      void run(`auth-${r.id}`, async () => {
                        await authorizeCreditRegistrationApi(r.id);
                        await load();
                      })
                    }
                  >
                    Authorize
                  </PendingButton>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={isPending(`rej-${r.id}`)}
                    onClick={() =>
                      void run(`rej-${r.id}`, async () => {
                        await rejectCreditRegistrationApi(
                          r.id,
                          "Not approved by admin",
                        );
                        await load();
                      })
                    }
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
