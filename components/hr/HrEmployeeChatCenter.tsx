"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { fetchHrEmployees, type HrEmployee } from "@/lib/api/hr";
import {
  createHrChatDirectApi,
  fetchHrChatMessages,
  fetchHrChatThreads,
  fetchHrChatUnreadCount,
  markHrChatThreadReadApi,
  sendHrChatMessageApi,
  type HrChatMessage,
  type HrChatThread,
} from "@/lib/api/hrChat";
import { cn } from "@/lib/utils";

const POLL_MS = 10000;

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Manager (hotel) / Admin (café) live employee chat. Control lives under HR → Chat control. */
export function HrEmployeeChatCenter({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<HrChatThread[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<HrChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [pickEmpId, setPickEmpId] = useState<string>("");
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

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

  const loadMessages = useCallback(
    async (threadId: number, opts?: { quiet?: boolean }) => {
      if (!opts?.quiet) setMsgsLoading(true);
      try {
        const rows = await fetchHrChatMessages(threadId);
        setMessages(rows);
        await markHrChatThreadReadApi(threadId);
        void load();
      } catch (e) {
        if (!opts?.quiet) {
          toast.error(
            e instanceof Error ? e.message : "Could not load messages",
          );
        }
      } finally {
        if (!opts?.quiet) setMsgsLoading(false);
      }
    },
    [load],
  );

  useEffect(() => {
    if (activeId && open) void loadMessages(activeId);
  }, [activeId, open, loadMessages]);

  useVisibleInterval(() => {
    if (enabled && open && activeId) void loadMessages(activeId, { quiet: true });
  }, POLL_MS);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

  if (!enabled) return null;

  return (
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
      <SheetContent className="flex h-full w-full max-w-full flex-col gap-0 p-0 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle>Employee chat</SheetTitle>
          <SheetDescription>
            Message staff anytime. Blocks &amp; history live under HR → Chat
            control. Apex support stays on the other chat icon.
          </SheetDescription>
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
                    {e.department ? ` · ${e.department}` : ""}
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

          <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[13rem_1fr] md:grid-cols-[15rem_1fr]">
            <ul className="max-h-40 space-y-0.5 overflow-y-auto border-b p-2 sm:max-h-none sm:border-b-0 sm:border-r">
              {threads.length === 0 ? (
                <li className="px-2 py-8 text-center text-xs text-muted-foreground">
                  No threads yet. Pick an employee above.
                </li>
              ) : (
                threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-lg px-2 py-2 text-left text-xs transition hover:bg-muted/70",
                        activeId === t.id && "bg-muted ring-1 ring-border",
                      )}
                      onClick={() => setActiveId(t.id)}
                    >
                      <p className="truncate font-medium">
                        {t.title || `Chat #${t.id}`}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {t.lastMessage?.body || t.kind}
                      </p>
                      {t.lastMessage?.createdAt ? (
                        <p className="mt-0.5 text-[9px] text-muted-foreground/80">
                          {formatMsgTime(t.lastMessage.createdAt)}
                        </p>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="flex min-h-0 flex-col">
              <div className="min-h-48 flex-1 space-y-2 overflow-y-auto p-3">
                {!active ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                    <MessageSquare className="size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Select or start a conversation
                    </p>
                  </div>
                ) : msgsLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-14 text-center text-sm text-muted-foreground">
                    No messages yet — say hello.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "w-fit max-w-[min(75%,20rem)] rounded-2xl px-3 py-2 text-sm shadow-sm",
                        m.senderIsManager
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      <div className="mb-0.5 flex items-baseline gap-2 text-[10px] opacity-70">
                        <span className="font-medium">{m.senderName}</span>
                        <span className="shrink-0 whitespace-nowrap">
                          {formatMsgTime(m.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {m.body}
                      </p>
                    </div>
                  ))
                )}
                <div ref={endRef} />
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
                      await loadMessages(active.id, { quiet: true });
                      draftRef.current?.focus();
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
                    ref={draftRef}
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Message… (Enter to send)"
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
  );
}
