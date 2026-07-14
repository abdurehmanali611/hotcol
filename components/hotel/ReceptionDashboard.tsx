"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Toaster } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RECEPTION_NAV_ITEMS, type ReceptionNavId } from "@/constants";
import { ReceptionCheckInForm } from "@/components/hotel/ReceptionCheckInForm";
import {
  BedDouble,
  FileText,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  Sparkles,
  UserPlus,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  LODGING_CM_ACTIONABLE_STATUSES,
  LODGING_ROOM_STATUS_LABELS,
  LODGING_SERVICE_KINDS,
  type LodgingRoomStatus,
  type LodgingServiceKind,
} from "@/constants/lodgingRooms";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { logoutAction, notifyApiFailure } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
  checkoutLodgingStayApi,
  completeLodgingCmAssignmentApi,
  createLodgingCmAssignmentApi,
  fetchLodgingActionLogs,
  fetchLodgingActiveStays,
  fetchLodgingCmAssignments,
  fetchLodgingCmQueue,
  fetchLodgingDashboardStats,
  fetchLodgingRooms,
  fetchLodgingServiceItems,
  fetchLodgingStaysByDate,
  registerLodgingServiceChargeApi,
  splitLodgingBillLineApi,
  transferLodgingBillLinesApi,
  updateLodgingRoomStatusApi,
  updateLodgingStayApi,
  type LodgingActionLog,
  type LodgingCmAssignment,
  type LodgingDashboardStats,
  type LodgingGuest,
  type LodgingRoom,
  type LodgingServiceItem,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";

