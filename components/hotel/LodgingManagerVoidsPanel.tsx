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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  fetchLodgingActiveStays,
  voidLodgingBillApi,
  voidLodgingBillLineApi,
  voidLodgingRoomChargesApi,
  type LodgingBillLine,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Ban,
  BedDouble,
  FileText,
  Hash,
  Receipt,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

function formatMoney(n: number) {
  return `ETB ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function guestLabel(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "Guest";
  return `${g.firstName || ""} ${g.lastName || ""}`.trim() || "Guest";
}

function roomsLabel(stay: LodgingStay) {
  return (
    stay.rooms
      ?.map((r) => r.room?.roomNumber)
      .filter(Boolean)
      .join(", ") || "—"
  );
}

function lineKindClass(kind: string) {
  switch (String(kind || "").toLowerCase()) {
    case "room":
      return "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300";
    case "food_drink":
      return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300";
    case "laundry":
      return "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-300";
    case "discount":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    default:
      return "border-border bg-muted/60 text-muted-foreground";
  }
}

type VoidIntent =
  | { type: "bill"; stay: LodgingStay; reason: string }
  | { type: "room"; stay: LodgingStay; roomNumber: string; reason: string }
  | { type: "line"; stay: LodgingStay; line: LodgingBillLine; reason: string };

export function LodgingManagerVoidsPanel({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [stays, setStays] = useState<LodgingStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [intent, setIntent] = useState<VoidIntent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchLodgingActiveStays();
      const open = rows.filter(
        (s) =>
          s.status === "checked_in" &&
          s.bill &&
          String(s.bill.status || "").toLowerCase() === "open",
      );
      setStays(open);
      setExpandedId((prev) => {
        if (prev != null && open.some((s) => s.id === prev)) return prev;
        return open[0]?.id ?? null;
      });
    } catch (e) {
      notifyApiFailure(e, "Could not load stays for voids");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const reasonFor = (key: string) => (reasons[key] || "").trim();
  const setReason = (key: string, value: string) => {
    setReasons((prev) => ({ ...prev, [key]: value }));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stays;
    return stays.filter((s) => {
      const hay = [
        guestLabel(s),
        s.voucherCode,
        roomsLabel(s),
        String(s.bill?.totalETB ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [stays, query]);

  const totals = useMemo(() => {
    const exposure = stays.reduce(
      (sum, s) => sum + Number(s.bill?.totalETB || 0),
      0,
    );
    const lines = stays.reduce(
      (sum, s) =>
        sum + (s.bill?.lines ?? []).filter((l) => !l.voided).length,
      0,
    );
    return { exposure, lines, stays: stays.length };
  }, [stays]);

  const confirmCopy = useMemo(() => {
    if (!intent) return { title: "", body: "" };
    if (intent.type === "bill") {
      return {
        title: "Void entire folio?",
        body: `This voids every open line on ${guestLabel(intent.stay)}’s bill (${intent.stay.voucherCode}). Total ${formatMoney(intent.stay.bill?.totalETB ?? 0)}.`,
      };
    }
    if (intent.type === "room") {
      return {
        title: `Void room ${intent.roomNumber} charges?`,
        body: `All non-voided folio lines for room ${intent.roomNumber} on ${guestLabel(intent.stay)}’s stay will be voided.`,
      };
    }
    return {
      title: "Void this line?",
      body: `${intent.line.description} · ${formatMoney(intent.line.amountETB)} will be removed from the open folio.`,
    };
  }, [intent]);

  const runVoid = async () => {
    if (!intent) return;
    setPending(true);
    try {
      if (intent.type === "bill") {
        await voidLodgingBillApi(intent.stay.bill!.id, intent.reason);
      } else if (intent.type === "room") {
        await voidLodgingRoomChargesApi(
          intent.stay.id,
          intent.roomNumber,
          intent.reason,
        );
      } else {
        await voidLodgingBillLineApi(intent.line.id, intent.reason);
      }
      setIntent(null);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not complete void");
    } finally {
      setPending(false);
    }
  };

  const requestVoid = (next: VoidIntent) => {
    if (!next.reason) {
      toast.error("Enter a void reason first");
      return;
    }
    setIntent(next);
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-linear-to-br from-rose-500/[0.07] via-background to-amber-500/[0.06] shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-rose-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-amber-500/10 blur-3xl"
        />
        <div className="relative space-y-5 p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-rose-800 dark:text-rose-300">
                <ShieldAlert className="size-3.5" />
                Manager only
              </div>
              <div className="space-y-2">
                <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/25 dark:text-rose-300">
                    <Ban className="size-5" />
                  </span>
                  Folio voids
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty sm:text-[15px]">
                  Correct open guest folios with a clear audit trail. Void a
                  whole bill, every charge on one room, or a single line —
                  always with a required reason. Reception cannot void.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Open folios",
                value: String(totals.stays),
                icon: Receipt,
                tone: "from-rose-500/15 to-transparent",
              },
              {
                label: "Live exposure",
                value: formatMoney(totals.exposure),
                icon: Sparkles,
                tone: "from-amber-500/15 to-transparent",
              },
              {
                label: "Active lines",
                value: String(totals.lines),
                icon: FileText,
                tone: "from-sky-500/15 to-transparent",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "rounded-2xl border border-border/60 bg-linear-to-br p-4 shadow-sm backdrop-blur-sm",
                  stat.tone,
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <stat.icon className="size-4 text-muted-foreground/80" />
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
          placeholder="Search guest, voucher, or room…"
          className="h-11 rounded-xl border-border/70 bg-card/80 pl-10 shadow-sm"
          aria-label="Search open folios"
        />
      </div>

      {loading ? (
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardContent className="space-y-4 py-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-muted/50"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="overflow-hidden border-dashed border-border/80 bg-muted/10 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-border/60">
              <Receipt className="size-6" />
            </span>
            <div className="space-y-1">
              <p className="font-medium tracking-tight">
                {stays.length === 0
                  ? "No open folios to void"
                  : "No matches for that search"}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground text-pretty">
                {stays.length === 0
                  ? "Checked-in stays with an open bill will appear here."
                  : "Try another guest name, voucher, or room number."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <Card className="overflow-hidden border-border/70 shadow-md">
            <div className="h-1 bg-linear-to-r from-rose-500/60 via-amber-500/35 to-transparent" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base tracking-tight">
                In-house folios
              </CardTitle>
              <CardDescription>
                Select a stay, then choose how much of the folio to void.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pb-5">
              {filtered.map((stay) => {
                const active = expandedId === stay.id;
                const lineCount = (stay.bill?.lines ?? []).filter(
                  (l) => !l.voided,
                ).length;
                return (
                  <button
                    key={stay.id}
                    type="button"
                    onClick={() => setExpandedId(stay.id)}
                    className={cn(
                      "w-full rounded-2xl border px-4 py-3.5 text-left transition-all duration-200",
                      active
                        ? "border-rose-500/35 bg-rose-500/[0.07] shadow-sm ring-1 ring-rose-500/20"
                        : "border-border/60 bg-card/40 hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1.5">
                        <p className="truncate font-medium tracking-tight">
                          {guestLabel(stay)}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="gap-1 font-mono text-[11px] font-normal"
                          >
                            <Hash className="size-3" />
                            {stay.voucherCode}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="gap-1 font-normal"
                          >
                            <BedDouble className="size-3" />
                            {roomsLabel(stay)}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="font-normal tabular-nums"
                          >
                            {lineCount} line{lineCount === 1 ? "" : "s"}
                          </Badge>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatMoney(stay.bill?.totalETB ?? 0)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {filtered.map((stay) => {
            if (stay.id !== expandedId) return null;
            const billKey = `bill-${stay.bill!.id}`;
            const lines = (stay.bill?.lines ?? []).filter((l) => !l.voided);
            const roomNums = [
              ...new Set(
                (stay.rooms || [])
                  .map((r) => r.room?.roomNumber)
                  .filter(Boolean) as string[],
              ),
            ];

            return (
              <Card
                key={`detail-${stay.id}`}
                className="overflow-hidden border-border/70 shadow-lg"
              >
                <div className="h-1 bg-linear-to-r from-rose-500/70 via-primary/30 to-amber-500/45" />
                <CardHeader className="space-y-3 border-b border-border/60 bg-muted/15 pb-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-xl tracking-tight">
                        {guestLabel(stay)}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        <span className="font-mono">{stay.voucherCode}</span>
                        <span aria-hidden>·</span>
                        <span>Rm {roomsLabel(stay)}</span>
                      </CardDescription>
                    </div>
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-right">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-rose-800/80 dark:text-rose-300/80">
                        Folio total
                      </p>
                      <p className="text-lg font-semibold tabular-nums text-rose-900 dark:text-rose-200">
                        {formatMoney(stay.bill?.totalETB ?? 0)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <Tabs defaultValue="bill" className="space-y-4">
                    <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1">
                      <TabsTrigger
                        value="bill"
                        className="rounded-lg py-2.5 text-xs sm:text-sm"
                      >
                        Whole bill
                      </TabsTrigger>
                      <TabsTrigger
                        value="room"
                        className="rounded-lg py-2.5 text-xs sm:text-sm"
                      >
                        By room
                      </TabsTrigger>
                      <TabsTrigger
                        value="line"
                        className="rounded-lg py-2.5 text-xs sm:text-sm"
                      >
                        By line
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="bill" className="space-y-4">
                      <div className="rounded-2xl border border-rose-500/20 bg-linear-to-br from-rose-500/[0.06] to-transparent p-4 sm:p-5">
                        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                          Voids every remaining line and marks the bill void.
                          Use only when the entire folio should be cleared.
                        </p>
                        <div className="mt-4 space-y-2">
                          <Label htmlFor={billKey}>Reason</Label>
                          <Textarea
                            id={billKey}
                            rows={3}
                            value={reasons[billKey] || ""}
                            onChange={(e) =>
                              setReason(billKey, e.target.value)
                            }
                            placeholder="Why is this folio being voided?"
                            className="resize-none rounded-xl bg-background/80"
                          />
                        </div>
                        <div className="mt-4 flex justify-end">
                          <PendingButton
                            type="button"
                            variant="destructive"
                            className="h-11 min-w-44 gap-2 rounded-xl"
                            pending={pending && intent?.type === "bill"}
                            onClick={() =>
                              requestVoid({
                                type: "bill",
                                stay,
                                reason: reasonFor(billKey),
                              })
                            }
                          >
                            <Ban className="size-4" />
                            Void entire folio
                          </PendingButton>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="room" className="space-y-3">
                      {roomNums.length === 0 ? (
                        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                          No rooms linked to this stay.
                        </p>
                      ) : (
                        roomNums.map((rn) => {
                          const key = `room-${stay.id}-${rn}`;
                          return (
                            <div
                              key={key}
                              className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-800 ring-1 ring-sky-500/20 dark:text-sky-300">
                                  <BedDouble className="size-4" />
                                </span>
                                <div>
                                  <p className="font-medium tracking-tight">
                                    Room {rn}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Voids open charges tagged to this room
                                  </p>
                                </div>
                              </div>
                              <Textarea
                                rows={2}
                                value={reasons[key] || ""}
                                onChange={(e) =>
                                  setReason(key, e.target.value)
                                }
                                placeholder="Reason for voiding this room’s charges"
                                className="resize-none rounded-xl"
                                aria-label={`Void room ${rn} reason`}
                              />
                              <div className="flex justify-end">
                                <PendingButton
                                  type="button"
                                  variant="outline"
                                  className="h-10 min-w-40 gap-2 rounded-xl border-destructive/35 text-destructive hover:bg-destructive/10"
                                  pending={
                                    pending &&
                                    intent?.type === "room" &&
                                    intent.roomNumber === rn
                                  }
                                  onClick={() =>
                                    requestVoid({
                                      type: "room",
                                      stay,
                                      roomNumber: rn,
                                      reason: reasonFor(key),
                                    })
                                  }
                                >
                                  Void room charges
                                </PendingButton>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </TabsContent>

                    <TabsContent value="line" className="space-y-2.5">
                      {lines.length === 0 ? (
                        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                          No active lines left on this folio.
                        </p>
                      ) : (
                        lines.map((line) => {
                          const key = `line-${line.id}`;
                          return (
                            <div
                              key={line.id}
                              className="space-y-3 rounded-2xl border border-border/60 bg-muted/15 p-3.5 transition-colors hover:bg-muted/25 sm:p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 space-y-1.5">
                                  <p className="font-medium leading-snug tracking-tight">
                                    {line.description}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "font-normal capitalize",
                                        lineKindClass(line.kind),
                                      )}
                                    >
                                      {line.kind.replace(/_/g, " ")}
                                    </Badge>
                                    {line.roomNumber ? (
                                      <Badge
                                        variant="outline"
                                        className="font-normal"
                                      >
                                        Rm {line.roomNumber}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                                <p className="text-sm font-semibold tabular-nums">
                                  {formatMoney(line.amountETB)}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1 space-y-1.5">
                                  <Label
                                    htmlFor={key}
                                    className="text-xs text-muted-foreground"
                                  >
                                    Reason
                                  </Label>
                                  <Input
                                    id={key}
                                    value={reasons[key] || ""}
                                    onChange={(e) =>
                                      setReason(key, e.target.value)
                                    }
                                    placeholder="Why void this line?"
                                    className="h-10 rounded-xl"
                                  />
                                </div>
                                <PendingButton
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-10 shrink-0 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-w-28"
                                  pending={
                                    pending &&
                                    intent?.type === "line" &&
                                    intent.line.id === line.id
                                  }
                                  onClick={() =>
                                    requestVoid({
                                      type: "line",
                                      stay,
                                      line,
                                      reason: reasonFor(key),
                                    })
                                  }
                                >
                                  Void line
                                </PendingButton>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={intent != null}
        onOpenChange={(open) => {
          if (!open && !pending) setIntent(null);
        }}
      >
        <AlertDialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="h-1 bg-linear-to-r from-rose-500 via-amber-500/70 to-transparent" />
          <AlertDialogHeader className="space-y-3 px-6 pt-6 text-left">
            <AlertDialogTitle className="flex items-center gap-2 text-xl tracking-tight">
              <span className="flex size-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/25 dark:text-rose-300">
                <ShieldAlert className="size-4" />
              </span>
              {confirmCopy.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pretty leading-relaxed">
              {confirmCopy.body}
              {intent?.reason ? (
                <span className="mt-3 block rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-foreground/90">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Reason
                  </span>
                  <span className="mt-1 block text-sm">{intent.reason}</span>
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:gap-2">
            <AlertDialogCancel
              disabled={pending}
              className="h-10 rounded-xl"
            >
              Keep folio
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className={cn(
                "h-10 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              onClick={(e) => {
                e.preventDefault();
                void runVoid();
              }}
            >
              {pending ? "Voiding…" : "Confirm void"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
