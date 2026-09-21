"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { PendingButton } from "@/components/ui/pending-button";
import {
  fetchPendingLodgingDiscounts,
  resolveLodgingDiscountApi,
  type LodgingBillLine,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  BadgePercent,
  BedDouble,
  Check,
  Clock3,
  MessageSquareQuote,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

function formatMoney(n: number) {
  return `ETB ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function discountAmount(line: LodgingBillLine) {
  return Math.abs(Number(line.unitPriceETB || line.amountETB || 0));
}

function initials(name?: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function relativeTime(iso?: string) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
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
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchPendingLodgingDiscounts();
      setRows(next);
      setSelectedId((prev) => {
        if (prev != null && next.some((r) => r.id === prev)) return prev;
        return next[0]?.id ?? null;
      });
    } catch (e) {
      notifyApiFailure(e, "Could not load discount requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((line) => {
      const hay = [
        line.description,
        line.roomNumber,
        line.createdBy,
        String(discountAmount(line)),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!filtered.some((r) => r.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const totals = useMemo(() => {
    const exposure = rows.reduce((sum, line) => sum + discountAmount(line), 0);
    const rooms = new Set(
      rows.map((r) => r.roomNumber).filter((n) => Boolean(n?.trim())),
    ).size;
    return { count: rows.length, exposure, rooms };
  }, [rows]);

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
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-linear-to-br from-amber-500/[0.1] via-background to-emerald-500/[0.07] shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-400/50 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-amber-500/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-emerald-500/12 blur-3xl"
        />
        <div className="relative space-y-5 p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-amber-950 shadow-sm dark:text-amber-300">
                <ShieldCheck className="size-3.5" />
                Manager only
              </div>
              <div className="space-y-2">
                <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500/25 to-amber-500/5 text-amber-900 shadow-inner ring-1 ring-amber-500/30 dark:text-amber-300">
                    <BadgePercent className="size-5" />
                  </span>
                  Discount approvals
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty sm:text-[15px]">
                  Reception can request folio discounts; they reduce the stay
                  total only after you approve. Manager-applied discounts skip
                  this queue.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Pending",
                value: String(totals.count),
                icon: Clock3,
                tone: "from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/20",
                iconTone: "text-amber-700 dark:text-amber-300",
              },
              {
                label: "Requested total",
                value: formatMoney(totals.exposure),
                icon: Sparkles,
                tone: "from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/20",
                iconTone: "text-emerald-700 dark:text-emerald-300",
              },
              {
                label: "Rooms affected",
                value: String(totals.rooms),
                icon: BedDouble,
                tone: "from-sky-500/20 via-sky-500/5 to-transparent border-sky-500/20",
                iconTone: "text-sky-700 dark:text-sky-300",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "rounded-2xl border bg-linear-to-br p-4 shadow-sm backdrop-blur-sm",
                  stat.tone,
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <stat.icon className={cn("size-4", stat.iconTone)} />
                </div>
                <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
                  {loading ? "—" : stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search room, requester, reason, or amount…"
          className="h-11 rounded-xl border-border/70 bg-card/80 pl-10 shadow-sm ring-offset-background focus-visible:ring-amber-500/30"
          aria-label="Search pending discounts"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardContent className="space-y-3 py-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-2xl bg-muted/50"
                  style={{ animationDelay: `${i * 70}ms` }}
                />
              ))}
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardContent className="space-y-4 py-8">
              <div className="h-16 animate-pulse rounded-2xl bg-muted/50" />
              <div className="h-28 animate-pulse rounded-2xl bg-muted/40" />
              <div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
            </CardContent>
          </Card>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="overflow-hidden border-dashed border-border/80 bg-muted/10 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500/15 to-emerald-500/10 text-muted-foreground ring-1 ring-border/60">
              <BadgePercent className="size-6" />
            </span>
            <div className="space-y-1">
              <p className="font-medium tracking-tight">
                {rows.length === 0
                  ? "No pending discount requests"
                  : "No matches for that search"}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground text-pretty">
                {rows.length === 0
                  ? "When Reception requests a folio discount, it will show up here for approval."
                  : "Try another room, requester, reason, or amount."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <Card className="overflow-hidden border-border/70 shadow-md">
            <div className="h-1 bg-linear-to-r from-amber-500/70 via-emerald-500/40 to-transparent" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base tracking-tight">
                    Pending requests
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Select a request, then decide on the right.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-500/35 bg-amber-500/10 tabular-nums text-amber-900 dark:text-amber-300"
                >
                  {filtered.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pb-5">
              {filtered.map((line) => {
                const active = selectedId === line.id;
                const amt = discountAmount(line);
                const ago = relativeTime(line.createdAt);
                return (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => setSelectedId(line.id)}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all duration-200",
                      active
                        ? "border-amber-500/45 bg-linear-to-br from-amber-500/[0.12] via-amber-500/[0.05] to-transparent shadow-md ring-1 ring-amber-500/25"
                        : "border-border/60 bg-card/50 hover:border-amber-500/25 hover:bg-muted/35 hover:shadow-sm",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-3 left-0 w-1 rounded-full transition-all",
                        active
                          ? "bg-linear-to-b from-amber-500 to-emerald-500 opacity-100"
                          : "bg-border opacity-0 group-hover:opacity-60",
                      )}
                    />
                    <div className="flex items-start justify-between gap-3 pl-1.5">
                      <div className="min-w-0 space-y-2">
                        <p
                          className={cn(
                            "line-clamp-2 text-sm leading-snug tracking-tight",
                            active ? "font-medium" : "text-foreground/90",
                          )}
                        >
                          {line.description || "No reason given"}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {line.roomNumber ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-sky-500/30 bg-sky-500/10 font-normal text-sky-900 dark:text-sky-300"
                            >
                              <BedDouble className="size-3" />
                              {line.roomNumber}
                            </Badge>
                          ) : null}
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                            <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[9px] font-semibold tracking-wide text-foreground/80">
                              {initials(line.createdBy)}
                            </span>
                            {line.createdBy || "—"}
                          </span>
                          {ago ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock3 className="size-3" />
                              {ago}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "shrink-0 rounded-xl px-2.5 py-1.5 text-right",
                          active
                            ? "bg-emerald-500/15 ring-1 ring-emerald-500/25"
                            : "bg-muted/40",
                        )}
                      >
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Off
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                          −{formatMoney(amt)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {selected ? (
            <Card
              key={selected.id}
              className="overflow-hidden border-border/70 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200"
            >
              <div className="h-1 bg-linear-to-r from-amber-500 via-emerald-500/70 to-sky-500/40" />
              <CardHeader className="relative space-y-4 overflow-hidden border-b border-border/60 bg-linear-to-br from-muted/40 via-muted/10 to-emerald-500/[0.04] pb-5">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-emerald-500/10 blur-2xl"
                />
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-950 dark:text-amber-300">
                      <Clock3 className="size-3" />
                      Awaiting decision
                    </div>
                    <CardTitle className="text-xl tracking-tight sm:text-2xl">
                      Review discount
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      {selected.roomNumber ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-sky-900 dark:text-sky-300">
                          <BedDouble className="size-3.5" />
                          Room {selected.roomNumber}
                        </span>
                      ) : (
                        <span>No room tagged</span>
                      )}
                      <span
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/70 px-2 py-0.5"
                      >
                        <UserRound className="size-3.5" />
                        {selected.createdBy || "Unknown requester"}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/30 bg-linear-to-br from-emerald-500/20 to-emerald-500/[0.04] px-4 py-3 text-right shadow-sm">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-900/70 dark:text-emerald-300/80">
                      Discount
                    </p>
                    <p className="text-xl font-semibold tabular-nums text-emerald-950 dark:text-emerald-200 sm:text-2xl">
                      −{formatMoney(discountAmount(selected))}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-linear-to-br from-amber-500/[0.1] via-background to-transparent p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-300">
                      <MessageSquareQuote className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Guest reason
                      </p>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/95 text-pretty">
                        {selected.description || "No reason given"}
                      </p>
                      {selected.createdAt ? (
                        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="size-3.5" />
                          Requested{" "}
                          {new Date(selected.createdAt).toLocaleString()}
                          {relativeTime(selected.createdAt)
                            ? ` · ${relativeTime(selected.createdAt)}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/10 p-4">
                  <Label
                    htmlFor={`disc-note-${selected.id}`}
                    className="text-sm font-medium"
                  >
                    Manager note{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id={`disc-note-${selected.id}`}
                    rows={3}
                    value={notes[selected.id] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({
                        ...n,
                        [selected.id]: e.target.value,
                      }))
                    }
                    placeholder="Why are you approving or rejecting this discount?"
                    className="resize-none rounded-xl border-border/70 bg-background/90 shadow-sm"
                    disabled={pending != null}
                  />
                </div>

                <div className="-mx-6 -mb-5 border-t border-border/60 bg-linear-to-r from-rose-500/[0.04] via-muted/20 to-emerald-500/[0.06] px-6 py-4">
                  <div className="flex flex-wrap justify-end gap-2.5">
                    <PendingButton
                      type="button"
                      variant="outline"
                      className="h-11 min-w-36 gap-2 rounded-xl border-rose-500/35 bg-background/80 text-rose-700 shadow-sm hover:bg-rose-500/10 dark:text-rose-300"
                      pending={pending === `no-${selected.id}`}
                      disabled={
                        pending != null && pending !== `no-${selected.id}`
                      }
                      onClick={() => void resolve(selected.id, false)}
                    >
                      <X className="size-4" />
                      Reject
                    </PendingButton>
                    <PendingButton
                      type="button"
                      className="h-11 min-w-40 gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-600/20 hover:from-emerald-600/95 hover:to-emerald-500/95"
                      pending={pending === `ok-${selected.id}`}
                      disabled={
                        pending != null && pending !== `ok-${selected.id}`
                      }
                      onClick={() => void resolve(selected.id, true)}
                    >
                      <Check className="size-4" />
                      Approve discount
                    </PendingButton>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
