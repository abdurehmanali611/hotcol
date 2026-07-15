"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/phone-input";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import { WORLD_COUNTRIES, statesForCountry } from "@/lib/countryStates";
import { LODGING_ROOM_TYPES } from "@/constants/lodgingRooms";
import {
  createLodgingStayApi,
  fetchLodgingGuests,
  type LodgingGuest,
  type LodgingRoom,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BedDouble,
  CalendarDays,
  IdCard,
  MapPin,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

type GuestDraft = {
  firstName: string;
  lastName: string;
  sex: string;
  phone: string;
  phoneSecondary: string;
  email: string;
  isEthiopian: boolean;
  nationalId: string;
  passportNumber: string;
  country: string;
  stateRegion: string;
};

type RoomAssign = { key: string; roomType: string; roomId: string };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function assignKey() {
  return `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyAssign(): RoomAssign {
  return {
    key: assignKey(),
    roomType: LODGING_ROOM_TYPES[0],
    roomId: "",
  };
}

const emptyGuest = (): GuestDraft => ({
  firstName: "",
  lastName: "",
  sex: "Male",
  phone: "",
  phoneSecondary: "",
  email: "",
  isEthiopian: true,
  nationalId: "",
  passportNumber: "",
  country: "Ethiopia",
  stateRegion: statesForCountry("Ethiopia")[0] || "Addis Ababa",
});

function todayYmd(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nowHm(d = new Date()) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatMoney(n: number) {
  return `ETB ${Number(n || 0).toLocaleString()}`;
}

function guestLabel(g: LodgingGuest) {
  return `${g.firstName} ${g.lastName}`.trim() || "Guest";
}

export function ReceptionCheckInForm({
  vacantCleanRooms,
  onCompleted,
}: {
  vacantCleanRooms: LodgingRoom[];
  onCompleted: () => void | Promise<void>;
}) {
  const [guest, setGuest] = useState(emptyGuest);
  const [guestId, setGuestId] = useState<number | null>(null);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestHits, setGuestHits] = useState<LodgingGuest[]>([]);
  const [roomAssignments, setRoomAssignments] = useState<RoomAssign[]>([
    emptyAssign(),
  ]);
  const [arrivalDate, setArrivalDate] = useState(todayYmd);
  const [arrivalTime, setArrivalTime] = useState(nowHm);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [stayNotes, setStayNotes] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [searchedEmpty, setSearchedEmpty] = useState(false);

  const selectedRoomIds = useMemo(
    () =>
      roomAssignments
        .map((a) => Number(a.roomId))
        .filter((id) => Number.isFinite(id) && id > 0),
    [roomAssignments],
  );

  const assignedRoomsMeta = useMemo(() => {
    return selectedRoomIds
      .map((id) => vacantCleanRooms.find((r) => r.id === id))
      .filter(Boolean) as LodgingRoom[];
  }, [selectedRoomIds, vacantCleanRooms]);

  const nightlyRate = useMemo(
    () =>
      assignedRoomsMeta.reduce(
        (sum, r) => sum + Number(r.pricePerNightETB || 0),
        0,
      ),
    [assignedRoomsMeta],
  );

  const canSubmit =
    Boolean(guest.firstName.trim()) &&
    Boolean(guest.lastName.trim()) &&
    Boolean(guest.phone.trim()) &&
    selectedRoomIds.length > 0;

  const searchGuests = async () => {
    const q = guestSearch.trim();
    if (!q) {
      toast.message("Enter a phone number to search");
      return;
    }
    setPending("guest-search");
    setSearchedEmpty(false);
    try {
      const hits = await fetchLodgingGuests(q);
      setGuestHits(hits);
      setSearchedEmpty(hits.length === 0);
    } catch (e) {
      notifyApiFailure(e, "Guest search failed");
    } finally {
      setPending(null);
    }
  };

  const applyGuest = (g: LodgingGuest) => {
    setGuestId(g.id);
    setGuest({
      firstName: g.firstName || "",
      lastName: g.lastName || "",
      sex: g.sex || "Male",
      phone: g.phone || "",
      phoneSecondary: g.phoneSecondary || "",
      email: g.email || "",
      isEthiopian: g.isEthiopian,
      nationalId: g.nationalId || "",
      passportNumber: g.passportNumber || "",
      country: g.country || "Ethiopia",
      stateRegion:
        g.stateRegion || statesForCountry(g.country || "Ethiopia")[0] || "",
    });
    setGuestHits([]);
    setSearchedEmpty(false);
    toast.success(`Loaded ${guestLabel(g)}`);
  };

  const clearReturningGuest = () => {
    setGuestId(null);
    setGuest(emptyGuest());
    setGuestHits([]);
    setGuestSearch("");
    setSearchedEmpty(false);
  };

  const submitCheckIn = async () => {
    if (!canSubmit) {
      toast.error("Complete guest name, phone, and at least one room");
      return;
    }
    if (new Set(selectedRoomIds).size !== selectedRoomIds.length) {
      toast.error("Each room can only be assigned once");
      return;
    }
    const now = new Date();
    const liveArrivalDate = todayYmd(now);
    const liveArrivalTime = nowHm(now);
    setArrivalDate(liveArrivalDate);
    setArrivalTime(liveArrivalTime);
    const arrival = new Date(`${liveArrivalDate}T${liveArrivalTime}`);
    if (Number.isNaN(arrival.getTime())) {
      toast.error("Invalid arrival date or time");
      return;
    }
    setPending("check-in");
    try {
      await createLodgingStayApi({
        guestId: guestId ?? undefined,
        guest: {
          id: guestId ?? undefined,
          firstName: guest.firstName.trim(),
          lastName: guest.lastName.trim(),
          sex: guest.sex,
          phone: guest.phone.trim(),
          phoneSecondary: guest.phoneSecondary.trim(),
          email: guest.email.trim(),
          isEthiopian: guest.isEthiopian,
          nationalId: guest.nationalId.trim(),
          passportNumber: guest.passportNumber.trim(),
          country: guest.country.trim(),
          stateRegion: guest.stateRegion.trim(),
          addressLine: "",
        },
        arrivalAt: arrival.toISOString(),
        nights: 1,
        adults: Math.max(1, adults),
        children: Math.max(0, children),
        preferredRoomType: roomAssignments[0]?.roomType || LODGING_ROOM_TYPES[0],
        notes: stayNotes.trim(),
        roomIds: selectedRoomIds,
      });
      setGuest(emptyGuest());
      setGuestId(null);
      setGuestSearch("");
      setGuestHits([]);
      setRoomAssignments([emptyAssign()]);
      setStayNotes("");
      setAdults(1);
      setChildren(0);
      setSearchedEmpty(false);
      toast.success("Guest checked in");
      await onCompleted();
    } catch (e) {
      notifyApiFailure(e, "Check-in failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Card className="overflow-hidden border-primary/20 bg-card/95 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="h-1 bg-linear-to-r from-primary/60 via-sky-500/45 to-emerald-500/40" />
        <CardHeader className="space-y-1 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
                <UserPlus className="h-5 w-5 text-primary" />
                Guest check-in
              </CardTitle>
              <CardDescription className="max-w-3xl text-pretty leading-relaxed">
                Look up a returning guest or enter a new profile, set arrival,
                then assign one or more vacant clean rooms and submit once.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 font-normal",
                vacantCleanRooms.length > 0
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400",
              )}
            >
              <BedDouble className="h-3.5 w-3.5 mr-1" />
              {vacantCleanRooms.length} ready
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          {/* Returning guest finder */}
          <HotelFormSection
            title="Returning guest"
            description="Search by phone. Selecting a match fills the guest form — you can still edit before check-in."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5 max-w-md">
                <Label>Phone search</Label>
                <PhoneInput
                  defaultCountry="ET"
                  international
                  countryCallingCodeEditable
                  value={guestSearch || undefined}
                  onChange={(v) => {
                    setGuestSearch((v as string) || "");
                    setSearchedEmpty(false);
                  }}
                  className="h-10"
                />
              </div>
              <PendingButton
                type="button"
                variant="outline"
                className="h-10"
                pending={pending === "guest-search"}
                onClick={() => void searchGuests()}
              >
                <Search className="h-4 w-4" />
                Search
              </PendingButton>
              {guestId != null ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10"
                  onClick={clearReturningGuest}
                >
                  Clear match
                </Button>
              ) : null}
            </div>
            {guestId != null ? (
              <Badge
                variant="outline"
                className="w-fit border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-normal"
              >
                Returning guest · ID {guestId}
              </Badge>
            ) : null}
            {searchedEmpty ? (
              <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border/80 px-4 py-3">
                No guest matched that phone — continue with a new profile below.
              </p>
            ) : null}
            {guestHits.length > 0 ? (
              <ul className="overflow-hidden rounded-xl border border-border/80 divide-y max-h-44 overflow-y-auto shadow-sm">
                {guestHits.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 text-sm transition-colors hover:bg-primary/5"
                      onClick={() => applyGuest(g)}
                    >
                      <span className="font-medium">{guestLabel(g)}</span>
                      <span className="text-muted-foreground"> · {g.phone}</span>
                      {g.nationalId ? (
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          FCN/FIN {g.nationalId}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </HotelFormSection>

          {/* Identity */}
          <HotelFormSection
            title="Guest identity"
            description="Name, sex, and contact — required for the stay voucher."
          >
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 space-y-1.5 sm:col-span-2">
                <Label htmlFor="ci-first">First name</Label>
                <Input
                  id="ci-first"
                  className="h-10"
                  value={guest.firstName}
                  onChange={(e) =>
                    setGuest((g) => ({ ...g, firstName: e.target.value }))
                  }
                  placeholder="First name"
                />
              </div>
              <div className="col-span-2 space-y-1.5 sm:col-span-2">
                <Label htmlFor="ci-last">Last name</Label>
                <Input
                  id="ci-last"
                  className="h-10"
                  value={guest.lastName}
                  onChange={(e) =>
                    setGuest((g) => ({ ...g, lastName: e.target.value }))
                  }
                  placeholder="Last name"
                />
              </div>
              <div className="col-span-2 flex flex-col items-center space-y-2 sm:col-span-4">
                <Label>Sex</Label>
                <RadioGroup
                  value={guest.sex || "Male"}
                  onValueChange={(v) => setGuest((g) => ({ ...g, sex: v }))}
                  className="flex flex-wrap justify-center gap-2"
                >
                  {(["Male", "Female"] as const).map((s) => (
                    <Label
                      key={s}
                      htmlFor={`sex-${s}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-normal transition-all",
                        guest.sex === s
                          ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                          : "border-border/70 bg-card/60 text-muted-foreground hover:bg-muted/40",
                      )}
                    >
                      <RadioGroupItem value={s} id={`sex-${s}`} />
                      {s}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
              <div className="col-span-2 space-y-1.5 sm:col-span-2">
                <Label>Phone</Label>
                <PhoneInput
                  defaultCountry="ET"
                  international
                  countryCallingCodeEditable
                  value={guest.phone || undefined}
                  onChange={(v) =>
                    setGuest((g) => ({ ...g, phone: (v as string) || "" }))
                  }
                />
              </div>
              <div className="col-span-2 space-y-1.5 sm:col-span-2">
                <Label>Second phone (optional)</Label>
                <PhoneInput
                  defaultCountry="ET"
                  international
                  countryCallingCodeEditable
                  value={guest.phoneSecondary || undefined}
                  onChange={(v) =>
                    setGuest((g) => ({
                      ...g,
                      phoneSecondary: (v as string) || "",
                    }))
                  }
                />
              </div>
              <div className="col-span-2 space-y-1.5 sm:col-span-4">
                <Label htmlFor="ci-email">Email (optional)</Label>
                <Input
                  id="ci-email"
                  type="email"
                  className="h-10"
                  value={guest.email}
                  onChange={(e) =>
                    setGuest((g) => ({ ...g, email: e.target.value }))
                  }
                  placeholder="name@example.com"
                />
              </div>
            </div>
          </HotelFormSection>

          {/* ID + location */}
          <HotelFormSection
            title="Identification & location"
            description="Ethiopian guests use Fayda FCN/FIN; others use passport. Country and state only."
          >
            <div
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
                guest.isEthiopian
                  ? "border-emerald-500/25 bg-emerald-500/8"
                  : "border-border/70 bg-muted/20",
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/80 border border-border/60">
                  <IdCard className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="eth-toggle" className="cursor-pointer text-sm font-medium">
                    Ethiopian guest
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Uses Fayda FCN/FIN and defaults country to Ethiopia
                  </p>
                </div>
              </div>
              <Switch
                id="eth-toggle"
                checked={guest.isEthiopian}
                onCheckedChange={(v) =>
                  setGuest((g) => ({
                    ...g,
                    isEthiopian: v,
                    country: v ? "Ethiopia" : g.country === "Ethiopia" ? "Other" : g.country,
                    stateRegion: v
                      ? statesForCountry("Ethiopia")[0] || ""
                      : statesForCountry(
                          g.country === "Ethiopia" ? "Other" : g.country,
                        )[0] || "",
                  }))
                }
              />
            </div>

            {guest.isEthiopian ? (
              <div className="space-y-1.5 max-w-md">
                <Label htmlFor="ci-fcn">National ID (FCN / FIN)</Label>
                <Input
                  id="ci-fcn"
                  className="h-10 font-mono tracking-wide"
                  value={guest.nationalId}
                  onChange={(e) =>
                    setGuest((g) => ({ ...g, nationalId: e.target.value }))
                  }
                  placeholder="Enter FCN or FIN"
                />
              </div>
            ) : (
              <div className="space-y-1.5 max-w-md">
                <Label htmlFor="ci-pass">Passport number</Label>
                <Input
                  id="ci-pass"
                  className="h-10 font-mono tracking-wide uppercase"
                  value={guest.passportNumber}
                  onChange={(e) =>
                    setGuest((g) => ({
                      ...g,
                      passportNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Passport number"
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Country
                </Label>
                <Select
                  value={guest.country}
                  onValueChange={(v) =>
                    setGuest((g) => ({
                      ...g,
                      country: v,
                      stateRegion: statesForCountry(v)[0] || "",
                      isEthiopian: v === "Ethiopia",
                    }))
                  }
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORLD_COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>State / region</Label>
                <Select
                  value={
                    guest.stateRegion || statesForCountry(guest.country)[0]
                  }
                  onValueChange={(v) =>
                    setGuest((g) => ({ ...g, stateRegion: v }))
                  }
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statesForCountry(guest.country).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </HotelFormSection>

          {/* Stay timing */}
          <HotelFormSection
            title="Stay window"
            description="Arrival is filled automatically at check-in. Nights are calculated at checkout from arrival and departure dates. Departure is set automatically when you check out."
          >
            <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Arrival (auto)
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <div className="flex h-10 items-center rounded-md border border-border/80 bg-muted/40 px-3 text-sm tabular-nums text-muted-foreground">
                    {arrivalDate}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <div className="flex h-10 items-center rounded-md border border-border/80 bg-muted/40 px-3 text-sm tabular-nums text-muted-foreground">
                    {arrivalTime}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    const now = new Date();
                    setArrivalDate(todayYmd(now));
                    setArrivalTime(nowHm(now));
                  }}
                >
                  Refresh to current time
                </Button>
              </div>

              <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Nights & party
                </div>
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Nights</Label>
                    <div className="flex h-10 items-center rounded-md border border-border/80 bg-muted/40 px-3 text-sm text-muted-foreground">
                      Auto — departure date minus arrival date at checkout
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ci-adults">Adults</Label>
                    <Input
                      id="ci-adults"
                      type="number"
                      min={1}
                      className="h-10 tabular-nums"
                      value={adults}
                      onChange={(e) =>
                        setAdults(Math.max(1, Number(e.target.value) || 1))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ci-children">Children</Label>
                    <Input
                      id="ci-children"
                      type="number"
                      min={0}
                      className="h-10 tabular-nums"
                      value={children}
                      onChange={(e) =>
                        setChildren(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </div>
                </div>
                <div className="flex min-h-[140px] flex-1 flex-col gap-1.5">
                  <Label htmlFor="ci-notes" className="shrink-0">
                    Notes
                  </Label>
                  <Textarea
                    id="ci-notes"
                    value={stayNotes}
                    onChange={(e) => setStayNotes(e.target.value)}
                    className="min-h-0 h-full flex-1 resize-y field-sizing-fixed"
                    placeholder="Special requests, early arrival, company booking…"
                  />
                </div>
              </div>
            </div>
          </HotelFormSection>

          {/* Rooms */}
          <HotelFormSection
            title="Room assignment"
            description={
              vacantCleanRooms.length === 0
                ? "No vacant clean inventory right now."
                : `${vacantCleanRooms.length} vacant clean room${vacantCleanRooms.length === 1 ? "" : "s"} ready. Add a line per room.`
            }
          >
            {vacantCleanRooms.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-5 py-8 text-center">
                <BedDouble className="mx-auto h-8 w-8 text-amber-600/70" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No vacant clean rooms available. Ask CM to finish dirty rooms
                  first.
                </p>
              </div>
            ) : (
              <div className="min-w-0 space-y-3">
                {roomAssignments.map((row, idx) => {
                  const options = vacantCleanRooms.filter(
                    (r) =>
                      r.roomType === row.roomType &&
                      (!row.roomId ||
                        String(r.id) === row.roomId ||
                        !roomAssignments.some(
                          (o) =>
                            o.key !== row.key && String(r.id) === o.roomId,
                        )),
                  );
                  return (
                    <div
                      key={row.key}
                      className="min-w-0 space-y-4 rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm ring-1 ring-black/4 sm:p-5 dark:ring-white/6"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Room {idx + 1}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={roomAssignments.length <= 1}
                          onClick={() =>
                            setRoomAssignments((prev) =>
                              prev.length <= 1
                                ? prev
                                : prev.filter((r) => r.key !== row.key),
                            )
                          }
                          aria-label="Remove room"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Type</Label>
                          <Select
                            value={row.roomType}
                            onValueChange={(v) =>
                              setRoomAssignments((prev) =>
                                prev.map((r) =>
                                  r.key === row.key
                                    ? { ...r, roomType: v, roomId: "" }
                                    : r,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="h-10 w-full">
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
                          <Label>Vacant clean room</Label>
                          <Select
                            value={row.roomId || undefined}
                            onValueChange={(v) =>
                              setRoomAssignments((prev) =>
                                prev.map((r) =>
                                  r.key === row.key ? { ...r, roomId: v } : r,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="h-10 w-full">
                              <SelectValue placeholder="Select room" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.length === 0 ? (
                                <SelectItem value="__none" disabled>
                                  None available for this type
                                </SelectItem>
                              ) : (
                                options.map((r) => (
                                  <SelectItem key={r.id} value={String(r.id)}>
                                    {r.roomNumber}
                                    {r.floor ? ` · Fl. ${r.floor}` : ""} ·{" "}
                                    {formatMoney(r.pricePerNightETB)}/night
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={vacantCleanRooms.length === 0}
                  onClick={() =>
                    setRoomAssignments((prev) => [...prev, emptyAssign()])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add Room
                </Button>
                {selectedRoomIds.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedRoomIds.length} room
                    {selectedRoomIds.length === 1 ? "" : "s"} ·{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {formatMoney(nightlyRate)}
                    </span>
                    /night · nights finalized at checkout
                  </p>
                ) : null}
              </div>
              {assignedRoomsMeta.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {assignedRoomsMeta.map((r) => (
                    <Badge
                      key={r.id}
                      variant="outline"
                      className="font-normal border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-300"
                    >
                      Rm {r.roomNumber}
                      {r.floor ? ` · Fl. ${r.floor}` : ""} ·{" "}
                      {formatMoney(r.pricePerNightETB)}/n
                    </Badge>
                  ))}
                </div>
              ) : null}
              <PendingButton
                type="button"
                className="h-11 w-full text-base font-semibold shadow-md"
                pending={pending === "check-in"}
                disabled={!canSubmit}
                onClick={() => void submitCheckIn()}
              >
                <UserPlus className="h-4 w-4" />
                Complete check-in
              </PendingButton>
            </div>
          </HotelFormSection>
        </CardContent>
      </Card>
    </div>
  );
}
