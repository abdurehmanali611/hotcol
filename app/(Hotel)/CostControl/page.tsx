/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  approvePurchaseRequestCCApi,
  approveStockOutRequestApi,
  createKitchenBarBeginningApi,
  deleteKitchenBarBeginningApi,
  fetchCostControllerProfiles,
  fetchItemRegistrations,
  fetchItemStatus,
  fetchPurchaseRequests,
  fetchStockOutRequests,
  fetchKitchenBarBeginnings,
  rejectPurchaseRequestCCApi,
  rejectStockOutRequestApi,
  updateKitchenBarBeginningApi,
  logoutAction,
  type ItemRegistration,
  type ItemStatus,
  type KitchenBarBeginningRow,
  type PurchaseRequestRow,
  type StockOutRequestRow,
  type CostControllerProfileRow,
} from "@/lib/actions";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  ClipboardList,
  LayoutGrid,
  Loader2,
  LogOut,
  MinusCircle,
  Package,
  RefreshCw,
  Send,
  ShoppingCart,
} from "lucide-react";
import { HotelWorkflowGlossary } from "@/components/hotel/HotelWorkflowGlossary";
import {
  formatMovementType,
  formatPurchaseStatus,
  formatStockOutRequestStatus,
} from "@/lib/hotelDisplayLabels";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HotelFormFieldStack,
  HotelFormSection,
} from "@/components/hotel/HotelTerminalInitFormLayout";
import StoreItems from "@/app/StoreItems/page";
import Inactive from "@/app/Inactive/page";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/** Same labels as Store inventory “Unit” so chef/bar beginnings stay consistent. */
const BEGINNING_UNIT_OPTIONS = [
  "Litre",
  "Kilogram",
  "Piece",
  "Packet",
  "Dozen",
  "Other",
] as const;

