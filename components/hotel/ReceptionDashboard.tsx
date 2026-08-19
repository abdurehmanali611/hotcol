"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { SUPPRESS_BROWSER_PRINT_CHROME } from "@/lib/suppressBrowserPrintChrome";
import { Toaster, toast } from "sonner";
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
import { LodgingStatCardsGrid } from "@/components/hotel/LodgingStatCards";
import { LodgingStayDepartureReceipt } from "@/components/hotel/LodgingStayDepartureReceipt";
import {
  ReceptionCheckoutPaymentDialog,
} from "@/components/hotel/ReceptionCheckoutPaymentDialog";
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
import { useTenantRouteGuard } from "@/hooks/useTenantRouteGuard";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { fetchItems, logoutAction, notifyApiFailure } from "@/lib/actions";
import {
  fetchLiveCafeOrders,
  updateOrderPayment,
} from "@/lib/api/cafeOrders";
import type { Item, Order } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  billLinesExcludingCancelledFoodDrink,
  billTotalFromLines,
  cafeOrderIdFromBillDescription,
  incompleteFoodDrinkLines,
  incompleteLaundryLines,
  isCafeOrderCancelled,
  isCancelledFoodDrinkBillLine,
  isFoodDrinkLineKitchenComplete,
  nightsFromArrivalDeparture,
  resolveCafeOrderForFoodDrinkLine,
  roomServiceTableNo,
  stripCafeOrderMarker,
} from "@/lib/lodgingRoomService";
import {
  readTenantModulesFromStorage,
} from "@/lib/tenantModules";
import { tenantHasModule } from "@/lib/subscriptionModules";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import {
  checkoutLodgingStayApi,
  deleteLodgingBillLineApi,
  fetchLodgingActionLogs,
  fetchLodgingActiveStays,
  fetchLodgingCmAssignments,
  fetchLodgingCmQueue,
  fetchLodgingDashboardStats,
  fetchLodgingRooms,
  fetchLodgingServiceItems,
  issueLodgingGuestOtpApi,
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
  const [liveCafeOrders, setLiveCafeOrders] = useState<Order[]>([]);

  // Active stay detail
  const [selectedStayId, setSelectedStayId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [transferToStayId, setTransferToStayId] = useState<string>("");
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>([]);
  const [splitLineId, setSplitLineId] = useState<number | null>(null);
  const [splitQtyToMove, setSplitQtyToMove] = useState("1");
  const [splitToStayId, setSplitToStayId] = useState<string>("");
  const [checkoutPaymentOpen, setCheckoutPaymentOpen] = useState(false);
  const [printStay, setPrintStay] = useState<LodgingStay | null>(null);
  const [printPayment, setPrintPayment] = useState<{
    cashETB: number;
    bankETB: number;
  } | null>(null);
  const departurePrintRef = useRef<HTMLDivElement>(null);
  const handleDeparturePrint = useReactToPrint({
    contentRef: departurePrintRef,
    documentTitle: "Departure_receipt",
    pageStyle: SUPPRESS_BROWSER_PRINT_CHROME,
    onAfterPrint: () => {
      setPrintStay(null);
      setPrintPayment(null);
    },
  });

  useEffect(() => {
    if (!printStay) return;
    const t = window.setTimeout(() => {
      handleDeparturePrint();
    }, 200);
    return () => window.clearTimeout(t);
  }, [printStay, handleDeparturePrint]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [st, lg, rm, ac, si, cq, ca, cafeItems, liveOrders] =
          await Promise.all([
          fetchLodgingDashboardStats().catch(() => null),
          fetchLodgingActionLogs().catch(() => []),
          fetchLodgingRooms().catch(() => []),
          fetchLodgingActiveStays().catch(() => []),
          fetchLodgingServiceItems().catch(() => []),
          fetchLodgingCmQueue().catch(() => []),
          fetchLodgingCmAssignments().catch(() => []),
          fetchItems().catch(() => [] as Item[]),
          fetchLiveCafeOrders().catch(() => [] as Order[]),
        ]);
        setStats(st);
        setLogs(lg);
        setRooms(rm);
        setStays(ac);
        setServiceItems(si);
        setCafeMenuItems(Array.isArray(cafeItems) ? cafeItems : []);
        setCmQueue(cq);
        setCmAssignments(ca);
        setLiveCafeOrders(Array.isArray(liveOrders) ? liveOrders : []);
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

  const selectedStayActiveLines = useMemo(() => {
    if (!selectedStay) return [];
    return billLinesExcludingCancelledFoodDrink(
      selectedStay.id,
      selectedStay.bill?.lines ?? [],
      liveCafeOrders,
    );
  }, [selectedStay, liveCafeOrders]);

  const selectedStayActiveTotal = useMemo(
    () => billTotalFromLines(selectedStayActiveLines),
    [selectedStayActiveLines],
  );

  const selectedStayForCheckout = useMemo(() => {
    if (!selectedStay) return null;
    if (!selectedStay.bill) return selectedStay;
    return {
      ...selectedStay,
      bill: {
        ...selectedStay.bill,
        lines: selectedStayActiveLines,
        totalETB: selectedStayActiveTotal,
      },
    };
  }, [selectedStay, selectedStayActiveLines, selectedStayActiveTotal]);

  const incompleteFnBLines = useMemo(() => {
    if (!selectedStay) return [];
    return incompleteFoodDrinkLines(
      selectedStay.id,
      selectedStayActiveLines,
      liveCafeOrders,
    );
  }, [selectedStay, selectedStayActiveLines, liveCafeOrders]);

  const incompleteLaundry = useMemo(
    () => incompleteLaundryLines(selectedStayActiveLines),
    [selectedStayActiveLines],
  );

  const checkoutBlockedByIncompleteFnB = incompleteFnBLines.length > 0;
  const checkoutBlockedByIncompleteLaundry = incompleteLaundry.length > 0;
  const checkoutBlocked =
    checkoutBlockedByIncompleteFnB || checkoutBlockedByIncompleteLaundry;

  useEffect(() => {
    if (!selectedStay?.bill || liveCafeOrders.length === 0) return;
    const stale = (selectedStay.bill.lines ?? []).filter((l) =>
      isCancelledFoodDrinkBillLine(l, selectedStay.id, liveCafeOrders),
    );
    if (stale.length === 0) return;
    let disposed = false;
    void (async () => {
      let removed = 0;
      for (const line of stale) {
        try {
          await deleteLodgingBillLineApi({
            lineId: line.id,
            stayId: selectedStay.id,
            silent: true,
          });
          removed += 1;
        } catch {
          /* keep filtered from UI even if delete fails */
        }
      }
      if (!disposed && removed > 0) await load(true);
    })();
    return () => {
      disposed = true;
    };
  }, [selectedStay, liveCafeOrders, load]);

  useEffect(() => {
    if (!selectedStay) return;
    setEditNotes(selectedStay.notes || "");
    setSelectedLineIds([]);
    setTransferToStayId("");
    setSplitLineId(null);
    setSplitToStayId("");
  }, [selectedStay]);

  // Keep room-night charges aligned with calendar nights so far (arrival → today).
  useEffect(() => {
    if (!selectedStay) return;
    const estimated = nightsFromArrivalDeparture(
      new Date(selectedStay.arrivalAt),
      new Date(),
    );
    if (estimated === selectedStay.nights) return;
    let cancelled = false;
    void (async () => {
      try {
        await updateLodgingStayApi({
          id: selectedStay.id,
          nights: estimated,
        });
        if (!cancelled) await load(true);
      } catch {
        /* non-blocking; checkout still recomputes nights */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally key off id/arrival/nights — full stay object identity churns on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedStay fields listed above
  }, [selectedStay?.id, selectedStay?.arrivalAt, selectedStay?.nights, load]);


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
        <div className="reception-screen flex min-h-screen w-full">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
          <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border bg-sidebar-accent/25 px-4">
            <div className="flex h-full min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/20">
                <BedDouble className="h-4.5 w-4.5" />
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
          <header className="app-chrome-header sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-3 md:h-16 md:px-6">
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
            <ChangeOwnPasswordButton />
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
                  <LodgingStatCardsGrid stats={stats} />
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
                                <p className="mt-0.5 text-[11px] text-muted-foreground/90 tabular-nums">
                                  In {new Date(s.arrivalAt).toLocaleString()}
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
                            {formatMoney(selectedStayActiveTotal)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          {selectedStay.status === "checked_in" ? (
                            <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Guest room code (OTP)
                              </p>
                              {selectedStay.guestOtp ? (
                                <>
                                  <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.35em] tabular-nums">
                                    {selectedStay.guestOtp}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Tell the guest this code at check-in. If they
                                    forget it later, look it up here.
                                  </p>
                                </>
                              ) : (
                                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="text-xs text-muted-foreground">
                                    No room code yet — issue one for the guest
                                    portal.
                                  </p>
                                  <PendingButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    pending={pending === "issue-otp"}
                                    onClick={async () => {
                                      setPending("issue-otp");
                                      try {
                                        await issueLodgingGuestOtpApi(
                                          selectedStay.id,
                                        );
                                        await load(true);
                                      } catch (e) {
                                        notifyApiFailure(
                                          e,
                                          "Could not issue room code",
                                        );
                                      } finally {
                                        setPending(null);
                                      }
                                    }}
                                  >
                                    Issue room code
                                  </PendingButton>
                                </div>
                              )}
                            </div>
                          ) : null}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label>Checked in</Label>
                              <div className="flex h-10 items-center rounded-md border border-border/80 bg-muted/40 px-3 text-sm tabular-nums text-muted-foreground">
                                {new Date(
                                  selectedStay.arrivalAt,
                                ).toLocaleString()}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Checked out</Label>
                              <div className="flex h-10 items-center rounded-md border border-border/80 bg-muted/40 px-3 text-sm tabular-nums text-muted-foreground">
                                {selectedStay.status === "checked_out"
                                  ? new Date(
                                      selectedStay.departureAt,
                                    ).toLocaleString()
                                  : "At checkout"}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Nights (auto)</Label>
                              <div className="flex h-10 items-center rounded-md border border-border/80 bg-muted/40 px-3 text-sm tabular-nums text-muted-foreground">
                                {nightsFromArrivalDeparture(
                                  new Date(selectedStay.arrivalAt),
                                  new Date(),
                                )}{" "}
                                · updates at checkout from departure − arrival
                              </div>
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
                            Save stay notes
                          </PendingButton>

                          <div className="space-y-2">
                            <div className="flex flex-wrap items-end justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">Guest usage</p>
                                <p className="text-xs text-muted-foreground">
                                  Checkboxes select guest service usages for
                                  transfer — room night charges are not
                                  selectable. Food &amp; drink can be moved only
                                  after kitchen/barista marks the order Completed.
                                </p>
                              </div>
                              {(selectedStayActiveLines.length > 0 ? (
                                <p className="text-sm font-semibold tabular-nums">
                                  Stay total{" "}
                                  {formatMoney(selectedStayActiveTotal)}
                                </p>
                              ) : null)}
                            </div>

                            {selectedStayActiveLines.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                                No bill lines yet.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {groupBillLinesByRoom(selectedStayActiveLines).map(
                                  ([room, roomLines]) => {
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
                                            const isFnB =
                                              String(line.kind || "").toLowerCase() ===
                                              "food_drink";
                                            const isLaundry =
                                              String(line.kind || "").toLowerCase() ===
                                              "laundry";
                                            const laundryStatus = String(
                                              line.fulfillmentStatus || "pending",
                                            ).toLowerCase();
                                            const laundryComplete =
                                              laundryStatus === "completed";
                                            const laundryCancelled =
                                              laundryStatus === "cancelled";
                                            const fnBComplete =
                                              isFoodDrinkLineKitchenComplete(
                                                line,
                                                selectedStay.id,
                                                liveCafeOrders,
                                              );
                                            const cafeOrder = isFnB
                                              ? resolveCafeOrderForFoodDrinkLine(
                                                  line,
                                                  selectedStay.id,
                                                  liveCafeOrders,
                                                )
                                              : null;
                                            return (
                                            <tr key={line.id}>
                                              <td className="px-3 py-2 align-top">
                                                {isService ? (
                                                  <Checkbox
                                                    aria-label={`Select ${line.description} for transfer`}
                                                    checked={selectedLineIds.includes(
                                                      line.id,
                                                    )}
                                                    disabled={
                                                      (isFnB && !fnBComplete) ||
                                                      (isLaundry &&
                                                        !laundryComplete &&
                                                        !laundryCancelled)
                                                    }
                                                    onCheckedChange={() => {
                                                      if (isFnB && !fnBComplete) {
                                                        toast.message(
                                                          "Wait until food & drink is Completed before transferring",
                                                        );
                                                        return;
                                                      }
                                                      if (
                                                        isLaundry &&
                                                        !laundryComplete &&
                                                        !laundryCancelled
                                                      ) {
                                                        toast.message(
                                                          "Wait until laundry is Completed before transferring",
                                                        );
                                                        return;
                                                      }
                                                      setSelectedLineIds((prev) =>
                                                        prev.includes(line.id)
                                                          ? prev.filter(
                                                              (x) => x !== line.id,
                                                            )
                                                          : [...prev, line.id],
                                                      );
                                                    }}
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
                                                  {stripCafeOrderMarker(
                                                    line.description,
                                                  )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {line.kind.replace(/_/g, " ")}{" "}
                                                  · qty {line.quantity}
                                                  {!isService
                                                    ? " · not transferable here"
                                                    : ""}
                                                  {isFnB
                                                    ? isCafeOrderCancelled(
                                                        cafeOrder?.status,
                                                      )
                                                      ? " · Cancelled (ignored)"
                                                      : fnBComplete
                                                        ? ` · ${cafeOrder?.status || "Completed"}`
                                                        : ` · ${cafeOrder?.status || "Pending"} — transfer/split locked`
                                                    : ""}
                                                  {isLaundry
                                                    ? laundryCancelled
                                                      ? " · Cancelled"
                                                      : laundryComplete
                                                        ? " · Completed"
                                                        : " · Pending — mark completed in Laundry update"
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
                                Food &amp; drink must be Completed first.
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
                                      selectedStayActiveLines,
                                    ).filter((l) =>
                                      isFoodDrinkLineKitchenComplete(
                                        l,
                                        selectedStay.id,
                                        liveCafeOrders,
                                      ),
                                    );
                                    const lineIds = selectedLineIds.filter((id) =>
                                      transferable.some((l) => l.id === id),
                                    );
                                    const blocked = selectedLineIds.filter(
                                      (id) =>
                                        !transferable.some((l) => l.id === id),
                                    );
                                    if (blocked.length > 0) {
                                      toast.error(
                                        "Cannot transfer food & drink until kitchen/barista marks it Completed",
                                      );
                                      return;
                                    }
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
                                laundry, etc.) — not room night charges. Food &amp;
                                drink lines appear only when Completed.
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
                                      serviceUsageLines(selectedStayActiveLines).filter(
                                        (l) =>
                                          isFoodDrinkLineKitchenComplete(
                                            l,
                                            selectedStay.id,
                                            liveCafeOrders,
                                          ),
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
                                            {stripCafeOrderMarker(
                                              l.description,
                                            )}{" "}
                                            (qty {l.quantity})
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
                                const line = selectedStayActiveLines.find(
                                  (l) => l.id === splitLineId,
                                );
                                if (
                                  line &&
                                  !isFoodDrinkLineKitchenComplete(
                                    line,
                                    selectedStay.id,
                                    liveCafeOrders,
                                  )
                                ) {
                                  toast.error(
                                    "Cannot split food & drink until it is Completed",
                                  );
                                  return;
                                }
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
                                Departure is set automatically when you confirm
                                checkout. All food &amp; drink and laundry on this
                                stay must be Completed first.
                              </p>
                              {checkoutBlockedByIncompleteFnB ? (
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                  {incompleteFnBLines.length} food &amp; drink
                                  order
                                  {incompleteFnBLines.length === 1 ? "" : "s"}{" "}
                                  still pending in kitchen/bar — checkout locked.
                                </p>
                              ) : null}
                              {checkoutBlockedByIncompleteLaundry ? (
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                  {incompleteLaundry.length} laundry order
                                  {incompleteLaundry.length === 1 ? "" : "s"}{" "}
                                  still pending — mark completed in Laundry
                                  update before checkout.
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Total of all usages
                                </p>
                                <p className="text-lg font-semibold tabular-nums">
                                  {formatMoney(selectedStayActiveTotal)}
                                </p>
                              </div>
                              <PendingButton
                                type="button"
                                className="h-11 w-full sm:w-auto sm:min-w-55"
                                pending={pending === "checkout"}
                                disabled={checkoutBlocked}
                                onClick={() => {
                                  if (checkoutBlockedByIncompleteFnB) {
                                    toast.error(
                                      "Complete all food & drink orders before checkout",
                                    );
                                    return;
                                  }
                                  if (checkoutBlockedByIncompleteLaundry) {
                                    toast.error(
                                      "Complete all laundry orders before checkout",
                                    );
                                    return;
                                  }
                                  setCheckoutPaymentOpen(true);
                                }}
                              >
                                Checkout & print receipt
                              </PendingButton>
                            </div>
                          </div>
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
                  cafeOrders={liveCafeOrders}
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

        {selectedStayForCheckout ? (
          <ReceptionCheckoutPaymentDialog
            open={checkoutPaymentOpen}
            onOpenChange={setCheckoutPaymentOpen}
            stay={selectedStayForCheckout}
            pending={pending === "checkout"}
            onConfirm={async (payment) => {
              setPending("checkout");
              try {
                const at = new Date();

                // Prefer bank/cash channels from checkout dialog; checkout API
                // also marks any remaining room-service café lines Paid.
                // Include tickets linked by #co: on this stay's bill (transfers/splits).
                try {
                  const tableNo = roomServiceTableNo(selectedStay!.id);
                  const orderIdsFromBill = new Set(
                    selectedStayActiveLines
                      .filter((l) => String(l.kind) === "food_drink")
                      .map((l) => cafeOrderIdFromBillDescription(l.description))
                      .filter((id): id is number => id != null && id > 0),
                  );
                  const roomOrders = liveCafeOrders.filter((o) => {
                    if (String(o.payment || "").toLowerCase() === "paid") {
                      return false;
                    }
                    if (String(o.status || "").toLowerCase() === "cancelled") {
                      return false;
                    }
                    if (orderIdsFromBill.has(o.id)) return true;
                    return Math.floor(Number(o.tableNo)) === tableNo;
                  });
                  for (const order of roomOrders) {
                    const lineMatch =
                      payment.mode === "order"
                        ? selectedStayActiveLines.find((l) => {
                            if (String(l.kind) !== "food_drink") return false;
                            const oid = cafeOrderIdFromBillDescription(
                              l.description,
                            );
                            if (oid === order.id) return true;
                            return stripCafeOrderMarker(l.description)
                              .toLowerCase()
                              .includes(
                                String(order.title || "").toLowerCase(),
                              );
                          })
                        : null;
                    const useBank =
                      payment.mode === "order"
                        ? (lineMatch
                            ? payment.lineChannels[lineMatch.id] === "bank"
                            : payment.bankETB >= payment.cashETB)
                        : payment.bankETB > 0 &&
                          (payment.cashETB <= 0 ||
                            payment.bankETB >= payment.cashETB);
                    await updateOrderPayment(order.id, "Paid", useBank, {
                      silent: true,
                    });
                  }
                } catch (e) {
                  console.warn(
                    "[reception] Room-service café settle before checkout:",
                    e,
                  );
                }

                const updated = await checkoutLodgingStayApi(
                  selectedStay!.id,
                  at.toISOString(),
                );
                setPrintPayment({
                  cashETB: payment.cashETB,
                  bankETB: payment.bankETB,
                });
                setPrintStay(updated);
                setCheckoutPaymentOpen(false);
                setSelectedStayId(null);
                await load(true);
              } catch (e) {
                notifyApiFailure(e, "Checkout failed");
              } finally {
                setPending(null);
              }
            }}
          />
        ) : null}

        {printStay ? (
          <div
            aria-hidden
            className="pointer-events-none fixed left-2500 top-0 h-0 w-0 overflow-hidden opacity-0 print:pointer-events-auto print:static print:left-auto print:top-auto print:h-auto print:w-auto print:overflow-visible print:opacity-100"
          >
            <div
              ref={departurePrintRef}
              className="lodging-departure-print-root"
            >
              <LodgingStayDepartureReceipt
                stay={printStay}
                payment={printPayment}
              />
            </div>
          </div>
        ) : null}
      </div>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}
