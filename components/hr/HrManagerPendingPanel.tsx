"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HrPanelShell,
  HrSectionCard,
  HrEmptyState,
} from "@/components/hr/hrChrome";
import { notifyApiFailure } from "@/lib/actions";
import {
  decideHrManagerPendingActionApi,
  fetchHrManagerPendingActionsApi,
  type HrManagerPendingAction,
} from "@/lib/api/hr";

function kindLabel(kind: string) {
  switch (kind) {
    case "terminate":
      return "Terminate employee";
    case "attendance_correction":
      return "Attendance correction";
    case "payroll_generate":
      return "Generate payroll";
    default:
      return kind.replaceAll("_", " ");
  }
}

export function HrManagerPendingPanel() {
  const [rows, setRows] = useState<HrManagerPendingAction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchHrManagerPendingActionsApi("pending");
      setRows(list);
    } catch (e) {
      notifyApiFailure(e, "Could not load pending HR approvals");
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
        title="Manager HR approvals"
        description="HR Manager requests for terminate, attendance corrections, and payroll generate appear here until you approve or reject."
        icon={<ClipboardCheck className="h-5 w-5" />}
        accent="bg-linear-to-r from-sky-600 to-cyan-500"
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <HrEmptyState
            title="No pending HR actions"
            description="Terminate, attendance corrections, and payroll generate requests from HR show up here."
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{kindLabel(r.kind)}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.employee?.fullName
                      ? r.employee.fullName
                      : r.kind === "payroll_generate"
                        ? "Payroll run"
                        : `Employee #${r.employeeId ?? "—"}`}
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
                        await decideHrManagerPendingActionApi(r.id, false);
                        toast.message("Request rejected");
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
                        await decideHrManagerPendingActionApi(r.id, true);
                        toast.success("Request approved");
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
      </HrSectionCard>
    </HrPanelShell>
  );
}
