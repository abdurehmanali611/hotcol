"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Users } from "lucide-react";
import {
  deleteDepartmentLeaderApi,
  fetchDepartmentLeaders,
  upsertDepartmentLeaderApi,
} from "@/lib/api/departmentLeaders";
import {
  DEPARTMENT_LABELS,
  HOTEL_DEPARTMENT_CODES,
  LEGACY_HOUSE_KEEPING_CODE,
  normalizeLeaderNames,
  type DepartmentLeaderRow,
} from "@/lib/departments";
import { notifyApiFailure } from "@/lib/actions";

export function DepartmentLeadersPanel() {
  const [leaders, setLeaders] = useState<DepartmentLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [pendingDept, setPendingDept] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchDepartmentLeaders();
      setLeaders(rows);
      const next: Record<string, string> = {};
      for (const code of HOTEL_DEPARTMENT_CODES) {
        const row = rows.find((r) => r.department === code);
        next[code] = row?.leaderName ?? "";
      }
      const legacy = rows.find((r) => r.department === LEGACY_HOUSE_KEEPING_CODE);
      if (legacy?.leaderName && !next.HOUSE_KEEPING_ROOM?.trim()) {
        next.HOUSE_KEEPING_ROOM = legacy.leaderName;
      }
      setDraftNames(next);
    } catch (e) {
      notifyApiFailure(e, "Could not load department leaders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byDept = new Map(leaders.map((r) => [r.department, r]));

  return (
    <Card className="max-w-3xl border-border/80 shadow-md bg-card/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Department leaders
        </CardTitle>
        <CardDescription>
          Register one or more leaders per department (comma-separated), e.g.{" "}
          <span className="font-medium text-foreground">Abdu, Sara</span>.
          Housekeeping has separate room and public area leaders. Only
          departments with a leader appear when store staff choose received by
          or requested by. Names are snapshotted on each request for printed
          receipts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="divide-y rounded-xl border border-border/70">
            {HOTEL_DEPARTMENT_CODES.map((code) => {
              const existing = byDept.get(code);
              const label = DEPARTMENT_LABELS[code];
              return (
                <li
                  key={code}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:gap-4"
                >
                  <div className="min-w-[200px] shrink-0">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{code}</p>
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <Label htmlFor={`leader-${code}`} className="sr-only">
                      Leader name(s) for {label}
                    </Label>
                    <Input
                      id={`leader-${code}`}
                      value={draftNames[code] ?? ""}
                      onChange={(e) =>
                        setDraftNames((prev) => ({
                          ...prev,
                          [code]: e.target.value,
                        }))
                      }
                      placeholder="e.g. Abdu, Sara"
                      className="h-10"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Separate multiple leaders with commas
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <PendingButton
                      type="button"
                      size="sm"
                      pending={pendingDept === `save-${code}`}
                      disabled={!normalizeLeaderNames(draftNames[code] ?? "")}
                      onClick={async () => {
                        setPendingDept(`save-${code}`);
                        try {
                          const normalized = normalizeLeaderNames(
                            draftNames[code] ?? "",
                          );
                          await upsertDepartmentLeaderApi(code, normalized);
                          await load();
                        } catch (e) {
                          notifyApiFailure(e, "Could not save");
                        } finally {
                          setPendingDept(null);
                        }
                      }}
                    >
                      {existing ? "Update" : "Save"}
                    </PendingButton>
                    {existing ? (
                      <PendingButton
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        pending={pendingDept === `del-${code}`}
                        onClick={async () => {
                          setPendingDept(`del-${code}`);
                          try {
                            await deleteDepartmentLeaderApi(code);
                            setDraftNames((prev) => ({ ...prev, [code]: "" }));
                            await load();
                          } catch (e) {
                            notifyApiFailure(e, "Could not remove");
                          } finally {
                            setPendingDept(null);
                          }
                        }}
                      >
                        Remove
                      </PendingButton>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
