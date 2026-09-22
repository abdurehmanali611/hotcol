"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PendingButton } from "@/components/ui/pending-button";
import { addLodgingPenaltyLinesApi } from "@/lib/api/lodgingRooms";
import { notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Plus, Scale, Trash2 } from "lucide-react";
import { toast } from "sonner";

type PenaltyLine = {
  key: string;
  name: string;
  amountETB: string;
};

function emptyLine(): PenaltyLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    amountETB: "",
  };
}

export function LodgingPenaltyDialog({
  open,
  onOpenChange,
  stayId,
  guestLabel,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stayId: number;
  guestLabel?: string;
  onSaved?: () => void | Promise<void>;
}) {
  const [lines, setLines] = useState<PenaltyLine[]>([emptyLine()]);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  const reset = () => {
    setLines([emptyLine()]);
    setNote("");
  };

  const submit = async () => {
    const payload = lines
      .map((l) => ({
        name: l.name.trim(),
        amountETB: Math.max(0, Number(l.amountETB) || 0),
      }))
      .filter((l) => l.name || l.amountETB > 0);

    if (!payload.length) {
      toast.error("Add at least one penalty");
      return;
    }
    for (const row of payload) {
      if (!row.name) {
        toast.error("Each penalty needs a name");
        return;
      }
      if (!(row.amountETB > 0)) {
        toast.error("Each penalty needs a positive amount");
        return;
      }
    }

    setPending(true);
    try {
      await addLodgingPenaltyLinesApi({
        stayId,
        lines: payload,
        note: note.trim() || undefined,
      });
      reset();
      onOpenChange(false);
      await onSaved?.();
    } catch (e) {
      notifyApiFailure(e, "Could not add penalties");
    } finally {
      setPending(false);
    }
  };

  const total = lines.reduce(
    (s, l) => s + Math.max(0, Number(l.amountETB) || 0),
    0,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="shrink-0 border-b border-border/70 bg-linear-to-br from-amber-500/10 via-background to-rose-500/5 px-6 pb-5 pt-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl tracking-tight">
              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-300">
                <Scale className="size-4" />
              </span>
              Penalty payment
            </DialogTitle>
            <DialogDescription className="text-pretty leading-relaxed">
              Charge{" "}
              {guestLabel ? (
                <span className="font-medium text-foreground">{guestLabel}</span>
              ) : (
                "this guest"
              )}{" "}
              for faults or damages. Posts to the folio immediately — no Manager
              approval. Add multiple penalties in one batch.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div
                key={line.key}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 rounded-xl border border-border/70 bg-muted/15 p-3",
                )}
              >
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">
                    Penalty {idx + 1} name
                  </Label>
                  <Input
                    value={line.name}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((r) =>
                          r.key === line.key
                            ? { ...r, name: e.target.value }
                            : r,
                        ),
                      )
                    }
                    placeholder="e.g. Broken glass, Smoking in room"
                    className="h-10 rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">
                    Amount (ETB)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.amountETB}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((r) =>
                          r.key === line.key
                            ? { ...r, amountETB: e.target.value }
                            : r,
                        ),
                      )
                    }
                    placeholder="0.00"
                    className="h-10 rounded-xl tabular-nums bg-background"
                  />
                </div>
                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-xl text-muted-foreground hover:text-destructive"
                    disabled={lines.length <= 1}
                    onClick={() =>
                      setLines((prev) =>
                        prev.length <= 1
                          ? prev
                          : prev.filter((r) => r.key !== line.key),
                      )
                    }
                    aria-label="Remove penalty line"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-10 w-full gap-2 rounded-xl"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <Plus className="size-4" />
            Add another penalty
          </Button>

          <div className="space-y-1.5">
            <Label htmlFor="penalty-batch-note">Batch note (optional)</Label>
            <Textarea
              id="penalty-batch-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Shared note applied to every penalty in this batch"
              className="resize-none rounded-xl"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5 text-sm">
            <span className="text-muted-foreground">Batch total (ex. tax)</span>
            <span className="font-semibold tabular-nums">
              ETB{" "}
              {total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 bg-muted/15 px-6 py-4 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <PendingButton
            type="button"
            className="gap-2 rounded-xl"
            pending={pending}
            onClick={() => void submit()}
          >
            <Scale className="size-4" />
            Post to folio
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
