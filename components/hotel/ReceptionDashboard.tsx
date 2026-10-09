"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { SUPPRESS_BROWSER_PRINT_CHROME } from "@/lib/suppressBrowserPrintChrome";
import { Toaster, toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChangeOwnPasswordButton } from "@/components/ChangeOwnPasswordButton";
import { LiveDateTimeClock } from "@/components/LiveDateTimeClock";
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
import { LodgingOptionCombobox } from "@/components/hotel/LodgingOptionCombobox";
import { RECEPTION_NAV_ITEMS, type ReceptionNavId } from "@/constants";
import { ReceptionCheckInForm } from "@/components/hotel/ReceptionCheckInForm";
import { LodgingReservationsPanel } from "@/components/hotel/LodgingReservationsPanel";
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
import {
  LodgingPageHero,
  LodgingPanelShell,
  LodgingSectionCard,
  LodgingActionBand,
  LodgingActivityList,
  lodgingNavActiveClass,
  lodgingFieldClass,
  lodgingPrimaryBtnClass,
  lodgingGhostBtnClass,
  LodgingEmptyState,
  LodgingCountBadge,
  LodgingStatusBadge,
  LodgingCompanyBadge,
} from "@/components/hotel/lodgingChrome";
import { InventoryNotificationCenter } from "@/components/inventory/InventoryNotificationCenter";
import {
  fetchTenantHotelContact,
  type TenantHotelContact,
} from "@/lib/api/lodgingHotelContact";
import { ReceptionRoomTransferDialog } from "@/components/hotel/ReceptionRoomTransferDialog";
import { LodgingStayDepartureReceipt } from "@/components/hotel/LodgingStayDepartureReceipt";
import { LodgingRegistrationCard } from "@/components/hotel/LodgingRegistrationCard";
import {
  ReceptionCheckoutPaymentDialog,
} from "@/components/hotel/ReceptionCheckoutPaymentDialog";
import { LodgingPenaltyDialog } from "@/components/hotel/LodgingPenaltyDialog";
import { useReceptionCmPortalEnabled } from "@/hooks/useReceptionCmPortalEnabled";
import {
  ArrowRightLeft,
  BadgePercent,
  BedDouble,
  CalendarRange,
  FileText,
  History,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  Printer,
  RefreshCw,
  Scale,
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
  requestLodgingDiscountApi,
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
  CalendarRange,
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
  return lines.filter((l) => {
    if (String(l.kind || "").toLowerCase() === "room") return false;
    const appr = String(l.approvalStatus || "").toLowerCase();
    // Pending/rejected discounts are not transferable usages.
    if (appr === "pending" || appr === "rejected") return false;
    if (String(l.fulfillmentStatus || "").toLowerCase() === "cancelled") {
      return false;
    }
    return true;
  });
}

