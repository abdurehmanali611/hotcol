"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Toaster } from "sonner";
import {
  ClipboardList,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CM_LEADER_NAV_ITEMS, type CmLeaderNavId } from "@/constants";
import {
  LODGING_ROOM_STATUS_LABELS,
  type LodgingRoomStatus,
} from "@/constants/lodgingRooms";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { logoutAction, notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  completeLodgingCmAssignmentApi,
  createLodgingCmAssignmentApi,
  fetchLodgingActionLogs,
  fetchLodgingCmAssignments,
  fetchLodgingCmQueue,
  fetchLodgingDashboardStats,
  updateLodgingRoomStatusApi,
  type LodgingActionLog,
  type LodgingCmAssignment,
  type LodgingDashboardStats,
  type LodgingRoom,
} from "@/lib/api/lodgingRooms";

const navIconMap: Record<(typeof CM_LEADER_NAV_ITEMS)[number]["icon"], LucideIcon> = {
  LayoutDashboard,
  Sparkles,
  ClipboardList,
  History,
};

function roomStatusBadgeClass(status: string): string {
  switch (status) {
    case "vacant_clean":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "vacant_dirty":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400";
    case "occupied":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400";
    case "on_maintenance":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function CMLeaderDashboard() {
  useTenantRouteGuard({ role: "CMLeader" });
  const searchParams = useSearchParams();
  const { displayName } = useTenantScopeAndDisplay(searchParams.get("hotel"));
  const logoUrl = searchParams.get("logo") || "";

  const [activeSection, setActiveSection] =
    useState<CmLeaderNavId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const [stats, setStats] = useState<LodgingDashboardStats | null>(null);
  const [queue, setQueue] = useState<LodgingRoom[]>([]);
  const [assignments, setAssignments] = useState<LodgingCmAssignment[]>([]);
  const [logs, setLogs] = useState<LodgingActionLog[]>([]);

  const [assignRoomId, setAssignRoomId] = useState<number | null>(null);
  const [workKind, setWorkKind] = useState("cleaning");
  const [assigneeName, setAssigneeName] = useState("");
  const [notes, setNotes] = useState("");
  const [maintUntil, setMaintUntil] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [st, q, a, lg] = await Promise.all([
        fetchLodgingDashboardStats().catch(() => null),
        fetchLodgingCmQueue().catch(() => []),
        fetchLodgingCmAssignments().catch(() => []),
        fetchLodgingActionLogs().catch(() => []),
      ]);
      setStats(st);
      setQueue(q);
      setAssignments(a);
      setLogs(lg);
    } catch (e) {
      notifyApiFailure(e, "Could not load CM data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sectionMeta = CM_LEADER_NAV_ITEMS.find((s) => s.id === activeSection);
  const SectionIcon = navIconMap[sectionMeta?.icon ?? "LayoutDashboard"];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-linear-to-b from-background via-muted/20 to-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading CM terminal…</span>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40 text-foreground">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
          <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border bg-sidebar-accent/25 px-4">
            <div className="flex h-full min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/20">
                <Sparkles className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Terminal
                </p>
                <span className="block truncate font-semibold leading-tight">
                  CM Leader
                </span>
              </div>
            </div>
          </SidebarHeader>
          <div className="shrink-0 px-3 pb-2 pt-3">
            <SidebarSeparator className="bg-sidebar-border/80" />
          </div>
          <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
            <SidebarMenu className="gap-1">
              {CM_LEADER_NAV_ITEMS.map((item) => {
                const Icon = navIconMap[item.icon];
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeSection === item.id}
                      onClick={() => setActiveSection(item.id)}
                      tooltip={item.label}
                      size="lg"
                      className="h-10 cursor-pointer text-[13px] data-[active=true]:shadow-sm"
                    >
                      <Icon className="opacity-80" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 pt-2">
            <Button
              variant="outline"
              className="w-full cursor-pointer justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => logoutAction()}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex min-h-svh flex-1 flex-col overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/20 md:m-2 md:ml-0 md:max-h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-border/80 md:bg-background md:shadow-lg md:ring-1 md:ring-black/5 dark:md:ring-white/10">
          <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center gap-2 border-b bg-background px-3 md:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground md:text-sm">
                {displayName || "Property"}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void load(true)}
              disabled={refreshing}
              aria-label="Refresh"
              className={refreshing ? "animate-spin" : ""}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8 border shadow-sm">
              <AvatarImage src={logoUrl} alt={displayName || "Property"} />
              <AvatarFallback>
                {(displayName || "P").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
            <div className="mx-auto max-w-5xl space-y-6 pb-10">
              <div className="rounded-2xl border border-border/70 bg-linear-to-br from-card via-card to-primary/6 p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10 md:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <SectionIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {sectionMeta?.label}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {sectionMeta?.description}
                    </p>
                  </div>
                </div>
              </div>

              {activeSection === "dashboard" && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      {
                        label: "Vacant dirty",
                        value: stats?.vacantDirty ?? 0,
                        className: "border-amber-500/20 to-amber-500/5",
                      },
                      {
                        label: "On maintenance",
                        value: stats?.onMaintenance ?? 0,
                        className: "border-rose-500/20 to-rose-500/5",
                      },
                      {
                        label: "Vacant clean",
                        value: stats?.vacantClean ?? 0,
                        className: "border-emerald-500/20 to-emerald-500/5",
                      },
                      {
                        label: "Occupied",
                        value: stats?.occupied ?? 0,
                        className: "border-sky-500/20 to-sky-500/5",
                      },
                      {
                        label: "Open assignments",
                        value: stats?.openCmAssignments ?? 0,
                        className: "border-primary/20 to-primary/5",
                      },
                      {
                        label: "Active stays",
                        value: stats?.activeStays ?? 0,
                        className: "border-border/80 to-muted/30",
                      },
                    ].map((c) => (
                      <Card
                        key={c.label}
                        className={cn(
                          "border bg-linear-to-br from-card shadow-md overflow-hidden",
                          c.className,
                        )}
                      >
                        <CardHeader className="pb-2 pt-4">
                          <CardDescription>{c.label}</CardDescription>
                          <CardTitle className="text-3xl tabular-nums tracking-tight">
                            {c.value}
                          </CardTitle>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                  <Card className="border-border/80 shadow-md bg-card/95">
                    <CardHeader>
                      <CardTitle className="text-lg">Recent activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity yet.</p>
                      ) : (
                        <ul className="divide-y rounded-xl border border-border/70">
                          {logs.slice(0, 10).map((log) => (
                            <li key={log.id} className="px-4 py-3 text-sm">
                              <div className="flex flex-wrap justify-between gap-2">
                                <span className="font-medium">{log.action}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(log.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {log.actorRole} · {log.actorName}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "queue" && (
                <div className="space-y-6">
                  <Card className="border-border/80 shadow-md bg-card/95">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Dirty & maintenance queue
                      </CardTitle>
                      <CardDescription>
                        Mark rooms vacant clean, set maintenance until, or assign staff.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {queue.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No rooms in the queue.
                        </p>
                      ) : (
                        <ul className="divide-y rounded-xl border border-border/70">
                          {queue.map((room) => {
                            const status = room.status as LodgingRoomStatus;
                            return (
                              <li
                                key={room.id}
                                className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium tabular-nums">
                                    Room {room.roomNumber}
                                    <span className="text-muted-foreground font-normal">
                                      {" "}
                                      · {room.roomType} · Floor {room.floor || "—"}
                                    </span>
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
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
                                    {room.maintenanceUntil ? (
                                      <span className="text-xs text-muted-foreground">
                                        Until{" "}
                                        {new Date(
                                          room.maintenanceUntil,
                                        ).toLocaleString()}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <PendingButton
                                    type="button"
                                    size="sm"
                                    pending={pending === `clean-${room.id}`}
                                    onClick={async () => {
                                      setPending(`clean-${room.id}`);
                                      try {
                                        await updateLodgingRoomStatusApi(
                                          room.id,
                                          "vacant_clean",
                                        );
                                        await load(true);
                                      } catch (e) {
                                        notifyApiFailure(
                                          e,
                                          "Could not mark clean",
                                        );
                                      } finally {
                                        setPending(null);
                                      }
                                    }}
                                  >
                                    Vacant clean
                                  </PendingButton>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setAssignRoomId(room.id);
                                      setWorkKind(
                                        status === "on_maintenance"
                                          ? "maintenance"
                                          : "cleaning",
                                      );
                                    }}
                                  >
                                    Assign
                                  </Button>
                                  <PendingButton
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    pending={pending === `maint-${room.id}`}
                                    onClick={async () => {
                                      const until = maintUntil
                                        ? new Date(maintUntil).toISOString()
                                        : (() => {
                                            const d = new Date();
                                            d.setHours(d.getHours() + 4);
                                            return d.toISOString();
                                          })();
                                      setPending(`maint-${room.id}`);
                                      try {
                                        await updateLodgingRoomStatusApi(
                                          room.id,
                                          "on_maintenance",
                                          until,
                                        );
                                        await load(true);
                                      } catch (e) {
                                        notifyApiFailure(
                                          e,
                                          "Could not set maintenance",
                                        );
                                      } finally {
                                        setPending(null);
                                      }
                                    }}
                                  >
                                    Set maintenance
                                  </PendingButton>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      <div className="mt-4 max-w-sm space-y-1.5">
                        <Label htmlFor="maint-until">
                          Default maintenance until (optional)
                        </Label>
                        <Input
                          id="maint-until"
                          type="datetime-local"
                          className="h-10"
                          value={maintUntil}
                          onChange={(e) => setMaintUntil(e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {assignRoomId != null ? (
                    <Card className="border-border/80 shadow-md bg-card/95 max-w-lg">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Assign room #{queue.find((r) => r.id === assignRoomId)?.roomNumber ?? assignRoomId}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1.5">
                          <Label>Work kind</Label>
                          <Select value={workKind} onValueChange={setWorkKind}>
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cleaning">Cleaning</SelectItem>
                              <SelectItem value="maintenance">
                                Maintenance
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Assignee name</Label>
                          <Input
                            className="h-10"
                            value={assigneeName}
                            onChange={(e) => setAssigneeName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Notes</Label>
                          <Input
                            className="h-10"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <PendingButton
                            type="button"
                            pending={pending === "assign"}
                            disabled={!assigneeName.trim()}
                            onClick={async () => {
                              setPending("assign");
                              try {
                                if (workKind === "maintenance" && maintUntil) {
                                  await updateLodgingRoomStatusApi(
                                    assignRoomId,
                                    "on_maintenance",
                                    new Date(maintUntil).toISOString(),
                                  );
                                }
                                await createLodgingCmAssignmentApi({
                                  roomId: assignRoomId,
                                  workKind,
                                  assigneeName: assigneeName.trim(),
                                  notes: notes.trim(),
                                });
                                setAssignRoomId(null);
                                setAssigneeName("");
                                setNotes("");
                                await load(true);
                              } catch (e) {
                                notifyApiFailure(e, "Could not create assignment");
                              } finally {
                                setPending(null);
                              }
                            }}
                          >
                            Create assignment
                          </PendingButton>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAssignRoomId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              )}

              {activeSection === "assignments" && (
                <Card className="border-border/80 shadow-md bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-lg">Assignments</CardTitle>
                    <CardDescription>
                      Complete open jobs when work is finished.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No assignments yet.
                      </p>
                    ) : (
                      <ul className="divide-y rounded-xl border border-border/70">
                        {assignments.map((a) => (
                          <li
                            key={a.id}
                            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                Room {a.room?.roomNumber ?? a.roomId} · {a.workKind}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {a.assigneeName}
                                {a.notes ? ` · ${a.notes}` : ""}
                              </p>
                              <Badge
                                variant="outline"
                                className="mt-1 font-normal capitalize"
                              >
                                {a.status}
                              </Badge>
                            </div>
                            {a.status === "open" ? (
                              <PendingButton
                                type="button"
                                size="sm"
                                pending={pending === `done-${a.id}`}
                                onClick={async () => {
                                  setPending(`done-${a.id}`);
                                  try {
                                    await completeLodgingCmAssignmentApi(a.id);
                                    await load(true);
                                  } catch (e) {
                                    notifyApiFailure(e, "Could not complete");
                                  } finally {
                                    setPending(null);
                                  }
                                }}
                              >
                                Complete
                              </PendingButton>
                            ) : a.completedAt ? (
                              <span className="text-xs text-muted-foreground">
                                Done {new Date(a.completedAt).toLocaleString()}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeSection === "history" && (
                <Card className="border-border/80 shadow-md bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-lg">Action history</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {logs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No logs yet.</p>
                    ) : (
                      <ul className="divide-y rounded-xl border border-border/70">
                        {logs.map((log) => (
                          <li key={log.id} className="px-4 py-3 text-sm">
                            <div className="flex flex-wrap justify-between gap-2">
                              <span className="font-medium">{log.action}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {log.actorRole} · {log.actorName} · {log.entityType}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}
