"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BedDouble,
  ChevronDown,
  ClipboardEdit,
  Minus,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { notifyApiFailure } from "@/lib/actions";
import {
  deleteLodgingBillLineApi,
  updateLodgingBillLineApi,
  type LodgingBillLine,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";
import { ReceptionRoomOrderSection } from "@/components/hotel/ReceptionRoomOrderSection";
import type { Item } from "@/lib/api/types";

function formatMoney(n: number) {
  return `ETB ${Number(n || 0).toLocaleString()}`;
}

function guestName(stay: LodgingStay) {
  const g = stay.guest;
  if (!g) return "Guest";
  return `${g.firstName} ${g.lastName}`.trim() || "Guest";
}

function stayRooms(stay: LodgingStay) {
  return stay.rooms
    .map((r) => r.room?.roomNumber)
    .filter(Boolean)
    .join(", ");
}

function linesForKind(stay: LodgingStay, kind: string): LodgingBillLine[] {
  return (stay.bill?.lines ?? []).filter((l) => l.kind === kind);
}

export function ReceptionLodgingServiceUpdatePanel({
  mode,
  stays,
  menuItems,
  hotelName,
  onRefresh,
}: {
  mode: "food_drink" | "laundry";
  stays: LodgingStay[];
  menuItems: Item[];
  hotelName: string;
  onRefresh: () => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [focusStayId, setFocusStayId] = useState<string>("");
  const [addMode, setAddMode] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [qtyDraft, setQtyDraft] = useState<Record<number, string>>({});

  const staysWithLines = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stays
      .map((s) => ({
        stay: s,
        lines: linesForKind(s, mode),
      }))
      .filter(({ stay, lines }) => {
        if (lines.length === 0 && focusStayId !== String(stay.id)) return false;
        if (!q) return true;
        const rooms = stayRooms(stay).toLowerCase();
        const guest = guestName(stay).toLowerCase();
        const voucher = stay.voucherCode.toLowerCase();
        return (
          rooms.includes(q) ||
          guest.includes(q) ||
          voucher.includes(q) ||
          lines.some((l) => l.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => stayRooms(a.stay).localeCompare(stayRooms(b.stay)));
  }, [stays, mode, query, focusStayId]);

  const updateQty = async (stay: LodgingStay, line: LodgingBillLine) => {
    const raw = qtyDraft[line.id] ?? String(line.quantity);
    const qty = Number(raw);
    if (!(qty > 0)) {
      notifyApiFailure(new Error("Quantity must be positive"), "Invalid quantity");
      return;
    }
    setPending(`qty-${line.id}`);
    try {
      await updateLodgingBillLineApi({
        lineId: line.id,
        quantity: qty,
        stayId: stay.id,
      });
      await onRefresh();
    } catch (e) {
      notifyApiFailure(e, "Could not update quantity");
    } finally {
      setPending(null);
    }
  };

  const removeLine = async (stay: LodgingStay, lineId: number) => {
    setPending(`del-${lineId}`);
    try {
      await deleteLodgingBillLineApi({ lineId, stayId: stay.id });
      await onRefresh();
    } catch (e) {
      notifyApiFailure(e, "Could not remove line");
    } finally {
      setPending(null);
    }
  };

  if (addMode) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Same café order flow — room instead of table, waiter still required.
          </p>
          <Button type="button" variant="outline" onClick={() => setAddMode(false)}>
            Back to order update
          </Button>
        </div>
        <ReceptionRoomOrderSection
          mode={mode}
          items={menuItems}
          stays={stays}
          hotelName={hotelName}
          onCompleted={async () => {
            await onRefresh();
            setAddMode(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/80 shadow-md bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardEdit className="h-4 w-4 text-primary" />
            {mode === "laundry" ? "Laundry order update" : "F&B order update"}
          </CardTitle>
          <CardDescription>
            Rooms with open{" "}
            {mode === "laundry" ? "laundry" : "food & drink"} charges. Adjust
            quantities, remove lines, or add more items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                placeholder="Search room, guest, voucher, or item…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 min-w-[220px]">
              <Label className="inline-flex items-center gap-1.5">
                <BedDouble className="h-3.5 w-3.5" />
                Focus room
              </Label>
              <Select
                value={focusStayId || "__all"}
                onValueChange={(v) => setFocusStayId(v === "__all" ? "" : v)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All rooms with charges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All rooms with charges</SelectItem>
                  {stays.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {stayRooms(s) ? `Rm ${stayRooms(s)}` : guestName(s)} ·{" "}
                      {s.voucherCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={() => setAddMode(true)}>
              <Plus className="h-4 w-4" />
              Add items
            </Button>
          </div>
        </CardContent>
      </Card>

      {staysWithLines.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No {mode === "laundry" ? "laundry" : "F&B"} charges on active stays
            yet. Use Order to place the first charge, or Add items.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {staysWithLines.map(({ stay, lines }) => {
            const rooms = stayRooms(stay);
            const total = lines.reduce((s, l) => s + Number(l.amountETB || 0), 0);
            return (
              <Collapsible
                key={stay.id}
                defaultOpen={
                  focusStayId === String(stay.id) || staysWithLines.length <= 3
                }
                className="rounded-xl border border-border/80 bg-card/95 shadow-sm"
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {rooms ? `Rm ${rooms}` : "No room #"} · {guestName(stay)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stay.voucherCode} · {lines.length} line
                      {lines.length === 1 ? "" : "s"} · {formatMoney(total)}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-border/70 divide-y">
                    {lines.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">
                        No {mode === "laundry" ? "laundry" : "F&B"} lines on this
                        stay yet.
                      </p>
                    ) : (
                      lines.map((line) => (
                        <div
                          key={line.id}
                          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {line.description}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {formatMoney(line.unitPriceETB)} × {line.quantity}{" "}
                              = {formatMoney(line.amountETB)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="size-8"
                                onClick={() =>
                                  setQtyDraft((p) => ({
                                    ...p,
                                    [line.id]: String(
                                      Math.max(
                                        1,
                                        Number(p[line.id] ?? line.quantity) - 1,
                                      ),
                                    ),
                                  }))
                                }
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <Input
                                className="h-8 w-16 text-center tabular-nums"
                                value={qtyDraft[line.id] ?? String(line.quantity)}
                                onChange={(e) =>
                                  setQtyDraft((p) => ({
                                    ...p,
                                    [line.id]: e.target.value,
                                  }))
                                }
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="size-8"
                                onClick={() =>
                                  setQtyDraft((p) => ({
                                    ...p,
                                    [line.id]: String(
                                      Math.max(
                                        1,
                                        Number(p[line.id] ?? line.quantity) + 1,
                                      ),
                                    ),
                                  }))
                                }
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <PendingButton
                              type="button"
                              size="sm"
                              variant="secondary"
                              pending={pending === `qty-${line.id}`}
                              onClick={() => void updateQty(stay, line)}
                            >
                              Save qty
                            </PendingButton>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove line?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remove “{line.description}” from this stay
                                    bill.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void removeLine(stay, line.id)}
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