const navIconMap: Record<(typeof RECEPTION_NAV_ITEMS)[number]["icon"], LucideIcon> = {
  LayoutDashboard,
  UserPlus,
  BedDouble,
  UtensilsCrossed,
  Sparkles,
  FileText,
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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalDatetimeValue(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}


function formatMoney(n: number) {
  return `ETB ${Number(n || 0).toLocaleString()}`;
}

function guestName(g: LodgingGuest | null | undefined) {
  if (!g) return "—";
  return `${g.firstName} ${g.lastName}`.trim() || "—";
}

function stayOptionLabel(s: LodgingStay) {
  const rooms = s.rooms
    .map((r) => r.room?.roomNumber)
    .filter(Boolean)
    .join(", ");
  return `${guestName(s.guest)} · ${s.voucherCode}${rooms ? ` · Rm ${rooms}` : ""}`;
}

function dayRangeToIso(fromDay: string, toDay: string) {
  const from = new Date(`${fromDay}T00:00:00`);
  const to = new Date(`${toDay}T23:59:59.999`);
  return {
    from: Number.isNaN(from.getTime()) ? fromDay : from.toISOString(),
    to: Number.isNaN(to.getTime()) ? toDay : to.toISOString(),
  };
}


export function ReceptionDashboard() {
  useTenantRouteGuard({ role: "Reception" });
  const searchParams = useSearchParams();
  const { displayName } = useTenantScopeAndDisplay(searchParams.get("hotel"));
  const logoUrl = searchParams.get("logo") || "";

  const [activeSection, setActiveSection] =
    useState<ReceptionNavId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const [stats, setStats] = useState<LodgingDashboardStats | null>(null);
  const [logs, setLogs] = useState<LodgingActionLog[]>([]);
  const [rooms, setRooms] = useState<LodgingRoom[]>([]);
  const [stays, setStays] = useState<LodgingStay[]>([]);
  const [serviceItems, setServiceItems] = useState<LodgingServiceItem[]>([]);
  const [cmQueue, setCmQueue] = useState<LodgingRoom[]>([]);
  const [cmAssignments, setCmAssignments] = useState<LodgingCmAssignment[]>([]);
  const [reportStays, setReportStays] = useState<LodgingStay[]>([]);

  // Active stay detail
  const [selectedStayId, setSelectedStayId] = useState<number | null>(null);
  const [editNights, setEditNights] = useState(1);
  const [editNotes, setEditNotes] = useState("");
  const [checkoutAt, setCheckoutAt] = useState(toLocalDatetimeValue);
  const [transferToStayId, setTransferToStayId] = useState<string>("");
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>([]);
  const [splitLineId, setSplitLineId] = useState<number | null>(null);
  const [splitQtyToMove, setSplitQtyToMove] = useState("1");
  const [splitToStayId, setSplitToStayId] = useState<string>("");

  // Services
  const [serviceKind, setServiceKind] =
    useState<LodgingServiceKind>("food_drink");
  const [serviceStayId, setServiceStayId] = useState<string>("");
  const [serviceItemId, setServiceItemId] = useState<string>("");
  const [serviceQty, setServiceQty] = useState("1");
  const [serviceRoomNumber, setServiceRoomNumber] = useState("");

  // CM portal
  const [cmAssignee, setCmAssignee] = useState("");
  const [cmNotes, setCmNotes] = useState("");
  const [cmWorkKind, setCmWorkKind] = useState("cleaning");
  const [cmRoomId, setCmRoomId] = useState<number | null>(null);
  const [maintUntil, setMaintUntil] = useState("");

  // Reports
  const [reportFrom, setReportFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  });
  const [reportTo, setReportTo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  });

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [st, lg, rm, ac, si, cq, ca] = await Promise.all([
          fetchLodgingDashboardStats().catch(() => null),
          fetchLodgingActionLogs().catch(() => []),
          fetchLodgingRooms().catch(() => []),
          fetchLodgingActiveStays().catch(() => []),
          fetchLodgingServiceItems().catch(() => []),
          fetchLodgingCmQueue().catch(() => []),
          fetchLodgingCmAssignments().catch(() => []),
        ]);
        setStats(st);
        setLogs(lg);
        setRooms(rm);
        setStays(ac);
        setServiceItems(si);
        setCmQueue(cq);
        setCmAssignments(ca);
      } catch (e) {
        notifyApiFailure(e, "Could not load reception data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const vacantCleanRooms = useMemo(
    () => rooms.filter((r) => r.status === "vacant_clean"),
    [rooms],
  );

  const selectedStay = useMemo(
    () => stays.find((s) => s.id === selectedStayId) ?? null,
    [stays, selectedStayId],
  );

  const otherActiveStays = useMemo(
    () => stays.filter((s) => s.id !== selectedStayId),
    [stays, selectedStayId],
  );

  useEffect(() => {
    if (!selectedStay) return;
    setEditNights(selectedStay.nights);
    setEditNotes(selectedStay.notes || "");
    setSelectedLineIds([]);
    setTransferToStayId("");
    setSplitLineId(null);
    setSplitToStayId("");
  }, [selectedStay]);


  const filteredServiceItems = useMemo(
    () => serviceItems.filter((i) => i.kind === serviceKind && i.isActive !== false),
    [serviceItems, serviceKind],
  );


  const loadReport = async () => {
    setPending("report");
    try {
      const { from, to } = dayRangeToIso(reportFrom, reportTo);
      const rows = await fetchLodgingStaysByDate(from, to);
      setReportStays(rows);
    } catch (e) {
      notifyApiFailure(e, "Could not load report");
    } finally {
      setPending(null);
    }
  };

  const sectionMeta = RECEPTION_NAV_ITEMS.find((s) => s.id === activeSection);
  const SectionIcon = navIconMap[sectionMeta?.icon ?? "LayoutDashboard"];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-linear-to-b from-background via-muted/20 to-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading reception…</span>
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
                <BedDouble className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Terminal
                </p>
                <span className="block truncate font-semibold leading-tight">
                  Reception
                </span>
              </div>
            </div>
          </SidebarHeader>
          <div className="shrink-0 px-3 pb-2 pt-3">
            <SidebarSeparator className="bg-sidebar-border/80" />
          </div>
          <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
            <SidebarMenu className="gap-1">
              {RECEPTION_NAV_ITEMS.map((item) => {
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
            <div className="mx-auto max-w-6xl space-y-6 pb-10">
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
                        label: "Vacant clean",
                        value: stats?.vacantClean ?? 0,
                        className: "border-emerald-500/20 to-emerald-500/5",
                      },
                      {
                        label: "Vacant dirty",
                        value: stats?.vacantDirty ?? 0,
                        className: "border-amber-500/20 to-amber-500/5",
                      },
                      {
                        label: "Occupied",
                        value: stats?.occupied ?? 0,
                        className: "border-sky-500/20 to-sky-500/5",
                      },
                      {
                        label: "On maintenance",
                        value: stats?.onMaintenance ?? 0,
                        className: "border-rose-500/20 to-rose-500/5",
                      },
                      {
                        label: "Open CM jobs",
                        value: stats?.openCmAssignments ?? 0,
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
                      <CardDescription>
                        Your latest lodging actions on this property
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity yet.</p>
                      ) : (
                        <ul className="divide-y rounded-xl border border-border/70">
                          {logs.slice(0, 12).map((log) => (
                            <li key={log.id} className="px-4 py-3 text-sm">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="font-medium">{log.action}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(log.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {log.actorRole || "—"} · {log.actorName || "—"} ·{" "}
                                {log.entityType || "—"}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "check-in" && (
                <ReceptionCheckInForm
                  vacantCleanRooms={vacantCleanRooms}
                  onCompleted={async () => {
                    setActiveSection("active-stays");
                    await load(true);
                  }}
                />
              )}

              {activeSection === "active-stays" && (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                  <Card className="border-border/80 shadow-md bg-card/95 h-fit">
                    <CardHeader>
                      <CardTitle className="text-lg">Active stays</CardTitle>
                      <CardDescription>
                        Select a stay to view the bill and manage charges.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stays.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No active stays.
                        </p>
                      ) : (
                        <ul className="divide-y rounded-xl border border-border/70">
                          {stays.map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                className={cn(
                                  "w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors",
                                  selectedStayId === s.id && "bg-primary/5",
                                )}
                                onClick={() => setSelectedStayId(s.id)}
                              >
                                <p className="font-medium text-sm">
                                  {guestName(s.guest)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {s.voucherCode} ·{" "}
                                  {s.rooms
                                    .map((r) => r.room?.roomNumber)
                                    .filter(Boolean)
                                    .join(", ") || "—"}
                                </p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  {selectedStay ? (
                    <div className="space-y-4">
                      <Card className="border-border/80 shadow-md bg-card/95">
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {guestName(selectedStay.guest)}
                          </CardTitle>
                          <CardDescription>
                            Voucher {selectedStay.voucherCode} ·{" "}
                            {formatMoney(selectedStay.bill?.totalETB ?? 0)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label>Nights</Label>
                              <Input
                                type="number"
                                min={1}
                                className="h-10"
                                value={editNights}
                                onChange={(e) =>
                                  setEditNights(
                                    Math.max(1, Number(e.target.value) || 1),
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Notes</Label>
                              <Input
                                className="h-10"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                              />
                            </div>
                          </div>
                          <PendingButton
                            type="button"
                            variant="outline"
                            pending={pending === "update-stay"}
                            onClick={async () => {
                              setPending("update-stay");
                              try {
                                await updateLodgingStayApi({
                                  id: selectedStay.id,
                                  nights: editNights,
                                  notes: editNotes,
                                });
                                await load(true);
                              } catch (e) {
                                notifyApiFailure(e, "Could not update stay");
                              } finally {
                                setPending(null);
                              }
                            }}
                          >
                            Save stay changes
                          </PendingButton>

                          <div className="overflow-x-auto rounded-xl border border-border/70">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground text-left">
                                  <th className="px-3 py-2" />
                                  <th className="px-3 py-2 font-medium">Line</th>
                                  <th className="px-3 py-2 font-medium">Room</th>
                                  <th className="px-3 py-2 font-medium text-right">
                                    Amount
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {(selectedStay.bill?.lines ?? []).map((line) => (
                                  <tr key={line.id}>
                                    <td className="px-3 py-2">
                                      <Checkbox
                                        checked={selectedLineIds.includes(line.id)}
                                        onCheckedChange={() =>
                                          setSelectedLineIds((prev) =>
                                            prev.includes(line.id)
                                              ? prev.filter((x) => x !== line.id)
                                              : [...prev, line.id],
                                          )
                                        }
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <p className="font-medium">{line.description}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {line.kind} · qty {line.quantity}
                                      </p>
                                    </td>
                                    <td className="px-3 py-2 tabular-nums">
                                      {line.roomNumber || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {formatMoney(line.amountETB)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-wrap gap-2 items-end">
                            <div className="space-y-1.5">
                              <Label>Transfer lines to stay</Label>
                              <Select
                                value={transferToStayId}
                                onValueChange={setTransferToStayId}
                              >
                                <SelectTrigger className="h-10 w-64">
                                  <SelectValue placeholder="Select target stay" />
                                </SelectTrigger>
                                <SelectContent>
                                  {otherActiveStays.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                      {stayOptionLabel(s)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <PendingButton
                              type="button"
                              variant="outline"
                              pending={pending === "transfer"}
                              disabled={
                                selectedLineIds.length === 0 || !transferToStayId
                              }
                              onClick={async () => {
                                setPending("transfer");
                                try {
                                  await transferLodgingBillLinesApi({
                                    lineIds: selectedLineIds,
                                    toStayId: Number(transferToStayId),
                                  });
                                  setSelectedLineIds([]);
                                  setTransferToStayId("");
                                  await load(true);
                                } catch (e) {
                                  notifyApiFailure(e, "Transfer failed");
                                } finally {
                                  setPending(null);
                                }
                              }}
                            >
                              Transfer selected
                            </PendingButton>
                          </div>

                          <div className="flex flex-wrap gap-2 items-end rounded-xl border border-border/70 p-3">
                            <div className="space-y-1.5">
                              <Label>Split line</Label>
                              <Select
                                value={
                                  splitLineId != null ? String(splitLineId) : ""
                                }
                                onValueChange={(v) =>
                                  setSplitLineId(Number(v))
                                }
                              >
                                <SelectTrigger className="h-10 w-48">
                                  <SelectValue placeholder="Select line" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(selectedStay.bill?.lines ?? []).map((l) => (
                                    <SelectItem key={l.id} value={String(l.id)}>
                                      {l.description} ({l.quantity})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Qty to move</Label>
                              <Input
                                className="h-10 w-24"
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={splitQtyToMove}
                                onChange={(e) =>
                                  setSplitQtyToMove(e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>To stay</Label>
                              <Select
                                value={splitToStayId}
                                onValueChange={setSplitToStayId}
                              >
                                <SelectTrigger className="h-10 w-64">
                                  <SelectValue placeholder="Select target stay" />
                                </SelectTrigger>
                                <SelectContent>
                                  {otherActiveStays.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                      {stayOptionLabel(s)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <PendingButton
                              type="button"
                              variant="outline"
                              pending={pending === "split"}
                              disabled={
                                splitLineId == null ||
                                !splitToStayId ||
                                !(Number(splitQtyToMove) > 0)
                              }
                              onClick={async () => {
                                if (splitLineId == null) return;
                                setPending("split");
                                try {
                                  await splitLodgingBillLineApi({
                                    lineId: splitLineId,
                                    quantityToMove: Number(splitQtyToMove) || 0,
                                    toStayId: Number(splitToStayId),
                                  });
                                  setSplitLineId(null);
                                  setSplitToStayId("");
                                  await load(true);
                                } catch (e) {
                                  notifyApiFailure(e, "Split failed");
                                } finally {
                                  setPending(null);
                                }
                              }}
                            >
                              Split
                            </PendingButton>
                          </div>

                          <div className="flex flex-wrap gap-2 items-end border-t border-border/60 pt-4">
                            <div className="space-y-1.5">
                              <Label>Checkout time</Label>
                              <Input
                                type="datetime-local"
                                className="h-10"
                                value={checkoutAt}
                                onChange={(e) => setCheckoutAt(e.target.value)}
                              />
                            </div>
                            <PendingButton
                              type="button"
                              pending={pending === "checkout"}
                              onClick={async () => {
                                setPending("checkout");
                                try {
                                  const updated = await checkoutLodgingStayApi(
                                    selectedStay.id,
                                    new Date(checkoutAt).toISOString(),
                                  );
                                  const receipt =
                                    updated.bill?.receiptNumber ||
                                    updated.voucherCode;
                                  window.print();
                                  void receipt;
                                  setSelectedStayId(null);
                                  await load(true);
                                } catch (e) {
                                  notifyApiFailure(e, "Checkout failed");
                                } finally {
                                  setPending(null);
                                }
                              }}
                            >
                              Checkout & print receipt
                            </PendingButton>
                          </div>

                          {selectedStay.bill?.receiptNumber ||
                          selectedStay.bill ? (
                            <div className="print:block hidden print:p-6">
                              <h1 className="text-xl font-bold">
                                Stay receipt
                              </h1>
                              <p>
                                {guestName(selectedStay.guest)} ·{" "}
                                {selectedStay.voucherCode}
                              </p>
                              <p>
                                Receipt:{" "}
                                {selectedStay.bill?.receiptNumber || "—"}
                              </p>
                              <p>
                                Total:{" "}
                                {formatMoney(selectedStay.bill?.totalETB ?? 0)}
                              </p>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card className="border-border/80 border-dashed shadow-none bg-muted/10">
                      <CardContent className="py-12 text-center text-sm text-muted-foreground">
                        Select a stay to manage the bill.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {activeSection === "services" && (
                <Card className="border-border/80 shadow-md bg-card/95 max-w-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Register service charge</CardTitle>
                    <CardDescription>
                      Link food & drink or laundry to an active stay / room.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs
                      value={serviceKind}
                      onValueChange={(v) =>
                        setServiceKind(v as LodgingServiceKind)
                      }
                    >
                      <TabsList className="grid w-full grid-cols-2 max-w-md">
                        {LODGING_SERVICE_KINDS.map((k) => (
                          <TabsTrigger key={k} value={k}>
                            {k === "food_drink" ? "Food & drink" : "Laundry"}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      <TabsContent value={serviceKind} className="mt-4 space-y-3">
                        <div className="space-y-1.5">
                          <Label>Active stay</Label>
                          <Select
                            value={serviceStayId}
                            onValueChange={setServiceStayId}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select stay" />
                            </SelectTrigger>
                            <SelectContent>
                              {stays.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {guestName(s.guest)} · {s.voucherCode}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Catalog item</Label>
                          <Select
                            value={serviceItemId}
                            onValueChange={setServiceItemId}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredServiceItems.map((i) => (
                                <SelectItem key={i.id} value={String(i.id)}>
                                  {i.name} · {formatMoney(i.unitPriceETB)}/
                                  {i.unitLabel}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              min={0.01}
                              step="0.01"
                              className="h-10"
                              value={serviceQty}
                              onChange={(e) => setServiceQty(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Room number (optional)</Label>
                            <Input
                              className="h-10"
                              value={serviceRoomNumber}
                              onChange={(e) =>
                                setServiceRoomNumber(e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <PendingButton
                          type="button"
                          pending={pending === "service"}
                          disabled={!serviceStayId || !serviceItemId}
                          onClick={async () => {
                            const item = filteredServiceItems.find(
                              (i) => String(i.id) === serviceItemId,
                            );
                            if (!item) return;
                            setPending("service");
                            try {
                              await registerLodgingServiceChargeApi({
                                stayId: Number(serviceStayId),
                                serviceItemId: item.id,
                                quantity: Number(serviceQty) || 1,
                                roomNumber: serviceRoomNumber.trim() || undefined,
                              });
                              await load(true);
                            } catch (e) {
                              notifyApiFailure(e, "Could not register charge");
                            } finally {
                              setPending(null);
                            }
                          }}
                        >
                          Register charge
                        </PendingButton>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {activeSection === "cm-portal" && (
                <div className="space-y-6">
                  <Card className="border-border/80 shadow-md bg-card/95">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Dirty & maintenance queue
                      </CardTitle>
                      <CardDescription>
                        Same actions as the CM leader terminal.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {cmQueue.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Queue is empty.
                        </p>
                      ) : (
                        <ul className="divide-y rounded-xl border border-border/70">
                          {cmQueue.map((room) => {
                            const status = room.status as LodgingRoomStatus;
                            return (
                              <li
                                key={room.id}
                                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <p className="font-medium tabular-nums">
                                    Room {room.roomNumber}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "mt-1 font-normal",
                                      roomStatusBadgeClass(room.status),
                                    )}
                                  >
                                    {LODGING_ROOM_STATUS_LABELS[status] ??
                                      room.status}
                                  </Badge>
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
                                    Mark vacant clean
                                  </PendingButton>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setCmRoomId(room.id);
                                      setCmWorkKind(
                                        LODGING_CM_ACTIONABLE_STATUSES.includes(
                                          status,
                                        ) && status === "on_maintenance"
                                          ? "maintenance"
                                          : "cleaning",
                                      );
                                    }}
                                  >
                                    Assign
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  {cmRoomId != null ? (
                    <Card className="border-border/80 shadow-md bg-card/95 max-w-lg">
                      <CardHeader>
                        <CardTitle className="text-lg">Create assignment</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1.5">
                          <Label>Work kind</Label>
                          <Select
                            value={cmWorkKind}
                            onValueChange={setCmWorkKind}
                          >
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
                            value={cmAssignee}
                            onChange={(e) => setCmAssignee(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Notes</Label>
                          <Input
                            className="h-10"
                            value={cmNotes}
                            onChange={(e) => setCmNotes(e.target.value)}
                          />
                        </div>
                        {cmWorkKind === "maintenance" ? (
                          <div className="space-y-1.5">
                            <Label>Maintenance until</Label>
                            <Input
                              type="datetime-local"
                              className="h-10"
                              value={maintUntil}
                              onChange={(e) => setMaintUntil(e.target.value)}
                            />
                          </div>
                        ) : null}
                        <div className="flex gap-2">
                          <PendingButton
                            type="button"
                            pending={pending === "cm-assign"}
                            disabled={!cmAssignee.trim()}
                            onClick={async () => {
                              setPending("cm-assign");
                              try {
                                if (
                                  cmWorkKind === "maintenance" &&
                                  maintUntil
                                ) {
                                  await updateLodgingRoomStatusApi(
                                    cmRoomId,
                                    "on_maintenance",
                                    new Date(maintUntil).toISOString(),
                                  );
                                }
                                await createLodgingCmAssignmentApi({
                                  roomId: cmRoomId,
                                  workKind: cmWorkKind,
                                  assigneeName: cmAssignee.trim(),
                                  notes: cmNotes.trim(),
                                });
                                setCmRoomId(null);
                                setCmAssignee("");
                                setCmNotes("");
                                await load(true);
                              } catch (e) {
                                notifyApiFailure(e, "Could not assign");
                              } finally {
                                setPending(null);
                              }
                            }}
                          >
                            Save assignment
                          </PendingButton>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCmRoomId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}

                  <Card className="border-border/80 shadow-md bg-card/95">
                    <CardHeader>
                      <CardTitle className="text-lg">Open assignments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {cmAssignments.filter((a) => a.status === "open").length ===
                      0 ? (
                        <p className="text-sm text-muted-foreground">
                          No open assignments.
                        </p>
                      ) : (
                        <ul className="divide-y rounded-xl border border-border/70">
                          {cmAssignments
                            .filter((a) => a.status === "open")
                            .map((a) => (
                              <li
                                key={a.id}
                                className="flex items-center justify-between gap-3 px-4 py-3"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    Room {a.room?.roomNumber ?? a.roomId} ·{" "}
                                    {a.workKind}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {a.assigneeName}
                                  </p>
                                </div>
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
                              </li>
                            ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSection === "reports" && (
                <Card className="border-border/80 shadow-md bg-card/95 print:shadow-none print:border-0">
                  <CardHeader className="print:hidden">
                    <CardTitle className="text-lg">Stay reports</CardTitle>
                    <CardDescription>
                      Select a date range, then print a daily or monthly summary.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-3 items-end print:hidden">
                      <div className="space-y-1.5">
                        <Label>From</Label>
                        <HotelDayPicker
                          value={reportFrom}
                          onChange={setReportFrom}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>To</Label>
                        <HotelDayPicker value={reportTo} onChange={setReportTo} />
                      </div>
                      <PendingButton
                        type="button"
                        pending={pending === "report"}
                        onClick={() => void loadReport()}
                      >
                        Load
                      </PendingButton>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.print()}
                        disabled={reportStays.length === 0}
                      >
                        Print
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">
                        Stays {reportFrom} → {reportTo}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {reportStays.length} stay
                        {reportStays.length === 1 ? "" : "s"} · Total billed{" "}
                        {formatMoney(
                          reportStays.reduce(
                            (s, x) => s + (x.bill?.totalETB ?? 0),
                            0,
                          ),
                        )}
                      </p>
                      {reportStays.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Load a range to see results.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border/70">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                <th className="px-3 py-2 font-medium">Guest</th>
                                <th className="px-3 py-2 font-medium">Voucher</th>
                                <th className="px-3 py-2 font-medium">Arrival</th>
                                <th className="px-3 py-2 font-medium">Status</th>
                                <th className="px-3 py-2 font-medium text-right">
                                  Total
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {reportStays.map((s) => (
                                <tr key={s.id}>
                                  <td className="px-3 py-2">
                                    {guestName(s.guest)}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-xs">
                                    {s.voucherCode}
                                  </td>
                                  <td className="px-3 py-2 text-xs">
                                    {new Date(s.arrivalAt).toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2">{s.status}</td>
                                  <td className="px-3 py-2 text-right tabular-nums">
                                    {formatMoney(s.bill?.totalETB ?? 0)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === "history" && (
                <Card className="border-border/80 shadow-md bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-lg">Action history</CardTitle>
                    <CardDescription>
                      Your lodging audit trail on this property
                    </CardDescription>
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
