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
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchLodgingGuestComplaints,
  fetchLodgingGuestRatings,
  updateLodgingGuestComplaintApi,
  type LodgingGuestComplaint,
  type LodgingGuestRating,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { MessageSquareWarning, RefreshCw, Star } from "lucide-react";
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

export function LodgingGuestFeedbackPanel() {
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
      const [c, r] = await Promise.all([
        fetchLodgingGuestComplaints(),
        fetchLodgingGuestRatings(),
      ]);
      setComplaints(c);
      setRatings(r);
    } catch (e) {
      notifyApiFailure(e, "Could not load guest feedback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = complaints.filter((c) =>
    filter === "all" ? true : c.status.toLowerCase() === filter,
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <div className="h-1 bg-linear-to-r from-rose-500/50 via-primary/40 to-amber-500/40" />
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquareWarning className="h-5 w-5 text-primary" />
              Guest complaints &amp; ratings
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Feedback submitted from HotCol Room by in-house guests. Acknowledge
              or resolve complaints; ratings are read-only.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void load()}
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
      </Card>

      <Tabs defaultValue="complaints">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="complaints">
            Complaints ({complaints.length})
          </TabsTrigger>
          <TabsTrigger value="ratings">Ratings ({ratings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="complaints" className="mt-4 space-y-3">
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
              </Button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-6">Loading…</p>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No complaints in this filter.
            </div>
          ) : (
            visible.map((c) => (
              <Card key={c.id} className="border-border/70">
                <CardContent className="space-y-3 pt-5">
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
                    <Badge
                      variant="outline"
                      className={cn("capitalize", statusBadge(c.status))}
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {c.message}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {c.status.toLowerCase() === "open" ? (
                      <PendingButton
                        type="button"
                        size="sm"
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
            ))
          )}
        </TabsContent>

        <TabsContent value="ratings" className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground py-6">Loading…</p>
          ) : ratings.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No guest ratings yet.
            </div>
          ) : (
            ratings.map((r) => (
              <Card key={r.id} className="border-border/70">
                <CardContent className="space-y-2 pt-5">
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
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
