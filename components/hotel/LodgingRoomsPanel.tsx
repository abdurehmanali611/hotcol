"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import {
  createLodgingRoomApi,
  deleteLodgingRoomApi,
  fetchLodgingRooms,
  updateLodgingRoomApi,
  type LodgingRoom,
} from "@/lib/api/lodgingRooms";
import {
  LODGING_ROOM_STATUS_LABELS,
  LODGING_ROOM_TYPES,
  type LodgingRoomStatus,
} from "@/constants/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

type RoomLine = {
  key: string;
  roomNumber: string;
  roomType: string;
  floor: string;
  pricePerNightETB: string;
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
    notes: "",
  };
}

function RoomFields({
  row,
  onPatch,
  idPrefix,
}: {
  row: RoomLine;
  onPatch: (patch: Partial<RoomLine>) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor={`${idPrefix}-number`}>Room number</Label>
        <Input
          id={`${idPrefix}-number`}
          value={row.roomNumber}
          onChange={(e) => onPatch({ roomNumber: e.target.value })}
          placeholder="e.g. 101"
          className="h-10 min-w-0"
        />
      </div>
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label>Room type</Label>
        <Select
          value={row.roomType}
          onValueChange={(v) => onPatch({ roomType: v })}
        >
          <SelectTrigger className="h-10 w-full min-w-0">
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
        <Label htmlFor={`${idPrefix}-floor`}>Floor</Label>
        <Input
          id={`${idPrefix}-floor`}
          type="number"
          inputMode="numeric"
          value={row.floor}
          onChange={(e) => onPatch({ floor: e.target.value })}
          placeholder="1"
          className="h-10 tabular-nums"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-price`}>Nightly price (ETB)</Label>
        <Input
          id={`${idPrefix}-price`}
          type="number"
          min={0}
          step="0.01"
          value={row.pricePerNightETB}
          onChange={(e) => onPatch({ pricePerNightETB: e.target.value })}
          placeholder="0.00"
          className="h-10 tabular-nums"
        />
      </div>
      <div className="col-span-2 space-y-1.5 sm:col-span-4">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={row.notes}
          onChange={(e) => onPatch({ notes: e.target.value })}
          placeholder="Optional — view, wing, accessibility…"
          rows={2}
          className="min-h-[72px] resize-y"
        />
      </div>
    </div>
  );
}

export function LodgingRoomsPanel() {
  const [rooms, setRooms] = useState<LodgingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<RoomLine[]>([emptyLine()]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyLine());
  const [pending, setPending] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

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
        r.floor.toLowerCase().includes(q),
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

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyLine());
  };

  const startEdit = (room: LodgingRoom) => {
    setEditingId(room.id);
    setEditForm({
      key: String(room.id),
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floor: room.floor ?? "",
      pricePerNightETB: String(room.pricePerNightETB ?? ""),
      notes: room.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    if (editingId == null) return;
    const price = Number(editForm.pricePerNightETB);
    if (!editForm.roomNumber.trim() || !Number.isFinite(price) || price < 0) {
      toast.error("Room number and valid nightly price are required");
      return;
    }
    setPending(`save-${editingId}`);
    try {
      await updateLodgingRoomApi({
        id: editingId,
        roomNumber: editForm.roomNumber.trim(),
        roomType: editForm.roomType,
        floor: String(editForm.floor).trim(),
        pricePerNightETB: price,
        notes: editForm.notes.trim(),
      });
      cancelEdit();
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not update room");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Card className="overflow-hidden border-primary/20 bg-card/95 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="h-1 bg-linear-to-r from-primary/55 via-sky-500/45 to-emerald-500/40" />
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
            <Building2 className="h-5 w-5 text-primary" />
            {editingId != null ? "Edit room" : "Register rooms"}
          </CardTitle>
          <CardDescription className="max-w-3xl text-pretty leading-relaxed">
            {editingId != null
              ? "Update this room’s number, type, floor, and nightly rate."
              : "Add one or more rooms in a single submit — each line has its own number, type, floor, price, and notes."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          {editingId != null ? (
            <HotelFormSection
              title="Room details"
              description="Changes apply immediately after update."
            >
              <RoomFields
                row={editForm}
                idPrefix="edit"
                onPatch={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <PendingButton
                  type="button"
                  pending={pending === `save-${editingId}`}
                  onClick={() => void submitEdit()}
                >
                  <Pencil className="h-4 w-4" />
                  Update room
                </PendingButton>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </HotelFormSection>
          ) : (
            <HotelFormSection
              title="Room lines"
              description="Add one card per room. Submit the batch when ready."
            >
              <div className="min-w-0 space-y-3">
                {lines.map((line, index) => (
                  <div
                    key={line.key}
                    className="min-w-0 space-y-4 rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm ring-1 ring-black/4 sm:p-5 dark:ring-white/6"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Room {index + 1}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={lines.length <= 1}
                        onClick={() =>
                          setLines((prev) =>
                            prev.length <= 1
                              ? prev
                              : prev.filter((l) => l.key !== line.key),
                          )
                        }
                        aria-label="Remove room line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <RoomFields
                      row={line}
                      idPrefix={line.key}
                      onPatch={(patch) => updateLine(line.key, patch)}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    onClick={() => setLines((prev) => [...prev, emptyLine()])}
                  >
                    <Plus className="h-4 w-4" />
                    Add Room
                  </Button>
                  {validLines.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {validLines.length} of {lines.length} line
                      {lines.length === 1 ? "" : "s"} ready
                    </p>
                  ) : null}
                </div>
                <PendingButton
                  type="button"
                  className="h-11 w-full text-base font-semibold shadow-md"
                  pending={pending === "batch"}
                  disabled={validLines.length === 0}
                  onClick={() => void submitBatch()}
                >
                  Submit {validLines.length || ""} room
                  {validLines.length === 1 ? "" : "s"}
                </PendingButton>
              </div>
            </HotelFormSection>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card/95 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg tracking-tight">Room directory</CardTitle>
          <CardDescription>
            Status updates from reception check-in/out and CM cleaning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by number, type, floor…"
              className="h-10 pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums -mt-2">
            {filtered.length} room{filtered.length === 1 ? "" : "s"}
          </p>

          {loading ? (
            <p className="text-sm text-muted-foreground py-6">Loading rooms…</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                No rooms yet. Register rooms above to build your directory.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/35 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Room</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Floor</th>
                    <th className="px-4 py-3 font-medium">Nightly (ETB)</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((room) => {
                    const status = room.status as LodgingRoomStatus;
                    const label =
                      LODGING_ROOM_STATUS_LABELS[status] ?? room.status;
                    return (
                      <tr
                        key={room.id}
                        className="transition-colors hover:bg-muted/25"
                      >
                        <td className="px-4 py-3 font-semibold tabular-nums">
                          {room.roomNumber}
                        </td>
                        <td className="px-4 py-3">{room.roomType}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {room.floor || "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {Number(room.pricePerNightETB).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal",
                              roomStatusBadgeClass(room.status),
                            )}
                          >
                            {label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              onClick={() => startEdit(room)}
                              aria-label={`Edit room ${room.roomNumber}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <PendingButton
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-8 text-destructive hover:text-destructive"
                              pending={pending === `del-${room.id}`}
                              onClick={async () => {
                                setPending(`del-${room.id}`);
                                try {
                                  await deleteLodgingRoomApi(room.id);
                                  if (editingId === room.id) cancelEdit();
                                  await load();
                                } catch (e) {
                                  notifyApiFailure(e, "Could not delete room");
                                } finally {
                                  setPending(null);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </PendingButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
