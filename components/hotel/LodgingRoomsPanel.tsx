"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { RegistrationImageUploadField } from "@/components/hotel/RegistrationImageUploadField";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import {
  LODGING_BED_TYPES,
  LODGING_MANAGER_ONLY_STATUSES,
  LODGING_ROOM_STATUS_LABELS,
  LODGING_ROOM_TYPES,
  type LodgingRoomStatus,
} from "@/constants/lodgingRooms";
import {
  createLodgingRoomApi,
  deleteLodgingRoomApi,
  fetchLodgingRooms,
  updateLodgingRoomApi,
  updateLodgingRoomStatusApi,
  type LodgingRoom,
} from "@/lib/api/lodgingRooms";
import {
  hasRegistrationImage,
  registrationPreviewImageUrl,
} from "@/lib/registrationImageUrl";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Keep wheel scroll inside a pane so Manager `main` does not steal it (desktop only). */
function usePaneWheelContain(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!window.matchMedia("(min-width: 1024px)").matches) return;
      e.preventDefault();
      e.stopPropagation();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);
}

function roomStatusBadgeClass(status: string): string {
  switch (status) {
    case "vacant_clean":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "vacant_dirty":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400";
    case "occupied":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400";
    case "on_maintenance":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
    case "inspected":
      return "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400";
    case "out_of_order":
    case "out_of_service":
    case "blocked":
      return "border-slate-500/35 bg-slate-500/10 text-slate-700 dark:text-slate-300";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

const HOLD_STATUSES = LODGING_MANAGER_ONLY_STATUSES;
const RELEASE_TARGETS = ["vacant_dirty", "vacant_clean"] as const;

function canManagerHold(status: string): boolean {
  return !["occupied", "reserved"].includes(status);
}

type RoomLine = {
  key: string;
  roomNumber: string;
  roomType: string;
  floor: string;
  pricePerNightETB: string;
  bedType: string;
  capacity: string;
  amenities: string;
  imageUrl: string;
  notes: string;
};

function newKey() {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyLine(): RoomLine {
  return {
    key: newKey(),
    roomNumber: "",
    roomType: LODGING_ROOM_TYPES[0],
    floor: "",
    pricePerNightETB: "",
    bedType: LODGING_BED_TYPES[0],
    capacity: "2",
    amenities: "",
    imageUrl: "",
    notes: "",
  };
}

function RoomFields({
  row,
  onPatch,
  idPrefix,
  compactImage,
}: {
  row: RoomLine;
  onPatch: (patch: Partial<RoomLine>) => void;
  idPrefix: string;
  compactImage?: boolean;
}) {
  return (
    <div className="space-y-4">
      <HotelFormSection
        title="Basics"
        description="Number, type, floor, and rack rate."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 min-w-0">
            <Label htmlFor={`${idPrefix}-number`}>Room number</Label>
            <Input
              id={`${idPrefix}-number`}
              value={row.roomNumber}
              onChange={(e) => onPatch({ roomNumber: e.target.value })}
              placeholder="101"
              className="h-10 bg-background"
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label>Room type</Label>
            <Select
              value={row.roomType}
              onValueChange={(v) => onPatch({ roomType: v })}
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
            <Label htmlFor={`${idPrefix}-floor`}>Floor</Label>
            <Input
              id={`${idPrefix}-floor`}
              type="number"
              inputMode="numeric"
              value={row.floor}
              onChange={(e) => onPatch({ floor: e.target.value })}
              placeholder="1"
              className="h-10 tabular-nums bg-background"
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label htmlFor={`${idPrefix}-price`}>Price / night (ETB)</Label>
            <Input
              id={`${idPrefix}-price`}
              type="number"
              min={0}
              step="0.01"
              value={row.pricePerNightETB}
              onChange={(e) => onPatch({ pricePerNightETB: e.target.value })}
              placeholder="0"
              className="h-10 tabular-nums bg-background"
            />
          </div>
        </div>
      </HotelFormSection>

      <HotelFormSection
        title="Sleeping"
        description="Bed, capacity, and amenities shown on the directory."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 min-w-0">
            <Label>Bed type</Label>
            <Select
              value={row.bedType || LODGING_BED_TYPES[0]}
              onValueChange={(v) => onPatch({ bedType: v })}
            >
              <SelectTrigger className="h-10 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LODGING_BED_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label htmlFor={`${idPrefix}-capacity`}>Capacity</Label>
            <Input
              id={`${idPrefix}-capacity`}
              type="number"
              min={1}
              value={row.capacity}
              onChange={(e) => onPatch({ capacity: e.target.value })}
              placeholder="2"
              className="h-10 tabular-nums bg-background"
            />
          </div>
          <div className="space-y-1.5 min-w-0 sm:col-span-2">
            <Label htmlFor={`${idPrefix}-amenities`}>Amenities</Label>
            <Input
              id={`${idPrefix}-amenities`}
              value={row.amenities}
              onChange={(e) => onPatch({ amenities: e.target.value })}
              placeholder="Wi‑Fi, TV, minibar, balcony…"
              className="h-10 bg-background"
            />
          </div>
        </div>
      </HotelFormSection>

      <HotelFormSection
        title="Photo & notes"
        description="Optional image and manager notes."
      >
        <div className="space-y-3">
          <RegistrationImageUploadField
            value={row.imageUrl}
            onChange={(url) => onPatch({ imageUrl: url })}
            title="Room photo"
            itemLabel={`Room ${row.roomNumber || idPrefix}`}
            hint={
              compactImage
                ? "Shown in the room directory."
                : "Optional. Appears in the directory."
            }
            uploadFolder="hotcol-lodging-rooms"
          />
          <div className="space-y-1.5 min-w-0">
            <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
            <Textarea
              id={`${idPrefix}-notes`}
              value={row.notes}
              onChange={(e) => onPatch({ notes: e.target.value })}
              placeholder="Optional notes for managers"
              rows={2}
              className="resize-none bg-background"
            />
          </div>
        </div>
      </HotelFormSection>
    </div>
  );
}

export function LodgingRoomsPanel() {
  const [rooms, setRooms] = useState<LodgingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<RoomLine[]>([emptyLine()]);
  const [editRoom, setEditRoom] = useState<LodgingRoom | null>(null);
  const [editForm, setEditForm] = useState(emptyLine());
  const [deleteTarget, setDeleteTarget] = useState<LodgingRoom | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const formPaneRef = useRef<HTMLDivElement>(null);
  const listPaneRef = useRef<HTMLDivElement>(null);
  usePaneWheelContain(formPaneRef);
  usePaneWheelContain(listPaneRef);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRooms(await fetchLodgingRooms());
    } catch (e) {
      notifyApiFailure(e, "Could not load rooms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        r.roomNumber.toLowerCase().includes(q) ||
        r.roomType.toLowerCase().includes(q) ||
        r.floor.toLowerCase().includes(q) ||
        (r.bedType || "").toLowerCase().includes(q),
    );
  }, [rooms, filter]);

  const validLines = useMemo(
    () =>
      lines.filter((l) => {
        const price = Number(l.pricePerNightETB);
        return l.roomNumber.trim() && Number.isFinite(price) && price >= 0;
      }),
    [lines],
  );

  const updateLine = (key: string, patch: Partial<RoomLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  const openEdit = (room: LodgingRoom) => {
    setEditRoom(room);
    setEditForm({
      key: String(room.id),
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floor: room.floor ?? "",
      pricePerNightETB: String(room.pricePerNightETB ?? ""),
      bedType: room.bedType || LODGING_BED_TYPES[0],
      capacity: String(room.capacity ?? 2),
      amenities: room.amenities ?? "",
      imageUrl: room.imageUrl ?? "",
      notes: room.notes ?? "",
    });
  };

  const closeEdit = () => {
    setEditRoom(null);
    setEditForm(emptyLine());
  };

  const submitBatch = async () => {
    if (validLines.length === 0) {
      toast.error("Add at least one room with number and nightly price");
      return;
    }
    setPending("batch");
    let ok = 0;
    try {
      for (const line of validLines) {
        await createLodgingRoomApi({
          roomNumber: line.roomNumber.trim(),
          roomType: line.roomType,
          floor: String(line.floor).trim(),
          pricePerNightETB: Number(line.pricePerNightETB),
          bedType: line.bedType,
          capacity: Math.max(1, Math.floor(Number(line.capacity) || 2)),
          amenities: line.amenities.trim(),
          imageUrl: line.imageUrl.trim(),
          notes: line.notes.trim(),
        });
        ok += 1;
      }
      toast.success(ok === 1 ? "Room created" : `${ok} rooms created`);
      setLines([emptyLine()]);
      await load();
    } catch (e) {
      notifyApiFailure(
        e,
        ok > 0 ? `Created ${ok}, then failed` : "Could not save rooms",
      );
      await load();
    } finally {
      setPending(null);
    }
  };

  const submitEdit = async () => {
    if (!editRoom) return;
    const price = Number(editForm.pricePerNightETB);
    if (!editForm.roomNumber.trim() || !Number.isFinite(price) || price < 0) {
      toast.error("Room number and valid nightly price are required");
      return;
    }
    setPending(`save-${editRoom.id}`);
    try {
      await updateLodgingRoomApi({
        id: editRoom.id,
        roomNumber: editForm.roomNumber.trim(),
        roomType: editForm.roomType,
        floor: String(editForm.floor).trim(),
        pricePerNightETB: price,
        bedType: editForm.bedType,
        capacity: Math.max(1, Math.floor(Number(editForm.capacity) || 2)),
        amenities: editForm.amenities.trim(),
        imageUrl: editForm.imageUrl.trim(),
        notes: editForm.notes.trim(),
      });
      toast.success("Room updated");
      closeEdit();
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not update room");
    } finally {
      setPending(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setPending(`del-${deleteTarget.id}`);
    try {
      await deleteLodgingRoomApi(deleteTarget.id);
      if (editRoom?.id === deleteTarget.id) closeEdit();
      setDeleteTarget(null);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not delete room");
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:h-[calc(100svh-13.5rem)] lg:min-h-[32rem]">
        <div className="shrink-0 space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Building2 className="h-5 w-5 text-primary" />
            Room inventory
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty leading-relaxed">
            Batch-register rooms with photos and amenities, then manage holds
            and details from the directory.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
          <div
            ref={formPaneRef}
            className="min-h-0 min-w-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
          >
            <Card className="overflow-hidden border-primary/20 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
              <div className="h-1 bg-linear-to-r from-sky-500/55 via-primary/40 to-emerald-500/40" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4 text-primary" />
                  Register rooms
                </CardTitle>
                <CardDescription className="text-pretty leading-relaxed">
                  One line per room — add more, then submit the batch once.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="space-y-4">
                  {lines.map((line, index) => (
                    <div key={line.key} className="space-y-3">
                      {lines.length > 1 ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Room {index + 1}
                          </p>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setLines((prev) =>
                                prev.filter((l) => l.key !== line.key),
                              )
                            }
                            aria-label="Remove room line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                      <RoomFields
                        row={line}
                        idPrefix={line.key}
                        onPatch={(patch) => updateLine(line.key, patch)}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full gap-2"
                    onClick={() => setLines((prev) => [...prev, emptyLine()])}
                  >
                    <Plus className="h-4 w-4" />
                    Add room line
                  </Button>
                  <PendingButton
                    type="button"
                    className="h-10 w-full gap-1.5"
                    pending={pending === "batch"}
                    disabled={validLines.length === 0}
                    onClick={() => void submitBatch()}
                  >
                    <Building2 className="h-4 w-4" />
                    Submit {validLines.length || ""} room
                    {validLines.length === 1 ? "" : "s"}
                  </PendingButton>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-2 px-0.5 sm:justify-start">
                <p className="text-sm font-medium tracking-tight">
                  Room directory
                </p>
                {!loading ? (
                  <Badge
                    variant="secondary"
                    className="tabular-nums font-normal"
                  >
                    {filtered.length}
                  </Badge>
                ) : null}
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter number, type, floor…"
                  className="h-10 pl-9 bg-background"
                />
              </div>
            </div>

            <div
              ref={listPaneRef}
              className="min-h-0 flex-1 space-y-3 lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
            >
              {loading ? (
                <p className="py-8 text-sm text-muted-foreground">Loading…</p>
              ) : filtered.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-14 text-center text-sm text-muted-foreground">
                  {rooms.length === 0
                    ? "No rooms yet. Use the form to register inventory."
                    : "No rooms match this filter."}
                </CardContent>
              </Card>
            ) : (
              filtered.map((room) => {
                const status = room.status as LodgingRoomStatus;
                const label =
                  LODGING_ROOM_STATUS_LABELS[status] ?? room.status;
                const preview = registrationPreviewImageUrl(room.imageUrl);
                const hasImage = hasRegistrationImage(room.imageUrl);
                const isEditing = editRoom?.id === room.id;
                const meta = [
                  room.floor ? `Floor ${room.floor}` : null,
                  room.bedType || null,
                  `${room.capacity ?? 2} guests`,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <Card
                    key={room.id}
                    className={cn(
                      "border-border/70 shadow-sm transition-shadow hover:shadow-md",
                      isEditing && "border-primary/40 ring-1 ring-primary/20",
                    )}
                  >
                    <CardContent className="flex flex-col gap-4 py-4">
                      <div className="flex gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted/30">
                          {preview && hasImage ? (
                            <Image
                              src={preview}
                              alt={`Room ${room.roomNumber}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                              No photo
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold tracking-tight tabular-nums">
                              Rm {room.roomNumber}
                            </p>
                            <Badge
                              variant="secondary"
                              className="font-normal"
                            >
                              {room.roomType}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-normal",
                                roomStatusBadgeClass(room.status),
                              )}
                            >
                              {label}
                            </Badge>
                          </div>
                          <p className="text-sm tabular-nums">
                            <span className="font-semibold text-foreground">
                              ETB{" "}
                              {Number(room.pricePerNightETB).toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              / night
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {meta}
                          </p>
                          {room.amenities?.trim() ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {room.amenities}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                        {canManagerHold(room.status) ? (
                          <Select
                            value=""
                            onValueChange={(v) => {
                              if (!v) return;
                              void (async () => {
                                setPending(`status-${room.id}`);
                                try {
                                  await updateLodgingRoomStatusApi(
                                    room.id,
                                    v as LodgingRoomStatus,
                                  );
                                  await load();
                                } catch (e) {
                                  notifyApiFailure(
                                    e,
                                    "Could not update status",
                                  );
                                } finally {
                                  setPending(null);
                                }
                              })();
                            }}
                          >
                            <SelectTrigger
                              className="h-9 w-[10.5rem] text-xs"
                              aria-label={`Hold status for room ${room.roomNumber}`}
                              disabled={pending === `status-${room.id}`}
                            >
                              <SelectValue placeholder="Hold / release" />
                            </SelectTrigger>
                            <SelectContent>
                              {HOLD_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {LODGING_ROOM_STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                              {(
                                HOLD_STATUSES as readonly string[]
                              ).includes(room.status)
                                ? RELEASE_TARGETS.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      Release →{" "}
                                      {LODGING_ROOM_STATUS_LABELS[s]}
                                    </SelectItem>
                                  ))
                                : null}
                            </SelectContent>
                          </Select>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1.5"
                          onClick={() => openEdit(room)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="ml-auto h-9 gap-1.5 text-destructive hover:text-destructive"
                          disabled={Boolean(pending)}
                          onClick={() => setDeleteTarget(room)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
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
      </div>

      <Dialog
        open={editRoom != null}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="flex max-h-[min(92vh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <div className="h-1 shrink-0 bg-linear-to-r from-sky-500/55 via-primary/40 to-emerald-500/40" />
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-border/60 px-6 py-5 text-left">
            <DialogTitle className="flex items-center gap-2 text-base tracking-tight">
              <Pencil className="h-4 w-4 text-primary" />
              Edit room
              {editRoom ? (
                <span className="font-mono text-muted-foreground">
                  {editRoom.roomNumber}
                </span>
              ) : null}
            </DialogTitle>
            <DialogDescription className="text-pretty leading-relaxed">
              Update inventory details and photo. Changes apply when you save.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <RoomFields
              row={editForm}
              idPrefix="edit-room"
              compactImage
              onPatch={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
            />
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={closeEdit}
            >
              Cancel
            </Button>
            <PendingButton
              type="button"
              className="h-10 gap-1.5"
              pending={editRoom != null && pending === `save-${editRoom.id}`}
              onClick={() => void submitEdit()}
            >
              <Pencil className="h-4 w-4" />
              Save changes
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !pending?.startsWith("del-")) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="h-1 bg-linear-to-r from-rose-500 via-amber-500/70 to-transparent" />
          <AlertDialogHeader className="space-y-3 px-6 pt-6 text-left">
            <AlertDialogTitle className="flex items-center gap-2 text-xl tracking-tight">
              <span className="flex size-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/25 dark:text-rose-300">
                <Trash2 className="size-4" />
              </span>
              Delete room?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pretty leading-relaxed">
              This permanently removes room{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.roomNumber}
              </span>{" "}
              from inventory. Stays that already used this room keep their
              history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:gap-2">
            <AlertDialogCancel
              disabled={Boolean(pending?.startsWith("del-"))}
              className="h-10 rounded-xl"
            >
              Keep room
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(pending?.startsWith("del-"))}
              className="h-10 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {pending?.startsWith("del-") ? "Deleting…" : "Delete room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
