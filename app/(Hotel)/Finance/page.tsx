"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  approvePurchaseRequestFinanceApi,
  approvePurchaseRequestsFinanceBatchApi,
  fetchItemRegistrations,
  fetchItemStatus,
  fetchPurchaseRequests,
  rejectPurchaseRequestFinanceApi,
  rejectPurchaseRequestsFinanceBatchApi,
  logoutAction,
  notifyApiFailure,
  type ItemRegistration,
  type ItemStatus,
  type PurchaseRequestRow,
} from "@/lib/actions";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import StoreItems from "@/app/StoreItems/page";
import { HotelInventoryPaymentVatPanel } from "@/components/hotel/HotelInventoryPaymentVatPanel";
import { HotelCreditorUsageReportPanel } from "@/components/hotel/HotelCreditorUsageReportPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { useLoadCoordinator } from "@/hooks/useLoadCoordinator";
import { patchPurchaseRequestStatus } from "@/lib/hotelRowPatches";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Banknote,
  CheckCircle2,
  History,
  Inbox,
  Loader2,
  LogOut,
  RefreshCw,
  Wallet,
  XCircle,
  LayoutGrid,
  Receipt,
  Table2,
} from "lucide-react";
import { HotelWorkflowGlossary } from "@/components/hotel/HotelWorkflowGlossary";
import {
  formatPurchaseStatus,
  formatQtyWithUnit,
  HOTEL_INVENTORY_COPY,
} from "@/lib/hotelDisplayLabels";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type FinanceSection =
  | "queue"
  | "history"
  | "inventory"
  | "payment-vat"
  | "creditor-usage";

