"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  fetchLodgingGuestComplaints,
  fetchLodgingGuestRatings,
  updateLodgingGuestComplaintApi,
  type LodgingGuestComplaint,
  type LodgingGuestRating,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { MessageSquareWarning, Star } from "lucide-react";
import { cn } from "@/lib/utils";

function stars(n: number | null | undefined) {
  const v = Math.max(0, Math.min(5, Number(n) || 0));
  return "★".repeat(v) + "☆".repeat(5 - v);
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "resolved") {
    return "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  }
  if (s === "acknowledged") {
    return "border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-300";
  }
  return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-300";
}

export function LodgingGuestFeedbackPanel({
  view,
  refreshKey = 0,
}: {
  view: "complaints" | "ratings";
  /** Bumped by Manager header refresh so this panel reloads with system refresh. */
  refreshKey?: number;
}) {
  const [complaints, setComplaints] = useState<LodgingGuestComplaint[]>([]);
  const [ratings, setRatings] = useState<LodgingGuestRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "acknowledged" | "resolved">(
    "all",
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (view === "complaints") {
        setComplaints(await fetchLodgingGuestComplaints());
      } else {
        setRatings(await fetchLodgingGuestRatings());
      }
    } catch (e) {
      notifyApiFailure(
        e,
        view === "complaints"
          ? "Could not load complaints"
          : "Could not load ratings",
      );
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const visible = complaints.filter((c) =>
    filter === "all" ? true : c.status.toLowerCase() === filter,
  );

  if (view === "ratings") {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Star className="h-5 w-5 text-primary" />
            Guest ratings
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty leading-relaxed">
            Read-only ratings submitted from HotCol Room by in-house guests.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6">Loading…</p>
        ) : ratings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-14 text-center text-sm text-muted-foreground">
              No guest ratings yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {ratings.map((r) => (
              <Card key={r.id} className="border-border/70 shadow-sm">
                <CardContent className="space-y-2 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {r.guestName || "Guest"}
                        {r.voucherCode ? (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            · {r.voucherCode}
                          </span>
                        ) : null}
                        {r.roomNumbers ? (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            · Rm {r.roomNumbers}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p
                      className="text-amber-600 dark:text-amber-400 tabular-nums text-sm"
                      title={`Overall ${r.overall}/5`}
                    >
                      <Star className="inline h-3.5 w-3.5 mr-1" />
                      {stars(r.overall)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cleanliness {stars(r.cleanliness)} · Service{" "}
                    {stars(r.service)}
                  </p>
                  {r.comment?.trim() ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {r.comment}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <MessageSquareWarning className="h-5 w-5 text-primary" />
          Guest complaints
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground text-pretty leading-relaxed">
          Feedback submitted from HotCol Room. Acknowledge or resolve open
          complaints.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["open", "Open"],
            ["acknowledged", "Acknowledged"],
            ["resolved", "Resolved"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={filter === id ? "default" : "outline"}
            onClick={() => setFilter(id)}
          >
            {label}
            {id === "all" && !loading ? (
              <span className="ml-1 tabular-nums opacity-70">
                ({complaints.length})
              </span>
            ) : null}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6">Loading…</p>
      ) : visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No complaints in this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => (
            <Card key={c.id} className="border-border/70 shadow-sm">
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {c.guestName || "Guest"}
                      {c.voucherCode ? (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {c.voucherCode}
                        </span>
                      ) : null}
                      {c.roomNumbers ? (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · Rm {c.roomNumbers}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {c.category.replace(/_/g, " ")} ·{" "}
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.isCritical ? (
                      <Badge className="bg-rose-600 text-white hover:bg-rose-600">
                        Critical
                      </Badge>
                    ) : null}
                    <Badge
                      variant="outline"
                      className={cn("capitalize", statusBadge(c.status))}
                    >
                      {c.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {c.message}
                </p>
                <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                  {c.status.toLowerCase() === "open" ? (
                    <PendingButton
                      type="button"
                      size="sm"
                      className="h-9"
                      pending={pending === `ack-${c.id}`}
                      onClick={async () => {
                        setPending(`ack-${c.id}`);
                        try {
                          await updateLodgingGuestComplaintApi(
                            c.id,
                            "acknowledged",
                          );
                          await load();
                        } catch (e) {
                          notifyApiFailure(e, "Update failed");
                        } finally {
                          setPending(null);
                        }
                      }}
                    >
                      Acknowledge
                    </PendingButton>
                  ) : null}
                  {c.status.toLowerCase() !== "resolved" ? (
                    <PendingButton
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9"
                      pending={pending === `res-${c.id}`}
                      onClick={async () => {
                        setPending(`res-${c.id}`);
                        try {
                          await updateLodgingGuestComplaintApi(
                            c.id,
                            "resolved",
                          );
                          await load();
                        } catch (e) {
                          notifyApiFailure(e, "Update failed");
                        } finally {
                          setPending(null);
                        }
                      }}
                    >
                      Mark resolved
                    </PendingButton>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
