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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  LODGING_RESERVATION_SOURCES,
  LODGING_RESERVATION_SOURCE_LABELS,
  LODGING_RESERVATION_STATUSES,
  LODGING_RESERVATION_STATUS_LABELS,
  LODGING_ROOM_STATUS_LABELS,
  LODGING_ROOM_TYPES,
  type LodgingRoomStatus,
} from "@/constants/lodgingRooms";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import { PhoneInput } from "@/components/phone-input";
import {
  cancelLodgingReservationApi,
  createLodgingReservationApi,
  fetchLodgingHoldableRooms,
  fetchLodgingReservations,
  type LodgingReservation,
  type LodgingRoom,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { CalendarRange, CheckCircle2, Plus, UserX, XCircle } from "lucide-react";
import { toast } from "sonner";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** Vacant-clean stock plus this booking's own reserved holds. */
function assignableRoomsForReservation(
  vacantCleanRooms: LodgingRoom[],
  reservation: LodgingReservation,
): LodgingRoom[] {
  const byId = new Map<number, LodgingRoom>();
  for (const room of vacantCleanRooms) {
    byId.set(room.id, room);
  }
  for (const rr of reservation.rooms || []) {
    const room = rr.room;
    if (!room?.id) continue;
    const st = String(room.status || "");
    if (st === "vacant_clean" || st === "reserved") {
      byId.set(room.id, room);
    }
  }
  return [...byId.values()].sort((a, b) =>
    String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, {
      numeric: true,
    }),
  );
}

