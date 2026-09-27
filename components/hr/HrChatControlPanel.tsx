"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Ban,
  History,
  Loader2,
  MessageSquareText,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchHrEmployees, type HrEmployee } from "@/lib/api/hr";
import {
  createHrChatBlockApi,
  deleteHrChatBlockApi,
  fetchHrChatBlocks,
  fetchHrChatHistory,
  fetchHrChatMessages,
  type HrChatBlock,
  type HrChatMessage,
  type HrChatThread,
} from "@/lib/api/hrChat";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { HrPanelShell, HrSectionCard } from "@/components/hr/hrChrome";
import { cn } from "@/lib/utils";

type ControlTab = "blocks" | "history";

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function threadMembersLabel(t: HrChatThread): string {
  return t.members
    .map((m) => (m.isManager ? "Manager" : m.employeeName || `#${m.employeeId}`))
    .join(", ");
}

/** Prefer employee names over a stored "Manager" title (emp-started threads). */
function threadDisplayTitle(t: HrChatThread): string {
  const empNames = t.members
    .filter((m) => !m.isManager)
    .map((m) => m.employeeName)
    .filter((n): n is string => Boolean(n && n.trim() && n !== "Manager"));
  const stored = String(t.title || "").trim();
  const storedIsManager = stored.toLowerCase() === "manager";

  if (t.kind === "group") {
    if (stored && !storedIsManager) return stored;
    if (empNames.length) return empNames.join(", ");
    return `Group #${t.id}`;
  }
  if (empNames.length === 1) return empNames[0];
  if (empNames.length > 1) return empNames.join(", ");
  if (stored && !storedIsManager) return stored;
  return `Thread #${t.id}`;
}

