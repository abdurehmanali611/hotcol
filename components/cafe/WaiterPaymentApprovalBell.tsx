"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchPendingWaiterPaymentApprovals,
  resolveWaiterPaymentApproval,
  type WaiterPaymentApprovalRequest,
} from "@/lib/api/waiterPaymentApproval";
import {
  bumpWaiterPaymentApprovalFeed,
  subscribeWaiterPaymentApprovalChanged,
} from "@/lib/waiterPaymentApprovalSync";
import { useWaiterPaymentApprovalEnabled } from "@/hooks/useWaiterPaymentApprovalEnabled";
import { refreshCafeOrdersFeed } from "@/lib/api/client";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";

const POLL_MS = 5000;

type Props = {
  onResolved?: () => void;
};

export function WaiterPaymentApprovalBell({ onResolved }: Props) {
  const approvalEnabled = useWaiterPaymentApprovalEnabled();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WaiterPaymentApprovalRequest[]>([]);
  const [noteById, setNoteById] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!approvalEnabled) {
      setRows([]);
      return;
    }
    try {
      const next = await fetchPendingWaiterPaymentApprovals();
      setRows(next);
    } catch {
      /* keep prior */
    }
  }, [approvalEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useVisibleInterval(() => {
    void load();
  }, POLL_MS);

  useEffect(() => {
    return subscribeWaiterPaymentApprovalChanged(() => {
      void load();
    });
  }, [load]);

  if (!approvalEnabled) return null;

  const resolve = async (row: WaiterPaymentApprovalRequest, approve: boolean) => {
    setBusyId(row.id);
    try {
      await resolveWaiterPaymentApproval({
        requestId: row.id,
        approve,
        cashierNote: noteById[row.id] || null,
      });
      bumpWaiterPaymentApprovalFeed();
      refreshCafeOrdersFeed();
      await load();
      onResolved?.();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not resolve request",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative h-9 w-9 shrink-0"
          aria-label="Waiter payment approval requests"
        >
          <Bell className="h-4 w-4" />
          {rows.length > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-1.5 -top-1.5 h-5 min-w-5 px-1 text-[10px]"
            >
              {rows.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-1.5rem,22rem)] p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">Payment approval requests</p>
          <p className="text-xs text-muted-foreground">
            Approve to mark paid, or dismiss with an optional note.
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {rows.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No pending requests
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border bg-card p-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium">
                        {row.waiterName}
                        {row.tableNo != null ? ` · Table ${row.tableNo}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.paymentMethod} ·{" "}
                        {Number(row.amountPaid).toLocaleString()} ETB
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.orderIds.length} line
                        {row.orderIds.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <Textarea
                    value={noteById[row.id] ?? ""}
                    onChange={(e) =>
                      setNoteById((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
                    }
                    placeholder="Optional cashier note"
                    className="mt-2 min-h-14 text-xs"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 gap-1"
                      disabled={busyId === row.id}
                      onClick={() => void resolve(row, true)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      disabled={busyId === row.id}
                      onClick={() => void resolve(row, false)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