export function ReceptionDashboard() {
  useTenantRouteGuard({ role: "Reception" });
  const searchParams = useSearchParams();
  const { tenantScope, displayName } = useTenantScopeAndDisplay(searchParams.get("hotel"));
  const logoUrl = searchParams.get("logo") || "";
  const receptionCmPortalEnabled = useReceptionCmPortalEnabled();
  const [receptionistName, setReceptionistName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReceptionistName(
      localStorage.getItem("receptionist_name")?.trim() || "",
    );
  }, []);

  /** Guest-call numbers for the departure receipt header (loaded once at boot). */
  useEffect(() => {
    let cancelled = false;
    void fetchTenantHotelContact()
      .then((row) => {
        if (!cancelled) setHotelContact(row);
      })
      .catch(() => {
        /* optional — receipt simply hides the contact strip */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [activeSection, setActiveSection] =
    useState<ReceptionSectionId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const [stats, setStats] = useState<LodgingDashboardStats | null>(null);
  const [hotelContact, setHotelContact] =
    useState<TenantHotelContact | null>(null);
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
  const [roomTransferOpen, setRoomTransferOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [penaltyOpen, setPenaltyOpen] = useState(false);
  const [checkInReservation, setCheckInReservation] =
    useState<import("@/lib/api/lodgingRooms").LodgingReservation | null>(null);
  const [printStay, setPrintStay] = useState<LodgingStay | null>(null);
  const [printPayment, setPrintPayment] = useState<{
    cashETB: number;
    bankETB: number;
    telebirrETB?: number;
  } | null>(null);
  const departurePrintRef = useRef<HTMLDivElement>(null);
  const registrationPrintRef = useRef<HTMLDivElement>(null);
  const handleDeparturePrint = useReactToPrint({
    contentRef: departurePrintRef,
    documentTitle: "Departure_receipt",
    pageStyle: SUPPRESS_BROWSER_PRINT_CHROME,
    onAfterPrint: () => {
      setPrintStay(null);
      setPrintPayment(null);
    },
  });
  const handleRegistrationPrint = useReactToPrint({
    contentRef: registrationPrintRef,
    documentTitle: "Guest_registration_card",
    pageStyle: SUPPRESS_BROWSER_PRINT_CHROME,
  });

  useEffect(() => {
    if (!printStay) return;
    const t = window.setTimeout(() => {
      handleDeparturePrint();
    }, 200);
    return () => window.clearTimeout(t);
  }, [printStay, handleDeparturePrint]);

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
    };
  }, []);

  useEffect(() => {
    if (!receptionCmPortalEnabled && activeSection === "cm-portal") {
      setActiveSection("dashboard");
    }
  }, [receptionCmPortalEnabled, activeSection]);

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
          receptionCmPortalEnabled
            ? fetchLodgingCmQueue().catch(() => [])
            : Promise.resolve([] as LodgingRoom[]),
          receptionCmPortalEnabled
            ? fetchLodgingCmAssignments().catch(() => [])
            : Promise.resolve([] as LodgingCmAssignment[]),
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
    [receptionCmPortalEnabled],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const vacantCleanRooms = useMemo(
    () => rooms.filter((r) => r.status === "vacant_clean"),
    [rooms],
  );

  const lodgingAlertInput = useMemo(() => {
    const now = Date.now();
    let overstay = 0;
    let blockers = 0;
    for (const s of stays) {
      if (s.status !== "checked_in") continue;
      const expected = s.expectedDepartureAt || s.departureAt;
      if (expected && new Date(expected).getTime() < now) overstay += 1;
      const lines = s.bill?.lines ?? [];
      if (
        incompleteFoodDrinkLines(s.id, lines, liveCafeOrders).length > 0 ||
        incompleteLaundryLines(lines).length > 0
      ) {
        blockers += 1;
      }
    }
    return {
      dirtyCount: stats?.vacantDirty ?? 0,
      maintenanceCount: stats?.onMaintenance ?? 0,
      inspectedCount: stats?.inspected ?? 0,
      openCmCount: stats?.openCmAssignments ?? 0,
      overstayCount: overstay,
      checkoutBlockerCount: blockers,
      reservationsDueToday: stats?.openReservations ?? 0,
    };
  }, [stays, stats, liveCafeOrders]);

  const selectedStay = useMemo(
    () => stays.find((s) => s.id === selectedStayId) ?? null,
    [stays, selectedStayId],
  );

  /** Guest-picker options: label is shown, everything else stays searchable via `keywords`. */
  const stayPickerOptions = useMemo(
    () =>
      stays.map((s) => {
        const g = s.guest;
        const rooms = s.rooms
          .map((r) => r.room?.roomNumber)
          .filter(Boolean)
          .join(", ");
        const label = rooms
          ? `${guestName(g)} · Rm ${rooms}`
          : guestName(g);
        return {
          value: String(s.id),
          label,
          hint: s.voucherCode,
          keywords: [
            g?.phone,
            g?.phoneSecondary,
            g?.nationalId,
            g?.passportNumber,
            g?.email,
            rooms,
            s.voucherCode,
            s.companyName,
            s.companyTin,
            new Date(s.arrivalAt).toLocaleString(),
          ]
            .filter(Boolean)
            .join(" "),
        };
      }),
    [stays],
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
    <SidebarProvider className="h-svh max-h-svh min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-muted/40 text-foreground">
        <div className="reception-screen flex h-full min-h-0 w-full overflow-hidden">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
          <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border bg-sidebar-accent/25 px-4">
            <div className="flex h-full min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
                <BedDouble className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Reception
                </p>
                <span className="block truncate font-semibold leading-tight">
                  {receptionistName || "Desk"}
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
                      {receptionCmPortalEnabled ? (
                        <SidebarMenuItem>
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
                      ) : null}
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

        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-0 md:p-2 md:pl-0">
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/20 md:rounded-xl md:border md:border-border/80 md:bg-background md:shadow-lg md:ring-1 md:ring-black/5 dark:md:ring-white/10">
          <header className="app-chrome-header sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-primary/12 px-3 md:h-16 md:px-6">
            <SidebarTrigger />
            <h1 className="min-w-0 shrink-0 truncate text-xs font-medium uppercase tracking-wider text-primary/80 md:text-sm">
              {displayName || "Property"}
            </h1>
            <LiveDateTimeClock className="min-w-0 flex-1" />
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
              audience="hotel-reception"
              lodging={lodgingAlertInput}
            />
            <ChangeOwnPasswordButton />
            <Avatar className="h-8 w-8 border shadow-sm">
              <AvatarImage src={logoUrl} alt={displayName || "Property"} />
              <AvatarFallback>
                {(receptionistName || displayName || "P")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
            <LodgingPanelShell
              className={cn(
                "mx-auto pb-6",
                activeSection === "active-stays"
                  ? "max-w-none"
                  : "max-w-6xl",
              )}
            >
              <LodgingPageHero
                eyebrow="Reception desk"
                title={sectionTitle}
                description={sectionDescription}
                icon={<SectionIcon className="h-5 w-5" />}
                actions={
                  activeSection === "dashboard" ? (
                    <>
                      <Button
                        type="button"
                        className={cn("gap-1.5", lodgingPrimaryBtnClass)}
                        onClick={() => setActiveSection("check-in")}
                      >
                        <UserPlus className="h-4 w-4" />
                        New check-in
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 gap-1.5 border-sky-500/30 text-sky-800 hover:bg-sky-500/10 dark:text-sky-300"
                        onClick={() => setActiveSection("reservations")}
                      >
                        <CalendarRange className="h-4 w-4" />
                        Reservations
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
                    comprehensive
                  />
                  <LodgingSectionCard
                    title="Recent activity"
                    description="Your latest lodging actions on this property"
                    icon={<History className="h-4 w-4" />}
                  >
                    <LodgingActivityList rows={logs} limit={12} />
                  </LodgingSectionCard>
                </div>
              )}

              {activeSection === "check-in" && (
                <ReceptionCheckInForm
                  vacantCleanRooms={vacantCleanRooms}
                  propertyName={displayName}
                  logoUrl={logoUrl}
                  reservation={checkInReservation}
                  onCompleted={async () => {
                    setCheckInReservation(null);
                    setActiveSection("active-stays");
                    await load(true);
                  }}
                />
              )}

              {activeSection === "reservations" && (
                <LodgingReservationsPanel
                  vacantCleanRooms={vacantCleanRooms}
                  onStartCheckIn={(reservation) => {
                    setCheckInReservation(reservation);
                    setActiveSection("check-in");
                  }}
                  onCheckedIn={async () => {
                    setActiveSection("active-stays");
                    await load(true);
                  }}
                />
              )}

              {activeSection === "active-stays" && (
                <div className="space-y-4">
                  <div className="sticky top-0 z-20 flex flex-col gap-3 rounded-2xl border border-primary/12 bg-background/95 px-4 py-3.5 shadow-md ring-1 ring-black/3 backdrop-blur-md dark:ring-white/5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-teal-800 dark:text-teal-300">
                        <BedDouble className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold tracking-tight">
                            Active stays
                          </p>
                          <LodgingCountBadge>{stays.length}</LodgingCountBadge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {stays.length === 0
                            ? "No guests are in house right now."
                            : "Pick a guest to manage their bill, charges, and checkout."}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-96 sm:shrink-0">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-800/60 dark:text-teal-300/70">
                        Guest stay
                      </span>
                      <LodgingOptionCombobox
                        id="active-stay-picker"
                        value={
                          selectedStayId != null ? String(selectedStayId) : ""
                        }
                        onChange={(v) => setSelectedStayId(Number(v))}
                        options={stayPickerOptions}
                        placeholder="Select a guest stay…"
                        searchPlaceholder="Search name, phone, Fayda, room, voucher…"
                        emptyText={
                          stays.length === 0
                            ? "No active stays."
                            : "No stays match this search."
                        }
                        align="end"
                        className="h-11"
                      />
                    </div>
                  </div>

                  {selectedStay ? (
                    <div className="space-y-4">
                      <Card className="overflow-hidden border-border/70 bg-card/95 shadow-md ring-1 ring-black/3 dark:ring-white/5">
                        <div className="h-1 bg-linear-to-r from-primary/40 via-sky-500/25 to-transparent" />
                        <CardHeader className="bg-muted/10">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-teal-800 ring-1 ring-primary/20 dark:text-teal-200">
                                {guestName(selectedStay.guest)
                                  .split(" ")
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((w) => w[0])
                                  .join("")
                                  .toUpperCase() || "G"}
                              </span>
                              <div className="min-w-0 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <CardTitle className="text-lg tracking-tight">
                                    {guestName(selectedStay.guest)}
                                  </CardTitle>
                                  <LodgingStatusBadge
                                    status={selectedStay.status}
                                    label={
                                      selectedStay.status === "checked_in"
                                        ? "In house"
                                        : "Checked out"
                                    }
                                  />
                                </div>
                                <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span>Voucher {selectedStay.voucherCode}</span>
                                  <span className="inline-flex items-center gap-1">
                                    <BedDouble className="h-3.5 w-3.5" />
                                    {selectedStay.rooms
                                      .map((r) => r.room?.roomNumber)
                                      .filter(Boolean)
                                      .join(", ") || "No room"}
                                  </span>
                                  <span className="font-medium text-foreground/80 tabular-nums">
                                    {formatMoney(selectedStayActiveTotal)}
                                  </span>
                                </CardDescription>
                                <LodgingCompanyBadge
                                  isCompany={selectedStay.isCompany}
                                  companyName={selectedStay.companyName}
                                  companyTin={selectedStay.companyTin}
                                />
                              </div>
                            </div>
                            {selectedStay.status === "checked_in" ? (
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "gap-1.5 border-primary/25",
                                    lodgingGhostBtnClass,
                                  )}
                                  onClick={() => handleRegistrationPrint()}
                                >
                                  <Printer className="h-4 w-4" />
                                  Print registration card
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 border-sky-500/30 text-sky-800 hover:bg-sky-500/10 dark:text-sky-300"
                                  onClick={() => setRoomTransferOpen(true)}
                                >
                                  <ArrowRightLeft className="h-4 w-4" />
                                  Transfer room
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          {selectedStay.status === "checked_in" ? (
                            selectedStay.guestOtp ? (
                              <div className="overflow-hidden rounded-xl border border-amber-500/15 bg-linear-to-br from-amber-500/5 via-card to-orange-500/3 p-5">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800/75 dark:text-amber-300/80">
                                  Guest room code (OTP)
                                </p>
                                <p className="mt-2 rounded-lg border border-amber-500/15 bg-background/80 px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-amber-950/90 dark:text-amber-100">
                                  {selectedStay.guestOtp}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Tell the guest this code at check-in. If they
                                  forget it later, look it up here.
                                </p>
                              </div>
                            ) : (
                              <LodgingActionBand
                                tone="sky"
                                eyebrow="Guest portal"
                                title="No room code yet"
                                description="Issue a code so the guest can use the room portal."
                              >
                                <PendingButton
                                  type="button"
                                  className={cn("h-10", lodgingPrimaryBtnClass)}
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
                              </LodgingActionBand>
                            )
                          ) : null}
                          <div className="grid gap-3 rounded-xl border border-primary/12 bg-primary/3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-teal-800/80 dark:text-teal-300/80">
                                Checked in
                              </Label>
                              <div className="flex h-10 items-center rounded-xl border border-primary/15 bg-background/80 px-3 text-sm tabular-nums shadow-sm">
                                {new Date(
                                  selectedStay.arrivalAt,
                                ).toLocaleString()}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-teal-800/80 dark:text-teal-300/80">
                                Checked out
                              </Label>
                              <div className="flex h-10 items-center rounded-xl border border-primary/15 bg-background/80 px-3 text-sm tabular-nums text-muted-foreground shadow-sm">
                                {selectedStay.status === "checked_out"
                                  ? new Date(
                                      selectedStay.departureAt,
                                    ).toLocaleString()
                                  : "At checkout"}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-teal-800/80 dark:text-teal-300/80">
                                Nights (auto)
                              </Label>
                              <div className="flex h-10 items-center rounded-xl border border-primary/15 bg-background/80 px-3 text-sm tabular-nums text-muted-foreground shadow-sm">
                                {nightsFromArrivalDeparture(
                                  new Date(selectedStay.arrivalAt),
                                  new Date(),
                                )}{" "}
                                · updates at checkout from departure − arrival
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label
                                htmlFor="stay-notes"
                                className="text-xs font-medium text-teal-800/80 dark:text-teal-300/80"
                              >
                                Notes
                              </Label>
                              <Input
                                id="stay-notes"
                                className={lodgingFieldClass}
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Optional stay notes"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <PendingButton
                              type="button"
                              className={cn(
                                "w-full sm:w-auto",
                                lodgingPrimaryBtnClass,
                              )}
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
                          </div>

                            <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/6 text-teal-800/90 dark:text-teal-300">
                                  <ListChecks className="h-4 w-4" />
                                </span>
                                <p className="min-w-0 text-sm font-semibold tracking-tight">
                                  Guest usage
                                </p>
                              </div>
                              {selectedStayActiveLines.length > 0 ? (
                                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-primary/15 bg-primary/6 px-3 py-1.5">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-800/60 dark:text-teal-300/70">
                                    Stay total
                                  </span>
                                  <span className="text-sm font-semibold tabular-nums">
                                    {formatMoney(selectedStayActiveTotal)}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                            <p className="w-full text-pretty text-center text-xs leading-relaxed text-muted-foreground">
                              Check the usages you want to transfer — room night
                              charges are not selectable. Food &amp; drink
                              unlocks only after the kitchen or barista marks the
                              order Completed.
                            </p>
                            {selectedStay.status === "checked_in" ? (
                              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/6 px-3.5 py-3 text-sm">
                                <Checkbox
                                  checked={penaltyOpen}
                                  onCheckedChange={(v) =>
                                    setPenaltyOpen(v === true)
                                  }
                                  className="mt-0.5"
                                />
                                <span className="min-w-0">
                                  <span className="inline-flex items-center gap-1.5 font-medium">
                                    <Scale className="size-3.5 text-amber-800 dark:text-amber-300" />
                                    Penalty payment
                                  </span>
                                  <span className="mt-0.5 block text-xs text-muted-foreground leading-relaxed">
                                    Post fault/damage charges to this folio in a
                                    batch — no Manager approval required.
                                  </span>
                                </span>
                              </label>
                            ) : null}

                            {selectedStayActiveLines.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                                No bill lines yet.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {groupBillLinesByRoom(selectedStayActiveLines).map(
                                  ([room, roomLines]) => {
                                  const roomTotal = billTotalFromLines(roomLines);
                                  return (
                                    <div
                                      key={room}
                                      className="overflow-hidden rounded-xl border border-primary/12 bg-card shadow-sm"
                                    >
                                      <div className="flex items-center justify-between gap-2 border-b border-primary/10 bg-primary/4 px-3 py-2">
                                        <p className="text-sm font-medium text-teal-900/90 dark:text-teal-100">
                                          {room === "Unassigned"
                                            ? "Unassigned room"
                                            : `Room ${room}`}
                                        </p>
                                        <p className="text-xs font-semibold tabular-nums text-teal-800/90 dark:text-teal-300">
                                          {formatMoney(roomTotal)}
                                        </p>
                                      </div>
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="border-b border-primary/10 bg-sky-500/5 text-left text-[11px] uppercase tracking-wider text-teal-800/70 dark:text-teal-300/70">
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
                                            <th className="px-3 py-2 font-medium text-right">
                                              <span className="sr-only">Actions</span>
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                          {roomLines.map((line) => {
                                            const isService =
                                              String(line.kind || "").toLowerCase() !==
                                              "room";
                                            const isDiscount =
                                              String(line.kind || "").toLowerCase() ===
                                              "discount";
                                            const approval = String(
                                              line.approvalStatus || "",
                                            ).toLowerCase();
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
                                            const cafeOrder = isFnB
                                              ? resolveCafeOrderForFoodDrinkLine(
                                                  line,
                                                  selectedStay.id,
                                                  liveCafeOrders,
                                                )
                                              : null;
                                            const fnBCancelled =
                                              isFnB &&
                                              (laundryStatus === "cancelled" ||
                                                isCafeOrderCancelled(
                                                  cafeOrder?.status,
                                                ));
                                            const lineCancelled =
                                              laundryCancelled || fnBCancelled;
                                            const fnBComplete =
                                              isFoodDrinkLineKitchenComplete(
                                                line,
                                                selectedStay.id,
                                                liveCafeOrders,
                                              );
                                            return (
                                            <tr key={line.id}>
                                              <td className="px-3 py-2 align-top">
                                                {isService && !isDiscount ? (
                                                  <Checkbox
                                                    aria-label={`Select ${line.description} for transfer`}
                                                    checked={selectedLineIds.includes(
                                                      line.id,
                                                    )}
                                                    disabled={
                                                      lineCancelled ||
                                                      (isFnB && !fnBComplete) ||
                                                      (isLaundry &&
                                                        !laundryComplete)
                                                    }
                                                    onCheckedChange={() => {
                                                      if (lineCancelled) {
                                                        toast.message(
                                                          "Cancelled usages cannot be transferred",
                                                        );
                                                        return;
                                                      }
                                                      if (isFnB && !fnBComplete) {
                                                        toast.message(
                                                          "Wait until food & drink is Completed before transferring",
                                                        );
                                                        return;
                                                      }
                                                      if (
                                                        isLaundry &&
                                                        !laundryComplete
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
                                                <p
                                                  className={cn(
                                                    "font-medium leading-snug",
                                                    isDiscount &&
                                                      approval === "rejected" &&
                                                      "text-muted-foreground line-through decoration-rose-500/50",
                                                  )}
                                                >
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
                                                  {isDiscount && approval === "pending"
                                                    ? " · awaiting manager approval"
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
                                                {isDiscount && approval === "approved" ? (
                                                  <div className="mt-1.5 space-y-0.5">
                                                    <span className="inline-flex w-fit items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                                                      Approved
                                                      {line.approvedBy
                                                        ? ` by ${line.approvedBy}`
                                                        : ""}
                                                    </span>
                                                    {line.approvalNote?.trim() ? (
                                                      <p className="text-xs leading-snug text-emerald-800/90 dark:text-emerald-300/90">
                                                        Reason: {line.approvalNote.trim()}
                                                      </p>
                                                    ) : null}
                                                  </div>
                                                ) : null}
                                                {isDiscount && approval === "rejected" ? (
                                                  <div className="mt-1.5 space-y-0.5">
                                                    <span className="inline-flex w-fit items-center rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:text-rose-300">
                                                      Rejected
                                                      {line.approvedBy
                                                        ? ` by ${line.approvedBy}`
                                                        : ""}
                                                    </span>
                                                    {line.approvalNote?.trim() ? (
                                                      <p className="text-xs leading-snug text-rose-800/90 dark:text-rose-300/90">
                                                        Reason: {line.approvalNote.trim()}
                                                      </p>
                                                    ) : null}
                                                  </div>
                                                ) : null}
                                              </td>
                                              <td className="px-3 py-2 text-right tabular-nums align-top">
                                                {isDiscount &&
                                                (approval === "pending" ||
                                                  approval === "rejected") ? (
                                                  <span
                                                    className={cn(
                                                      approval === "rejected" &&
                                                        "text-muted-foreground line-through decoration-rose-500/50",
                                                    )}
                                                  >
                                                    {formatMoney(
                                                      -Math.abs(
                                                        Number(
                                                          line.unitPriceETB || 0,
                                                        ),
                                                      ),
                                                    )}
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex flex-col items-end gap-0.5">
                                                    <span>
                                                      {formatMoney(
                                                        Number(
                                                          line.amountETB || 0,
                                                        ) +
                                                          Number(
                                                            line.taxETB || 0,
                                                          ),
                                                      )}
                                                    </span>
                                                    {Number(line.taxETB || 0) >
                                                    0 ? (
                                                      <span className="text-[11px] font-normal text-muted-foreground">
                                                        incl. tax{" "}
                                                        {formatMoney(
                                                          Number(line.taxETB),
                                                        )}
                                                        {Number(
                                                          line.taxPercent || 0,
                                                        ) > 0
                                                          ? ` (${Number(line.taxPercent)}%)`
                                                          : ""}
                                                      </span>
                                                    ) : null}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 text-right align-top">
                                                {/* Line voids are Manager-only — Reception cannot void */}
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

                          <div className="grid gap-5 lg:grid-cols-2">
                          {selectedStay.status === "checked_in" ? (
                            <div className="flex h-full flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 shadow-sm">
                              <div>
                                <p className="text-sm font-medium flex items-center gap-1.5">
                                  <BadgePercent className="h-4 w-4 text-primary" />
                                  Request discount
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Needs Manager approval before it reduces the
                                  folio total.
                                </p>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label htmlFor="disc-amt">Amount (ETB)</Label>
                                  <Input
                                    id="disc-amt"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="tabular-nums"
                                    value={discountAmount}
                                    onChange={(e) =>
                                      setDiscountAmount(e.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor="disc-reason">Reason</Label>
                                  <Input
                                    id="disc-reason"
                                    value={discountReason}
                                    onChange={(e) =>
                                      setDiscountReason(e.target.value)
                                    }
                                    placeholder="Why this discount?"
                                  />
                                </div>
                              </div>
                              <div className="mt-auto flex justify-end">
                                <PendingButton
                                  type="button"
                                  pending={pending === "discount"}
                                  onClick={async () => {
                                    const amt = Number(discountAmount);
                                    if (!Number.isFinite(amt) || amt <= 0) {
                                      toast.error("Enter a valid discount amount");
                                      return;
                                    }
                                    if (!discountReason.trim()) {
                                      toast.error("Enter a discount reason");
                                      return;
                                    }
                                    setPending("discount");
                                    try {
                                      await requestLodgingDiscountApi({
                                        stayId: selectedStay.id,
                                        amountETB: amt,
                                        reason: discountReason.trim(),
                                      });
                                      setDiscountAmount("");
                                      setDiscountReason("");
                                      await load(true);
                                    } catch (e) {
                                      notifyApiFailure(e, "Discount request failed");
                                    } finally {
                                      setPending(null);
                                    }
                                  }}
                                >
                                  Send for approval
                                </PendingButton>
                              </div>
                            </div>
                          ) : null}

                          <div className="flex h-full flex-col gap-3 rounded-xl border border-sky-500/25 bg-sky-500/5 p-4 shadow-sm">
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
                            <div className="my-auto flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-center">
                              <div className="space-y-1.5 w-full sm:w-80">
                                <Label>Target stay</Label>
                                <LodgingOptionCombobox
                                  value={transferToStayId}
                                  onChange={setTransferToStayId}
                                  options={otherActiveStays.map((s) => ({
                                    value: String(s.id),
                                    label: stayOptionLabel(s),
                                  }))}
                                  placeholder="Select target stay"
                                  searchPlaceholder="Search stays…"
                                  emptyText="No other active stays."
                                  className="h-10"
                                />
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

                          </div>

                          <div className="space-y-3 rounded-xl border border-primary/15 bg-primary/3 p-4 shadow-sm">
                            <div>
                              <p className="text-sm font-medium">Split a line</p>
                              <p className="text-xs text-muted-foreground">
                                Move part of a guest service usage (food & drink,
                                laundry, etc.) — not room night charges. Food &amp;
                                drink lines appear only when Completed.
                              </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
                              <div className="space-y-1.5">
                                <Label>Line</Label>
                                <LodgingOptionCombobox
                                  value={
                                    splitLineId != null
                                      ? String(splitLineId)
                                      : ""
                                  }
                                  onChange={(v) => setSplitLineId(Number(v))}
                                  options={serviceUsageLines(
                                    selectedStayActiveLines,
                                  )
                                    .filter((l) =>
                                      isFoodDrinkLineKitchenComplete(
                                        l,
                                        selectedStay.id,
                                        liveCafeOrders,
                                      ),
                                    )
                                    .map((l) => {
                                      const room =
                                        String(l.roomNumber || "").trim() ||
                                        "Unassigned";
                                      return {
                                        value: String(l.id),
                                        label: `${stripCafeOrderMarker(
                                          l.description,
                                        )} (qty ${l.quantity})`,
                                        hint:
                                          room === "Unassigned"
                                            ? "Unassigned"
                                            : `Room ${room}`,
                                      };
                                    })}
                                  placeholder="Select line"
                                  searchPlaceholder="Search lines…"
                                  emptyText="No splittable lines."
                                  className="h-10"
                                />
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
                                <LodgingOptionCombobox
                                  value={splitToStayId}
                                  onChange={setSplitToStayId}
                                  options={otherActiveStays.map((s) => ({
                                    value: String(s.id),
                                    label: stayOptionLabel(s),
                                  }))}
                                  placeholder="Target stay"
                                  searchPlaceholder="Search stays…"
                                  emptyText="No other active stays."
                                  className="h-10"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end">
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
                            <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/18 bg-linear-to-br from-emerald-500/6 via-card to-teal-500/3 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
                    <LodgingEmptyState
                      icon={<BedDouble className="h-6 w-6" />}
                      title={
                        stays.length === 0
                          ? "No active stays"
                          : "Select a guest stay"
                      }
                      description={
                        stays.length === 0
                          ? "Checked-in guests will show up here. Start a check-in from the top of this page."
                          : "Pick a guest from the selector at the top right — search by name, phone, Fayda, passport, room, or voucher — to view their bill, transfer charges, and check out."
                      }
                    />
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

              {activeSection === "cm-portal" && receptionCmPortalEnabled && (
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
            </LodgingPanelShell>
          </main>
        </div>
        </div>

        {selectedStay ? (
          <ReceptionRoomTransferDialog
            open={roomTransferOpen}
            onOpenChange={setRoomTransferOpen}
            stay={selectedStay}
            vacantCleanRooms={vacantCleanRooms}
            onDone={async () => {
              await load(true);
            }}
          />
        ) : null}

        {selectedStay ? (
          <LodgingPenaltyDialog
            open={penaltyOpen}
            onOpenChange={setPenaltyOpen}
            stayId={selectedStay.id}
            guestLabel={guestName(selectedStay.guest)}
            onSaved={async () => {
              await load(true);
            }}
          />
        ) : null}

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
                  {
                    cashETB: payment.cashETB,
                    bankETB: payment.bankETB,
                    telebirrETB: payment.telebirrETB ?? 0,
                    nights: payment.nights,
                  },
                );
                setPrintPayment({
                  cashETB: payment.cashETB,
                  bankETB: payment.bankETB,
                  telebirrETB: payment.telebirrETB ?? 0,
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
                propertyName={displayName}
                propertyTin={tenantScope}
                logoUrl={logoUrl}
                hotelContact={hotelContact}
              />
            </div>
          </div>
        ) : null}

        {selectedStay ? (
          <div
            aria-hidden
            className="pointer-events-none fixed left-2500 top-0 h-0 w-0 overflow-hidden opacity-0 print:pointer-events-auto print:static print:left-auto print:top-auto print:h-auto print:w-auto print:overflow-visible print:opacity-100"
          >
            <div ref={registrationPrintRef}>
              <LodgingRegistrationCard
                stay={selectedStay}
                propertyName={displayName}
                logoUrl={logoUrl}
              />
            </div>
          </div>
        ) : null}
      </div>
      </div>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}
