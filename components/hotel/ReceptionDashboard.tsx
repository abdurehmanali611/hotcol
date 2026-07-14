"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Toaster } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";
import { BeautifulTimePicker } from "@/components/hotel/BeautifulTimePicker";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RECEPTION_NAV_ITEMS, type ReceptionNavId } from "@/constants";
import { ReceptionCheckInForm } from "@/components/hotel/ReceptionCheckInForm";
import {
  ReceptionServicesSidebarGroup,
  isReceptionServiceNestedTab,
  receptionServiceSectionMeta,
  type ReceptionServiceNestedTabId,
} from "@/components/hotel/ReceptionServicesSidebarGroup";
import {
  ReceptionRoomOrderSection,
  laundryItemsAsMenuItems,
} from "@/components/hotel/ReceptionRoomOrderSection";
import { ReceptionLodgingServiceUpdatePanel } from "@/components/hotel/ReceptionLodgingServiceUpdatePanel";
import { LodgingCmQueuePanel } from "@/components/hotel/LodgingCmQueuePanel";
import { LodgingActionHistoryPanel } from "@/components/hotel/LodgingActionHistoryPanel";
import { LodgingReportsPanel } from "@/components/hotel/LodgingReportsPanel";
import {
  BedDouble,
  FileText,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  Shirt,
  Sparkles,
  UserPlus,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  LODGING_ROOM_STATUS_LABELS,
  type LodgingRoomStatus,
} from "@/constants/lodgingRooms";
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { fetchItems, logoutAction, notifyApiFailure } from "@/lib/actions";
import type { Item } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  readTenantModulesFromStorage,
} from "@/lib/tenantModules";
import { tenantHasModule } from "@/lib/subscriptionModules";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import {
  checkoutLodgingStayApi,
  fetchLodgingActionLogs,
  fetchLodgingActiveStays,
  fetchLodgingCmAssignments,
  fetchLodgingCmQueue,
  fetchLodgingDashboardStats,
  fetchLodgingRooms,
  fetchLodgingServiceItems,
  splitLodgingBillLineApi,
  transferLodgingBillLinesApi,
  updateLodgingStayApi,
  type LodgingActionLog,
  type LodgingBillLine,
  type LodgingCmAssignment,
  type LodgingDashboardStats,
  type LodgingGuest,
  type LodgingRoom,
  type LodgingServiceItem,
  type LodgingStay,
} from "@/lib/api/lodgingRooms";

type ReceptionSectionId = ReceptionNavId | ReceptionServiceNestedTabId;

