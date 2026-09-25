"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HrPanelShell, HrSectionCard, HrEmptyState } from "@/components/hr/hrChrome";
import { notifyApiFailure } from "@/lib/actions";
import {
  decideHrOtpResetApi,
  fetchHrOtpResetRequestsApi,
  type HrOtpResetRequest,
} from "@/lib/api/hr";

export function HrOtpResetApprovalPanel() {
  const [rows, setRows] = useState<HrOtpResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<{ name: string; otp: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchHrOtpResetRequestsApi("pending");
      setRows(list);
    } catch (e) {
      notifyApiFailure(e, "Could not load OTP reset requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <HrPanelShell>
      <HrSectionCard
        title="OTP reset approvals"
        description="HR Manager requests a reset; you approve to generate a new portal code. The code is visible only to Manager until the employee’s first login."
        icon={<KeyRound className="h-5 w-5" />}
        accent="bg-linear-to-r from-amber-500 to-orange-400"
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <HrEmptyState
            title="No pending OTP resets"
            description="When HR requests a reset, it appears here for your approval."
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {r.employee?.fullName || `Employee #${r.employeeId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested by {r.requestedBy || "HR"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await decideHrOtpResetApi(r.id, false);
                        toast.message("OTP reset rejected");
                        await load();
                      } catch (e) {
                        notifyApiFailure(e, "Reject failed");
                      }
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        const decided = await decideHrOtpResetApi(r.id, true);
                        const otp =
                          String(decided.portalOtpPreview || "").trim() ||
                          String(decided.employee?.portalOtpPreview || "").trim();
                        if (otp) {
                          setRevealed({
                            name: decided.employee?.fullName || "Employee",
                            otp,
                          });
                        } else {
                          toast.success("OTP reset approved");
                        }
                        await load();
                      } catch (e) {
                        notifyApiFailure(e, "Approve failed");
                      }
                    }}
                  >
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {revealed ? (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-medium">
              New portal OTP for {revealed.name} (Manager only)
            </p>
            <p className="mt-2 font-mono text-2xl tracking-[0.3em]">{revealed.otp}</p>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(revealed.otp);
                  toast.success("Copied");
                } catch {
                  /* ignore */
                }
                setRevealed(null);
              }}
            >
              Copy and dismiss
            </Button>
          </div>
        ) : null}
      </HrSectionCard>
    </HrPanelShell>
  );
}