function CostControlInner() {
  const searchParams = useSearchParams();
  const { displayName, tenantScope } = useTenantScopeAndDisplay(searchParams.get("hotel"));
  const logoUrl = searchParams.get("logo") || "";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<CostControllerProfileRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [stocks, setStocks] = useState<StockOutRequestRow[]>([]);
  const [beginnings, setBeginnings] = useState<KitchenBarBeginningRow[]>([]);
  const [ccPick, setCcPick] = useState<Record<number, string>>({});
  const [beginForm, setBeginForm] = useState({
    station: "CHEF",
    itemName: "",
    amount: 0,
    measuredBy: "Piece",
    monthPeriod: new Date().toISOString().slice(0, 7),
    notes: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inventoryRows, setInventoryRows] = useState<ItemRegistration[]>([]);
  const [statusRows, setStatusRows] = useState<ItemStatus[]>([]);
  type CostSection =
    | "purchases"
    | "inventory"
    | "inactive"
    | "stock"
    | "request-status"
    | "beginnings";
  const [activeSection, setActiveSection] = useState<CostSection>("purchases");

  const beginningUnitSelectItems = useMemo(() => {
    const m = beginForm.measuredBy.trim();
    if (m && !BEGINNING_UNIT_OPTIONS.includes(m as (typeof BEGINNING_UNIT_OPTIONS)[number])) {
      return [m, ...BEGINNING_UNIT_OPTIONS];
    }
    return [...BEGINNING_UNIT_OPTIONS];
  }, [beginForm.measuredBy]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [p, pr, so, kb, regs, stats] = await Promise.all([
        fetchCostControllerProfiles(),
        fetchPurchaseRequests(),
        fetchStockOutRequests(),
        fetchKitchenBarBeginnings(),
        fetchItemRegistrations(),
        fetchItemStatus(),
      ]);
      setProfiles(p);
      setPurchases(pr);
      setStocks(so);
      setBeginnings(kb);
      const t = String(tenantScope ?? "").trim();
      const regList = regs as ItemRegistration[];
      const statList = stats as ItemStatus[];
      const inv = t
        ? regList.filter((it) => rowHotelMatchesTenantScope(it.HotelName, t))
        : regList;
      const st = t
        ? statList.filter((it) => rowHotelMatchesTenantScope(it.HotelName, t))
        : statList;
      setInventoryRows(inv);
      setStatusRows(st);
    } catch (e: any) {
      toast.error(e?.message || "Load failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantScope]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-linear-to-b from-background via-muted/15 to-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading cost control…</span>
      </div>
    );
  }

  const pendingPr = purchases.filter((x) => x.status === "PENDING_CC");
  const pendingSo = stocks.filter((x) => x.status === "PENDING");

  const costNavItems = [
    { section: "purchases" as const, label: "Purchase requests", icon: Send },
    { section: "inventory" as const, label: "Inventory", icon: ShoppingCart },
    { section: "inactive" as const, label: "Inactive", icon: MinusCircle },
    {
      section: "stock" as const,
      label: "Stock / wastage / returns",
      icon: Package,
    },
    {
      section: "beginnings" as const,
      label: "Chef & bar beginnings",
      icon: LayoutGrid,
    },
    {
      section: "request-status" as const,
      label: "Request status",
      icon: ClipboardList,
    },
  ];

  const workspaceIntro: Record<
    CostSection,
    { title: string; description: string; Icon: typeof Send }
  > = {
    purchases: {
      title: "Purchase requests",
      description:
        "Review store requests and approve with your registered identity so finance and managers can audit who cleared each line.",
      Icon: Send,
    },
    inventory: {
      title: "Active inventory",
      description:
        "Live quantities and stock movements for this property — aligned with the hotel store terminal.",
      Icon: ShoppingCart,
    },
    inactive: {
      title: "Inactive items",
      description:
        "Depleted or written-off rows and history for this property, matching the store inactive audit view.",
      Icon: MinusCircle,
    },
    stock: {
      title: "Stock / wastage / returns",
      description:
        "Approve stock-out, wastage, and return movements before they hit on-hand balances.",
      Icon: Package,
    },
    beginnings: {
      title: "Chef & bar beginnings",
      description:
        "Monthly opening balances by station — same units as inventory for consistent reporting.",
      Icon: LayoutGrid,
    },
    "request-status": {
      title: "Request status",
      description:
        "Full purchase and stock-movement history with current status across cost control and finance.",
      Icon: ClipboardList,
    },
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40 text-foreground">
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border shadow-sm"
        >
          <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border bg-sidebar-accent/25 px-4">
            <div className="flex h-full min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/20">
                <LayoutGrid className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Terminal
                </p>
                <span className="block truncate font-semibold leading-tight">
                  Cost control
                </span>
              </div>
            </div>
          </SidebarHeader>
          <div className="shrink-0 px-3 pb-2 pt-3">
            <SidebarSeparator className="bg-sidebar-border/80" />
          </div>
          <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
            <SidebarMenu className="gap-1">
              {costNavItems.map(({ section, label, icon: Icon }) => (
                <SidebarMenuItem key={section}>
                  <SidebarMenuButton
                    isActive={activeSection === section}
                    onClick={() => setActiveSection(section)}
                    tooltip={label}
                    size="lg"
                    className="h-10 cursor-pointer text-[13px] data-[active=true]:shadow-sm"
                  >
                    <Icon className="opacity-80" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              onClick={() => logoutAction()}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex min-h-svh flex-1 flex-col overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/20 md:m-2 md:ml-0 md:max-h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-border/80 md:bg-background md:shadow-lg md:ring-1 md:ring-black/5 dark:md:ring-white/10">
          <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center gap-2 border-b bg-background px-3 md:px-6">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <h1 className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider truncate">
                {displayName || "Property"}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => load(true)}
              disabled={refreshing}
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

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/60 bg-muted/20 p-4">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 md:px-6 md:py-6 scroll-smooth">
              <div className="mx-auto max-w-6xl space-y-10 pb-10">
        <HotelWorkflowGlossary variant="costControl" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-emerald-500/20 bg-linear-to-br from-card to-emerald-500/4 shadow-md overflow-hidden">
            <div className="h-0.5 bg-linear-to-r from-emerald-500/80 to-teal-400/60" />
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                  <Send className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 space-y-1">
                  <CardDescription>Purchase requests for you</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">
                    {pendingPr.length}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Awaiting your sign-off before finance
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card className="border-amber-500/20 bg-linear-to-br from-card to-amber-500/5 shadow-md overflow-hidden">
            <div className="h-0.5 bg-linear-to-r from-amber-500/80 to-orange-400/60" />
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5">
                  <Package className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                </div>
                <div className="min-w-0 space-y-1">
                  <CardDescription>Stock movements for you</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">
                    {pendingSo.length}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Wastage, returns, and transfers pending approval
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {(() => {
          const {
            title,
            description,
            Icon: IntroIcon,
          } = workspaceIntro[activeSection];
          return (
            <Card className="border-primary/15 bg-card/95 shadow-lg backdrop-blur-sm overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="h-1 bg-linear-to-r from-primary/60 via-violet-500/50 to-cyan-500/40" />
              <CardHeader className="pb-3 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-fit shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 p-2.5">
                    <IntroIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-xl tracking-tight sm:text-2xl">
                      {title}
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-pretty leading-relaxed">
                      {description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })()}

        {activeSection === "purchases" && (
          <div className="space-y-4">
            {profiles.length === 0 && pendingPr.length > 0 && (
              <p className="text-sm rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
                Your manager has not added any cost-controller names yet. Ask
                them to add identities under Manager → Cost control IDs.
              </p>
            )}
            {pendingPr.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-14 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/80">
                  <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Queue is clear
                </p>
                <p className="mx-auto max-w-md text-pretty text-sm text-muted-foreground">
                  No purchase requests waiting for cost control right now.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPr.map((r) => (
                  <Card
                    key={r.id}
                    className="border-border/80 shadow-md bg-card/95 backdrop-blur-sm overflow-hidden ring-1 ring-black/3 dark:ring-white/6"
                  >
                    <div className="h-0.5 bg-linear-to-r from-primary/50 to-transparent" />
                    <CardHeader className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg leading-snug">
                          {r.itemName}{" "}
                          <span className="text-muted-foreground font-normal">
                            × {r.quantity} {r.measuredBy}
                          </span>
                        </CardTitle>
                        <Badge variant="outline" className="shrink-0">
                          From store
                        </Badge>
                      </div>
                      <CardDescription className="space-y-1">
                        <span>
                          Requested by <strong>{r.storeUserName}</strong>
                        </span>
                        <span className="block">
                          Est. {r.estimatedUnitPrice} ETB / unit · Notes:{" "}
                          {r.notes || "—"}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end pb-5">
                      <div className="flex-1 w-full space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Who is approving? (your registered name)
                        </Label>
                        <Select
                          value={ccPick[r.id] ?? ""}
                          onValueChange={(v) =>
                            setCcPick((m) => ({ ...m, [r.id]: v }))
                          }
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select your name" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="shadow-sm"
                          onClick={async () => {
                            const pid = Number(ccPick[r.id]);
                            if (!pid) {
                              toast.error("Select your cost controller identity");
                              return;
                            }
                            await approvePurchaseRequestCCApi(r.id, pid);
                            load();
                          }}
                        >
                          Approve → finance
                        </Button>
                        <Button
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={async () => {
                            await rejectPurchaseRequestCCApi(
                              r.id,
                              "Rejected by cost control",
                            );
                            load();
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          )}
          {activeSection === "inventory" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-pretty max-w-3xl">
              Same live inventory as the store terminal: quantities, pricing context, and
              stock-out flows for <span className="text-foreground font-medium">{displayName || "your property"}</span>.
            </p>
            <Card className="border-primary/20 bg-linear-to-br from-card to-primary/4 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="h-0.5 bg-linear-to-r from-primary/80 via-cyan-500/50 to-teal-400/40" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/15">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl">Active inventory</CardTitle>
                    <CardDescription>
                      Filter by arrival date, edit lines, and approve stock movements — aligned with hotel store inventory.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6 px-3 sm:px-6">
                <StoreItems
                  items={inventoryRows}
                  hotelStockApprovals
                  tenantScope={tenantScope}
                  embedded
                />
              </CardContent>
            </Card>
          </div>
          )}

          {activeSection === "inactive" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-pretty max-w-3xl">
              Depleted, written off, or otherwise inactive stock rows for this property — same audit view as Store → Inactive.
            </p>
            <Card className="border-slate-500/20 bg-linear-to-br from-card to-slate-500/5 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="h-0.5 bg-linear-to-r from-slate-500/70 to-rose-400/40" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20">
                    <MinusCircle className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl">Inactive items</CardTitle>
                    <CardDescription>
                      Historical movements and status changes for {displayName || "this property"}.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6 px-3 sm:px-6">
                <Inactive
                  items={statusRows}
                  admin={false}
                  hotelName={tenantScope}
                  embedded
                />
              </CardContent>
            </Card>
          </div>
          )}

          {activeSection === "stock" && (
          <div className="space-y-4">
            {pendingSo.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center">
                No stock movements waiting for approval.
              </p>
            ) : (
              pendingSo.map((r) => (
                <Card
                  key={r.id}
                  className="border-border/80 shadow-md bg-card/95 backdrop-blur-sm overflow-hidden ring-1 ring-black/3 dark:ring-white/6"
                >
                  <div className="h-0.5 bg-linear-to-r from-amber-500/50 to-transparent" />
                  <CardHeader className="py-4">
                    <CardTitle className="text-base sm:text-lg leading-snug">
                      <span className="block text-foreground">
                        {r.itemName?.trim()
                          ? r.itemName
                          : `Item #${r.itemRegistrationId}`}
                      </span>
                      <span className="block text-sm font-normal text-muted-foreground mt-1">
                        {formatMovementType(r.movementType)}
                      </span>
                    </CardTitle>
                    <CardDescription className="space-y-1">
                      <span className="block">
                        Inventory row{" "}
                        <strong className="text-foreground tabular-nums">
                          #{r.itemRegistrationId}
                        </strong>{" "}
                        — quantity <strong>{r.amount}</strong>
                      </span>
                      <span className="block">
                        Detail: {r.stakeHolderOrReason} · Requested by{" "}
                        <strong>{r.requestedByUserName}</strong>
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end pb-5">
                    <div className="flex-1 w-full space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Who is approving? (your registered name)
                      </Label>
                      <Select
                        value={ccPick[-r.id] ?? ""}
                        onValueChange={(v) =>
                          setCcPick((m) => ({ ...m, [-r.id]: v }))
                        }
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select your name" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="shadow-sm"
                        onClick={async () => {
                          const pid = Number(ccPick[-r.id]);
                          if (!pid) {
                            toast.error("Select your cost controller identity");
                            return;
                          }
                          await approveStockOutRequestApi(r.id, pid);
                          load();
                        }}
                      >
                        Approve & update stock
                      </Button>
                      <Button
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={async () => {
                          await rejectStockOutRequestApi(
                            r.id,
                            "Rejected by cost control",
                          );
                          load();
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          )}

          {activeSection === "request-status" && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground text-pretty max-w-3xl">
              Every purchase and stock movement for your property, with current
              status — including items already past cost control or finance.
            </p>
            <Card className="border-border/80 shadow-md overflow-hidden">
              <CardHeader className="border-b bg-muted/30 py-3">
                <CardTitle className="text-lg">All purchase requests</CardTitle>
                <CardDescription>{purchases.length} total</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {purchases.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-6 text-center">
                    No purchase requests yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>CC reviewer</TableHead>
                        <TableHead>Finance</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...purchases]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {r.itemName}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.storeUserName}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.status === "REJECTED_CC" ||
                                  r.status === "REJECTED_FINANCE"
                                    ? "destructive"
                                    : r.status === "APPROVED_FINANCE"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {formatPurchaseStatus(r.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm max-w-[120px] truncate">
                              {r.ccActorName ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm max-w-[120px] truncate">
                              {r.financeActorName ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(r.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-md overflow-hidden">
              <CardHeader className="border-b bg-muted/30 py-3">
                <CardTitle className="text-lg">All stock movement requests</CardTitle>
                <CardDescription>{stocks.length} total</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {stocks.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-6 text-center">
                    No movement requests yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested by</TableHead>
                        <TableHead>CC reviewer</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...stocks]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium max-w-[160px] truncate">
                              {r.itemName?.trim()
                                ? r.itemName
                                : `#${r.itemRegistrationId}`}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {formatMovementType(r.movementType)}
                            </TableCell>
                            <TableCell>{r.amount}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.status === "REJECTED"
                                    ? "destructive"
                                    : r.status === "APPROVED"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {formatStockOutRequestStatus(r.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.requestedByUserName}
                            </TableCell>
                            <TableCell className="text-sm max-w-[120px] truncate">
                              {r.ccActorName ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(r.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
          )}

          {activeSection === "beginnings" && (
          <div className="space-y-6">
            <Card className="border-primary/15 shadow-lg bg-card/90 backdrop-blur-sm overflow-hidden">
              <div className="h-1 bg-linear-to-r from-violet-500/50 via-primary/40 to-cyan-500/40" />
              <CardHeader>
                <CardTitle>Monthly beginning balances</CardTitle>
                <CardDescription className="text-pretty max-w-2xl">
                  Record opening quantities for chef or bar areas by month. Edit
                  or delete rows when figures change after monthly inventory.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-1 pb-8 px-5 sm:px-6">
                <HotelFormSection
                  title="Period & station"
                  description="Which month you are reporting and whether this balance is for the kitchen or the bar."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <HotelFormFieldStack>
                      <Label htmlFor="kb-station">Station</Label>
                      <Select
                        value={beginForm.station}
                        onValueChange={(v) =>
                          setBeginForm((f) => ({ ...f, station: v }))
                        }
                      >
                        <SelectTrigger
                          id="kb-station"
                          className="h-10 w-full border-border/80 shadow-sm"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHEF">Chef (kitchen)</SelectItem>
                          <SelectItem value="BAR">Bar</SelectItem>
                        </SelectContent>
                      </Select>
                    </HotelFormFieldStack>
                    <HotelFormFieldStack>
                      <Label htmlFor="kb-month">Month</Label>
                      <Input
                        id="kb-month"
                        type="month"
                        value={beginForm.monthPeriod}
                        onChange={(e) =>
                          setBeginForm((f) => ({
                            ...f,
                            monthPeriod: e.target.value,
                          }))
                        }
                        className="h-10 border-border/80 shadow-sm"
                      />
                    </HotelFormFieldStack>
                  </div>
                </HotelFormSection>

                <HotelFormSection
                  title="Item & quantity"
                  description="Opening amount and unit of measure — same unit labels as store inventory."
                >
                  <HotelFormFieldStack>
                    <Label htmlFor="kb-item">Item or ingredient</Label>
                    <Input
                      id="kb-item"
                      value={beginForm.itemName}
                      onChange={(e) =>
                        setBeginForm((f) => ({ ...f, itemName: e.target.value }))
                      }
                      placeholder="e.g. Cooking oil, tonic water"
                      className="h-10 border-border/80 shadow-sm"
                    />
                  </HotelFormFieldStack>
                  <div className="grid gap-4 sm:grid-cols-2 pt-1">
                    <HotelFormFieldStack>
                      <Label htmlFor="kb-amount">Amount</Label>
                      <Input
                        id="kb-amount"
                        type="number"
                        min={0}
                        step={0.01}
                        value={beginForm.amount}
                        onChange={(e) =>
                          setBeginForm((f) => ({
                            ...f,
                            amount: Number(e.target.value),
                          }))
                        }
                        className="h-10 tabular-nums border-border/80 shadow-sm"
                      />
                    </HotelFormFieldStack>
                    <HotelFormFieldStack>
                      <Label>Unit</Label>
                      <Select
                        value={beginForm.measuredBy}
                        onValueChange={(v) =>
                          setBeginForm((f) => ({ ...f, measuredBy: v }))
                        }
                      >
                        <SelectTrigger className="h-10 w-full border-border/80 shadow-sm">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {beginningUnitSelectItems.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HotelFormFieldStack>
                  </div>
                </HotelFormSection>

                <HotelFormSection
                  title="Notes"
                  description="Optional — adjustments, batch references, or who counted."
                >
                  <HotelFormFieldStack>
                    <Label htmlFor="kb-notes">Notes</Label>
                    <Textarea
                      id="kb-notes"
                      value={beginForm.notes}
                      onChange={(e) =>
                        setBeginForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      rows={3}
                      placeholder="Optional detail for your records"
                      className="min-h-22 resize-y border-border/80 shadow-sm"
                    />
                  </HotelFormFieldStack>
                </HotelFormSection>

                <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                  <Button
                    type="button"
                    className="shadow-sm"
                    onClick={async () => {
                      if (editingId) {
                        await updateKitchenBarBeginningApi({
                          id: editingId,
                          ...beginForm,
                        });
                        setEditingId(null);
                      } else {
                        await createKitchenBarBeginningApi(beginForm);
                      }
                      setBeginForm({
                        station: "CHEF",
                        itemName: "",
                        amount: 0,
                        measuredBy: "Piece",
                        monthPeriod: new Date().toISOString().slice(0, 7),
                        notes: "",
                      });
                      load();
                    }}
                  >
                    {editingId ? "Save changes" : "Add record"}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setBeginForm({
                          station: "CHEF",
                          itemName: "",
                          amount: 0,
                          measuredBy: "Piece",
                          monthPeriod: new Date().toISOString().slice(0, 7),
                          notes: "",
                        });
                      }}
                    >
                      Cancel edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="rounded-xl border border-border/80 bg-card/95 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Station</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beginnings.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/30">
                      <TableCell>{b.station === "CHEF" ? "Chef" : "Bar"}</TableCell>
                      <TableCell className="font-medium">{b.itemName}</TableCell>
                      <TableCell>
                        {b.amount} {b.measuredBy}
                      </TableCell>
                      <TableCell className="tabular-nums">{b.monthPeriod}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(b.id);
                            setBeginForm({
                              station: b.station,
                              itemName: b.itemName,
                              amount: b.amount,
                              measuredBy: b.measuredBy,
                              monthPeriod: b.monthPeriod,
                              notes: b.notes,
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            await deleteKitchenBarBeginningApi(b.id);
                            load();
                          }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          )}
            </div>
          </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function CostControlPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-muted/30">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <CostControlInner />
    </Suspense>
  );
}
