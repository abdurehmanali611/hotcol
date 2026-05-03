/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  approvePurchaseRequestFinanceApi,
  fetchPurchaseRequests,
  rejectPurchaseRequestFinanceApi,
  logoutAction,
  type PurchaseRequestRow,
} from "@/lib/actions";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { HotelWorkflowGlossary } from "@/components/hotel/HotelWorkflowGlossary";
import { formatPurchaseStatus } from "@/lib/hotelDisplayLabels";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function FinanceInner() {
  const searchParams = useSearchParams();
  const { displayName } = useTenantScopeAndDisplay(searchParams.get("hotel"));
  const logoUrl = searchParams.get("logo") || "";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<PurchaseRequestRow[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const all = await fetchPurchaseRequests();
      setRows(all);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = rows.filter((r) => r.status === "PENDING_FINANCE");
  const history = rows.filter((r) =>
    ["APPROVED_FINANCE", "REJECTED_FINANCE"].includes(r.status),
  );
  const pendingLineTotal = pending.reduce(
    (sum, r) =>
      sum + (Number(r.estimatedUnitPrice) || 0) * (Number(r.quantity) || 0),
    0,
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-linear-to-b from-background via-muted/15 to-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading finance queue…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 text-foreground pb-16">
      <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center gap-2 border-b bg-background px-3 md:px-6">
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
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => logoutAction()}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </header>

      <main className="p-3 md:p-6">
        <div className="mx-auto max-w-6xl space-y-10">
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

        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList className="h-12 items-center bg-muted/50 p-1.5 rounded-xl border border-border w-fit">
            <TabsTrigger value="queue" className="rounded-lg gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Inbox className="h-4 w-4 opacity-80" />
              Queue
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <History className="h-4 w-4 opacity-80" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4 mt-2">
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
            <div className="rounded-xl border border-border/80 bg-card/95 shadow-md overflow-hidden ring-1 ring-black/3 dark:ring-white/6">
              <div className="border-b border-border/60 bg-muted/25 px-4 py-3 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Awaiting you
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-0">
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
                      <TableCell className="font-medium align-middle">
                        {r.itemName}
                      </TableCell>
                      <TableCell className="align-middle">
                        <span className="tabular-nums">{r.quantity}</span>{" "}
                        <span className="text-muted-foreground text-xs">
                          {r.measuredBy}
                        </span>
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
                          <Button
                            size="sm"
                            className="shadow-sm gap-1.5"
                            onClick={async () => {
                              await approvePurchaseRequestFinanceApi(r.id);
                              load();
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 opacity-90" />
                            Approve payment
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                            onClick={async () => {
                              await rejectPurchaseRequestFinanceApi(
                                r.id,
                                "Rejected by finance",
                              );
                              load();
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5 opacity-90" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-2">
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
          </TabsContent>
        </Tabs>

        </div>
      </main>
    </div>
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
