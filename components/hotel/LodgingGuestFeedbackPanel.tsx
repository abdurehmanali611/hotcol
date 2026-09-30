"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PendingButton } from "@/components/ui/pending-button";
import { LodgingOptionCombobox } from "@/components/hotel/LodgingOptionCombobox";
import {
  LODGING_ACCENTS,
  LodgingEmptyState,
  LodgingPanelShell,
  LodgingSectionCard,
  lodgingPrimaryBtnClass,
} from "@/components/hotel/lodgingChrome";
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
    return "border-emerald-500/20 bg-emerald-500/8 text-emerald-800 dark:text-emerald-300";
  }
  if (s === "acknowledged") {
    return "border-sky-500/20 bg-sky-500/8 text-sky-800 dark:text-sky-300";
  }
  return "border-amber-500/20 bg-amber-500/8 text-amber-900 dark:text-amber-300";
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
      <LodgingPanelShell>
        <LodgingSectionCard
          title="Guest ratings"
          description="Read-only ratings submitted from HotCol Room by in-house guests."
          icon={<Star className="h-5 w-5" />}
          accent={LODGING_ACCENTS.amber}
        >
          {loading ? (
            <p className="py-6 text-sm text-muted-foreground">Loading…</p>
          ) : ratings.length === 0 ? (
            <LodgingEmptyState
              title="No guest ratings yet"
              description="Ratings from HotCol Room will appear here when guests submit them."
              icon={<Star className="h-6 w-6" />}
            />
          ) : (
            <ul className="space-y-3">
              {ratings.map((r) => (
                <li
                  key={r.id}
                  className="overflow-hidden rounded-xl border border-amber-500/15 bg-linear-to-br from-amber-500/4 via-card to-card p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {r.guestName || "Guest"}
                        {r.voucherCode ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {r.voucherCode}
                          </span>
                        ) : null}
                        {r.roomNumbers ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · Rm {r.roomNumbers}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p
                      className="text-sm tabular-nums text-amber-800/90 dark:text-amber-300"
                      title={`Overall ${r.overall}/5`}
                    >
                      <Star className="mr-1 inline h-3.5 w-3.5" />
                      {stars(r.overall)}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Cleanliness {stars(r.cleanliness)} · Service{" "}
                    {stars(r.service)}
                  </p>
                  {r.comment?.trim() ? (
                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                      {r.comment}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </LodgingSectionCard>
      </LodgingPanelShell>
    );
  }

  return (
    <LodgingPanelShell>
      <LodgingSectionCard
        title="Guest complaints"
        description="Feedback submitted from HotCol Room. Acknowledge or resolve open complaints."
        icon={<MessageSquareWarning className="h-5 w-5" />}
        accent={LODGING_ACCENTS.rose}
        actions={
          <LodgingOptionCombobox
            value={filter}
            onChange={(v) =>
              setFilter(v as "all" | "open" | "acknowledged" | "resolved")
            }
            options={[
              {
                value: "all",
                label: loading ? "All" : `All (${complaints.length})`,
              },
              { value: "open", label: "Open" },
              { value: "acknowledged", label: "Acknowledged" },
              { value: "resolved", label: "Resolved" },
            ]}
            placeholder="Filter status…"
            searchPlaceholder="Search status…"
            className="h-10 w-full sm:w-52"
            align="end"
          />
        }
      >
        {loading ? (
          <p className="py-6 text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <LodgingEmptyState
            title="No complaints in this filter"
            description="Try another status, or wait for new guest feedback from HotCol Room."
            icon={<MessageSquareWarning className="h-6 w-6" />}
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((c) => (
              <li
                key={c.id}
                className="overflow-hidden rounded-xl border border-primary/12 bg-linear-to-br from-primary/3 via-card to-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {c.guestName || "Guest"}
                      {c.voucherCode ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {c.voucherCode}
                        </span>
                      ) : null}
                      {c.roomNumbers ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · Rm {c.roomNumbers}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                      {c.category.replace(/_/g, " ")} ·{" "}
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.isCritical ? (
                      <Badge
                        variant="outline"
                        className="border-rose-500/25 bg-rose-500/8 font-medium text-rose-800 dark:text-rose-300"
                      >
                        Critical
                      </Badge>
                    ) : null}
                    <Badge
                      variant="outline"
                      className={cn("font-medium capitalize", statusBadge(c.status))}
                    >
                      {c.status}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {c.message}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-primary/8 pt-3">
                  {c.status.toLowerCase() === "open" ? (
                    <PendingButton
                      type="button"
                      size="sm"
                      className={cn("h-9", lodgingPrimaryBtnClass)}
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
                      className={cn(
                        "h-9 rounded-xl border-emerald-500/25 text-emerald-800 hover:bg-emerald-500/8 dark:text-emerald-300",
                      )}
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
              </li>
            ))}
          </ul>
        )}
      </LodgingSectionCard>
    </LodgingPanelShell>
  );
}