function FinanceInner() {
  const searchParams = useSearchParams();
  const { displayName, tenantScope } = useTenantScopeAndDisplay(
    searchParams.get("hotel"),
  );
  const logoUrl = searchParams.get("logo") || "";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<PurchaseRequestRow[]>([]);
  const [inventoryRows, setInventoryRows] = useState<ItemRegistration[]>([]);
  const [inactiveRows, setInactiveRows] = useState<ItemStatus[]>([]);
  const [financeSection, setFinanceSection] = useState<FinanceSection>("queue");
  const [selectedFinanceIds, setSelectedFinanceIds] = useState<number[]>([]);
  const { isPending: isFinancePending, run: runFinanceAction } =
    useConcurrentActions();
  const loadCoordinator = useLoadCoordinator();

  const load = useCallback(
    async (isRefresh = false) => {
      await loadCoordinator.run(async (isStale) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
          const [all, regs, stat] = await Promise.all([
            fetchPurchaseRequests(),
            fetchItemRegistrations(),
            fetchItemStatus(),
          ]);
          if (isStale()) return;
          setRows(all);
          const t = String(tenantScope ?? "").trim();
          const regList = regs as ItemRegistration[];
          setInventoryRows(
            t
              ? regList.filter((it) =>
                  rowHotelMatchesTenantScope(it.HotelName, t),
                )
              : regList,
          );
          const statList = stat as ItemStatus[];
          setInactiveRows(
            t
              ? statList.filter((it) =>
                  rowHotelMatchesTenantScope(it.HotelName, t),
                )
              : statList,
          );
        } catch (e: unknown) {
          if (!isStale()) notifyApiFailure(e, "Failed to load finance data");
        } finally {
          if (!isStale()) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      });
    },
    [tenantScope, loadCoordinator],
  );

  const refreshPurchasesOnly = useCallback(async () => {
    await loadCoordinator.run(async (isStale) => {
      setRefreshing(true);
      try {
        const all = await fetchPurchaseRequests();
        if (isStale()) return;
        setRows(all);
      } catch (e: unknown) {
        if (!isStale()) notifyApiFailure(e, "Failed to refresh payment queue");
      } finally {
        if (!isStale()) setRefreshing(false);
      }
    });
  }, [loadCoordinator]);

  useEffect(() => {
    void load();
  }, [load]);

  const scopedPurchases = useMemo(
    () =>
      rows.filter((r) =>
        rowHotelMatchesTenantScope(r.HotelName, tenantScope || ""),
      ),
    [rows, tenantScope],
  );

  const pending = scopedPurchases.filter((r) => r.status === "PENDING_FINANCE");
  const history = scopedPurchases.filter((r) =>
    ["APPROVED_FINANCE", "REJECTED_FINANCE"].includes(r.status),
  );
  const pendingLineTotal = pending.reduce(
    (sum, r) =>
      sum + (Number(r.estimatedUnitPrice) || 0) * (Number(r.quantity) || 0),
    0,
  );
  const financeInventoryTotalEtb = useMemo(
    () =>
      inventoryRows.reduce(
        (sum, r) => sum + (Number(r.amount) || 0) * (Number(r.unitPrice) || 0),
        0,
      ),
    [inventoryRows],
  );

  const pendingFinanceIdsKey = useMemo(
    () =>
      scopedPurchases
        .filter((r) => r.status === "PENDING_FINANCE")
        .map((r) => r.id)
        .sort((a, b) => a - b)
        .join(","),
    [scopedPurchases],
  );

  useEffect(() => {
    const allow = new Set(
      scopedPurchases
        .filter((r) => r.status === "PENDING_FINANCE")
        .map((r) => r.id),
    );
    setSelectedFinanceIds((prev) => prev.filter((id) => allow.has(id)));
  }, [pendingFinanceIdsKey, scopedPurchases]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-linear-to-b from-background via-muted/15 to-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading finance queue…</span>
      </div>
    );
  }

  const financeNavItems: {
    section: FinanceSection;
    label: string;
    icon: typeof Inbox;
  }[] = [
    { section: "queue", label: "Payment queue", icon: Inbox },
    { section: "history", label: "History", icon: History },
    {
      section: "inventory",
      label: HOTEL_INVENTORY_COPY.inventoryItems,
      icon: LayoutGrid,
    },
    {
      section: "payment-vat",
      label: HOTEL_INVENTORY_COPY.paymentAndTax,
      icon: Receipt,
    },
    {
      section: "creditor-usage",
      label: "Creditor staff usage report",
      icon: Table2,
    },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40 text-foreground">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
          <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border bg-sidebar-accent/25 px-4">
            <div className="flex h-full min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/20">
                <Wallet className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Terminal
                </p>
                <span className="block truncate font-semibold leading-tight">
                  Finance
                </span>
              </div>
            </div>
          </SidebarHeader>
          <div className="shrink-0 px-3 pb-2 pt-3">
            <SidebarSeparator className="bg-sidebar-border/80" />
          </div>
          <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
            <SidebarMenu className="gap-1">
              {financeNavItems.map(({ section, label, icon: Icon }) => (
                <SidebarMenuItem key={section}>
                  <SidebarMenuButton
                    isActive={financeSection === section}
                    onClick={() => setFinanceSection(section)}
                    tooltip={label}
                    size="lg"
                    className="h-auto min-h-10 cursor-pointer py-2 text-[13px] data-[active=true]:shadow-sm"
                  >
                    <Icon className="opacity-80 shrink-0" />
                    <span className="text-left leading-snug">{label}</span>
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

        <SidebarInset className="flex min-h-svh flex-1 flex-col overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/20">
          <header className="sticky top-0 z-10 flex h-14 md:h-16 shrink-0 items-center gap-2 border-b bg-background px-3 md:px-6">
            <SidebarTrigger />
            <Avatar className="h-8 w-8 border shadow-sm">
              <AvatarImage src={logoUrl} alt={displayName || "Property"} />
              <AvatarFallback>
                {(displayName || "P").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider truncate">
                {displayName || "Property"}
              </h1>
              <p className="text-sm md:text-base font-semibold text-foreground truncate">
                Finance
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => load(true)}
              disabled={refreshing}
              className={refreshing ? "animate-spin" : ""}
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
        <div className="mx-auto max-w-6xl space-y-10 pb-16">
        <HotelWorkflowGlossary variant="finance" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-emerald-500/20 bg-linear-to-br from-card to-emerald-500/4 shadow-md overflow-hidden">
            <div className="h-0.5 bg-linear-to-r from-emerald-500/80 to-teal-400/60" />
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Inbox className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-1 min-w-0">
                  <CardDescription>Awaiting payment sign-off</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">
                    {pending.length}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Purchase lines ready for your decision
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card className="border-violet-500/20 bg-linear-to-br from-card to-violet-500/5 shadow-md overflow-hidden">
            <div className="h-0.5 bg-linear-to-r from-violet-500/70 to-indigo-400/50" />
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <Banknote className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="space-y-1 min-w-0">
                  <CardDescription>Estimated exposure (queue)</CardDescription>
                  <CardTitle className="text-3xl tabular-nums tracking-tight">
                    {pendingLineTotal.toLocaleString()}{" "}
                    <span className="text-lg font-semibold text-muted-foreground">
                      ETB
                    </span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Sum of line totals at estimated unit prices
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {financeSection === "queue" && (
        <section className="space-y-4">
          <Card className="border-primary/15 shadow-lg bg-card/95 backdrop-blur-sm overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
            <div className="h-1 bg-linear-to-r from-primary/60 via-violet-500/50 to-cyan-500/40" />
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/15 shrink-0">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl sm:text-2xl tracking-tight">
                      Payment queue
                    </CardTitle>
                    <CardDescription className="text-pretty max-w-2xl leading-relaxed">
                      Cost control has already approved these requests. Your
                      approval records finance sign-off; the store adds stock when
                      goods are received.
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 shrink-0 self-start sm:mt-1"
                >
                  {pending.length} open
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-14 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/80 border border-border/60">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Queue is clear
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto text-pretty">
                Nothing is waiting for finance approval. New requests appear here
                after cost control sends them forward.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Card className="border-dashed border-primary/25 bg-primary/5 shadow-sm">
                  <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedFinanceIds(
                          selectedFinanceIds.length === pending.length
                            ? []
                            : pending.map((x) => x.id),
                        )
                      }
                    >
                      {selectedFinanceIds.length === pending.length
                        ? "Clear selection"
                        : "Select all"}
                    </Button>
                    <PendingButton
                      size="sm"
                      className="shadow-sm gap-1.5"
                      pending={isFinancePending("batch-finance-a")}
                      disabled={selectedFinanceIds.length === 0}
                      onClick={() => {
                        void runFinanceAction("batch-finance-a", async () => {
                          try {
                            const results =
                              await approvePurchaseRequestsFinanceBatchApi(
                                selectedFinanceIds,
                              );
                            for (const res of results) {
                              setRows((prev) =>
                                patchPurchaseRequestStatus(
                                  prev,
                                  res.id,
                                  res.status,
                                ),
                              );
                            }
                            setSelectedFinanceIds([]);
                            void refreshPurchasesOnly();
                          } catch (e: unknown) {
                            notifyApiFailure(
                              e,
                              "Could not batch-approve payments",
                            );
                          }
                        });
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 opacity-90" />
                      Approve selected ({selectedFinanceIds.length})
                    </PendingButton>
                    <PendingButton
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                      pending={isFinancePending("batch-finance-r")}
                      disabled={selectedFinanceIds.length === 0}
                      onClick={() => {
                        void runFinanceAction("batch-finance-r", async () => {
                          try {
                            const results =
                              await rejectPurchaseRequestsFinanceBatchApi(
                                selectedFinanceIds,
                              );
                            for (const res of results) {
                              setRows((prev) =>
                                patchPurchaseRequestStatus(
                                  prev,
                                  res.id,
                                  res.status,
                                ),
                              );
                            }
                            setSelectedFinanceIds([]);
                            void refreshPurchasesOnly();
                          } catch (e: unknown) {
                            notifyApiFailure(
                              e,
                              "Could not batch-reject payments",
                            );
                          }
                        });
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5 opacity-90" />
                      Reject selected ({selectedFinanceIds.length})
                    </PendingButton>
                  </CardContent>
                </Card>
            <div className="rounded-xl border border-border/80 bg-card/95 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="border-b border-border/60 bg-muted/25 px-4 py-3 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Awaiting you
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-0">
                    <TableHead className="w-10 font-semibold">
                      <span className="sr-only">Select</span>
                    </TableHead>
                    <TableHead className="font-semibold">Item</TableHead>
                    <TableHead className="font-semibold">Quantity</TableHead>
                    <TableHead className="font-semibold">Est. line</TableHead>
                    <TableHead className="font-semibold">
                      Cost control
                    </TableHead>
                    <TableHead className="text-right font-semibold w-[220px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((r) => (
                    <TableRow
                      key={r.id}
                      className="hover:bg-muted/25 border-border/50 transition-colors"
                    >
                      <TableCell className="align-middle w-10">
                        <Checkbox
                          checked={selectedFinanceIds.includes(r.id)}
                          onCheckedChange={(checked) => {
                            setSelectedFinanceIds((prev) =>
                              checked === true
                                ? [...new Set([...prev, r.id])]
                                : prev.filter((x) => x !== r.id),
                            );
                          }}
                          aria-label={`Select ${r.itemName}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium align-middle">
                        {r.itemName}
                      </TableCell>
                      <TableCell className="align-middle tabular-nums whitespace-nowrap">
                        {formatQtyWithUnit(r.quantity, r.measuredBy)}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium align-middle">
                        {(
                          (r.estimatedUnitPrice || 0) * (r.quantity || 0)
                        ).toLocaleString()}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          ETB
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate align-middle">
                        {r.ccActorName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="flex flex-wrap justify-end gap-2">
                          <PendingButton
                            size="sm"
                            className="shadow-sm gap-1.5"
                            pending={isFinancePending(`finance-a-${r.id}`)}
                            onClick={() => {
                              void runFinanceAction(`finance-a-${r.id}`, async () => {
                                try {
                                  const result =
                                    await approvePurchaseRequestFinanceApi(r.id);
                                  setRows((prev) =>
                                    patchPurchaseRequestStatus(
                                      prev,
                                      r.id,
                                      result.status,
                                    ),
                                  );
                                  void refreshPurchasesOnly();
                                } catch (e: unknown) {
                                  notifyApiFailure(e, "Could not approve payment");
                                }
                              });
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 opacity-90" />
                            Approve payment
                          </PendingButton>
                          <PendingButton
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                            pending={isFinancePending(`finance-r-${r.id}`)}
                            onClick={() => {
                              void runFinanceAction(`finance-r-${r.id}`, async () => {
                                try {
                                  const result =
                                    await rejectPurchaseRequestFinanceApi(
                                      r.id,
                                      "Rejected by finance",
                                    );
                                  setRows((prev) =>
                                    patchPurchaseRequestStatus(
                                      prev,
                                      r.id,
                                      result.status,
                                    ),
                                  );
                                  void refreshPurchasesOnly();
                                } catch (e: unknown) {
                                  notifyApiFailure(e, "Could not reject payment");
                                }
                              });
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5 opacity-90" />
                            Reject
                          </PendingButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </div>
          )}
        </section>
        )}

        {financeSection === "history" && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-2 rounded-lg bg-muted/60 border border-border/60">
              <History className="h-4 w-4 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              Recent decisions
            </h2>
            <Badge variant="outline" className="rounded-full text-xs font-normal">
              Last {Math.min(40, history.length)} shown
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground text-pretty max-w-3xl -mt-1">
            Items you or another finance user already approved or rejected for
            this property.
          </p>

          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No finance decisions recorded yet.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/80 bg-card/95 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-0">
                      <TableHead className="font-semibold">Item</TableHead>
                      <TableHead className="font-semibold">Outcome</TableHead>
                      <TableHead className="font-semibold">Finance user</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">
                        Decided
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.slice(0, 40).map((r) => (
                      <TableRow
                        key={r.id}
                        className="hover:bg-muted/25 border-border/50 transition-colors"
                      >
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {r.itemName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "APPROVED_FINANCE"
                                ? "default"
                                : "destructive"
                            }
                            className="rounded-md font-normal gap-1"
                          >
                            {r.status === "APPROVED_FINANCE" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {formatPurchaseStatus(r.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.financeActorName ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">
                          {r.financeApprovedAt
                            ? new Date(r.financeApprovedAt).toLocaleString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </section>
        )}

        {financeSection === "inventory" && (
            <section className="space-y-4">
              <Card className="border-violet-500/15 shadow-md bg-card/95 overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
                <div className="h-0.5 bg-linear-to-r from-violet-500/60 to-primary/40" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg sm:text-xl tracking-tight">
                    {HOTEL_INVENTORY_COPY.inventoryItems} & supplier payment
                  </CardTitle>
                  <CardDescription className="text-pretty max-w-2xl">
                    Read-only mirror of store stock lines with fully paid vs on-credit
                    status — same totals cost control sees.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-emerald-500/20 bg-linear-to-br from-card to-emerald-500/5 shadow-sm overflow-hidden">
                <CardHeader className="py-4">
                  <CardDescription>
                    Overall inventory value (sum of amount × unit price)
                  </CardDescription>
                  <CardTitle className="text-2xl tabular-nums tracking-tight">
                    {financeInventoryTotalEtb.toLocaleString()}{" "}
                    <span className="text-base font-semibold text-muted-foreground">
                      ETB
                    </span>
                  </CardTitle>
                </CardHeader>
              </Card>
              <StoreItems
                items={inventoryRows}
                tenantScope={tenantScope}
                embedded
                readOnly
                showPaymentSummary
              />
            </section>
        )}

        {financeSection === "payment-vat" && (
          <section className="space-y-4">
            <HotelInventoryPaymentVatPanel
              tenantLabel={displayName || "Property"}
              inventoryItems={inventoryRows}
              purchasePipeline={scopedPurchases}
              inactiveItems={inactiveRows}
            />
          </section>
        )}

        {financeSection === "creditor-usage" && (
          <section className="space-y-4">
            <HotelCreditorUsageReportPanel tenantLabel={displayName || "Property"} />
          </section>
        )}

        </div>
      </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function FinancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-muted/30">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <FinanceInner />
    </Suspense>
  );
}
