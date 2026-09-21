"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import {
  fetchPendingLodgingDiscounts,
  resolveLodgingDiscountApi,
  type LodgingBillLine,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { BadgePercent } from "lucide-react";
import { toast } from "sonner";

function formatMoney(n: number) {
  return `ETB ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function LodgingDiscountApprovalsPanel({
  refreshKey = 0,
}: {
  /** Bumped by Manager header refresh so this panel reloads with system refresh. */
  refreshKey?: number;
}) {
  const [rows, setRows] = useState<LodgingBillLine[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchPendingLodgingDiscounts());
    } catch (e) {
      notifyApiFailure(e, "Could not load discount requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const resolve = async (lineId: number, approve: boolean) => {
    setPending(`${approve ? "ok" : "no"}-${lineId}`);
    try {
      await resolveLodgingDiscountApi({
        lineId,
        approve,
        note: notes[lineId]?.trim() || undefined,
      });
      setNotes((n) => {
        const next = { ...n };
        delete next[lineId];
        return next;
      });
      await load();
    } catch (e) {
      notifyApiFailure(e, approve ? "Approve failed" : "Reject failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20 shadow-lg">
      <div className="h-1 bg-linear-to-r from-amber-500/55 via-primary/40 to-emerald-500/40" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BadgePercent className="h-5 w-5 text-primary" />
          Discount approvals
        </CardTitle>
        <CardDescription className="mt-1 max-w-2xl">
          Reception can request folio discounts; they reduce the stay total only
          after Manager approval. Manager-applied discounts skip this queue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground py-6">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            No pending discount requests.
          </div>
        ) : (
          rows.map((line) => {
            const amt = Math.abs(Number(line.unitPriceETB || line.amountETB || 0));
            return (
              <div
                key={line.id}
                className="space-y-3 rounded-xl border border-border/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {formatMoney(amt)}
                      {line.roomNumber ? (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · Room {line.roomNumber}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {line.description || "No reason given"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested by {line.createdBy || "—"}
                      {line.createdAt
                        ? ` · ${new Date(line.createdAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    Pending
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`disc-note-${line.id}`}>Note (optional)</Label>
                  <Input
                    id={`disc-note-${line.id}`}
                    value={notes[line.id] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [line.id]: e.target.value }))
                    }
                    placeholder="Approval or rejection note"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <PendingButton
                    type="button"
                    pending={pending === `ok-${line.id}`}
                    onClick={() => void resolve(line.id, true)}
                  >
                    Approve
                  </PendingButton>
                  <PendingButton
                    type="button"
                    variant="outline"
                    pending={pending === `no-${line.id}`}
                    onClick={() => {
                      if (!notes[line.id]?.trim()) {
                        toast.message("Add a short reject note if useful");
                      }
                      void resolve(line.id, false);
                    }}
                  >
                    Reject
                  </PendingButton>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
