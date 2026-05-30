"use client";

import { useCallback, useId, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  normalizeRejectionReasonInput,
  rejectionReasonRequiredMessage,
} from "@/lib/hotelRejectionReason";

export type RejectionReasonDialogOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
};

type PendingReject = {
  opts: RejectionReasonDialogOptions;
  resolve: (reason: string | null) => void;
};

export function useRejectionReasonDialog() {
  const reasonId = useId();
  const [pending, setPending] = useState<PendingReject | null>(null);
  const [draft, setDraft] = useState("");

  const requestRejectionReason = useCallback(
    (opts: RejectionReasonDialogOptions = {}) =>
      new Promise<string | null>((resolve) => {
        setDraft("");
        setPending({ opts, resolve });
      }),
    [],
  );

  const close = useCallback((reason: string | null) => {
    pending?.resolve(reason);
    setPending(null);
    setDraft("");
  }, [pending]);

  const submit = useCallback(() => {
    const normalized = normalizeRejectionReasonInput(draft);
    if (!normalized) {
      toast.error(rejectionReasonRequiredMessage());
      return;
    }
    close(normalized);
  }, [draft, close]);

  const RejectionReasonDialog = (
    <Dialog
      open={pending != null}
      onOpenChange={(open) => {
        if (!open) close(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {pending?.opts.title ?? "Reason for rejection"}
          </DialogTitle>
          <DialogDescription>
            {pending?.opts.description ??
              "This reason is saved on the request and visible to the store team."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor={reasonId}>Rejection reason</Label>
          <Textarea
            id={reasonId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Explain why this request is rejected…"
            rows={4}
            className="resize-y min-h-[100px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Required. Ctrl+Enter to submit.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => close(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={!normalizeRejectionReasonInput(draft)}
          >
            {pending?.opts.confirmLabel ?? "Submit rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { requestRejectionReason, RejectionReasonDialog };
}