/** Manager / Café Admin — Blocks + History with read-only message viewer. */
export function HrChatControlPanel() {
  const [tab, setTab] = useState<ControlTab>("blocks");
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [blocks, setBlocks] = useState<HrChatBlock[]>([]);
  const [pathType, setPathType] = useState<"emp_emp" | "emp_manager">(
    "emp_manager",
  );
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [note, setNote] = useState("");
  const [fromYmd, setFromYmd] = useState("");
  const [toYmd, setToYmd] = useState("");
  const [filterEmp, setFilterEmp] = useState("all");
  const [kind, setKind] = useState("all");
  const [withManager, setWithManager] = useState("all");
  const [history, setHistory] = useState<HrChatThread[]>([]);
  const [historySearched, setHistorySearched] = useState(false);
  const [viewerThread, setViewerThread] = useState<HrChatThread | null>(null);
  const [viewerMessages, setViewerMessages] = useState<HrChatMessage[]>([]);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const viewerEndRef = useRef<HTMLDivElement>(null);

  const loadEmployees = useCallback(async () => {
    try {
      const emps = await fetchHrEmployees();
      setEmployees(emps.filter((e) => e.status !== "terminated"));
    } catch {
      /* keep */
    }
  }, []);

  const refreshBlocks = useCallback(async () => {
    try {
      setBlocks(await fetchHrChatBlocks());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load blocks");
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
    void refreshBlocks();
  }, [loadEmployees, refreshBlocks]);

  useEffect(() => {
    viewerEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [viewerMessages]);

  const openViewer = async (thread: HrChatThread) => {
    setViewerThread(thread);
    setViewerLoading(true);
    setViewerMessages([]);
    try {
      setViewerMessages(await fetchHrChatMessages(thread.id, 500));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load messages");
      setViewerThread(null);
    } finally {
      setViewerLoading(false);
    }
  };

  if (viewerThread) {
    return (
      <div className="p-4 md:p-6">
        <HrPanelShell>
          <HrSectionCard
            title={threadDisplayTitle(viewerThread)}
            description={`Read-only · ${viewerThread.kind} · ${threadMembersLabel(viewerThread)}`}
            icon={<MessageSquareText className="size-5 text-cyan-600 dark:text-cyan-400" />}
            accent="bg-linear-to-r from-cyan-500 via-sky-500 to-teal-500"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setViewerThread(null);
                  setViewerMessages([]);
                }}
              >
                <ArrowLeft className="size-3.5" />
                Back to history
              </Button>
            }
          >
            <div className="flex max-h-[min(70vh,36rem)] flex-col rounded-xl border border-border/60 bg-muted/20">
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
                {viewerLoading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading messages…
                  </div>
                ) : viewerMessages.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    No messages in this thread.
                  </p>
                ) : (
                  viewerMessages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex w-full",
                        m.senderIsManager ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "inline-block max-w-60 space-y-2 rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-68",
                          m.senderIsManager
                            ? "bg-primary text-primary-foreground"
                            : "bg-card ring-1 ring-border/60",
                        )}
                      >
                        <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[10px] opacity-70">
                          <span className="font-medium">{m.senderName}</span>
                          <span className="whitespace-nowrap">
                            {formatMsgTime(m.createdAt)}
                          </span>
                        </div>
                        {m.imageUrl ? (
                          <a
                            href={m.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-lg"
                          >
                            <Image
                              src={m.imageUrl}
                              alt="Chat attachment"
                              width={280}
                              height={200}
                              className="max-h-40 w-auto object-contain"
                              unoptimized
                            />
                          </a>
                        ) : null}
                        {m.body ? (
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {m.body}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
                <div ref={viewerEndRef} />
              </div>
              <div className="border-t border-border/50 bg-muted/40 px-4 py-2.5 text-center text-xs text-muted-foreground">
                Audit view only — reply from the Employee chat icon in the header.
              </div>
            </div>
          </HrSectionCard>
        </HrPanelShell>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <HrPanelShell>
        <div className="flex flex-wrap gap-2">
          {(
            [
              {
                id: "blocks" as const,
                label: "Blocks",
                icon: ShieldOff,
                hint: "Stop emp↔emp or emp↔Manager paths",
              },
              {
                id: "history" as const,
                label: "History",
                icon: History,
                hint: "Search and review past threads",
              },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex min-w-40 flex-1 items-start gap-3 rounded-2xl border px-4 py-3 text-left transition sm:flex-none",
                  active
                    ? "border-cyan-500/40 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-400/25"
                    : "border-border/60 bg-card/80 hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                    active
                      ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold tracking-tight">
                    {t.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {tab === "blocks" ? (
          <HrSectionCard
            title="Chat blocks"
            description="Blocked paths stop employees from starting or continuing those chats. Manager can still message out from the header chat."
            icon={<Ban className="size-5 text-rose-600 dark:text-rose-400" />}
            accent="bg-linear-to-r from-rose-500 via-orange-500 to-amber-500"
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4">
                <p className="text-sm font-medium">Add a block</p>
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
                        <SelectItem value="emp_emp">
                          Employee ↔ Employee
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Employee A</Label>
                    <Select value={sideA} onValueChange={setSideA}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
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
                      {pathType === "emp_manager" ? "Side B" : "Employee B"}
                    </Label>
                    {pathType === "emp_manager" ? (
                      <Input value="Manager" disabled className="bg-muted" />
                    ) : (
                      <Select value={sideB} onValueChange={setSideB}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
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
                      placeholder="Reason for this block"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={
                    busy || !sideA || (pathType === "emp_emp" && !sideB)
                  }
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
                      toast.error(
                        e instanceof Error ? e.message : "Could not add block",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Add block"
                  )}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Active blocks</p>
                  <Badge variant="secondary">{blocks.length}</Badge>
                </div>
                <ul className="max-h-112 space-y-2 overflow-y-auto pr-1">
                  {blocks.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                      No blocks yet. Employees can chat freely within policy.
                    </li>
                  ) : (
                    blocks.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-3 shadow-sm"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                b.pathType === "emp_manager"
                                  ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                                  : "border-sky-500/40 text-sky-700 dark:text-sky-300",
                              )}
                            >
                              {b.pathType === "emp_manager"
                                ? "↔ Manager"
                                : "↔ Employee"}
                            </Badge>
                            <p className="truncate text-sm font-medium">
                              {b.pathType === "emp_manager"
                                ? `${b.employeeAName || b.employeeIdA} ↔ Manager`
                                : `${b.employeeAName || b.employeeIdA} ↔ ${b.employeeBName || b.employeeIdB}`}
                            </p>
                          </div>
                          {b.note ? (
                            <p className="text-xs text-muted-foreground">
                              {b.note}
                            </p>
                          ) : null}
                          <p className="text-[10px] text-muted-foreground">
                            {b.createdBy
                              ? `By ${b.createdBy} · `
                              : ""}
                            {formatMsgTime(b.createdAt)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 shrink-0 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                          aria-label="Remove block"
                          onClick={async () => {
                            try {
                              await deleteHrChatBlockApi(b.id);
                              toast.success("Block removed");
                              await refreshBlocks();
                            } catch (e) {
                              toast.error(
                                e instanceof Error
                                  ? e.message
                                  : "Could not remove",
                              );
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </HrSectionCard>
        ) : (
          <HrSectionCard
            title="Chat history"
            description="Search threads across the property. Open any result to read messages without joining the live chat."
            icon={
              <History className="size-5 text-violet-600 dark:text-violet-400" />
            }
            accent="bg-linear-to-r from-violet-500 via-fuchsia-500 to-rose-400"
          >
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  <Select value={filterEmp} onValueChange={setFilterEmp}>
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
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label>With Manager</Label>
                  <Select value={withManager} onValueChange={setWithManager}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="includes">Includes Manager</SelectItem>
                      <SelectItem value="emp_only">Employees only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end sm:col-span-2 lg:col-span-3">
                  <Button
                    type="button"
                    disabled={busy}
                    className="w-full sm:w-auto"
                    onClick={async () => {
                      setBusy(true);
                      try {
                        setHistory(
                          await fetchHrChatHistory({
                            fromYmd: fromYmd || undefined,
                            toYmd: toYmd || undefined,
                            employeeId:
                              filterEmp !== "all"
                                ? Number(filterEmp)
                                : null,
                            kind: kind === "all" ? undefined : kind,
                            withManager:
                              withManager === "all"
                                ? undefined
                                : withManager,
                          }),
                        );
                        setHistorySearched(true);
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Search failed",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Search history
                  </Button>
                </div>
              </div>

              <ul className="space-y-2">
                {!historySearched ? (
                  <li className="rounded-xl border border-dashed border-border/70 px-4 py-12 text-center text-sm text-muted-foreground">
                    Set filters and search to list threads.
                  </li>
                ) : history.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-border/70 px-4 py-12 text-center text-sm text-muted-foreground">
                    No threads match these filters.
                  </li>
                ) : (
                  history.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col gap-1 rounded-xl border border-border/60 bg-card px-4 py-3 text-left shadow-sm transition hover:border-cyan-500/35 hover:bg-cyan-500/5"
                        onClick={() => void openViewer(t)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {threadDisplayTitle(t)}
                          </p>
                          <Badge variant="secondary" className="text-[10px]">
                            {t.kind}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {t.messageCount ?? 0} msgs
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {threadMembersLabel(t)}
                        </p>
                        {t.lastMessage ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {t.lastMessage.senderName}: {t.lastMessage.body}
                          </p>
                        ) : null}
                        <p className="text-[10px] text-muted-foreground">
                          Updated {formatMsgTime(t.updatedAt)} · Open to read
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </HrSectionCard>
        )}
      </HrPanelShell>
    </div>
  );
}
