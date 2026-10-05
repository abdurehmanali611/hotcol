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
import { ChangeOwnPasswordButton } from "@/components/ChangeOwnPasswordButton";
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
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { CM_LEADER_NAV_ITEMS, type CmLeaderNavId } from "@/constants";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { logoutAction, notifyApiFailure } from "@/lib/actions";
import { LodgingCmQueuePanel } from "@/components/hotel/LodgingCmQueuePanel";
import { LodgingActionHistoryPanel } from "@/components/hotel/LodgingActionHistoryPanel";
import { LodgingStatCardsGrid } from "@/components/hotel/LodgingStatCards";
import {
  LodgingPageHero,
  LodgingPanelShell,
  LodgingSectionCard,
  LodgingActivityList,
  LodgingEmptyState,
  LodgingStatusBadge,
  lodgingNavActiveClass,
  lodgingPrimaryBtnClass,
} from "@/components/hotel/lodgingChrome";
import { InventoryNotificationCenter } from "@/components/inventory/InventoryNotificationCenter";
import {
  completeLodgingCmAssignmentApi,
  fetchLodgingActionLogs,
  fetchLodgingCmAssignments,
  fetchLodgingCmQueue,
  fetchLodgingDashboardStats,
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
                <Sparkles className="h-4.5 w-4.5" />
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
                      className={lodgingNavActiveClass}
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
          <header className="app-chrome-header sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-primary/20 px-3 md:h-16 md:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xs font-medium uppercase tracking-wider text-primary/80 md:text-sm">
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
            <InventoryNotificationCenter
              audience="hotel-cm"
              lodging={{
                dirtyCount: stats?.vacantDirty,
                maintenanceCount: stats?.onMaintenance,
                inspectedCount: stats?.inspected,
                openCmCount: stats?.openCmAssignments,
              }}
            />
            <ChangeOwnPasswordButton />
            <Avatar className="h-8 w-8 border shadow-sm">
              <AvatarImage src={logoUrl} alt={displayName || "Property"} />
              <AvatarFallback>
                {(displayName || "P").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
            <LodgingPanelShell className="mx-auto max-w-5xl pb-10">
              <LodgingPageHero
                eyebrow="CM Leader"
                title={sectionMeta?.label ?? "CM"}
                description={sectionMeta?.description}
                icon={<SectionIcon className="h-5 w-5" />}
                actions={
                  activeSection === "dashboard" ? (
                    <>
                      <Button
                        type="button"
                        className={lodgingPrimaryBtnClass}
                        onClick={() => setActiveSection("queue")}
                      >
                        <ClipboardList className="h-4 w-4" />
                        Open queue
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 gap-1.5 border-amber-500/30 text-amber-900 hover:bg-amber-500/10 dark:text-amber-300"
                        onClick={() => setActiveSection("assignments")}
                      >
                        <Sparkles className="h-4 w-4" />
                        Assignments
                      </Button>
                    </>
                  ) : null
                }
              />

              {activeSection === "dashboard" && (
                <div className="space-y-6">
                                    <LodgingStatCardsGrid
                    stats={stats}
                    includeActiveStays
                    openCmLabel="Open assignments"
                  />
                  <LodgingSectionCard
                    title="Recent activity"
                    description="Latest cleaning, maintenance, and status changes on this property."
                    icon={<History className="h-4 w-4" />}
                    accent="bg-linear-to-r from-sky-500/40 via-primary/25 to-transparent"
                  >
                    <LodgingActivityList rows={logs} limit={10} />
                  </LodgingSectionCard>
                </div>
              )}

              {activeSection === "queue" && (
                <LodgingCmQueuePanel
                  queue={queue}
                  openAssignments={assignments.filter((a) => a.status === "open")}
                  onRefresh={async () => {
                    await load(true);
                  }}
                  showRoomMeta
                />
              )}

              {activeSection === "assignments" && (
                <LodgingSectionCard
                  title="Assignments"
                  description="Complete open jobs when work is finished."
                  icon={<ClipboardList className="h-4 w-4" />}
                  accent="bg-linear-to-r from-amber-500/40 via-primary/25 to-transparent"
                >                    {assignments.length === 0 ? (
                      <LodgingEmptyState
                        title="No assignments yet"
                        description="Jobs assigned to cleaners and maintainers will appear here with a Complete action."
                        icon={<ClipboardList className="h-6 w-6" />}
                      />
                    ) : (
                      <ul className="divide-y overflow-hidden rounded-xl border border-amber-500/15 bg-linear-to-br from-amber-500/3 to-transparent">
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
                              <div className="mt-1">
                                <LodgingStatusBadge status={a.status} />
                              </div>
                            </div>
                            {a.status === "open" ? (
                              <PendingButton
                                type="button"
                                size="sm"
                                className={lodgingPrimaryBtnClass}
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
                </LodgingSectionCard>
              )}

              {activeSection === "history" && (
                <LodgingActionHistoryPanel
                  logs={logs}
                  description="Full lodging audit trail for this property."
                />
              )}
            </LodgingPanelShell>
          </main>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}
