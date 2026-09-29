"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  HrEmptyState,
  HrPanelShell,
  HrSectionCard,
  hrPrimaryBtnClass,
} from "@/components/hr/hrChrome";
import { notifyApiFailure } from "@/lib/actions";
import {
  fetchAtsAccessOtpsApi,
  upsertAtsAccessOtpApi,
  type AtsAccessOtp,
} from "@/lib/api/ats";
import { cn } from "@/lib/utils";

type AtsRole = "HR" | "Manager";

export function HrAtsOtpPanel() {
  const [rows, setRows] = useState<AtsAccessOtp[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AtsRole>("HR");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{
    role: AtsRole;
    otp: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAtsAccessOtpsApi());
    } catch (e) {
      notifyApiFailure(e, "Could not load ATS access codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => void load();
    window.addEventListener("hotcol-hr-refresh", onRefresh);
    return () => window.removeEventListener("hotcol-hr-refresh", onRefresh);
  }, [load]);

  const existing = rows.find((r) => r.role === role);

  const issue = async () => {
    setBusy(true);
    try {
      const row = await upsertAtsAccessOtpApi(role);
      const otp = String(row.otpPreview || "").trim();
      if (!otp) {
        toast.error("Code was saved but preview was empty — try again");
      } else {
        setPreview({ role, otp });
        toast.success(
          existing?.hasCode
            ? `${role} ATS code rotated`
            : `${role} ATS code created`,
        );
      }
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not save ATS access code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <HrPanelShell>
      <HrSectionCard
        title="ATS access codes"
        description="Create or rotate HotCol ATS Admin unlock codes for HR and Manager. Codes are unique across hotels, stored hashed, and shown once after Save. Share the code only with the people who should open ATS Admin for this property."
        icon={<Briefcase className="h-5 w-5" />}
        accent="bg-linear-to-r from-sky-600 to-indigo-500"
      >
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {(["HR", "Manager"] as const).map((r) => {
                const row = rows.find((x) => x.role === r);
                return (
                  <div
                    key={r}
                    className={cn(
                      "rounded-xl border p-4 ring-1",
                      row?.hasCode
                        ? "border-emerald-500/25 bg-emerald-500/8 ring-emerald-500/10"
                        : "border-border/60 bg-muted/20 ring-transparent",
                    )}
                  >
                    <p className="text-sm font-semibold">{r}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row?.hasCode
                        ? `Code on file · updated ${row.updatedBy ? `by ${row.updatedBy}` : "—"}`
                        : "No code yet"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-2xl border border-sky-500/20 bg-linear-to-br from-sky-500/8 via-card to-indigo-500/5 p-4 shadow-sm ring-1 ring-sky-500/10 sm:p-5">
              <Label className="text-xs font-medium text-sky-900/80 dark:text-sky-200/80">
                Who is this code for?
              </Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {(["HR", "Manager"] as const).map((r) => (
                  <label
                    key={r}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      role === r
                        ? "border-sky-500/40 bg-sky-500/15 font-medium"
                        : "border-border/60 hover:bg-muted/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="ats-otp-role"
                      className="accent-sky-600"
                      checked={role === r}
                      onChange={() => setRole(r)}
                      disabled={busy}
                    />
                    {r}
                  </label>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className={cn(hrPrimaryBtnClass, "cursor-pointer")}
                  disabled={busy}
                  onClick={() => void issue()}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : existing?.hasCode ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  {existing?.hasCode ? "Get OTP and Save (rotate)" : "Get OTP and Save"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Rotating replaces the previous code for that role. Anyone still
                using the old code must get the new one.
              </p>
            </div>

            {preview ? (
              <div className="overflow-hidden rounded-xl border border-amber-500/35 bg-linear-to-br from-amber-500/15 via-amber-500/5 to-orange-500/10 p-5 shadow-sm ring-1 ring-amber-500/20">
                <p className="text-sm font-semibold">
                  New {preview.role} ATS code (copy now)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Shown once here. It is not stored in plaintext after this.
                </p>
                <p className="mt-3 rounded-lg border border-amber-500/25 bg-background/70 px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-amber-950 dark:text-amber-100">
                  {preview.otp}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 cursor-pointer border-amber-500/30"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(preview.otp);
                      toast.success("Copied");
                    } catch {
                      /* ignore */
                    }
                    setPreview(null);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy and dismiss
                </Button>
              </div>
            ) : null}

            {!rows.some((r) => r.hasCode) && !preview ? (
              <HrEmptyState
                title="No ATS codes yet"
                description="Choose HR or Manager, then Get OTP and Save. Staff unlock ATS Admin with that code."
              />
            ) : null}
          </div>
        )}
      </HrSectionCard>
    </HrPanelShell>
  );
}
