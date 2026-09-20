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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft } from "lucide-react";
import {
  transferLodgingStayRoomApi,
  type LodgingRoom,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";

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

  const canSubmit =
    Number(fromRoomId) > 0 &&
    Number(toRoomId) > 0 &&
    Number(fromRoomId) !== Number(toRoomId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transfer guest room
          </DialogTitle>
          <DialogDescription>
            Move {stay.voucherCode} to a vacant clean room. Folio and café /
            laundry charges follow the guest; the old room becomes vacant dirty
            (or on maintenance if you choose).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>From room</Label>
            <Select value={fromRoomId} onValueChange={setFromRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="Current room" />
              </SelectTrigger>
              <SelectContent>
                {fromOptions.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    Room {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>To room (vacant clean)</Label>
            <Select value={toRoomId || "__none__"} onValueChange={(v) => setToRoomId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select room</SelectItem>
                {vacantCleanRooms.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.roomNumber} · {r.roomType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Guest request, maintenance, upgrade…"
            />
          </div>
          <label className="flex items-start gap-2 rounded-xl border border-border/70 p-3 text-sm">
            <Checkbox
              checked={markMaintenance}
              onCheckedChange={(v) => setMarkMaintenance(v === true)}
              className="mt-0.5"
            />
            <span>
              Put old room on maintenance
              <span className="mt-1 block text-xs text-muted-foreground">
                Use when the guest is moved because the room needs repair.
              </span>
            </span>
          </label>
          {markMaintenance ? (
            <div className="space-y-1.5">
              <Label>Expected ready (optional)</Label>
              <Input
                type="datetime-local"
                value={maintUntil}
                onChange={(e) => setMaintUntil(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <PendingButton
            type="button"
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
                  maintenanceUntil: maintUntil
                    ? new Date(maintUntil).toISOString()
                    : null,
                });
                onOpenChange(false);
                await onDone?.();
              } catch (e) {
                notifyApiFailure(e, "Transfer failed");
              } finally {
                setPending(false);
              }
            }}
          >
            Transfer
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