const navIconMap: Record<(typeof RECEPTION_NAV_ITEMS)[number]["icon"], LucideIcon> = {
  LayoutDashboard,
  UserPlus,
  BedDouble,
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

function todayYmd(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nowHm(d = new Date()) {
  return `${pad2(d.getHours())}:${pad2(Math.floor(d.getMinutes() / 5) * 5)}`;
}

function toLocalDatetimeValue(d = new Date()) {
  return `${todayYmd(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
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

function groupBillLinesByRoom(lines: LodgingBillLine[]) {
  const map = new Map<string, LodgingBillLine[]>();
  for (const line of lines) {
    const key = (line.roomNumber || "").trim() || "Unassigned";
    const list = map.get(key);
    if (list) list.push(line);
    else map.set(key, [line]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Split / transfer services only — exclude nightly room charge lines. */
function serviceUsageLines(lines: LodgingBillLine[]) {
  return lines.filter((l) => String(l.kind || "").toLowerCase() !== "room");
}

export function ReceptionDashboard() {
  useTenantRouteGuard({ role: "Reception" });
  const searchParams = useSearchParams();
  const { tenantScope, displayName } = useTenantScopeAndDisplay(searchParams.get("hotel"));
  const logoUrl = searchParams.get("logo") || "";

  const [activeSection, setActiveSection] =
    useState<ReceptionSectionId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const [stats, setStats] = useState<LodgingDashboardStats | null>(null);
  const [logs, setLogs] = useState<LodgingActionLog[]>([]);
  const [rooms, setRooms] = useState<LodgingRoom[]>([]);
  const [stays, setStays] = useState<LodgingStay[]>([]);
  const [serviceItems, setServiceItems] = useState<LodgingServiceItem[]>([]);
  const [cafeMenuItems, setCafeMenuItems] = useState<Item[]>([]);
  const [cmQueue, setCmQueue] = useState<LodgingRoom[]>([]);
  const [cmAssignments, setCmAssignments] = useState<LodgingCmAssignment[]>([]);

  // Active stay detail
  const [selectedStayId, setSelectedStayId] = useState<number | null>(null);
  const [editNights, setEditNights] = useState(1);
  const [editNotes, setEditNotes] = useState("");
  const [checkoutDate, setCheckoutDate] = useState(todayYmd);
  const [checkoutTime, setCheckoutTime] = useState(nowHm);
  const [transferToStayId, setTransferToStayId] = useState<string>("");
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>([]);
  const [splitLineId, setSplitLineId] = useState<number | null>(null);
  const [splitQtyToMove, setSplitQtyToMove] = useState("1");
  const [splitToStayId, setSplitToStayId] = useState<string>("");

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [st, lg, rm, ac, si, cq, ca, cafeItems] = await Promise.all([
          fetchLodgingDashboardStats().catch(() => null),
          fetchLodgingActionLogs().catch(() => []),
          fetchLodgingRooms().catch(() => []),
          fetchLodgingActiveStays().catch(() => []),
          fetchLodgingServiceItems().catch(() => []),
          fetchLodgingCmQueue().catch(() => []),
          fetchLodgingCmAssignments().catch(() => []),
          fetchItems().catch(() => [] as Item[]),
        ]);
        setStats(st);
        setLogs(lg);
        setRooms(rm);
        setStays(ac);
        setServiceItems(si);
        setCafeMenuItems(Array.isArray(cafeItems) ? cafeItems : []);
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
    const now = new Date();
    setCheckoutDate(todayYmd(now));
    setCheckoutTime(nowHm(now));
  }, [selectedStay]);


  const hasCafeModule = useMemo(
    () =>
      tenantHasModule(
        readTenantModulesFromStorage(),
        "Cafe and Restaurant",
      ),
    [],
  );

  const laundryMenuItems = useMemo(
    () => laundryItemsAsMenuItems(serviceItems, tenantScope || ""),
    [serviceItems, tenantScope],
  );

  const scopedCafeMenuItems = useMemo(
    () =>
      cafeMenuItems.filter((i) =>
        rowHotelMatchesTenantScope(i.HotelName, tenantScope || ""),
      ),
    [cafeMenuItems, tenantScope],
  );

  useEffect(() => {
    if (
      !hasCafeModule &&
      (activeSection === "services-fnb-order" ||
        activeSection === "services-fnb-update")
    ) {
      setActiveSection("dashboard");
    }
  }, [hasCafeModule, activeSection]);

  const serviceMeta = receptionServiceSectionMeta(activeSection);
  const sectionMeta = isReceptionServiceNestedTab(activeSection)
    ? null
    : RECEPTION_NAV_ITEMS.find((s) => s.id === activeSection);
  const SectionIcon = isReceptionServiceNestedTab(activeSection)
    ? activeSection.includes("laundry")
      ? Shirt
      : UtensilsCrossed
    : navIconMap[sectionMeta?.icon ?? "LayoutDashboard"];
  const sectionTitle =
    serviceMeta?.title ?? sectionMeta?.label ?? "Reception";
  const sectionDescription =
    serviceMeta?.description ?? sectionMeta?.description ?? "";

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
                if (item.id === "cm-portal") {
                  return (
                    <div key="services-and-cm" className="contents">
                      <ReceptionServicesSidebarGroup
                        activeSection={activeSection}
                        showFoodDrink={hasCafeModule}
                        onSelect={(id) =>
                          setActiveSection(id as ReceptionSectionId)
                        }
                      />
                      <SidebarMenuItem>
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
                    </div>
                  );
                }
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
                      {sectionTitle}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {sectionDescription}
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
                        <CardContent className="space-y-5">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="stay-nights">Nights</Label>
                              <Input
                                id="stay-nights"
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
                              <Label htmlFor="stay-notes">Notes</Label>
                              <Input
                                id="stay-notes"
                                className="h-10"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Optional stay notes"
                              />
                            </div>
                          </div>
                          <PendingButton
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto"
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

                          <div className="space-y-2">
                            <div className="flex flex-wrap items-end justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">Guest usage</p>
                                <p className="text-xs text-muted-foreground">
                                  Checkboxes select guest service usages for
                                  transfer — room night charges are not
                                  selectable.
                                </p>
                              </div>
                              {(selectedStay.bill?.lines ?? []).length > 0 ? (
                                <p className="text-sm font-semibold tabular-nums">
                                  Stay total{" "}
                                  {formatMoney(
                                    selectedStay.bill?.totalETB ?? 0,
                                  )}
                                </p>
                              ) : null}
                            </div>

                            {(selectedStay.bill?.lines ?? []).length === 0 ? (
                              <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                                No bill lines yet.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {groupBillLinesByRoom(
                                  selectedStay.bill?.lines ?? [],
                                ).map(([room, roomLines]) => {
                                  const roomTotal = roomLines.reduce(
                                    (sum, l) => sum + Number(l.amountETB || 0),
                                    0,
                                  );
                                  return (
                                    <div
                                      key={room}
                                      className="overflow-hidden rounded-xl border border-border/70"
                                    >
                                      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                                        <p className="text-sm font-medium">
                                          {room === "Unassigned"
                                            ? "Unassigned room"
                                            : `Room ${room}`}
                                        </p>
                                        <p className="text-xs font-medium tabular-nums text-muted-foreground">
                                          {formatMoney(roomTotal)}
                                        </p>
                                      </div>
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="border-b bg-muted/20 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                                            <th className="w-10 px-3 py-2 font-medium">
                                              <span className="sr-only">
                                                Select for transfer
                                              </span>
                                            </th>
                                            <th className="px-3 py-2 font-medium">
                                              Usage
                                            </th>
                                            <th className="px-3 py-2 font-medium text-right">
                                              Amount
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                          {roomLines.map((line) => {
                                            const isService =
                                              String(line.kind || "").toLowerCase() !==
                                              "room";
                                            return (
                                            <tr key={line.id}>
                                              <td className="px-3 py-2 align-top">
                                                {isService ? (
                                                  <Checkbox
                                                    aria-label={`Select ${line.description} for transfer`}
                                                    checked={selectedLineIds.includes(
                                                      line.id,
                                                    )}
                                                    onCheckedChange={() =>
                                                      setSelectedLineIds((prev) =>
                                                        prev.includes(line.id)
                                                          ? prev.filter(
                                                              (x) => x !== line.id,
                                                            )
                                                          : [...prev, line.id],
                                                      )
                                                    }
                                                  />
                                                ) : (
                                                  <span
                                                    className="block h-4 w-4"
                                                    aria-hidden
                                                  />
                                                )}
                                              </td>
                                              <td className="px-3 py-2">
                                                <p className="font-medium leading-snug">
                                                  {line.description}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {line.kind.replace(/_/g, " ")}{" "}
                                                  · qty {line.quantity}
                                                  {!isService
                                                    ? " · not transferable here"
                                                    : ""}
                                                </p>
                                              </td>
                                              <td className="px-3 py-2 text-right tabular-nums align-top">
                                                {formatMoney(line.amountETB)}
                                              </td>
                                            </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="space-y-3 rounded-xl border border-border/70 p-4">
                            <div>
                              <p className="text-sm font-medium">
                                Transfer selected lines
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Move checked usages to another active stay.
                                {selectedLineIds.length > 0
                                  ? ` ${selectedLineIds.length} selected.`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <Label>Target stay</Label>
                                <Select
                                  value={transferToStayId}
                                  onValueChange={setTransferToStayId}
                                >
                                  <SelectTrigger className="h-10 w-full">
                                    <SelectValue placeholder="Select target stay" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {otherActiveStays.map((s) => (
                                      <SelectItem
                                        key={s.id}
                                        value={String(s.id)}
                                      >
                                        {stayOptionLabel(s)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <PendingButton
                                type="button"
                                variant="outline"
                                className="h-10 shrink-0"
                                pending={pending === "transfer"}
                                disabled={
                                  selectedLineIds.length === 0 ||
                                  !transferToStayId
                                }
                                onClick={async () => {
                                  setPending("transfer");
                                  try {
                                    const transferable = serviceUsageLines(
                                      selectedStay.bill?.lines ?? [],
                                    ).map((l) => l.id);
                                    const lineIds = selectedLineIds.filter((id) =>
                                      transferable.includes(id),
                                    );
                                    if (lineIds.length === 0) {
                                      notifyApiFailure(
                                        new Error(
                                          "Select service usages only (not room charges)",
                                        ),
                                        "Transfer failed",
                                      );
                                      return;
                                    }
                                    await transferLodgingBillLinesApi({
                                      lineIds,
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
                          </div>

                          <div className="space-y-3 rounded-xl border border-border/70 p-4">
                            <div>
                              <p className="text-sm font-medium">Split a line</p>
                              <p className="text-xs text-muted-foreground">
                                Move part of a guest service usage (food & drink,
                                laundry, etc.) — not room night charges.
                              </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                              <div className="space-y-1.5 sm:col-span-2">
                                <Label>Line</Label>
                                <Select
                                  value={
                                    splitLineId != null
                                      ? String(splitLineId)
                                      : ""
                                  }
                                  onValueChange={(v) =>
                                    setSplitLineId(Number(v))
                                  }
                                >
                                  <SelectTrigger className="h-10 w-full">
                                    <SelectValue placeholder="Select line" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {groupBillLinesByRoom(
                                      serviceUsageLines(
                                        selectedStay.bill?.lines ?? [],
                                      ),
                                    ).map(([room, roomLines]) => (
                                      <SelectGroup key={room}>
                                        <SelectLabel>
                                          {room === "Unassigned"
                                            ? "Unassigned"
                                            : `Room ${room}`}
                                        </SelectLabel>
                                        {roomLines.map((l) => (
                                          <SelectItem
                                            key={l.id}
                                            value={String(l.id)}
                                          >
                                            {l.description} (qty {l.quantity})
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label>Qty to move</Label>
                                <Input
                                  className="h-10"
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
                                  <SelectTrigger className="h-10 w-full">
                                    <SelectValue placeholder="Target stay" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {otherActiveStays.map((s) => (
                                      <SelectItem
                                        key={s.id}
                                        value={String(s.id)}
                                      >
                                        {stayOptionLabel(s)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <PendingButton
                              type="button"
                              variant="outline"
                              className="w-full sm:w-auto"
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
                              Split line
                            </PendingButton>
                          </div>

                          <div className="space-y-4 border-t border-border/60 pt-4">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Checkout</p>
                              <p className="text-xs text-muted-foreground">
                                Pick the departure date and time, then complete
                                checkout.
                              </p>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)] lg:items-start">
                              <HotelDayPicker
                                label="Date"
                                value={checkoutDate}
                                onChange={setCheckoutDate}
                              />
                              <BeautifulTimePicker
                                label="Time"
                                value={checkoutTime}
                                onChange={setCheckoutTime}
                                compact
                              />
                            </div>
                            <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Total of all usages
                                </p>
                                <p className="text-lg font-semibold tabular-nums">
                                  {formatMoney(
                                    selectedStay.bill?.totalETB ?? 0,
                                  )}
                                </p>
                              </div>
                              <PendingButton
                                type="button"
                                className="h-11 w-full sm:w-auto sm:min-w-[220px]"
                                pending={pending === "checkout"}
                                onClick={async () => {
                                  setPending("checkout");
                                  try {
                                    const at = new Date(
                                      `${checkoutDate}T${checkoutTime}`,
                                    );
                                    if (Number.isNaN(at.getTime())) {
                                      notifyApiFailure(
                                        new Error(
                                          "Invalid checkout date or time",
                                        ),
                                        "Checkout failed",
                                      );
                                      return;
                                    }
                                    const updated =
                                      await checkoutLodgingStayApi(
                                        selectedStay.id,
                                        at.toISOString(),
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

              {activeSection === "services-fnb-order" && hasCafeModule && (
                <ReceptionRoomOrderSection
                  mode="food_drink"
                  items={scopedCafeMenuItems}
                  stays={stays}
                  hotelName={tenantScope || ""}
                  onCompleted={async () => {
                    await load(true);
                  }}
                />
              )}

              {activeSection === "services-fnb-order" && !hasCafeModule && (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Café module required
                    </CardTitle>
                    <CardDescription>
                      In-room food & drink ordering needs the Cafe and
                      Restaurant module. Guests cannot be charged F&B from
                      Reception on this tenant.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}

              {activeSection === "services-fnb-update" && hasCafeModule && (
                <ReceptionLodgingServiceUpdatePanel
                  mode="food_drink"
                  stays={stays}
                  menuItems={scopedCafeMenuItems}
                  hotelName={tenantScope || ""}
                  onRefresh={async () => {
                    await load(true);
                  }}
                />
              )}

              {activeSection === "services-laundry-order" && (
                <ReceptionRoomOrderSection
                  mode="laundry"
                  items={laundryMenuItems}
                  stays={stays}
                  hotelName={tenantScope || ""}
                  onCompleted={async () => {
                    await load(true);
                  }}
                />
              )}

              {activeSection === "services-laundry-update" && (
                <ReceptionLodgingServiceUpdatePanel
                  mode="laundry"
                  stays={stays}
                  menuItems={laundryMenuItems}
                  hotelName={tenantScope || ""}
                  onRefresh={async () => {
                    await load(true);
                  }}
                />
              )}

              {activeSection === "cm-portal" && (
                <LodgingCmQueuePanel
                  queue={cmQueue}
                  openAssignments={cmAssignments.filter((a) => a.status === "open")}
                  onRefresh={async () => {
                    await load(true);
                  }}
                />
              )}

              {activeSection === "reports" && (
                <LodgingReportsPanel showActivityTrail={false} />
              )}

              {activeSection === "history" && (
                <LodgingActionHistoryPanel
                  logs={logs}
                  description="Your lodging audit trail on this property."
                />
              )}
            </div>
          </main>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}
