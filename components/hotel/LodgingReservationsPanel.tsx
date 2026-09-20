"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LODGING_RESERVATION_SOURCES,
  LODGING_RESERVATION_SOURCE_LABELS,
  LODGING_RESERVATION_STATUSES,
  LODGING_RESERVATION_STATUS_LABELS,
  LODGING_ROOM_TYPES,
} from "@/constants/lodgingRooms";
import {
  cancelLodgingReservationApi,
  checkInLodgingReservationApi,
  createLodgingReservationApi,
  fetchLodgingHoldableRooms,
  fetchLodgingReservations,
  type LodgingReservation,
  type LodgingRoom,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { CalendarRange, CheckCircle2, Plus, UserX, XCircle } from "lucide-react";
import { toast } from "sonner";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function LodgingReservationsPanel({
  vacantCleanRooms,
  onCheckedIn,
}: {
  vacantCleanRooms: LodgingRoom[];
  onCheckedIn?: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<LodgingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [arrivalDate, setArrivalDate] = useState(todayYmd);
  const [nights, setNights] = useState(1);
  const [source, setSource] =
    useState<(typeof LODGING_RESERVATION_SOURCES)[number]>("phone");
  const [status, setStatus] = useState<"tentative" | "confirmed">("confirmed");
  const [preferredRoomType, setPreferredRoomType] = useState<string>(
    LODGING_ROOM_TYPES[0],
  );
  const [holdRoomIds, setHoldRoomIds] = useState<number[]>([]);
  const [depositETB, setDepositETB] = useState("0");
  const [notes, setNotes] = useState("");
  const [guestFirst, setGuestFirst] = useState("");
  const [guestLast, setGuestLast] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [holdable, setHoldable] = useState<LodgingRoom[]>([]);
  /** reservationId → selected vacant-clean room ids for check-in */
  const [checkInRoomIds, setCheckInRoomIds] = useState<
    Record<number, number[]>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchLodgingReservations();
      setRows(list);
      setCheckInRoomIds((prev) => {
        const next = { ...prev };
        for (const r of list) {
          if (next[r.id]?.length) continue;
          const held = (r.rooms || [])
            .map((x) => x.roomId)
            .filter((id): id is number => id != null && id > 0);
          const stillClean = held.filter((id) =>
            vacantCleanRooms.some((v) => v.id === id),
          );
          if (stillClean.length) next[r.id] = stillClean;
        }
        return next;
      });
    } catch (e) {
      notifyApiFailure(e, "Could not load reservations");
    } finally {
      setLoading(false);
    }
  }, [vacantCleanRooms]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const arrival = new Date(`${arrivalDate}T14:00:00`);
    void fetchLodgingHoldableRooms(arrival.toISOString())
      .then(setHoldable)
      .catch(() => setHoldable([]));
  }, [arrivalDate]);

  const holdableForType = useMemo(
    () =>
      holdable.filter(
        (r) =>
          !preferredRoomType ||
          r.roomType === preferredRoomType ||
          r.status === "vacant_clean" ||
          r.status === "inspected",
      ),
    [holdable, preferredRoomType],
  );

  const submit = async () => {
    if (!guestFirst.trim() || !guestLast.trim() || !guestPhone.trim()) {
      toast.error("Guest name and phone are required");
      return;
    }
    setPending("create");
    try {
      const arrival = new Date(`${arrivalDate}T14:00:00`);
      await createLodgingReservationApi({
        guest: {
          firstName: guestFirst.trim(),
          lastName: guestLast.trim(),
          phone: guestPhone.trim(),
        },
        source,
        status,
        arrivalAt: arrival.toISOString(),
        nights: Math.max(1, nights),
        preferredRoomType,
        roomIds: holdRoomIds.length ? holdRoomIds : undefined,
        depositETB: Math.max(0, Number(depositETB) || 0),
        notes: notes.trim(),
      });
      setShowForm(false);
      setGuestFirst("");
      setGuestLast("");
      setGuestPhone("");
      setNotes("");
      setHoldRoomIds([]);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not save reservation");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden border-primary/20 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="h-1 bg-linear-to-r from-fuchsia-500/60 via-primary/50 to-sky-500/40" />
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarRange className="h-5 w-5 text-primary" />
              Reservations
            </CardTitle>
            <CardDescription>
              Hold one or more rooms (or a room type) ahead of arrival. Check-in
              can assign multiple vacant clean rooms onto one stay folio.
            </CardDescription>
          </div>
          <Button
            type="button"
            className="gap-2"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Hide form" : "New reservation"}
          </Button>
        </CardHeader>
        {showForm ? (
          <CardContent className="grid gap-4 border-t border-border/60 pt-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>First name</Label>
              <Input
                value={guestFirst}
                onChange={(e) => setGuestFirst(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input
                value={guestLast}
                onChange={(e) => setGuestLast(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Arrival date</Label>
              <Input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nights</Label>
              <Input
                type="number"
                min={1}
                value={nights}
                onChange={(e) => setNights(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select
                value={source}
                onValueChange={(v) =>
                  setSource(v as (typeof LODGING_RESERVATION_SOURCES)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LODGING_RESERVATION_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LODGING_RESERVATION_SOURCE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred room type</Label>
              <Select
                value={preferredRoomType}
                onValueChange={setPreferredRoomType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LODGING_ROOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as "tentative" | "confirmed")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tentative">Tentative</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Optional deposit (ETB)</Label>
              <Input
                type="number"
                min={0}
                value={depositETB}
                onChange={(e) => setDepositETB(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Hold specific rooms (multi — optional)</Label>
              <p className="text-xs text-muted-foreground">
                Select every room to hold. Leave empty to hold by room type only.
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border/70 p-3">
                {holdableForType.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No holdable rooms for this arrival.
                  </p>
                ) : (
                  holdableForType.map((r) => {
                    const checked = holdRoomIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            setHoldRoomIds((prev) => toggleId(prev, r.id))
                          }
                        />
                        <span className="text-sm">
                          {r.roomNumber} · {r.roomType} · {r.status}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {holdRoomIds.length > 0 ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {holdRoomIds.length} room
                  {holdRoomIds.length === 1 ? "" : "s"} selected
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="sm:col-span-2">
              <PendingButton
                type="button"
                pending={pending === "create"}
                onClick={() => void submit()}
              >
                Save reservation
              </PendingButton>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No open reservations. Create one to hold inventory for a future
              arrival.
            </CardContent>
          </Card>
        ) : (
          rows.map((r) => {
            const guestName = r.guest
              ? `${r.guest.firstName} ${r.guest.lastName}`.trim()
              : "Guest";
            const held = r.rooms
              ?.map((x) => x.room?.roomNumber || x.roomType)
              .filter(Boolean)
              .join(", ");
            const selected = checkInRoomIds[r.id] || [];
            return (
              <Card
                key={r.id}
                className="border-border/70 shadow-sm transition-shadow hover:shadow-md"
              >
                <CardContent className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold tracking-tight">
                          {guestName}
                        </p>
                        <Badge variant="outline" className="font-mono text-xs">
                          {r.reservationCode}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {LODGING_RESERVATION_STATUS_LABELS[
                            r.status as (typeof LODGING_RESERVATION_STATUSES)[number]
                          ] || r.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {LODGING_RESERVATION_SOURCE_LABELS[
                            r.source as (typeof LODGING_RESERVATION_SOURCES)[number]
                          ] || r.source}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(r.arrivalAt).toLocaleDateString()} ·{" "}
                        {r.nights} night(s)
                        {held ? ` · Hold: ${held}` : ""}
                        {r.depositETB > 0
                          ? ` · Deposit ETB ${r.depositETB}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PendingButton
                        type="button"
                        size="sm"
                        className="gap-1.5"
                        pending={pending === `ci-${r.id}`}
                        disabled={selected.length === 0}
                        onClick={async () => {
                          setPending(`ci-${r.id}`);
                          try {
                            await checkInLodgingReservationApi({
                              reservationId: r.id,
                              roomIds: selected,
                            });
                            await load();
                            await onCheckedIn?.();
                          } catch (e) {
                            notifyApiFailure(e, "Check-in failed");
                          } finally {
                            setPending(null);
                          }
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Check in
                        {selected.length > 1 ? ` (${selected.length})` : ""}
                      </PendingButton>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={Boolean(pending)}
                        onClick={async () => {
                          setPending(`noshow-${r.id}`);
                          try {
                            await cancelLodgingReservationApi(r.id, true);
                            await load();
                          } catch (e) {
                            notifyApiFailure(e, "No-show failed");
                          } finally {
                            setPending(null);
                          }
                        }}
                      >
                        <UserX className="h-4 w-4" />
                        No-show
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive"
                        disabled={Boolean(pending)}
                        onClick={async () => {
                          setPending(`cancel-${r.id}`);
                          try {
                            await cancelLodgingReservationApi(r.id, false);
                            await load();
                          } catch (e) {
                            notifyApiFailure(e, "Cancel failed");
                          } finally {
                            setPending(null);
                          }
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-xl border border-border/70 bg-muted/15 p-3">
                    <Label className="text-xs">
                      Check-in rooms (select one or more vacant clean)
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {vacantCleanRooms.length === 0 ? (
                        <p className="text-sm text-muted-foreground col-span-full">
                          No vacant clean rooms available.
                        </p>
                      ) : (
                        vacantCleanRooms.map((room) => {
                          const checked = selected.includes(room.id);
                          return (
                            <label
                              key={room.id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-2.5 py-2 text-sm"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  setCheckInRoomIds((prev) => ({
                                    ...prev,
                                    [r.id]: toggleId(prev[r.id] || [], room.id),
                                  }))
                                }
                              />
                              <span>
                                {room.roomNumber} · {room.roomType}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
