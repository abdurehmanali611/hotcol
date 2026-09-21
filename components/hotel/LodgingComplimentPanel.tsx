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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { PendingButton } from "@/components/ui/pending-button";
import {
  assignLodgingComplimentRoomApi,
  fetchLodgingRooms,
  releaseLodgingComplimentRoomApi,
  updateLodgingComplimentRoomApi,
  type LodgingRoom,
} from "@/lib/api/lodgingRooms";
import {
  isLodgingComplimentRoom,
  parseLodgingComplimentNotes,
} from "@/lib/lodgingCompliment";
import { LODGING_ROOM_STATUS_LABELS } from "@/constants/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  BedDouble,
  Gift,
  KeyRound,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

const ASSIGNABLE = new Set([
  "vacant_clean",
  "vacant_dirty",
  "inspected",
  "out_of_service",
]);

export function LodgingComplimentPanel({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [rooms, setRooms] = useState<LodgingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [assignee, setAssignee] = useState("Manager");
  const [note, setNote] = useState("");

  const [editRoom, setEditRoom] = useState<LodgingRoom | null>(null);
  const [editAssignee, setEditAssignee] = useState("");
  const [editNote, setEditNote] = useState("");
  const [deleteRoom, setDeleteRoom] = useState<LodgingRoom | null>(null);

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
  }, [load, refreshKey]);

  const complimentRooms = useMemo(
    () => rooms.filter((r) => isLodgingComplimentRoom(r)),
    [rooms],
  );

  const assignableRooms = useMemo(
    () =>
      rooms
        .filter(
          (r) =>
            !isLodgingComplimentRoom(r) &&
            ASSIGNABLE.has(String(r.status || "").toLowerCase()),
        )
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)),
    [rooms],
  );

  const assign = async () => {
    const id = Number(roomId);
    if (!(id > 0)) {
      toast.error("Select a room");
      return;
    }
    if (!assignee.trim()) {
      toast.error("Enter who the room is for");
      return;
    }
    setPending("assign");
    try {
      await assignLodgingComplimentRoomApi({
        roomId: id,
        assigneeName: assignee.trim(),
        note: note.trim() || undefined,
      });
      setRoomId("");
      setNote("");
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not assign complimentary room");
    } finally {
      setPending(null);
    }
  };

  const openEdit = (room: LodgingRoom) => {
    const meta = parseLodgingComplimentNotes(room.notes);
    setEditRoom(room);
    setEditAssignee(meta?.assignee || "Manager");
    setEditNote(meta?.note || "");
  };

  const saveEdit = async () => {
    if (!editRoom) return;
    if (!editAssignee.trim()) {
      toast.error("Enter who the room is for");
      return;
    }
    setPending(`edit-${editRoom.id}`);
    try {
      await updateLodgingComplimentRoomApi({
        roomId: editRoom.id,
        assigneeName: editAssignee.trim(),
        note: editNote.trim() || undefined,
      });
      setEditRoom(null);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not update complimentary room");
    } finally {
      setPending(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRoom) return;
    const id = deleteRoom.id;
    setPending(`delete-${id}`);
    try {
      await releaseLodgingComplimentRoomApi(id);
      setDeleteRoom(null);
      await load();
    } catch (e) {
      notifyApiFailure(e, "Could not delete complimentary room");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-linear-to-br from-violet-500/[0.09] via-background to-amber-500/[0.06] shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-violet-500/12 blur-3xl"
        />
        <div className="relative space-y-5 p-5 sm:p-7">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-violet-950 dark:text-violet-300">
              <ShieldCheck className="size-3.5" />
              Manager only
            </div>
            <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-800 ring-1 ring-violet-500/25 dark:text-violet-300">
                <Gift className="size-5" />
              </span>
              Complimentary rooms
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty sm:text-[15px]">
              Hold rooms for staff — especially the manager — that are{" "}
              <span className="font-medium text-foreground">not for sale</span>.
              Assigned rooms are blocked from check-in and reservations until
              you release them.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Active compliments",
                value: String(complimentRooms.length),
                icon: KeyRound,
              },
              {
                label: "Available to assign",
                value: String(assignableRooms.length),
                icon: BedDouble,
              },
              {
                label: "Inventory rooms",
                value: String(rooms.length),
                icon: Sparkles,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border/60 bg-linear-to-br from-violet-500/10 to-transparent p-4 shadow-sm"
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <Card className="overflow-hidden border-border/70 shadow-md">
          <div className="h-1 bg-linear-to-r from-violet-500/70 via-amber-500/40 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">
              Assign complimentary room
            </CardTitle>
            <CardDescription>
              Choose a vacant inventory room and who it is held for.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-5">
            <div className="space-y-1.5">
              <Label>Room</Label>
              <Select
                value={roomId || undefined}
                onValueChange={setRoomId}
                disabled={loading || assignableRooms.length === 0}
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="Select vacant room…" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRooms.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      Rm {r.roomNumber} · {r.roomType}
                      {r.floor ? ` · Fl ${r.floor}` : ""} ·{" "}
                      {LODGING_ROOM_STATUS_LABELS[
                        r.status as keyof typeof LODGING_ROOM_STATUS_LABELS
                      ] || r.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-assignee">Assigned to</Label>
              <Input
                id="comp-assignee"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="e.g. Manager, Housekeeping lead"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-note">Note (optional)</Label>
              <Textarea
                id="comp-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why this room is held for staff"
                className="resize-none rounded-xl"
              />
            </div>
            <div className="flex justify-end">
              <PendingButton
                type="button"
                className="h-11 min-w-44 gap-2 rounded-xl"
                pending={pending === "assign"}
                disabled={assignableRooms.length === 0}
                onClick={() => void assign()}
              >
                <Gift className="size-4" />
                Assign room
              </PendingButton>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 shadow-md">
          <div className="h-1 bg-linear-to-r from-amber-500/60 via-violet-500/40 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">
              Active complimentary holds
            </CardTitle>
            <CardDescription>
              These rooms stay blocked from sale until deleted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pb-5">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : complimentRooms.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
                No complimentary rooms assigned yet.
              </div>
            ) : (
              complimentRooms.map((room) => {
                const meta = parseLodgingComplimentNotes(room.notes);
                return (
                  <div
                    key={room.id}
                    className={cn(
                      "flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] px-4 py-3.5",
                    )}
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold tracking-tight">
                          Room {room.roomNumber}
                        </p>
                        <Badge
                          variant="outline"
                          className="border-violet-500/35 bg-violet-500/10 font-normal text-violet-900 dark:text-violet-300"
                        >
                          Not for sale
                        </Badge>
                        <Badge variant="secondary" className="font-normal">
                          {room.roomType}
                        </Badge>
                      </div>
                      <p className="inline-flex items-center gap-1.5 text-sm text-foreground/90">
                        <UserRound className="size-3.5 text-muted-foreground" />
                        For {meta?.assignee || "Staff"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Assigned by {meta?.assignedBy || "—"}
                        {meta?.assignedAt
                          ? ` · ${new Date(meta.assignedAt).toLocaleString()}`
                          : ""}
                      </p>
                      {meta?.note ? (
                        <p className="text-xs text-muted-foreground text-pretty">
                          {meta.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-xl"
                        onClick={() => openEdit(room)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteRoom(room)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={editRoom != null}
        onOpenChange={(open) => {
          if (!open) setEditRoom(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit complimentary room
              {editRoom ? ` ${editRoom.roomNumber}` : ""}
            </DialogTitle>
            <DialogDescription>
              Update who the room is held for and any note. The room stays not
              for sale.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="edit-comp-assignee">Assigned to</Label>
              <Input
                id="edit-comp-assignee"
                value={editAssignee}
                onChange={(e) => setEditAssignee(e.target.value)}
                placeholder="e.g. Manager, Housekeeping lead"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-comp-note">Note (optional)</Label>
              <Textarea
                id="edit-comp-note"
                rows={3}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Why this room is held for staff"
                className="resize-none rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditRoom(null)}
            >
              Cancel
            </Button>
            <PendingButton
              type="button"
              className="gap-2 rounded-xl"
              pending={editRoom != null && pending === `edit-${editRoom.id}`}
              onClick={() => void saveEdit()}
            >
              <Pencil className="size-3.5" />
              Save changes
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteRoom != null}
        onOpenChange={(open) => {
          if (!open) setDeleteRoom(null);
        }}
      >
        <AlertDialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
          <AlertDialogHeader className="space-y-3 px-6 pt-6 text-left">
            <AlertDialogTitle className="flex items-center gap-2 text-xl tracking-tight">
              <Trash2 className="size-5 text-destructive" />
              Delete complimentary hold?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pretty leading-relaxed">
              Room {deleteRoom?.roomNumber} will return to vacant inventory and
              become available for sale again. This cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                deleteRoom != null && pending === `delete-${deleteRoom.id}`
              }
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              Delete hold
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