export function LodgingReservationsPanel({
  vacantCleanRooms,
  onCheckedIn,
  onStartCheckIn,
}: {
  vacantCleanRooms: LodgingRoom[];
  onCheckedIn?: () => void | Promise<void>;
  /** Open Reception check-in form with this reservation prefilled. */
  onStartCheckIn?: (reservation: LodgingReservation) => void;
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
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<
    "" | "cash" | "bank" | "telebirr"
  >("");
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyTin, setCompanyTin] = useState("");
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
    const deposit = Math.max(0, Number(depositETB) || 0);
    if (deposit > 0 && !depositPaymentMethod) {
      toast.error("Select deposit payment method");
      return;
    }
    if (isCompany && (!companyName.trim() || !companyTin.trim())) {
      toast.error("Company name and TIN are required");
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
        depositETB: deposit,
        depositPaymentMethod: deposit > 0 ? depositPaymentMethod : "",
        isCompany,
        companyName: isCompany ? companyName.trim() : "",
        companyTin: isCompany ? companyTin.trim() : "",
        notes: notes.trim(),
      });
      setShowForm(false);
      setGuestFirst("");
      setGuestLast("");
      setGuestPhone("");
      setNotes("");
      setDepositETB("0");
      setDepositPaymentMethod("");
      setIsCompany(false);
      setCompanyName("");
      setCompanyTin("");
      setHoldRoomIds([]);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not save reservation");
    } finally {
      setPending(null);
    }
  };

  const formPanel = (
    <Card className="overflow-hidden border-primary/20 shadow-lg ring-1 ring-black/5 dark:ring-white/10 lg:sticky lg:top-4">
      <div className="h-1 bg-linear-to-r from-fuchsia-500/60 via-primary/50 to-sky-500/40" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="h-4 w-4 text-primary" />
          New reservation
        </CardTitle>
        <CardDescription className="text-pretty leading-relaxed">
          Hold rooms or a room type ahead of arrival.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <HotelFormSection
          title="Guest"
          description="Who the reservation is for."
        >
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="res-first">First name</Label>
                <Input
                  id="res-first"
                  className="h-10 bg-background"
                  placeholder="First name"
                  value={guestFirst}
                  onChange={(e) => setGuestFirst(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="res-last">Last name</Label>
                <Input
                  id="res-last"
                  className="h-10 bg-background"
                  placeholder="Last name"
                  value={guestLast}
                  onChange={(e) => setGuestLast(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Phone</Label>
              <PhoneInput
                defaultCountry="ET"
                international
                countryCallingCodeEditable
                value={guestPhone || undefined}
                onChange={(v) => setGuestPhone((v as string) || "")}
                className="h-10 bg-background"
              />
            </div>
          </div>
        </HotelFormSection>

        <HotelFormSection
          title="Stay"
          description="Arrival, length, source, and preferred room type."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <HotelDayPicker
              label="Arrival date"
              id="res-arrival"
              value={arrivalDate}
              onChange={setArrivalDate}
              placeholder="Pick arrival date"
              compact
              buttonClassName="bg-background"
            />
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="res-nights">Nights</Label>
              <Input
                id="res-nights"
                type="number"
                min={1}
                className="h-10 tabular-nums bg-background"
                value={nights}
                onChange={(e) => setNights(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Source</Label>
              <Select
                value={source}
                onValueChange={(v) =>
                  setSource(v as (typeof LODGING_RESERVATION_SOURCES)[number])
                }
              >
                <SelectTrigger className="h-10 w-full bg-background">
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
            <div className="space-y-1.5 min-w-0">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as "tentative" | "confirmed")
                }
              >
                <SelectTrigger className="h-10 w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tentative">Tentative</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Preferred room type</Label>
              <Select
                value={preferredRoomType}
                onValueChange={setPreferredRoomType}
              >
                <SelectTrigger className="h-10 w-full bg-background">
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
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="res-deposit">Deposit (ETB)</Label>
              <Input
                id="res-deposit"
                type="number"
                min={0}
                step="0.01"
                className="h-10 tabular-nums bg-background"
                placeholder="0"
                value={depositETB}
                onChange={(e) => setDepositETB(e.target.value)}
              />
            </div>
            {Number(depositETB) > 0 ? (
              <div className="space-y-2 min-w-0 sm:col-span-2">
                <Label>Deposit payment method</Label>
                <RadioGroup
                  value={depositPaymentMethod}
                  onValueChange={(v) =>
                    setDepositPaymentMethod(
                      v as "cash" | "bank" | "telebirr",
                    )
                  }
                  className="grid gap-2 sm:grid-cols-3"
                >
                  {(
                    [
                      { value: "cash", label: "Cash" },
                      { value: "bank", label: "Bank" },
                      { value: "telebirr", label: "Telebirr" },
                    ] as const
                  ).map((opt) => {
                    const selected = depositPaymentMethod === opt.value;
                    return (
                      <Label
                        key={opt.value}
                        htmlFor={`res-deposit-${opt.value}`}
                        className={
                          selected
                            ? "flex cursor-pointer items-center gap-2.5 rounded-xl border border-primary/50 bg-primary/5 px-3 py-2.5 shadow-sm"
                            : "flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/80 bg-background px-3 py-2.5 hover:bg-muted/30"
                        }
                      >
                        <RadioGroupItem
                          id={`res-deposit-${opt.value}`}
                          value={opt.value}
                        />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>
            ) : null}
            <div className="space-y-3 sm:col-span-2 rounded-xl border border-border/70 bg-muted/10 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={isCompany}
                  onCheckedChange={(v) => setIsCompany(v === true)}
                />
                Booking by a company
              </label>
              {isCompany ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="res-co-name">Company name</Label>
                    <Input
                      id="res-co-name"
                      className="h-10 bg-background"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="res-co-tin">Company TIN</Label>
                    <Input
                      id="res-co-tin"
                      className="h-10 bg-background"
                      value={companyTin}
                      onChange={(e) => setCompanyTin(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <Label htmlFor="res-notes">Notes</Label>
              <Textarea
                id="res-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes for reception"
                className="resize-none bg-background"
              />
            </div>
          </div>
        </HotelFormSection>

        <HotelFormSection
          title="Room holds"
          description="Optional — leave empty to reserve by room type only."
        >
          <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-border/50 bg-background p-1.5">
            {holdableForType.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No holdable rooms for this arrival.
              </p>
            ) : (
              holdableForType.map((r) => {
                const checked = holdRoomIds.includes(r.id);
                const statusLabel =
                  LODGING_ROOM_STATUS_LABELS[r.status as LodgingRoomStatus] ??
                  r.status;
                return (
                  <label
                    key={r.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 transition-colors",
                      checked ? "bg-primary/6" : "hover:bg-muted/40",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        setHoldRoomIds((prev) => toggleId(prev, r.id))
                      }
                    />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-medium tabular-nums">
                        {r.roomNumber}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {r.roomType}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-border/60 font-normal text-[10px]"
                    >
                      {statusLabel}
                    </Badge>
                  </label>
                );
              })
            )}
          </div>
          {holdRoomIds.length > 0 ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {holdRoomIds.length} room
              {holdRoomIds.length === 1 ? "" : "s"} selected to hold
            </p>
          ) : null}
        </HotelFormSection>

        <div className="space-y-2 pt-1">
          <PendingButton
            type="button"
            className="h-10 w-full"
            pending={pending === "create"}
            onClick={() => void submit()}
          >
            Save reservation
          </PendingButton>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full lg:hidden"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <CalendarRange className="h-5 w-5 text-primary" />
            Reservations
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty leading-relaxed">
            Hold one or more rooms ahead of arrival. Check-in can assign
            multiple vacant clean rooms onto one stay folio.
          </p>
        </div>
        <Button
          type="button"
          className="gap-2 shrink-0 lg:hidden"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Hide form" : "New reservation"}
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className={cn("min-w-0", showForm ? "block" : "hidden lg:block")}>
          {formPanel}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="text-sm font-medium tracking-tight">Open holds</p>
            {!loading ? (
              <Badge variant="secondary" className="tabular-nums font-normal">
                {rows.length}
              </Badge>
            ) : null}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8">Loading…</p>
          ) : rows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                No open reservations. Use the form to hold inventory for a
                future arrival.
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
              const assignableRooms = assignableRoomsForReservation(
                vacantCleanRooms,
                r,
              );
              return (
                <Card
                  key={r.id}
                  className="border-border/70 shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardContent className="flex flex-col gap-4 py-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold tracking-tight">
                          {guestName}
                        </p>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs"
                        >
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
                    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/15 p-3">
                      <Label className="text-xs">
                        Check-in rooms (vacant clean, or this booking&apos;s
                        reserved holds)
                      </Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {assignableRooms.length === 0 ? (
                          <p className="text-sm text-muted-foreground col-span-full">
                            No vacant clean or held rooms available.
                          </p>
                        ) : (
                          assignableRooms.map((room) => {
                            const checked = selected.includes(room.id);
                            const isHold = room.status === "reserved";
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
                                      [r.id]: toggleId(
                                        prev[r.id] || [],
                                        room.id,
                                      ),
                                    }))
                                  }
                                />
                                <span>
                                  {room.roomNumber} · {room.roomType}
                                  {isHold ? " · held" : ""}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 gap-1.5"
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
                        className="h-9 gap-1.5 text-destructive hover:text-destructive"
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
                      <Button
                        type="button"
                        size="sm"
                        className="ml-auto h-9 gap-1.5"
                        disabled={Boolean(pending)}
                        onClick={() => {
                          if (onStartCheckIn) {
                            onStartCheckIn(r);
                            return;
                          }
                          toast.message(
                            "Open Check-in from Reception to continue this reservation",
                          );
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Check in
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
