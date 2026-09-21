"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HotelFormSection } from "@/components/hotel/HotelTerminalInitFormLayout";
import { ArrowRight, ArrowRightLeft } from "lucide-react";
import {
  transferLodgingStayRoomApi,
  type LodgingRoom,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { toast } from "sonner";

function guestLabel(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "Guest";
  return `${g.firstName} ${g.lastName}`.trim() || "Guest";
}

function ymdToMaintenanceIso(ymd: string): string | null {
  if (!ymd.trim()) return null;
  const d = new Date(`${ymd.trim()}T14:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function ReceptionRoomTransferDialog({
  open,
  onOpenChange,
  stay,
  vacantCleanRooms,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay: LodgingStay;
  vacantCleanRooms: LodgingRoom[];
  onDone?: () => void | Promise<void>;
}) {
  const fromOptions = useMemo(
    () =>
      (stay.rooms || [])
        .map((r) => ({
          id: r.roomId,
          label: r.room?.roomNumber || String(r.roomId),
          type: r.room?.roomType || "",
        }))
        .filter((r) => r.id > 0),
    [stay.rooms],
  );
  const [fromRoomId, setFromRoomId] = useState("");
  const [toRoomId, setToRoomId] = useState("");
  const [reason, setReason] = useState("");
  const [markMaintenance, setMarkMaintenance] = useState(false);
  const [maintUntil, setMaintUntil] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFromRoomId(fromOptions[0] ? String(fromOptions[0].id) : "");
    setToRoomId("");
    setReason("");
    setMarkMaintenance(false);
    setMaintUntil("");
  }, [open, stay.id, fromOptions]);

  const fromRoom = fromOptions.find((r) => String(r.id) === fromRoomId);
  const toRoom = vacantCleanRooms.find((r) => String(r.id) === toRoomId);

  const canSubmit =
    Number(fromRoomId) > 0 &&
    Number(toRoomId) > 0 &&
    Number(fromRoomId) !== Number(toRoomId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="h-1 shrink-0 bg-linear-to-r from-sky-500/55 via-primary/45 to-emerald-500/40" />

        <DialogHeader className="shrink-0 space-y-2 border-b border-border/60 px-6 pb-4 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl tracking-tight">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transfer guest room
          </DialogTitle>
          <DialogDescription className="text-pretty leading-relaxed">
            Move the guest to a vacant clean room. Folio, café, and laundry
            charges follow; the old room becomes vacant dirty (or on
            maintenance if you choose).
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline" className="font-mono text-xs">
              {stay.voucherCode}
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {guestLabel(stay)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
          <HotelFormSection
            title="Move"
            description="Current room and vacant clean destination."
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div className="space-y-1.5 min-w-0">
                <Label>From room</Label>
                <Select value={fromRoomId} onValueChange={setFromRoomId}>
                  <SelectTrigger className="h-10 w-full bg-background">
                    <SelectValue placeholder="Current room" />
                  </SelectTrigger>
                  <SelectContent>
                    {fromOptions.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        Rm {r.label}
                        {r.type ? ` · ${r.type}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden h-10 items-center justify-center sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label>To room</Label>
                <Select
                  value={toRoomId || "__none__"}
                  onValueChange={(v) =>
                    setToRoomId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-10 w-full bg-background">
                    <SelectValue placeholder="Vacant clean" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select room</SelectItem>
                    {vacantCleanRooms.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        No vacant clean rooms
                      </SelectItem>
                    ) : (
                      vacantCleanRooms.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.roomNumber} · {r.roomType}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {fromRoom && toRoom ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                Rm {fromRoom.label} → Rm {toRoom.roomNumber} · {toRoom.roomType}
              </p>
            ) : null}
          </HotelFormSection>

          <HotelFormSection
            title="Notes"
            description="Optional reason shown on the action trail."
          >
            <div className="space-y-1.5">
              <Label htmlFor="transfer-reason">Reason</Label>
              <Textarea
                id="transfer-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Guest request, maintenance, upgrade…"
                className="resize-none bg-background"
              />
            </div>
          </HotelFormSection>

          <HotelFormSection
            title="Old room"
            description="Default: vacant dirty for housekeeping. Optionally hold on maintenance."
          >
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-background px-3 py-3 text-sm transition-colors hover:bg-muted/30">
              <Checkbox
                checked={markMaintenance}
                onCheckedChange={(v) => setMarkMaintenance(v === true)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="font-medium">Put old room on maintenance</span>
                <span className="mt-0.5 block text-xs text-muted-foreground leading-relaxed">
                  Use when the guest is moved because the room needs repair.
                </span>
              </span>
            </label>
            {markMaintenance ? (
              <HotelDayPicker
                label="Expected ready"
                id="transfer-maint-until"
                value={maintUntil}
                onChange={setMaintUntil}
                placeholder="Optional ready date"
                compact
                buttonClassName="bg-background"
              />
            ) : null}
          </HotelFormSection>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 bg-background px-6 py-4 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <PendingButton
            type="button"
            className="h-10 min-w-36 gap-1.5"
            pending={pending}
            disabled={!canSubmit}
            onClick={async () => {
              setPending(true);
              try {
                await transferLodgingStayRoomApi({
                  stayId: stay.id,
                  fromRoomId: Number(fromRoomId),
                  toRoomId: Number(toRoomId),
                  reason: reason.trim() || undefined,
                  markOldOnMaintenance: markMaintenance,
                  maintenanceUntil: markMaintenance
                    ? ymdToMaintenanceIso(maintUntil)
                    : null,
                });
                toast.success("Guest transferred");
                onOpenChange(false);
                await onDone?.();
              } catch (e) {
                notifyApiFailure(e, "Transfer failed");
              } finally {
                setPending(false);
              }
            }}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
