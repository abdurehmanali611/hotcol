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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  Pencil,
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
  syncLodgingCmOpenAssigneesApi,
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
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";

function ymdToExpectedReadyIso(value: string): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  // Accept YYYY-MM-DD or YYYY-MM-DDTHH:mm from HotelDayPicker
  const withTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)
    ? raw
    : /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T14:00`
      : raw;
  const d = new Date(withTime);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isoToDayPickerValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function canEditOpenAssignment(a: LodgingCmAssignment): boolean {
  if (String(a.status || "").toLowerCase() !== "open") return false;
  const roomStatus = String(a.room?.status || "").toLowerCase();
  const wk = String(a.workKind || "").toLowerCase();
  if (wk === "cleaning") return roomStatus === "vacant_dirty";
  if (wk === "maintenance") return roomStatus === "on_maintenance";
  return false;
}

function roomStatusBadgeClass(status: string): string {
  switch (status) {
    case "vacant_clean":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "vacant_dirty":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400";
    case "inspected":
      return "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400";
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
  expectedEndAt: string;
};

function emptyDraft(): RoomAssignDraft {
  return { names: [""], notes: "", expectedEndAt: "" };
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
        className="h-9 gap-1.5 rounded-lg"
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
  const [editingAssignment, setEditingAssignment] =
    useState<LodgingCmAssignment | null>(null);
  const [editNames, setEditNames] = useState<string[]>([""]);
  const [editNotes, setEditNotes] = useState("");
  const [editExpectedEndAt, setEditExpectedEndAt] = useState("");

  const openEditAssignment = (a: LodgingCmAssignment) => {
    if (!canEditOpenAssignment(a)) return;
    const siblings = openAssignments.filter(
      (row) =>
        row.roomId === a.roomId &&
        row.workKind === a.workKind &&
        String(row.status || "").toLowerCase() === "open",
    );
    const names = siblings
      .map((row) => String(row.assigneeName || "").trim())
      .filter(Boolean);
    setEditingAssignment(a);
    setEditNames(names.length > 0 ? names : [a.assigneeName || ""]);
    setEditNotes(a.notes || siblings[0]?.notes || "");
    setEditExpectedEndAt(isoToDayPickerValue(a.room?.statusExpectedEndAt));
  };

  const resetEditAssignment = () => {
    setEditingAssignment(null);
    setEditNames([""]);
    setEditNotes("");
    setEditExpectedEndAt("");
  };

  const saveEditAssignment = async () => {
    if (!editingAssignment) return;
    const names = parseAssigneeNames(editNames);
    if (names.length === 0) {
      toast.error("Add at least one assignee");
      return;
    }
    setPending(`edit-${editingAssignment.roomId}-${editingAssignment.workKind}`);
    try {
      await syncLodgingCmOpenAssigneesApi({
        roomId: editingAssignment.roomId,
        workKind: editingAssignment.workKind,
        assigneeNames: names,
        notes: editNotes.trim(),
        statusExpectedEndAt: ymdToExpectedReadyIso(editExpectedEndAt),
      });
      resetEditAssignment();
      await onRefresh();
    } catch (e) {
      notifyApiFailure(e, "Could not update assignees");
    } finally {
      setPending(null);
    }
  };

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
  const selectedDirtyNeedingAssign = selectedDirty.filter(
    (r) => (openCleaningByRoom.get(r.id) ?? []).length === 0,
  );

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
          expectedEndAt: "",
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
          expectedEndAt: "",
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
          statusExpectedEndAt: ymdToExpectedReadyIso(draft.expectedEndAt),
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
      <Card className="overflow-hidden border-border/80 bg-card/95 shadow-md">
        <div className="h-1 bg-linear-to-r from-amber-500/60 via-rose-500/40 to-emerald-500/45" />
        <CardHeader className="pb-3">
          <CardTitle className="text-lg tracking-tight">
            Dirty & maintenance queue
          </CardTitle>
          <CardDescription>
            Dirty rooms need cleaners assigned before they can open as vacant
            clean. Send rooms to maintenance when repair work is required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {queue.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground">
              Queue is empty.
            </p>
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
                {selectedDirtyNeedingAssign.length > 0 ? (
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 gap-1.5 rounded-lg shadow-sm"
                      onClick={() =>
                        openAssignForRooms(
                          selectedDirtyNeedingAssign,
                          "cleaning",
                        )
                      }
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign cleaners ({selectedDirtyNeedingAssign.length})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 rounded-lg border-rose-500/30 text-rose-800 hover:bg-rose-500/10 dark:text-rose-300"
                      onClick={() =>
                        openAssignForRooms(
                          selectedDirtyNeedingAssign,
                          "maintenance",
                        )
                      }
                    >
                      <Wrench className="h-4 w-4" />
                      Enter maintenance ({selectedDirtyNeedingAssign.length})
                    </Button>
                  </div>
                ) : null}
              </div>

              <ul className="divide-y overflow-hidden rounded-xl border border-border/70">
                {queue.map((room) => {
                  const status = room.status as LodgingRoomStatus;
                  const onMaintenance = status === "on_maintenance";
                  const isInspected = status === "inspected";
                  const isDirty = status === "vacant_dirty";
                  const cleaningOpen = openCleaningByRoom.get(room.id) ?? [];
                  const maintOpen = openMaintByRoom.get(room.id) ?? [];
                  const hasOpenCleaning = cleaningOpen.length > 0;
                  /** Vacant clean only after inspect path (cleaners finished → inspected). */
                  const canOpenVacantClean = isInspected || onMaintenance;
                  const checked = selectedRoomIds.includes(room.id);
                  return (
                    <li
                      key={room.id}
                      className={cn(
                        "flex flex-col gap-3 p-4 transition-colors lg:flex-row lg:items-center lg:justify-between",
                        checked && "bg-primary/5",
                        isDirty && !checked && "bg-amber-500/[0.03]",
                        onMaintenance && !checked && "bg-rose-500/[0.03]",
                        isInspected && !checked && "bg-teal-500/[0.03]",
                      )}
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
                            {room.statusExpectedEndAt ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarClock className="h-3.5 w-3.5" />
                                Ready by{" "}
                                {new Date(
                                  room.statusExpectedEndAt,
                                ).toLocaleString()}
                              </span>
                            ) : null}
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
                                {isInspected
                                  ? "Inspected — open as vacant clean when ready"
                                  : onMaintenance
                                    ? "Maintenance in progress — complete open jobs, then release clean"
                                    : "Assign cleaners, or enter maintenance"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pl-7 lg:justify-end lg:pl-0">
                        {isDirty && !hasOpenCleaning ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 gap-1.5 rounded-lg shadow-sm"
                              onClick={() =>
                                openAssignForRooms([room], "cleaning")
                              }
                            >
                              <UserPlus className="h-4 w-4" />
                              Assign cleaners
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-9 gap-1.5 rounded-lg border-rose-500/30 text-rose-800 hover:bg-rose-500/10 dark:text-rose-300"
                              onClick={() =>
                                openAssignForRooms([room], "maintenance")
                              }
                            >
                              <Wrench className="h-4 w-4" />
                              Enter maintenance
                            </Button>
                          </>
                        ) : null}
                        {isDirty && hasOpenCleaning ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 gap-1.5 rounded-lg"
                            onClick={() => openEditAssignment(cleaningOpen[0]!)}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit people
                          </Button>
                        ) : null}
                        {canOpenVacantClean ? (
                          <PendingButton
                            type="button"
                            size="sm"
                            className="h-9 gap-1.5 rounded-lg bg-emerald-600 shadow-sm hover:bg-emerald-700"
                            pending={pending === `clean-${room.id}`}
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
                            <CheckCircle2 className="h-4 w-4" />
                            {onMaintenance
                              ? "Release to vacant clean"
                              : "Open as vacant clean"}
                          </PendingButton>
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

      <Dialog
        open={assignRoomIds.length > 0 && assignRooms.length > 0}
        onOpenChange={(open) => {
          if (!open) resetAssign();
        }}
      >
        <DialogContent
          showCloseButton
          className="flex max-h-[min(92vh,780px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <div
            className={cn(
              "h-1 shrink-0",
              isMaintForm
                ? "bg-linear-to-r from-rose-500/70 via-amber-500/50 to-transparent"
                : "bg-linear-to-r from-sky-500/70 via-emerald-500/45 to-transparent",
            )}
          />
          <DialogHeader className="shrink-0 space-y-3 border-b border-border/60 px-6 pb-4 pt-5 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl tracking-tight">
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
            </DialogTitle>
            <DialogDescription className="text-pretty leading-relaxed">
              {isMaintForm
                ? "Assign staff per room or share one team across all selected rooms. Dirty rooms move to maintenance on save."
                : "Enter cleaners for each room. When the last cleaner completes, the room becomes inspected — then Open as vacant clean unlocks."}
            </DialogDescription>
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
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
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
                      className="h-9 gap-1.5 rounded-lg text-xs"
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
                <div className="space-y-1.5">
                  <HotelDayPicker
                    id="shared-expected-end"
                    label="Expected ready (for reservation holds)"
                    value={sharedDraft.expectedEndAt}
                    onChange={(ymd) =>
                      setSharedDraft((d) => ({
                        ...d,
                        expectedEndAt: ymd,
                      }))
                    }
                    placeholder="Optional ready date & time"
                    buttonClassName="bg-background"
                    withTime
                  />
                  <p className="text-xs text-muted-foreground">
                    Dirty rooms with an expected ready before a booking&apos;s
                    arrival can be held for that reservation. Leave blank if
                    unknown.
                  </p>
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
                    className="h-9 gap-1.5 rounded-lg text-xs"
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
                      <HotelDayPicker
                        id={`expected-end-${room.id}`}
                        label="Expected ready"
                        value={draft.expectedEndAt}
                        onChange={(ymd) =>
                          updatePerRoom(room.id, {
                            expectedEndAt: ymd,
                          })
                        }
                        placeholder="Optional ready date & time"
                        buttonClassName="bg-background"
                        withTime
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border/60 bg-background px-6 py-4 sm:gap-2">
            <p className="mr-auto hidden max-w-[46%] text-xs text-muted-foreground sm:block">
              {canSave
                ? `Ready to save ${assignRooms.length} room${assignRooms.length === 1 ? "" : "s"}.`
                : peopleLayout === "per-room"
                  ? "Add at least one person on every room."
                  : "Add at least one person to continue."}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="h-10"
              disabled={pending === "assign"}
              onClick={resetAssign}
            >
              Cancel
            </Button>
            <PendingButton
              type="button"
              className="h-10 min-w-44 gap-1.5"
              pending={pending === "assign"}
              disabled={!canSave}
              onClick={() => void saveAssignments()}
            >
              <CheckCircle2 className="h-4 w-4" />
              Save assignment
              {assignRooms.length > 1 ? `s (${assignRooms.length})` : ""}
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="overflow-hidden border-border/80 bg-card/95 shadow-md">
        <div className="h-1 bg-linear-to-r from-sky-500/50 via-primary/35 to-emerald-500/45" />
        <CardHeader className="pb-3">
          <CardTitle className="text-lg tracking-tight">Open assignments</CardTitle>
          <CardDescription>
            Complete each person&apos;s job when finished. Edit open cleaning
            (vacant dirty) or maintenance jobs to add or remove assignees, or
            change the expected ready time. Last cleaner done → inspected; last
            maintenance done → inspected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {openAssignments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground">
              No open assignments.
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border border-border/70">
              {openAssignments.map((a) => {
                const editable = canEditOpenAssignment(a);
                const isFirstOfGroup =
                  openAssignments.find(
                    (row) =>
                      row.roomId === a.roomId &&
                      row.workKind === a.workKind &&
                      String(row.status || "").toLowerCase() === "open",
                  )?.id === a.id;
                return (
                  <li
                    key={a.id}
                    className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium">
                        Room {a.room?.roomNumber ?? a.roomId}
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {a.workKind}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.assigneeName}
                        {a.notes ? ` · ${a.notes}` : ""}
                      </p>
                      {a.room?.statusExpectedEndAt ? (
                        <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CalendarClock className="h-3 w-3" />
                          Ready{" "}
                          {new Date(
                            a.room.statusExpectedEndAt,
                          ).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {editable && isFirstOfGroup ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1.5 rounded-lg"
                          onClick={() => openEditAssignment(a)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit people
                        </Button>
                      ) : null}
                      <PendingButton
                        type="button"
                        size="sm"
                        className="h-9 gap-1.5 rounded-lg bg-emerald-600 shadow-sm hover:bg-emerald-700 sm:min-w-32"
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
                        <CheckCircle2 className="h-4 w-4" />
                        Complete
                      </PendingButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editingAssignment != null}
        onOpenChange={(open) => {
          if (!open) resetEditAssignment();
        }}
      >
        <DialogContent
          showCloseButton
          className="flex max-h-[min(92vh,640px)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <div
            className={cn(
              "h-1 shrink-0",
              editingAssignment?.workKind === "maintenance"
                ? "bg-linear-to-r from-rose-500/70 via-amber-500/40 to-transparent"
                : "bg-linear-to-r from-sky-500/70 via-emerald-500/40 to-transparent",
            )}
          />
          <DialogHeader className="shrink-0 space-y-2 border-b border-border/60 px-6 pb-4 pt-5 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl tracking-tight">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Users className="h-4 w-4" />
              </span>
              Edit people
            </DialogTitle>
            <DialogDescription className="text-pretty leading-relaxed">
              Add or remove assignees for room{" "}
              {editingAssignment?.room?.roomNumber ??
                editingAssignment?.roomId}
              {" "}
              ({editingAssignment?.workKind}). At least one person must remain.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
            <PeopleFields
              idPrefix="edit-cm"
              names={editNames}
              onChangeName={(idx, value) =>
                setEditNames((prev) =>
                  prev.map((n, i) => (i === idx ? value : n)),
                )
              }
              onAdd={() => setEditNames((prev) => [...prev, ""])}
              onRemove={(idx) =>
                setEditNames((prev) =>
                  prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx),
                )
              }
            />
            <div className="space-y-1.5">
              <Label htmlFor="edit-cm-notes">Notes</Label>
              <Input
                id="edit-cm-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes"
                className="h-10"
              />
            </div>
            <HotelDayPicker
              id="edit-cm-expected-end"
              label="Expected ready"
              value={editExpectedEndAt}
              onChange={setEditExpectedEndAt}
              placeholder="Pick date & time (optional)"
              buttonClassName="bg-background"
              withTime
            />
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border/60 bg-background px-6 py-4 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-10"
              disabled={pending?.startsWith("edit-")}
              onClick={resetEditAssignment}
            >
              Cancel
            </Button>
            <PendingButton
              type="button"
              className="h-10 min-w-36 gap-1.5"
              pending={
                editingAssignment
                  ? pending ===
                    `edit-${editingAssignment.roomId}-${editingAssignment.workKind}`
                  : false
              }
              disabled={parseAssigneeNames(editNames).length === 0}
              onClick={() => void saveEditAssignment()}
            >
              <CheckCircle2 className="h-4 w-4" />
              Save people
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
