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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Banknote, Building2, Printer, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LodgingBillLine, LodgingStay } from "@/lib/api/lodgingRooms";
import { stripCafeOrderMarker } from "@/lib/lodgingRoomService";

export type StayLinePaymentChannel = "cash" | "bank";

export type StayCheckoutPaymentResult = {
  mode: "order" | "amount";
  /** Line id → channel (pay by order). */
  lineChannels: Record<number, StayLinePaymentChannel>;
  cashETB: number;
  bankETB: number;
};

function formatMoney(n: number) {
  return `ETB ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function lineAmount(line: LodgingBillLine) {
  return Number(line.amountETB) || 0;
}

function guestLabel(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "Guest";
  return `${g.firstName} ${g.lastName}`.trim() || "Guest";
}

function roomsLabel(stay: LodgingStay) {
  return (
    stay.rooms
      ?.map((r) => r.room?.roomNumber)
      .filter(Boolean)
      .join(", ") || "—"
  );
}

function summarizeChannels(
  lines: LodgingBillLine[],
  channels: Record<number, StayLinePaymentChannel>,
) {
  let cash = 0;
  let bank = 0;
  for (const line of lines) {
    const ch = channels[line.id] ?? "cash";
    if (ch === "bank") bank += lineAmount(line);
    else cash += lineAmount(line);
  }
  return {
    cashETB: Math.round(cash * 100) / 100,
    bankETB: Math.round(bank * 100) / 100,
  };
}

function ChannelToggle({
  value,
  onChange,
  size = "md",
}: {
  value: StayLinePaymentChannel;
  onChange: (v: StayLinePaymentChannel) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/30 p-1",
        size === "sm" && "rounded-lg",
      )}
    >
      {(["cash", "bank"] as const).map((option) => {
        const active = value === option;
        const Icon = option === "cash" ? Banknote : Building2;
        return (
          <button
            key={option}
            type="button"
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg capitalize transition-colors",
              size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
              active
                ? "bg-background text-foreground shadow-sm font-medium ring-1 ring-border/80"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(option)}
          >
            <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function ReceptionCheckoutPaymentDialog({
  open,
  onOpenChange,
  stay,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stay: LodgingStay;
  pending?: boolean;
  onConfirm: (result: StayCheckoutPaymentResult) => void | Promise<void>;
}) {
  const lines = useMemo(() => stay.bill?.lines ?? [], [stay.bill?.lines]);
  const total = Number(stay.bill?.totalETB ?? 0);

  const [mode, setMode] = useState<"order" | "amount">("order");
  const [lineChannels, setLineChannels] = useState<
    Record<number, StayLinePaymentChannel>
  >({});
  const [primaryChannel, setPrimaryChannel] =
    useState<StayLinePaymentChannel>("cash");
  const [amountInput, setAmountInput] = useState("");

  useEffect(() => {
    if (!open) return;
    const init: Record<number, StayLinePaymentChannel> = {};
    for (const line of lines) init[line.id] = "cash";
    setLineChannels(init);
    setMode("order");
    setPrimaryChannel("cash");
    setAmountInput("");
  }, [open, stay.id, lines]);

  const orderSummary = useMemo(
    () => summarizeChannels(lines, lineChannels),
    [lines, lineChannels],
  );

  const amountPlan = useMemo(() => {
    const entered = Math.max(0, Number(amountInput) || 0);
    const primary = Math.min(entered, total);
    const secondary = Math.max(0, Math.round((total - primary) * 100) / 100);
    if (primaryChannel === "cash") {
      return { cashETB: primary, bankETB: secondary };
    }
    return { cashETB: secondary, bankETB: primary };
  }, [amountInput, primaryChannel, total]);

  const activeSummary = mode === "order" ? orderSummary : amountPlan;
  const amountOk =
    mode === "order" ||
    (Number(amountInput) >= 0 &&
      Math.abs(activeSummary.cashETB + activeSummary.bankETB - total) < 0.02);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,880px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="shrink-0 border-b border-border/70 bg-linear-to-br from-primary/10 via-background to-emerald-500/5 px-6 pb-5 pt-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-xl tracking-tight">
                  Checkout payment
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  Settle cash and bank for this stay, then print the departure
                  receipt. Room stays do not use corporate credit.
                </DialogDescription>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {guestLabel(stay)}
              </Badge>
              <Badge variant="outline" className="font-mono font-normal">
                {stay.voucherCode}
              </Badge>
              <Badge variant="outline" className="font-normal tabular-nums">
                Rm {roomsLabel(stay)}
              </Badge>
            </div>
          </DialogHeader>

          <div className="mt-4 flex items-end justify-between gap-3 rounded-2xl border border-primary/20 bg-background/80 px-4 py-3 shadow-sm backdrop-blur-sm">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Stay total
              </p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">
                {formatMoney(total)}
              </p>
            </div>
            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 font-normal">
              No credit
            </Badge>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v === "amount" ? "amount" : "order")}
          >
            <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="order" className="rounded-lg text-sm">
                Pay by order
              </TabsTrigger>
              <TabsTrigger value="amount" className="rounded-lg text-sm">
                Pay by amount
              </TabsTrigger>
            </TabsList>

            <TabsContent value="order" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose cash or bank for each bill line (e.g. room on cash,
                laundry on bank).
              </p>
              {lines.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  No bill lines on this stay.
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {lines.map((line) => {
                    const ch = lineChannels[line.id] ?? "cash";
                    return (
                      <li
                        key={line.id}
                        className="rounded-2xl border border-border/70 bg-card/90 px-3.5 py-3 shadow-sm"
                      >
                        <div className="mb-2.5 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug">
                              {stripCafeOrderMarker(line.description)}
                            </p>
                            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                              {line.kind.replace(/_/g, " ")}
                              {line.roomNumber
                                ? ` · Rm ${line.roomNumber}`
                                : ""}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold tabular-nums">
                            {formatMoney(lineAmount(line))}
                          </p>
                        </div>
                        <ChannelToggle
                          size="sm"
                          value={ch}
                          onChange={(option) =>
                            setLineChannels((prev) => ({
                              ...prev,
                              [line.id]: option,
                            }))
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="amount" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter how much settles on the primary channel; the remainder goes
                to the other channel automatically.
              </p>
              <div className="space-y-2">
                <Label>Primary channel</Label>
                <ChannelToggle
                  value={primaryChannel}
                  onChange={setPrimaryChannel}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stay-primary-amount">
                  Amount on {primaryChannel} (ETB)
                </Label>
                <Input
                  id="stay-primary-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-11 rounded-xl tabular-nums text-base"
                  placeholder={`0 – ${total}`}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/70 bg-muted/25 p-3.5">
            <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Banknote className="h-3.5 w-3.5" />
                Cash
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatMoney(activeSummary.cashETB)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Bank
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatMoney(activeSummary.bankETB)}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/70 bg-muted/20 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <PendingButton
            type="button"
            className="h-11 gap-2 rounded-xl px-5"
            pending={Boolean(pending)}
            disabled={!amountOk || total < 0}
            onClick={() =>
              void onConfirm({
                mode,
                lineChannels,
                cashETB: activeSummary.cashETB,
                bankETB: activeSummary.bankETB,
              })
            }
          >
            <Printer className="h-4 w-4" />
            Confirm & print receipt
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
