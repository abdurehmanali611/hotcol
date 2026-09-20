"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LODGING_BILL_LINE_KINDS } from "@/constants/lodgingRooms";
import {
  closeLodgingBusinessDayApi,
  fetchLodgingBusinessDay,
  fetchLodgingTaxConfigs,
  upsertLodgingTaxConfigApi,
  type LodgingBusinessDay,
  type LodgingTaxConfig,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { CalendarCheck, Percent, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LodgingTaxConfigPanel() {
  const [rows, setRows] = useState<LodgingTaxConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await fetchLodgingTaxConfigs();
      setRows(list);
      const next: Record<string, string> = {};
      for (const kind of LODGING_BILL_LINE_KINDS) {
        const found = list.find((r) => r.kind === kind);
        next[kind] = String(found?.taxPercent ?? 0);
      }
      setDrafts(next);
    } catch (e) {
      notifyApiFailure(e, "Could not load tax config");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="overflow-hidden border-primary/20 shadow-lg">
      <div className="h-1 bg-linear-to-r from-indigo-500/60 via-primary/45 to-emerald-500/40" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Percent className="h-5 w-5 text-primary" />
          Lodging tax by charge type
        </CardTitle>
        <CardDescription>
          Percent applied per folio line kind (room, F&amp;B, laundry, other).
          Folio discounts are allowed only with Manager approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {LODGING_BILL_LINE_KINDS.map((kind) => (
            <div key={kind} className="space-y-1.5 rounded-xl border p-3">
              <Label className="capitalize">{kind.replace(/_/g, " ")}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="tabular-nums"
                  value={drafts[kind] ?? "0"}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [kind]: e.target.value }))
                  }
                />
                <PendingButton
                  type="button"
                  size="sm"
                  pending={pending === kind}
                  onClick={async () => {
                    setPending(kind);
                    try {
                      await upsertLodgingTaxConfigApi(
                        kind,
                        Math.max(0, Number(drafts[kind]) || 0),
                      );
                      await load();
                    } catch (e) {
                      notifyApiFailure(e, "Save failed");
                    } finally {
                      setPending(null);
                    }
                  }}
                >
                  Save
                </PendingButton>
              </div>
            </div>
          ))}
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No tax rows yet — saving a percent creates the config for this hotel.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function LodgingNightAuditPanel() {
  const [businessDate, setBusinessDate] = useState(todayYmd);
  const [day, setDay] = useState<LodgingBusinessDay | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const row = await fetchLodgingBusinessDay(businessDate);
      setDay(row);
    } catch (e) {
      notifyApiFailure(e, "Could not load business day");
    }
  }, [businessDate]);

  useEffect(() => {
    void load();
  }, [load]);

  let summary: Record<string, unknown> | null = null;
  try {
    summary = day?.summaryJson ? JSON.parse(day.summaryJson) : null;
  } catch {
    summary = null;
  }

  return (
    <Card className="overflow-hidden border-primary/20 shadow-lg">
      <div className="h-1 bg-linear-to-r from-amber-500/60 via-orange-500/45 to-rose-500/40" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Night audit — close business day
        </CardTitle>
        <CardDescription>
          Manual close only. Captures arrivals, departures, in-house, no-shows,
          and outstanding balances for the selected date.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Business date</Label>
            <Input
              type="date"
              value={businessDate}
              onChange={(e) => setBusinessDate(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void load()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <PendingButton
            type="button"
            pending={pending}
            disabled={day?.status === "closed"}
            onClick={async () => {
              setPending(true);
              try {
                const row = await closeLodgingBusinessDayApi(businessDate);
                setDay(row);
                toast.success("Business day closed");
              } catch (e) {
                notifyApiFailure(e, "Could not close day");
              } finally {
                setPending(false);
              }
            }}
          >
            Close business day
          </PendingButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={day?.status === "closed" ? "default" : "secondary"}
            className="capitalize"
          >
            {day?.status === "closed" ? "Closed" : "Open / not closed"}
          </Badge>
          {day?.closedBy ? (
            <span className="text-xs text-muted-foreground">
              by {day.closedBy}
              {day.closedAt
                ? ` · ${new Date(day.closedAt).toLocaleString()}`
                : ""}
            </span>
          ) : null}
        </div>

        {summary ? (
          <div className="grid gap-2 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
            {Object.entries(summary).map(([k, v]) => (
              <div key={k} className="text-sm">
                <span className="text-muted-foreground capitalize">
                  {k.replace(/([A-Z])/g, " $1")}:{" "}
                </span>
                <span className="font-medium tabular-nums">
                  {typeof v === "number"
                    ? v.toLocaleString()
                    : String(v ?? "—")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Close the day to generate the audit summary snapshot.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
