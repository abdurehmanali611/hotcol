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
import { PendingButton } from "@/components/ui/pending-button";
import {
  fetchLodgingActiveStays,
  voidLodgingBillApi,
  voidLodgingBillLineApi,
  voidLodgingRoomChargesApi,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { toast } from "sonner";
import { Ban } from "lucide-react";

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

export function LodgingManagerVoidsPanel({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [stays, setStays] = useState<LodgingStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchLodgingActiveStays();
      setStays(
        rows.filter(
          (s) =>
            s.status === "checked_in" &&
            s.bill &&
            String(s.bill.status || "").toLowerCase() === "open",
        ),
      );
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

  const openStays = useMemo(() => stays, [stays]);

  return (
    <Card className="overflow-hidden border-primary/20 shadow-lg">
      <div className="h-1 bg-linear-to-r from-rose-500/55 via-primary/40 to-amber-500/40" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ban className="h-5 w-5 text-destructive" />
          Folio voids
        </CardTitle>
        <CardDescription>
          Manager-only. Void a whole bill, all charges for one room, or a single
          line. Reception cannot void.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading open folios…</p>
        ) : openStays.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
            No checked-in stays with an open bill.
          </p>
        ) : (
          openStays.map((stay) => {
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
              <div
                key={stay.id}
                className="space-y-3 rounded-xl border border-border/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{guestLabel(stay)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="font-mono font-normal">
                        {stay.voucherCode}
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        Rm {roomsLabel(stay)}
                      </Badge>
                      <Badge variant="secondary" className="font-normal tabular-nums">
                        {formatMoney(stay.bill?.totalETB ?? 0)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor={billKey}>Void whole bill — reason</Label>
                    <Input
                      id={billKey}
                      value={reasons[billKey] || ""}
                      onChange={(e) => setReason(billKey, e.target.value)}
                      placeholder="Required reason"
                    />
                  </div>
                  <PendingButton
                    type="button"
                    variant="destructive"
                    pending={pending === billKey}
                    onClick={async () => {
                      const why = reasonFor(billKey);
                      if (!why) {
                        toast.error("Enter a void reason");
                        return;
                      }
                      setPending(billKey);
                      try {
                        await voidLodgingBillApi(stay.bill!.id, why);
                        await load();
                      } catch (e) {
                        notifyApiFailure(e, "Could not void bill");
                      } finally {
                        setPending(null);
                      }
                    }}
                  >
                    Void bill
                  </PendingButton>
                </div>

                {roomNums.length > 0 ? (
                  <div className="space-y-2 border-t border-border/60 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Void room charges
                    </p>
                    {roomNums.map((rn) => {
                      const key = `room-${stay.id}-${rn}`;
                      return (
                        <div
                          key={key}
                          className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end"
                        >
                          <Badge variant="outline" className="w-fit font-normal">
                            Rm {rn}
                          </Badge>
                          <Input
                            value={reasons[key] || ""}
                            onChange={(e) => setReason(key, e.target.value)}
                            placeholder="Reason"
                            aria-label={`Void room ${rn} reason`}
                          />
                          <PendingButton
                            type="button"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            pending={pending === key}
                            onClick={async () => {
                              const why = reasonFor(key);
                              if (!why) {
                                toast.error("Enter a void reason");
                                return;
                              }
                              setPending(key);
                              try {
                                await voidLodgingRoomChargesApi(
                                  stay.id,
                                  rn,
                                  why,
                                );
                                await load();
                              } catch (e) {
                                notifyApiFailure(e, "Could not void room");
                              } finally {
                                setPending(null);
                              }
                            }}
                          >
                            Void room
                          </PendingButton>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {lines.length > 0 ? (
                  <div className="space-y-2 border-t border-border/60 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Void single line
                    </p>
                    <ul className="space-y-2">
                      {lines.map((line) => {
                        const key = `line-${line.id}`;
                        return (
                          <li
                            key={line.id}
                            className="grid gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5 sm:grid-cols-[1fr_auto] sm:items-center"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {line.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {line.kind.replace(/_/g, " ")}
                                {line.roomNumber
                                  ? ` · Rm ${line.roomNumber}`
                                  : ""}{" "}
                                · {formatMoney(line.amountETB)}
                              </p>
                              <Input
                                className="mt-1.5 h-8"
                                value={reasons[key] || ""}
                                onChange={(e) =>
                                  setReason(key, e.target.value)
                                }
                                placeholder="Reason"
                              />
                            </div>
                            <PendingButton
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              pending={pending === key}
                              onClick={async () => {
                                const why = reasonFor(key);
                                if (!why) {
                                  toast.error("Enter a void reason");
                                  return;
                                }
                                setPending(key);
                                try {
                                  await voidLodgingBillLineApi(line.id, why);
                                  await load();
                                } catch (e) {
                                  notifyApiFailure(e, "Could not void line");
                                } finally {
                                  setPending(null);
                                }
                              }}
                            >
                              Void line
                            </PendingButton>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
