"use client";

import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Plus,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import {
  completeLodgingCmAssignmentApi,
  createLodgingCmAssignmentsApi,
  updateLodgingRoomStatusApi,
  type LodgingCmAssignment,
  type LodgingRoom,
} from "@/lib/api/lodgingRooms";
import {
  LODGING_ROOM_STATUS_LABELS,
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

function parseAssigneeNames(raw: string[]): string[] {
  return [
    ...new Set(
      raw
        .flatMap((line) => line.split(/[,;\n]+/))
        .map((n) => n.trim())
        .filter(Boolean),
    ),
  ];
}

type AssignMode = "cleaning" | "maintenance";
type PeopleLayout = "shared" | "per-room";

type RoomAssignDraft = {
  names: string[];
  notes: string;
};

function emptyDraft(): RoomAssignDraft {
  return { names: [""], notes: "" };
}

function PeopleFields({
  names,
  onChangeName,
  onAdd,
  onRemove,
  idPrefix,
}: {
  names: string[];
  onChangeName: (idx: number, value: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        People
      </Label>
      {names.map((name, idx) => (
        <div key={`${idPrefix}-${idx}`} className="flex gap-2">
          <Input
            id={`${idPrefix}-person-${idx}`}
            className="h-10"
            placeholder={`Name ${idx + 1}`}
            value={name}
            onChange={(e) => onChangeName(idx, e.target.value)}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={names.length <= 1}
            onClick={() => onRemove(idx)}
            aria-label="Remove person"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        onClick={onAdd}
      >
        <Plus className="h-4 w-4" />
        Add person
      </Button>
    </div>
  );
}

export function LodgingCmQueuePanel({
  queue,
  openAssignments,
  onRefresh,
  showRoomMeta = false,
}: {
  queue: LodgingRoom[];
  openAssignments: LodgingCmAssignment[];
  onRefresh: () => void | Promise<void>;
  showRoomMeta?: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [assignRoomIds, setAssignRoomIds] = useState<number[]>([]);
  const [workKind, setWorkKind] = useState<AssignMode>("cleaning");
  const [peopleLayout, setPeopleLayout] = useState<PeopleLayout>("shared");
  const [sharedDraft, setSharedDraft] = useState<RoomAssignDraft>(emptyDraft);
  const [perRoomDrafts, setPerRoomDrafts] = useState<
    Record<number, RoomAssignDraft>
  >({});

  const openCleaningByRoom = useMemo(() => {
    const map = new Map<number, LodgingCmAssignment[]>();
    for (const a of openAssignments) {
      if (a.workKind !== "cleaning" || a.status !== "open") continue;
      const list = map.get(a.roomId) ?? [];
      list.push(a);
      map.set(a.roomId, list);
    }
    return map;
  }, [openAssignments]);

  const openMaintByRoom = useMemo(() => {
    const map = new Map<number, LodgingCmAssignment[]>();
    for (const a of openAssignments) {
      if (a.workKind !== "maintenance" || a.status !== "open") continue;
      const list = map.get(a.roomId) ?? [];
      list.push(a);
      map.set(a.roomId, list);
    }
    return map;
  }, [openAssignments]);

  const selectedRooms = useMemo(
    () => queue.filter((r) => selectedRoomIds.includes(r.id)),
    [queue, selectedRoomIds],
  );

  const selectedDirty = selectedRooms.filter((r) => r.status === "vacant_dirty");
  const selectedMaint = selectedRooms.filter(
    (r) => r.status === "on_maintenance",
  );
  const selectionMixed =
    selectedDirty.length > 0 && selectedMaint.length > 0;

  const assignRooms = useMemo(
    () => queue.filter((r) => assignRoomIds.includes(r.id)),
    [queue, assignRoomIds],
  );

  const canSave = useMemo(() => {
    if (assignRoomIds.length === 0) return false;
    if (peopleLayout === "shared") {
      return parseAssigneeNames(sharedDraft.names).length > 0;
    }
    return assignRoomIds.every(
      (id) => parseAssigneeNames(perRoomDrafts[id]?.names ?? []).length > 0,
    );
  }, [assignRoomIds, peopleLayout, sharedDraft.names, perRoomDrafts]);

  const resetAssign = () => {
    setAssignRoomIds([]);
    setPeopleLayout("shared");
    setSharedDraft(emptyDraft());
    setPerRoomDrafts({});
    setWorkKind("cleaning");
  };

  const toggleRoom = (id: number, checked: boolean) => {
    setSelectedRoomIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  };

  const toggleAllVisible = (checked: boolean) => {
    if (!checked) {
      setSelectedRoomIds([]);
      return;
    }
    setSelectedRoomIds(queue.map((r) => r.id));
  };

  const openAssignForRooms = (rooms: LodgingRoom[], mode: AssignMode) => {
    if (rooms.length === 0) return;
    const ids = rooms.map((r) => r.id);
    setAssignRoomIds(ids);
    setWorkKind(mode);
    setPeopleLayout(rooms.length > 1 ? "per-room" : "shared");
    setSharedDraft(emptyDraft());
    const drafts: Record<number, RoomAssignDraft> = {};
    for (const id of ids) drafts[id] = emptyDraft();
    setPerRoomDrafts(drafts);
  };

  const updatePerRoom = (
    roomId: number,
    patch: Partial<RoomAssignDraft> | ((prev: RoomAssignDraft) => RoomAssignDraft),
  ) => {
    setPerRoomDrafts((prev) => {
      const current = prev[roomId] ?? emptyDraft();
      const next =
        typeof patch === "function" ? patch(current) : { ...current, ...patch };
      return { ...prev, [roomId]: next };
    });
  };

  const copySharedToAllRooms = () => {
    const base = {
      names: [...sharedDraft.names],
      notes: sharedDraft.notes,
    };
    setPerRoomDrafts((prev) => {
      const next = { ...prev };
      for (const id of assignRoomIds) {
        next[id] = {
          names: [...base.names],
          notes: base.notes,
        };
      }
      return next;
    });
    toast.message("Shared people copied onto each room card");
  };

  const copyFirstRoomToOthers = () => {
    const firstId = assignRoomIds[0];
    if (firstId == null) return;
    const source = perRoomDrafts[firstId] ?? emptyDraft();
    setPerRoomDrafts((prev) => {
      const next = { ...prev };
      for (const id of assignRoomIds) {
        if (id === firstId) continue;
        next[id] = {
          names: [...source.names],
          notes: source.notes,
        };
      }
      return next;
    });
    toast.message("First room’s assignment copied to the others");
  };

  const saveAssignments = async () => {
    if (!canSave || assignRoomIds.length === 0) return;
    setPending("assign");
    let ok = 0;
    try {
      for (const roomId of assignRoomIds) {
        const draft =
          peopleLayout === "shared"
            ? sharedDraft
            : (perRoomDrafts[roomId] ?? emptyDraft());
        const names = parseAssigneeNames(draft.names);
        if (names.length === 0) {
          throw new Error(
            `Add at least one person for room ${
              queue.find((r) => r.id === roomId)?.roomNumber ?? roomId
            }`,
          );
        }
        await createLodgingCmAssignmentsApi({
          roomId,
          workKind,
          assigneeNames: names,
          notes: draft.notes.trim(),
          quiet: true,
        });
        ok += 1;
      }
      toast.success(
        ok === 1 ? "Assignment saved" : `Assigned ${ok} rooms`,
      );
      setSelectedRoomIds((prev) =>
        prev.filter((id) => !assignRoomIds.includes(id)),
      );
      resetAssign();
      await onRefresh();
    } catch (e) {
      notifyApiFailure(
        e,
        ok > 0 ? `Saved ${ok} room(s), then failed` : "Could not create assignment",
      );
      if (ok > 0) await onRefresh();
    } finally {
      setPending(null);
    }
  };

  const isMaintForm = workKind === "maintenance";
  const FormIcon = isMaintForm ? Wrench : UserPlus;

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-md bg-card/95">
        <CardHeader>
          <CardTitle className="text-lg">Dirty & maintenance queue</CardTitle>
          <CardDescription>
            Select multiple rooms to assign cleaners or maintenance staff. You
            can use the same people for all rooms or different people per room.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Queue is empty.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
                <Checkbox
                  checked={
                    selectedRoomIds.length > 0 &&
                    selectedRoomIds.length === queue.length
                  }
                  onCheckedChange={(v) => toggleAllVisible(v === true)}
                  aria-label="Select all rooms in queue"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedRoomIds.length === 0
                    ? "Select rooms for batch assign"
                    : `${selectedRoomIds.length} room${selectedRoomIds.length === 1 ? "" : "s"} selected`}
                </span>
                {selectedDirty.length > 0 && !selectionMixed ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="ml-auto sm:ml-2"
                      onClick={() =>
                        openAssignForRooms(selectedDirty, "cleaning")
                      }
                    >
                      Assign cleaners ({selectedDirty.length})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        openAssignForRooms(selectedDirty, "maintenance")
                      }
                    >
                      Enter maintenance ({selectedDirty.length})
                    </Button>
                  </>
                ) : null}
                {selectedMaint.length > 0 && !selectionMixed ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={selectedDirty.length > 0 ? "" : "ml-auto sm:ml-2"}
                    onClick={() =>
                      openAssignForRooms(selectedMaint, "maintenance")
                    }
                  >
                    Assign maintenance ({selectedMaint.length})
                  </Button>
                ) : null}
                {selectionMixed ? (
                  <p className="w-full text-xs text-amber-700 dark:text-amber-400 sm:ml-2 sm:w-auto">
                    Select only dirty rooms or only maintenance rooms for batch
                    assign.
                  </p>
                ) : null}
              </div>

              <ul className="divide-y rounded-xl border border-border/70">
                {queue.map((room) => {
                  const status = room.status as LodgingRoomStatus;
                  const onMaintenance = status === "on_maintenance";
                  const cleaningOpen = openCleaningByRoom.get(room.id) ?? [];
                  const maintOpen = openMaintByRoom.get(room.id) ?? [];
                  const canMarkClean =
                    onMaintenance || cleaningOpen.length > 0;
                  const checked = selectedRoomIds.includes(room.id);
                  return (
                    <li
                      key={room.id}
                      className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <Checkbox
                          className="mt-1"
                          checked={checked}
                          onCheckedChange={(v) =>
                            toggleRoom(room.id, v === true)
                          }
                          aria-label={`Select room ${room.roomNumber}`}
                        />
                        <div className="min-w-0 space-y-1.5">
                          <p className="font-medium tabular-nums">
                            Room {room.roomNumber}
                            {showRoomMeta ? (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                · {room.roomType} · Floor {room.floor || "—"}
                              </span>
                            ) : null}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-normal",
                                roomStatusBadgeClass(room.status),
                              )}
                            >
                              {LODGING_ROOM_STATUS_LABELS[status] ??
                                room.status}
                            </Badge>
                            {(onMaintenance ? maintOpen : cleaningOpen)
                              .length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3.5 w-3.5" />
                                {(onMaintenance ? maintOpen : cleaningOpen)
                                  .map((a) => a.assigneeName)
                                  .join(", ")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {onMaintenance
                                  ? "No open maintenance assignees"
                                  : "No cleaners assigned yet"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pl-7 lg:pl-0">
                        <PendingButton
                          type="button"
                          size="sm"
                          pending={pending === `clean-${room.id}`}
                          disabled={!canMarkClean}
                          title={
                            canMarkClean
                              ? undefined
                              : "Assign cleaners before marking vacant clean"
                          }
                          onClick={async () => {
                            setPending(`clean-${room.id}`);
                            try {
                              await updateLodgingRoomStatusApi(
                                room.id,
                                "vacant_clean",
                              );
                              await onRefresh();
                            } catch (e) {
                              notifyApiFailure(e, "Could not mark clean");
                            } finally {
                              setPending(null);
                            }
                          }}
                        >
                          {onMaintenance
                            ? "Release → vacant clean"
                            : "Mark vacant clean"}
                        </PendingButton>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openAssignForRooms(
                              [room],
                              onMaintenance ? "maintenance" : "cleaning",
                            )
                          }
                        >
                          {onMaintenance
                            ? "Assign maintenance"
                            : "Assign cleaners"}
                        </Button>
                        {!onMaintenance ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              openAssignForRooms([room], "maintenance")
                            }
                          >
                            Enter maintenance
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {assignRoomIds.length > 0 && assignRooms.length > 0 ? (
        <Card className="mx-auto w-full max-w-3xl overflow-hidden border-primary/20 bg-card/95 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
          <div
            className={cn(
              "h-1",
              isMaintForm
                ? "bg-linear-to-r from-rose-500/70 via-amber-500/50 to-transparent"
                : "bg-linear-to-r from-sky-500/70 via-emerald-500/45 to-transparent",
            )}
          />
          <CardHeader className="space-y-3 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl ring-1",
                      isMaintForm
                        ? "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300"
                        : "bg-sky-500/10 text-sky-800 ring-sky-500/20 dark:text-sky-200",
                    )}
                  >
                    <FormIcon className="h-4 w-4" />
                  </span>
                  {isMaintForm ? "Maintenance assignment" : "Cleaner assignment"}
                </CardTitle>
                <CardDescription className="max-w-xl text-pretty leading-relaxed">
                  {isMaintForm
                    ? "Assign staff per room or share one team across all selected rooms. Dirty rooms move to maintenance on save."
                    : "Assign cleaners per room or the same crew to every selected room. Vacant clean unlocks after cleaners are assigned."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {assignRooms.map((r) => (
                  <Badge
                    key={r.id}
                    variant="outline"
                    className="font-mono tabular-nums"
                  >
                    Rm {r.roomNumber}
                  </Badge>
                ))}
              </div>
            </div>

            {assignRooms.length > 1 ? (
              <Tabs
                value={peopleLayout}
                onValueChange={(v) => setPeopleLayout(v as PeopleLayout)}
                className="w-full"
              >
                <TabsList className="grid h-auto w-full max-w-md grid-cols-2 gap-1 bg-muted/50 p-1">
                  <TabsTrigger value="shared" className="gap-1.5 py-2">
                    <Users className="h-3.5 w-3.5" />
                    Same for all
                  </TabsTrigger>
                  <TabsTrigger value="per-room" className="gap-1.5 py-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Different per room
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-5 pb-8">
            {peopleLayout === "shared" || assignRooms.length === 1 ? (
              <div className="space-y-4 rounded-xl border border-border/80 bg-muted/10 p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {assignRooms.length > 1
                      ? "Shared team for all selected rooms"
                      : `Team for room ${assignRooms[0]?.roomNumber}`}
                  </p>
                  {assignRooms.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setPeopleLayout("per-room");
                        copySharedToAllRooms();
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Switch to per-room with this list
                    </Button>
                  ) : null}
                </div>
                <PeopleFields
                  idPrefix="shared"
                  names={sharedDraft.names}
                  onChangeName={(idx, value) =>
                    setSharedDraft((d) => ({
                      ...d,
                      names: d.names.map((n, i) => (i === idx ? value : n)),
                    }))
                  }
                  onAdd={() =>
                    setSharedDraft((d) => ({
                      ...d,
                      names: [...d.names, ""],
                    }))
                  }
                  onRemove={(idx) =>
                    setSharedDraft((d) => ({
                      ...d,
                      names: d.names.filter((_, i) => i !== idx),
                    }))
                  }
                />
                <div className="space-y-1.5">
                  <Label htmlFor="shared-notes">Notes</Label>
                  <Input
                    id="shared-notes"
                    className="h-10"
                    value={sharedDraft.notes}
                    onChange={(e) =>
                      setSharedDraft((d) => ({ ...d, notes: e.target.value }))
                    }
                    placeholder="Optional note for every room"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Set a different team for each room.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={copyFirstRoomToOthers}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy first room to others
                  </Button>
                </div>
                {assignRooms.map((room, roomIdx) => {
                  const draft = perRoomDrafts[room.id] ?? emptyDraft();
                  return (
                    <div
                      key={room.id}
                      className="space-y-4 rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm ring-1 ring-black/4 sm:p-5 dark:ring-white/6"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                        <div>
                          <p className="text-sm font-semibold tabular-nums">
                            Room {room.roomNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {showRoomMeta
                              ? `${room.roomType} · Floor ${room.floor || "—"}`
                              : `Room ${roomIdx + 1} of ${assignRooms.length}`}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-normal",
                            roomStatusBadgeClass(room.status),
                          )}
                        >
                          {LODGING_ROOM_STATUS_LABELS[
                            room.status as LodgingRoomStatus
                          ] ?? room.status}
                        </Badge>
                      </div>
                      <PeopleFields
                        idPrefix={`room-${room.id}`}
                        names={draft.names}
                        onChangeName={(idx, value) =>
                          updatePerRoom(room.id, (d) => ({
                            ...d,
                            names: d.names.map((n, i) =>
                              i === idx ? value : n,
                            ),
                          }))
                        }
                        onAdd={() =>
                          updatePerRoom(room.id, (d) => ({
                            ...d,
                            names: [...d.names, ""],
                          }))
                        }
                        onRemove={(idx) =>
                          updatePerRoom(room.id, (d) => ({
                            ...d,
                            names: d.names.filter((_, i) => i !== idx),
                          }))
                        }
                      />
                      <div className="space-y-1.5">
                        <Label htmlFor={`notes-${room.id}`}>Notes</Label>
                        <Input
                          id={`notes-${room.id}`}
                          className="h-10"
                          value={draft.notes}
                          onChange={(e) =>
                            updatePerRoom(room.id, { notes: e.target.value })
                          }
                          placeholder="Optional for this room"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {canSave
                  ? `Ready to save ${assignRooms.length} room${assignRooms.length === 1 ? "" : "s"}.`
                  : peopleLayout === "per-room"
                    ? "Add at least one person on every room card."
                    : "Add at least one person to continue."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={resetAssign}>
                  Cancel
                </Button>
                <PendingButton
                  type="button"
                  className="min-w-[160px]"
                  pending={pending === "assign"}
                  disabled={!canSave}
                  onClick={() => void saveAssignments()}
                >
                  Save assignment
                  {assignRooms.length > 1 ? `s (${assignRooms.length})` : ""}
                </PendingButton>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/80 shadow-md bg-card/95">
        <CardHeader>
          <CardTitle className="text-lg">Open assignments</CardTitle>
          <CardDescription>
            Complete each person’s job when finished. After all cleaners on a
            dirty room are completed, the room can auto-move to vacant clean.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {openAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open assignments.</p>
          ) : (
            <ul className="divide-y rounded-xl border border-border/70">
              {openAssignments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Room {a.room?.roomNumber ?? a.roomId} · {a.workKind}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.assigneeName}
                      {a.notes ? ` · ${a.notes}` : ""}
                    </p>
                  </div>
                  <PendingButton
                    type="button"
                    size="sm"
                    pending={pending === `done-${a.id}`}
                    onClick={async () => {
                      setPending(`done-${a.id}`);
                      try {
                        await completeLodgingCmAssignmentApi(a.id);
                        await onRefresh();
                      } catch (e) {
                        notifyApiFailure(e, "Could not complete");
                      } finally {
                        setPending(null);
                      }
                    }}
                  >
                    Complete
                  </PendingButton>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
