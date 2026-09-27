"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Settings2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { fetchHrEmployees, type HrEmployee } from "@/lib/api/hr";
import {
  createHrChatBlockApi,
  createHrChatDirectApi,
  deleteHrChatBlockApi,
  fetchHrChatBlocks,
  fetchHrChatHistory,
  fetchHrChatMessages,
  fetchHrChatThreads,
  fetchHrChatUnreadCount,
  markHrChatThreadReadApi,
  sendHrChatMessageApi,
  type HrChatBlock,
  type HrChatMessage,
  type HrChatThread,
} from "@/lib/api/hrChat";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { cn } from "@/lib/utils";
import { responsiveFormDialogClassName } from "@/lib/responsiveDialog";

const POLL_MS = 12000;

/** Manager (hotel) / Admin (café) employee chat + control portal. */
export function HrEmployeeChatCenter({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [threads, setThreads] = useState<HrChatThread[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<HrChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [pickEmpId, setPickEmpId] = useState<string>("");
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const [t, u, emps] = await Promise.all([
        fetchHrChatThreads(),
        fetchHrChatUnreadCount(),
        fetchHrEmployees(),
      ]);
      setThreads(t);
      setUnread(u);
      setEmployees(emps.filter((e) => e.status !== "terminated"));
    } catch {
      /* keep */
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useVisibleInterval(() => {
    if (enabled) void load();
  }, POLL_MS);

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId],
  );

  const loadMessages = useCallback(async (threadId: number) => {
    try {
      const rows = await fetchHrChatMessages(threadId);
      setMessages(rows);
      await markHrChatThreadReadApi(threadId);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load messages");
    }
  }, [load]);

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
  }, [activeId, loadMessages]);

  if (!enabled) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative h-9 w-9 shrink-0"
            aria-label="Employee chat"
          >
            <MessageSquare className="h-4 w-4" />
            {unread > 0 ? (
              <Badge
                variant="destructive"
                className="absolute -right-1.5 -top-1.5 h-5 min-w-5 px-1 text-[10px]"
              >
                {unread > 99 ? "99+" : unread}
              </Badge>
            ) : null}
          </Button>
        </SheetTrigger>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-4 py-3 text-left">
            <div className="flex items-center justify-between gap-2 pr-6">
              <div>
                <SheetTitle>Employee chat</SheetTitle>
                <SheetDescription>
                  Message employees. Apex support stays on the other chat icon.
                </SheetDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setControlOpen(true)}
                aria-label="Chat control"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex gap-2 border-b p-3">
              <Select value={pickEmpId} onValueChange={setPickEmpId}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder="Start chat with…" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                className="h-9"
                disabled={!pickEmpId || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const t = await createHrChatDirectApi({
                      employeeId: Number(pickEmpId),
                      includeManager: true,
                    });
                    setPickEmpId("");
                    await load();
                    setActiveId(t.id);
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Could not start chat",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Open
              </Button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[8.5rem_1fr]">
              <ul className="max-h-40 space-y-0.5 overflow-y-auto border-b p-2 sm:max-h-none sm:border-b-0 sm:border-r">
                {threads.length === 0 ? (
                  <li className="px-2 py-6 text-center text-xs text-muted-foreground">
                    No threads yet
                  </li>
                ) : (
                  threads.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-lg px-2 py-2 text-left text-xs transition hover:bg-muted/70",
                          activeId === t.id && "bg-muted",
                        )}
                        onClick={() => setActiveId(t.id)}
                      >
                        <p className="truncate font-medium">
                          {t.title || `Chat #${t.id}`}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {t.lastMessage?.body || t.kind}
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="flex min-h-0 flex-col">
                <div className="min-h-48 flex-1 space-y-2 overflow-y-auto p-3">
                  {!active ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      Select or start a conversation
                    </p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[90%] rounded-xl px-3 py-2 text-sm",
                          m.senderIsManager
                            ? "ml-auto bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        <p className="text-[10px] opacity-70">{m.senderName}</p>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      </div>
                    ))
                  )}
                </div>
                {active ? (
                  <form
                    className="flex gap-2 border-t p-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!draft.trim() || busy) return;
                      setBusy(true);
                      try {
                        await sendHrChatMessageApi(active.id, draft.trim());
                        setDraft("");
                        await loadMessages(active.id);
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "Send failed",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Textarea
                      rows={2}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Message…"
                      className="min-h-10 resize-none"
                      disabled={busy}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      disabled={busy || !draft.trim()}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <HrChatControlDialog
        open={controlOpen}
        onOpenChange={setControlOpen}
        employees={employees}
      />
    </>
  );
}

function HrChatControlDialog({
  open,
  onOpenChange,
  employees,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: HrEmployee[];
}) {
  const [tab, setTab] = useState<"blocks" | "history">("blocks");
  const [blocks, setBlocks] = useState<HrChatBlock[]>([]);
  const [pathType, setPathType] = useState<"emp_emp" | "emp_manager">(
    "emp_manager",
  );
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [note, setNote] = useState("");
  const [fromYmd, setFromYmd] = useState("");
  const [toYmd, setToYmd] = useState("");
  const [filterEmp, setFilterEmp] = useState("");
  const [kind, setKind] = useState("all");
  const [withManager, setWithManager] = useState("all");
  const [history, setHistory] = useState<HrChatThread[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshBlocks = useCallback(async () => {
    try {
      setBlocks(await fetchHrChatBlocks());
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    if (open) void refreshBlocks();
  }, [open, refreshBlocks]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(responsiveFormDialogClassName, "max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>Chat control</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          {(
            [
              { id: "blocks", label: "Blocks" },
              { id: "history", label: "History" },
            ] as const
          ).map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={tab === t.id ? "default" : "outline"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {tab === "blocks" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Path type</Label>
                <Select
                  value={pathType}
                  onValueChange={(v) =>
                    setPathType(v as "emp_emp" | "emp_manager")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emp_manager">
                      Employee ↔ Manager
                    </SelectItem>
                    <SelectItem value="emp_emp">Employee ↔ Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Side A (employee)</Label>
                <Select value={sideA} onValueChange={setSideA}>
                  <SelectTrigger>
                    <SelectValue placeholder="Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {pathType === "emp_manager" ? "Side B (Manager)" : "Side B"}
                </Label>
                {pathType === "emp_manager" ? (
                  <Input value="Manager" disabled className="bg-muted" />
                ) : (
                  <Select value={sideB} onValueChange={setSideB}>
                    <SelectTrigger>
                      <SelectValue placeholder="Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Note (optional)</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why this is blocked"
                />
              </div>
            </div>
            <Button
              type="button"
              disabled={busy || !sideA || (pathType === "emp_emp" && !sideB)}
              onClick={async () => {
                setBusy(true);
                try {
                  await createHrChatBlockApi({
                    pathType,
                    employeeIdA: Number(sideA),
                    employeeIdB:
                      pathType === "emp_emp" ? Number(sideB) : null,
                    note,
                  });
                  setSideA("");
                  setSideB("");
                  setNote("");
                  toast.success("Block added");
                  await refreshBlocks();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Add block
            </Button>
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {blocks.length === 0 ? (
                <li className="text-sm text-muted-foreground">No blocks yet.</li>
              ) : (
                blocks.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {b.pathType === "emp_manager"
                          ? `${b.employeeAName || b.employeeIdA} ↔ Manager`
                          : `${b.employeeAName || b.employeeIdA} ↔ ${b.employeeBName || b.employeeIdB}`}
                      </p>
                      {b.note ? (
                        <p className="text-xs text-muted-foreground">{b.note}</p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await deleteHrChatBlockApi(b.id);
                          await refreshBlocks();
                        } catch (e) {
                          toast.error(
                            e instanceof Error ? e.message : "Failed",
                          );
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>From</Label>
                <HotelDayPicker value={fromYmd} onChange={setFromYmd} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <HotelDayPicker value={toYmd} onChange={setToYmd} />
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={filterEmp || "all"} onValueChange={setFilterEmp}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Thread type</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>With Manager</Label>
                <Select value={withManager} onValueChange={setWithManager}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="includes">Includes Manager</SelectItem>
                    <SelectItem value="emp_only">Emp only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setHistory(
                    await fetchHrChatHistory({
                      fromYmd: fromYmd || undefined,
                      toYmd: toYmd || undefined,
                      employeeId:
                        filterEmp && filterEmp !== "all"
                          ? Number(filterEmp)
                          : null,
                      kind: kind === "all" ? undefined : kind,
                      withManager:
                        withManager === "all" ? undefined : withManager,
                    }),
                  );
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Search history
            </Button>
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {history.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Run a search to list threads.
                </li>
              ) : (
                history.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <p className="font-medium">
                      {t.title || `#${t.id}`} · {t.kind}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.messageCount ?? 0} messages ·{" "}
                      {t.members
                        .map((m) =>
                          m.isManager ? "Manager" : m.employeeName || m.employeeId,
                        )
                        .join(", ")}
                    </p>
                    {t.lastMessage ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {t.lastMessage.body}
                      </p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
