/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  createHotelCreditCompanyApi,
  createHotelCreditConsumptionApi,
  deleteHotelCreditCompanyApi,
  fetchHotelCorporateCreditTiers,
  fetchHotelCreditCompanies,
  fetchHotelCreditConsumptions,
  fetchHotelCreditParties,
  fetchItems,
  logoutAction,
  notifyApiFailure,
  updateHotelCreditCompanyApi,
  type HotelCorporateCreditTierRow,
  type HotelCreditCompanyRow,
  type HotelCreditConsumptionRow,
  type HotelCreditPartyRow,
  type Item,
} from "@/lib/actions";
import {
  hotelCreditCompanyDealFormSchema,
  hotelCreditConsumptionMetaFormSchema,
} from "@/lib/validations";
import { useTenantScopeAndDisplay } from "@/lib/useTenantScopeAndDisplay";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTable } from "@/app/StoreItems/data-table";
import { buildCreditorUsageColumns } from "@/lib/dataTableColumns/creditorUsage";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Info,
  Loader2,
  LogOut,
  Package,
  RefreshCw,
  Receipt,
  Table2,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatCreditCycle } from "@/lib/creditCycleLabel";
import { HOTEL_CASHIER_NAV_ITEMS, type HotelCashierNavId } from "@/constants";
import { HotelDayPicker } from "@/components/hotel/HotelDayPicker";

type AllowedDraft = Record<number, { on: boolean }>;

function defaultOccurredAtLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tierSummary(t: HotelCorporateCreditTierRow) {
  return `ETB ${Number(t.creditCeiling).toLocaleString()} Â· ${formatCreditCycle(t.timeInterval, t.timeFrame)}`;
}

export function HotelCashierDashboard() {
  const searchParams = useSearchParams();
  const { displayName, tenantScope } = useTenantScopeAndDisplay(
    searchParams.get("hotel"),
  );
  const logoUrl = searchParams.get("logo") || "";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tiers, setTiers] = useState<HotelCorporateCreditTierRow[]>([]);
  const [menu, setMenu] = useState<Item[]>([]);
  const [companies, setCompanies] = useState<HotelCreditCompanyRow[]>([]);
  const [selCompany, setSelCompany] = useState<HotelCreditCompanyRow | null>(
    null,
  );
  const [reportRows, setReportRows] = useState<HotelCreditConsumptionRow[]>([]);
  const [reportPartyById, setReportPartyById] = useState<
    Map<number, HotelCreditPartyRow>
  >(() => new Map());
  const [reportCompanyFilter, setReportCompanyFilter] = useState("all");
  const [reportSearchDraft, setReportSearchDraft] = useState("");
  const [reportSearchTerm, setReportSearchTerm] = useState("");
  const [reportFrom, setReportFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [reportTo, setReportTo] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const companyDealForm = useForm<
    z.infer<typeof hotelCreditCompanyDealFormSchema>
  >({
    resolver: zodResolver(hotelCreditCompanyDealFormSchema),
    defaultValues: {
      companyName: "",
      companyTinNumber: "",
      phoneNumber: "",
      email: "",
      payTiming: "AFTER_SERVICE" as const,
      dealNotes: "",
      hotelCorporateCreditTierId: 0,
    },
  });

  const consumptionMetaForm = useForm<
    z.infer<typeof hotelCreditConsumptionMetaFormSchema>
  >({
    resolver: zodResolver(hotelCreditConsumptionMetaFormSchema),
    defaultValues: { occurredAt: defaultOccurredAtLocal() },
  });

  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [allowedDraft, setAllowedDraft] = useState<AllowedDraft>({});
  const [lineRows, setLineRows] = useState<
    { name: string; qty: number; unitPrice: number }[]
  >([{ name: "", qty: 1, unitPrice: 0 }]);

  const [activeSection, setActiveSection] =
    useState<HotelCashierNavId>("companies");
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<
    "all" | "Food" | "Beverage" | "Others"
  >("all");
  const [companyDealSaving, setCompanyDealSaving] = useState(false);
  const [companyDeleting, setCompanyDeleting] = useState(false);
  const [consumptionSaving, setConsumptionSaving] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const t = String(tenantScope ?? "").trim();
        const [tr, it, co] = await Promise.all([
          fetchHotelCorporateCreditTiers(),
          fetchItems(),
          fetchHotelCreditCompanies(),
        ]);
        setTiers(tr);
        const items = Array.isArray(it) ? (it as Item[]) : [];
        setMenu(
          t
            ? items.filter((x) => rowHotelMatchesTenantScope(x.HotelName, t))
            : items,
        );
        setCompanies(co);
      } catch (e: unknown) {
        notifyApiFailure(e, "Could not load cashier data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantScope],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const allowedList = useMemo(() => {
    if (!selCompany) return [];
    try {
      const a = JSON.parse(selCompany.allowedMenuJson || "[]");
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  }, [selCompany]);

  const companyNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of companies) m.set(c.id, c.companyName);
    return m;
  }, [companies]);

  const getMenuPriceByName = useCallback(
    (name: string, fallback = 0) => {
      const key = String(name || "")
        .trim()
        .toLowerCase();
      if (!key) return Number(fallback) || 0;
      const mi = menu.find(
        (m) =>
          String(m.name || "")
            .trim()
            .toLowerCase() === key,
      );
      return mi != null ? Number(mi.price) || 0 : Number(fallback) || 0;
    },
    [menu],
  );

  const lineTotal = useMemo(
    () =>
      lineRows.reduce(
        (s, r) =>
          s + (Number(r.qty) || 0) * getMenuPriceByName(r.name, r.unitPrice),
        0,
      ),
    [lineRows, getMenuPriceByName],
  );

  const buildAllowedJson = () => {
    const out: { name: string; itemId?: number }[] = [];
    for (const it of menu) {
      const d = allowedDraft[it.id];
      if (!d?.on) continue;
      out.push({
        name: it.name,
        itemId: it.id,
      });
    }
    return JSON.stringify(out);
  };

  const resetCompanyForm = () => {
    setEditingCompanyId(null);
    setSelCompany(null);
    companyDealForm.reset({
      companyName: "",
      companyTinNumber: "",
      phoneNumber: "",
      email: "",
      payTiming: "AFTER_SERVICE",
      dealNotes: "",
      hotelCorporateCreditTierId: tiers[0]?.id ?? 0,
    });
    setAllowedDraft({});
  };

  const saveCompanyDeal = companyDealForm.handleSubmit(async (values) => {
    const anyAllowed = menu.some((it) => allowedDraft[it.id]?.on);
    if (!anyAllowed) {
      toast.error("Allow at least one menu item for this deal");
      return;
    }
    setCompanyDealSaving(true);
    try {
      const allowedMenuJson = buildAllowedJson();
      const payload = {
        companyName: values.companyName.trim(),
        companyTinNumber: values.companyTinNumber?.trim() || undefined,
        phoneNumber: values.phoneNumber?.trim() || undefined,
        email: (values.email ?? "").trim(),
        payTiming: values.payTiming ?? "AFTER_SERVICE",
        dealNotes: values.dealNotes?.trim() ?? "",
        hotelCorporateCreditTierId: values.hotelCorporateCreditTierId,
        allowedMenuJson,
        imageUrl: logoUrl || "",
      };
      if (editingCompanyId) {
        await updateHotelCreditCompanyApi({
          id: editingCompanyId,
          ...payload,
        });
        toast.success("Company deal updated");
      } else {
        await createHotelCreditCompanyApi(payload);
        toast.success("Submitted for manager authorization");
      }
      await load(true);
      resetCompanyForm();
    } catch (e: unknown) {
      notifyApiFailure(e, "Could not save company deal");
    } finally {
      setCompanyDealSaving(false);
    }
  });

  const loadReport = async () => {
    setReportLoading(true);
    try {
      const from = new Date(`${reportFrom}T00:00:00`).toISOString();
      const to = new Date(`${reportTo}T23:59:59`).toISOString();
      const rows = await fetchHotelCreditConsumptions(from, to);
      setReportRows(rows);
      const pmap = new Map<number, HotelCreditPartyRow>();
      const companyIds = [...new Set(rows.map((r) => r.companyId))];
      for (const cid of companyIds) {
        try {
          const plist: HotelCreditPartyRow[] =
            await fetchHotelCreditParties(cid);
          for (const p of plist) pmap.set(p.id, p);
        } catch {
          /* ignore */
        }
      }
      setReportPartyById(pmap);
    } catch (e: unknown) {
      notifyApiFailure(e, "Could not load usage report");
    } finally {
      setReportLoading(false);
    }
  };

  const reportCompanyOptions = useMemo(() => {
    const ids = [...new Set(reportRows.map((r) => r.companyId))];
    return ids.map((id) => ({
      id: String(id),
      label: companyNameById.get(id) ?? `Company #${id}`,
    }));
  }, [reportRows, companyNameById]);

  const visibleReportRows = useMemo(() => {
    const term = reportSearchTerm.trim().toLowerCase();
    return reportRows.filter((r) => {
      if (
        reportCompanyFilter !== "all" &&
        String(r.companyId) !== reportCompanyFilter
      ) {
        return false;
      }
      if (!term) return true;
      const party = reportPartyById.get(r.partyId);
      const hay = `${party?.displayName ?? ""} ${party?.phoneNumber ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [reportRows, reportCompanyFilter, reportSearchTerm, reportPartyById]);

  const reportColumns = useMemo(
    () =>
      buildCreditorUsageColumns(
        companyNameById,
        reportPartyById,
        "Cashier",
      ),
    [companyNameById, reportPartyById],
  );

  useEffect(() => {
    if (!tiers.length || editingCompanyId != null) return;
    const cur = companyDealForm.getValues("hotelCorporateCreditTierId");
    if (!cur || cur === 0) {
      companyDealForm.setValue("hotelCorporateCreditTierId", tiers[0].id, {
        shouldValidate: true,
      });
    }
  }, [tiers, editingCompanyId, companyDealForm]);

  const tierIdWatch = companyDealForm.watch("hotelCorporateCreditTierId");
  const selectedTier = useMemo(
    () => tiers.find((t) => t.id === tierIdWatch),
    [tiers, tierIdWatch],
  );

  const authorizedCompanies = useMemo(
    () =>
      companies.filter(
        (c) => !c.approvalStatus || c.approvalStatus === "AUTHORIZED",
      ),
    [companies],
  );

  const [occurredYmd, setOccurredYmd] = useState(() =>
    defaultOccurredAtLocal().slice(0, 10),
  );
  const [occurredTime, setOccurredTime] = useState(() =>
    defaultOccurredAtLocal().slice(11, 16),
  );

  const tierLevelSelectList = useMemo(
    () =>
      tiers.map((t) => ({
        id: t.id,
        name: `${t.name} Â· ETB ${Number(t.creditCeiling).toLocaleString()} Â· ${formatCreditCycle(t.timeInterval, t.timeFrame)}`,
        realValue: t.id,
      })),
    [tiers],
  );

  const filteredMenuForDeal = useMemo(() => {
    if (menuCategoryFilter === "all") return menu;
    return menu.filter((m) => m.category === menuCategoryFilter);
  }, [menu, menuCategoryFilter]);

  const itemForAllowedEntry = useCallback(
    (a: { name?: string; itemId?: number }) =>
      menu.find(
        (m) =>
          (a.itemId != null && m.id === a.itemId) ||
          String(m.name).toLowerCase() === String(a.name ?? "").toLowerCase(),
      ),
    [menu],
  );

  const menuItemByName = useCallback(
    (name: string) =>
      menu.find(
        (m) => String(m.name).toLowerCase() === String(name).toLowerCase(),
      ),
    [menu],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-linear-to-b from-background via-muted/20 to-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading terminalâ€¦</span>
      </div>
    );
  }

  const sectionMeta = HOTEL_CASHIER_NAV_ITEMS.find(
    (s) => s.id === activeSection,
  );
  const SectionIcon =
    activeSection === "companies"
      ? Building2
      : activeSection === "usage"
        ? Receipt
        : Table2;

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
                <Receipt className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  Terminal
                </p>
                <span className="block truncate font-semibold leading-tight">
                  Hotel cashier
                </span>
              </div>
            </div>
          </SidebarHeader>
          <div className="shrink-0 px-3 pb-2 pt-3">
            <SidebarSeparator className="bg-sidebar-border/80" />
          </div>
          <SidebarContent className="flex-1 gap-0 px-2 pb-4 pt-2">
            <SidebarMenu className="gap-1">
              {HOTEL_CASHIER_NAV_ITEMS.map((item) => {
                const Icon =
                  item.icon === "Building2"
                    ? Building2
                    : item.icon === "Receipt"
                      ? Receipt
                      : Table2;
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

        <SidebarInset className="flex min-h-svh flex-1 flex-col overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/20 md:m-2 md:ml-0 md:max-h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-border/80 md:bg-background md:shadow-lg md:ring-1 md:ring-black/5 dark:md:ring-white/10">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:h-16 md:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground md:text-sm">
                {displayName || "Property"}
              </h1>
              <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                {sectionMeta?.label ?? "Hotel cashier"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => load(true)}
              disabled={refreshing}
              aria-label="Refresh"
              className={refreshing ? "animate-spin" : ""}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8 shrink-0 border shadow-sm">
              <AvatarImage src={logoUrl || undefined} alt="" />
              <AvatarFallback className="text-xs font-semibold">
                {(displayName || "H").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/60 bg-muted/20 p-4">
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-5 scroll-smooth md:px-6 md:py-6">
              <div className="mx-auto max-w-6xl space-y-10 pb-10">
                <div className="rounded-2xl border border-border/70 bg-linear-to-br from-card via-card to-primary/6 p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10 md:p-8 lg:p-10">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 md:h-14 md:w-14">
                      <SectionIcon className="h-6 w-6 text-primary md:h-7 md:w-7" />
                    </div>
                    <div className="min-w-0 space-y-2.5">
                      <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                        {sectionMeta?.label ?? "Hotel cashier"}
                      </h2>
                      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty md:text-[15px] md:leading-relaxed">
                        {sectionMeta?.description}
                      </p>
                    </div>
                  </div>
                </div>

                {activeSection === "companies" && (
                  <div className="space-y-6 md:space-y-8 focus-visible:outline-none">
                    {tiers.length === 0 && (
                      <Alert className="border-amber-500/30 bg-amber-500/5">
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertTitle>No credit tiers yet</AlertTitle>
                        <AlertDescription>
                          Your manager must add at least one tier under{" "}
                          <strong>Manager â†’ Corporate credit tiers</strong>{" "}
                          before you can register a company deal.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
                      <Card className="flex flex-col gap-0 overflow-hidden py-0 shadow-md lg:col-span-5 border-border/80">
                        <CardHeader className="shrink-0 border-b bg-muted/30 px-5 py-5 md:px-6">
                          <CardTitle className="text-base md:text-lg">
                            Companies
                          </CardTitle>
                          <CardDescription className="mt-1.5 leading-relaxed">
                            Select to edit or start fresh.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex min-h-0 flex-1 px-0 pb-0 pt-0">
                          <ScrollArea className="h-[min(28rem,55vh)] w-full">
                            <div className="space-y-3 p-4 md:p-5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-center border-dashed"
                                onClick={() => resetCompanyForm()}
                              >
                                New company deal
                              </Button>
                              {companies.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setSelCompany(c);
                                    setEditingCompanyId(c.id);
                                    companyDealForm.reset({
                                      companyName: c.companyName,
                                      companyTinNumber: c.companyTinNumber ?? "",
                                      phoneNumber: c.phoneNumber ?? "",
                                      email: c.email ?? "",
                                      payTiming:
                                        (c.payTiming as "NOW" | "AFTER_SERVICE") ??
                                        "AFTER_SERVICE",
                                      dealNotes: c.dealNotes ?? "",
                                      hotelCorporateCreditTierId:
                                        c.hotelCorporateCreditTierId != null
                                          ? c.hotelCorporateCreditTierId
                                          : (tiers[0]?.id ?? 0),
                                    });
                                    const ad: AllowedDraft = {};
                                    let arr: any[] = [];
                                    try {
                                      arr = JSON.parse(
                                        c.allowedMenuJson || "[]",
                                      );
                                    } catch {
                                      arr = [];
                                    }
                                    for (const it of menu) {
                                      const hit = arr.find(
                                        (x) =>
                                          String(x.name).toLowerCase() ===
                                          it.name.toLowerCase(),
                                      );
                                      ad[it.id] = {
                                        on: !!hit,
                                      };
                                    }
                                    setAllowedDraft(ad);
                                  }}
                                  className={`w-full rounded-xl border p-4 text-left transition-all hover:bg-muted/50 hover:border-primary/25 ${
                                    editingCompanyId === c.id
                                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                                      : "border-border/70 bg-card/80"
                                  }`}
                                >
                                  <div className="font-semibold text-sm leading-snug">
                                    {c.companyName}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-normal"
                                    >
                                      {c.approvalStatus === "PENDING_MANAGER"
                                        ? "Pending manager"
                                        : c.approvalStatus === "AUTHORIZED"
                                          ? "Authorized"
                                          : c.approvalStatus || "Draft"}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-normal"
                                    >
                                      {c.creditLevel}
                                    </Badge>
                                    <span className="tabular-nums">
                                      ETB{" "}
                                      {Number(c.creditLimit).toLocaleString()}
                                    </span>
                                    <span>
                                      Â·{" "}
                                      {formatCreditCycle(
                                        c.timeInterval,
                                        c.timeFrame,
                                      )}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      <div className="flex flex-col gap-8 lg:col-span-7">
                        <Card className="gap-0 overflow-hidden py-0 shadow-md border-border/80">
                          <div className="h-1.5 shrink-0 bg-linear-to-r from-primary/70 via-violet-500/50 to-cyan-500/40" />
                          <CardHeader className="px-5 pb-4 pt-6 md:px-6 md:pb-5 md:pt-8">
                            <CardTitle className="text-lg md:text-xl leading-snug">
                              {editingCompanyId
                                ? "Edit company deal"
                                : "New company deal"}
                            </CardTitle>
                            <CardDescription className="mt-2 max-w-prose leading-relaxed">
                              Tier sets the money ceiling and rolling period.
                              New deals require manager authorization; the manager
                              prints the corporate meal agreement.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-8 px-5 pb-8 pt-2 md:px-6 md:pb-10 md:space-y-10">
                            <Form {...companyDealForm}>
                              <form className="space-y-8 md:space-y-10">
                                <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-6">
                                  <CustomFormField
                                    name="companyName"
                                    control={companyDealForm.control}
                                    fieldType={formFieldTypes.INPUT}
                                    label="Company name"
                                    inputClassName="h-10 w-56"
                                  />
                                  <CustomFormField
                                    name="companyTinNumber"
                                    control={companyDealForm.control}
                                    fieldType={formFieldTypes.INPUT}
                                    label="Company TIN (10 digits)"
                                    inputClassName="h-10 w-56"
                                  />
                                  <CustomFormField
                                    name="payTiming"
                                    control={companyDealForm.control}
                                    fieldType={formFieldTypes.SELECT}
                                    label="Payment timing"
                                    listdisplay={[
                                      { value: "NOW", label: "Pay now" },
                                      {
                                        value: "AFTER_SERVICE",
                                        label: "Pay after service",
                                      },
                                    ]}
                                    inputClassName="h-10 w-56"
                                  />
                                  <CustomFormField
                                    name="phoneNumber"
                                    control={companyDealForm.control}
                                    fieldType={formFieldTypes.PHONE_INPUT}
                                    label="Phone"
                                    inputClassName="w-full min-w-0"
                                    formItemClassName="w-56 min-w-0"
                                  />
                                  <CustomFormField
                                    name="hotelCorporateCreditTierId"
                                    control={companyDealForm.control}
                                    fieldType={formFieldTypes.SELECT}
                                    label="Tier Level"
                                    isNumeric
                                    disabled={tiers.length === 0}
                                    listdisplay={tierLevelSelectList}
                                    inputClassName="h-fit w-56 p-2 md:max-w-xs"
                                  />
                                  <CustomFormField
                                    name="email"
                                    control={companyDealForm.control}
                                    fieldType={formFieldTypes.INPUT}
                                    label="Email"
                                    type="email"
                                    inputClassName="h-10 w-56"
                                  />
                                </div>

                                {selectedTier && (
                                  <p className="text-xs leading-relaxed text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      {selectedTier.name}
                                    </span>{" "}
                                    â€” {tierSummary(selectedTier)}. Limits apply
                                    when you save.
                                  </p>
                                )}

                                <CustomFormField
                                  name="dealNotes"
                                  control={companyDealForm.control}
                                  fieldType={formFieldTypes.TEXTAREA}
                                  label="Internal notes"
                                  inputClassName="resize-y min-h-[72px] w-full ml-0"
                                />
                              </form>
                            </Form>

                            <div className="space-y-4 md:space-y-5">
                              <div className="space-y-2">
                                <Label className="text-base font-semibold md:text-lg">
                                  Allowed menu for this company
                                </Label>
                                <p className="max-w-prose text-xs leading-relaxed text-muted-foreground md:text-sm">
                                  Check dishes and drinks this company may
                                  order.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2.5">
                                {(
                                  ["all", "Food", "Beverage", "Others"] as const
                                ).map((cat) => (
                                  <Button
                                    key={cat}
                                    type="button"
                                    size="sm"
                                    variant={
                                      menuCategoryFilter === cat
                                        ? "default"
                                        : "outline"
                                    }
                                    className="rounded-full h-8 text-xs"
                                    onClick={() => setMenuCategoryFilter(cat)}
                                  >
                                    {cat === "all" ? "All items" : cat}
                                  </Button>
                                ))}
                              </div>
                              <ScrollArea className="h-[min(34rem,65vh)] rounded-xl border border-border/70 bg-muted/10">
                                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 lg:gap-5">
                                  {filteredMenuForDeal.map((it) => (
                                    <div
                                      key={it.id}
                                      className={cn(
                                        "rounded-xl border bg-card overflow-hidden shadow-sm transition-all",
                                        allowedDraft[it.id]?.on
                                          ? "ring-2 ring-primary border-primary/35 shadow-md"
                                          : "border-border/70 hover:border-primary/25",
                                      )}
                                    >
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        className="relative aspect-square bg-muted cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        onClick={() =>
                                          setAllowedDraft((d) => ({
                                            ...d,
                                            [it.id]: {
                                              on: !d[it.id]?.on,
                                            },
                                          }))
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" ||
                                            e.key === " "
                                          ) {
                                            e.preventDefault();
                                            setAllowedDraft((d) => ({
                                              ...d,
                                              [it.id]: {
                                                on: !d[it.id]?.on,
                                              },
                                            }));
                                          }
                                        }}
                                      >
                                        {it.imageUrl ? (
                                          <Image
                                            src={it.imageUrl}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            sizes="(max-width:640px) 50vw, 25vw"
                                          />
                                        ) : (
                                          <div className="flex h-full items-center justify-center text-muted-foreground">
                                            <Package className="h-12 w-12 opacity-35" />
                                          </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/50 to-transparent px-2.5 pb-2 pt-6">
                                          <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                                            {it.name}
                                          </p>
                                          <p className="mt-1 text-[10px] tabular-nums text-emerald-200">
                                            ETB{" "}
                                            {Number(it.price).toLocaleString()}
                                          </p>
                                        </div>
                                        <Badge
                                          variant="secondary"
                                          className="absolute top-2 right-2 text-[10px] font-normal bg-background/90 backdrop-blur-sm border border-border/60"
                                        >
                                          {it.category}
                                        </Badge>
                                      </div>
                                      <div
                                        className="space-y-2 border-t border-border/60 bg-card/95 p-3 md:p-3.5"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                                          <Checkbox
                                            checked={!!allowedDraft[it.id]?.on}
                                            onCheckedChange={(ck) =>
                                              setAllowedDraft((d) => ({
                                                ...d,
                                                [it.id]: {
                                                  on: ck === true,
                                                },
                                              }))
                                            }
                                            className="h-5 w-5 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                          />
                                          Select item
                                        </label>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                              {menu.length === 0 && (
                                <Alert className="border-amber-500/30 bg-amber-500/5">
                                  <Info className="h-4 w-4 text-amber-600" />
                                  <AlertTitle>No menu items</AlertTitle>
                                  <AlertDescription>
                                    Your manager can add dishes & drinks under{" "}
                                    <strong className="text-foreground">
                                      Manager â†’ Add menu item
                                    </strong>
                                    â€” then they appear here with photos.
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-3 pt-1">
                              <PendingButton
                                type="button"
                                disabled={tiers.length === 0}
                                className="min-h-11 px-6"
                                pending={companyDealSaving}
                                onClick={() => void saveCompanyDeal()}
                              >
                                {editingCompanyId
                                  ? "Save company"
                                  : "Create company"}
                              </PendingButton>
                              {editingCompanyId && (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="min-h-11 px-5"
                                    onClick={() => resetCompanyForm()}
                                  >
                                    Cancel
                                  </Button>
                                  <PendingButton
                                    type="button"
                                    variant="destructive"
                                    className="min-h-11 px-5"
                                    pending={companyDeleting}
                                    onClick={async () => {
                                      if (!editingCompanyId) return;
                                      if (
                                        !confirm(
                                          "Delete this company and all guests / usage?",
                                        )
                                      )
                                        return;
                                      setCompanyDeleting(true);
                                      try {
                                        await deleteHotelCreditCompanyApi(
                                          editingCompanyId,
                                        );
                                        await load(true);
                                        resetCompanyForm();
                                      } catch (e: unknown) {
                                        notifyApiFailure(
                                          e,
                                          "Could not delete company",
                                        );
                                      } finally {
                                        setCompanyDeleting(false);
                                      }
                                    }}
                                  >
                                    Delete company
                                  </PendingButton>
                                </>
                              )}
                            </div>

                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "usage" && (
                  <div className="space-y-6 md:space-y-8 focus-visible:outline-none">
                    <Card className="gap-0 overflow-hidden py-0 shadow-md border-border/80">
                      <div className="h-1.5 shrink-0 bg-linear-to-r from-emerald-500/60 to-teal-400/40" />
                      <CardHeader className="px-5 pb-4 pt-6 md:px-6 md:pb-5 md:pt-8">
                        <CardTitle className="text-lg md:text-xl leading-snug">
                          Register consumption
                        </CardTitle>
                        <CardDescription className="mt-2 max-w-prose leading-relaxed">
                          Pick the company, add lines from the deal menu, and
                          set date/time. Price is fetched from saved items and
                          totals are calculated automatically.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="mx-auto w-full max-w-6xl space-y-8 px-5 pb-8 pt-2 md:px-6 md:pb-10 md:space-y-10">
                        <Form {...consumptionMetaForm}>
                          <div className="space-y-5 rounded-xl border border-border/60 bg-muted/20 p-4 md:p-5">
                            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                              <div className="space-y-2.5">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Company
                                </Label>
                                <Select
                                  value={selCompany ? String(selCompany.id) : ""}
                                  onValueChange={(v) => {
                                    const c = companies.find(
                                      (x) => String(x.id) === v,
                                    );
                                    setSelCompany(c || null);
                                    setEditingCompanyId(c?.id ?? null);
                                  }}
                                >
                                  <SelectTrigger className="h-10 w-56">
                                    <SelectValue placeholder="Select company" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {authorizedCompanies.map((c) => (
                                      <SelectItem key={c.id} value={String(c.id)}>
                                        {c.companyName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <HotelDayPicker
                                label="Date"
                                value={occurredYmd}
                                onChange={setOccurredYmd}
                                className="min-w-[200px]"
                              />
                              <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Time
                                </Label>
                                <Input
                                  type="time"
                                  value={occurredTime}
                                  onChange={(e) => setOccurredTime(e.target.value)}
                                  className="h-10 w-36"
                                />
                              </div>
                            </div>
                            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                              <CustomFormField
                                name="guestName"
                                control={consumptionMetaForm.control}
                                fieldType={formFieldTypes.INPUT}
                                label="Staff / Guest name"
                                inputClassName="h-10 w-56 ml-0"
                                formItemClassName="space-y-2"
                              />
                              <CustomFormField
                                name="guestPhone"
                                control={consumptionMetaForm.control}
                                fieldType={formFieldTypes.PHONE_INPUT}
                                label="Staff / Guest phone"
                                inputClassName="h-10 w-56 ml-0"
                                formItemClassName="space-y-2"
                              />
                            </div>
                          </div>
                        </Form>

                        <div className="space-y-4 md:space-y-5">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                              Line items
                            </Label>
                            <p className="max-w-prose text-xs leading-relaxed text-muted-foreground md:text-sm">
                              Only items allowed on the company deal appear
                              here; unit price defaults from the menu.
                            </p>
                          </div>
                          <div className="flex flex-col gap-4 md:gap-5">
                            {lineRows.map((row, idx) => {
                              const rowMenu = menuItemByName(row.name);
                              return (
                                <div
                                  key={idx}
                                  className="flex flex-wrap items-end gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm md:gap-5"
                                >
                                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted shadow-inner">
                                    {rowMenu?.imageUrl ? (
                                      <Image
                                        src={rowMenu.imageUrl}
                                        alt=""
                                        fill
                                        className="object-cover"
                                        sizes="56px"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center">
                                        <Package className="h-6 w-6 text-muted-foreground opacity-35" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-[200px] flex-1 space-y-2">
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                      Item
                                    </span>
                                    <Select
                                      value={row.name}
                                      onValueChange={(v) =>
                                        setLineRows((rows) =>
                                          rows.map((r, i) => {
                                            if (i !== idx) return r;
                                            const mi = menuItemByName(v);
                                            const price =
                                              mi != null
                                                ? Number(mi.price) || 0
                                                : r.unitPrice;
                                            return {
                                              ...r,
                                              name: v,
                                              unitPrice: price,
                                            };
                                          }),
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-10">
                                        <SelectValue placeholder="From deal list" />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[min(24rem,70vh)]">
                                        {allowedList.map((a: any) => {
                                          const mi = itemForAllowedEntry(a);
                                          return (
                                            <SelectItem
                                              key={String(a.name)}
                                              value={String(a.name)}
                                            >
                                              <span className="flex items-center gap-2 py-0.5">
                                                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border bg-muted">
                                                  {mi?.imageUrl ? (
                                                    <Image
                                                      src={mi.imageUrl}
                                                      alt=""
                                                      fill
                                                      className="object-cover"
                                                      sizes="36px"
                                                    />
                                                  ) : (
                                                    <span className="flex h-full w-full items-center justify-center">
                                                      <Package className="h-4 w-4 text-muted-foreground opacity-50" />
                                                    </span>
                                                  )}
                                                </span>
                                                <span className="flex flex-col gap-0 leading-tight">
                                                  <span className="truncate font-medium">
                                                    {a.name}
                                                  </span>
                                                  {mi != null && (
                                                    <span className="text-[11px] text-muted-foreground tabular-nums">
                                                      ETB{" "}
                                                      {Number(
                                                        mi.price,
                                                      ).toLocaleString()}
                                                    </span>
                                                  )}
                                                </span>
                                              </span>
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="w-24 space-y-2">
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                      Qty
                                    </span>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1}
                                      className="h-10"
                                      value={row.qty}
                                      onChange={(e) =>
                                        setLineRows((rows) =>
                                          rows.map((r, i) =>
                                            i === idx
                                              ? {
                                                  ...r,
                                                  qty: Number(e.target.value),
                                                }
                                              : r,
                                          ),
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="w-28 space-y-2">
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                      ETB
                                    </span>
                                    <div className="flex h-10 items-center rounded-md border border-border/80 bg-muted/40 px-3 text-sm tabular-nums">
                                      {getMenuPriceByName(
                                        row.name,
                                        row.unitPrice,
                                      ).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-10 w-full sm:w-auto"
                            onClick={() =>
                              setLineRows((r) => [
                                ...r,
                                { name: "", qty: 1, unitPrice: 0 },
                              ])
                            }
                          >
                            Add line
                          </Button>
                        </div>

                        <div className="flex flex-col gap-4 border-t pt-8 mt-2 sm:flex-row sm:items-center sm:justify-between md:pt-10">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Total</span>{" "}
                            <span className="text-lg font-semibold tabular-nums">
                              ETB {lineTotal.toFixed(2)}
                            </span>
                          </div>
                          <PendingButton
                            type="button"
                            className="min-h-11 px-8 sm:shrink-0"
                            disabled={
                              !selCompany || lineRows.every((r) => !r.name)
                            }
                            pending={consumptionSaving}
                            onClick={async () => {
                              const metaOk =
                                await consumptionMetaForm.trigger();
                              if (!metaOk) return;
                              if (!selCompany) return;
                              if (
                                selCompany.approvalStatus &&
                                selCompany.approvalStatus !== "AUTHORIZED"
                              ) {
                                toast.error(
                                  "Company must be authorized by manager before usage",
                                );
                                return;
                              }
                              const lines = lineRows
                                .filter((r) => r.name)
                                .map((r) => ({
                                  ...r,
                                  unitPrice: getMenuPriceByName(
                                    r.name,
                                    r.unitPrice,
                                  ),
                                }));
                              setConsumptionSaving(true);
                              try {
                                await createHotelCreditConsumptionApi({
                                  companyId: selCompany.id,
                                  guestName:
                                    consumptionMetaForm
                                      .getValues("guestName")
                                      ?.trim() || undefined,
                                  guestPhone:
                                    consumptionMetaForm
                                      .getValues("guestPhone")
                                      ?.trim() || undefined,
                                  linesJson: JSON.stringify(lines),
                                  totalAmount: lineTotal,
                                  occurredAt: new Date(
                                    `${occurredYmd}T${occurredTime}`,
                                  ).toISOString(),
                                });
                                setLineRows([
                                  { name: "", qty: 1, unitPrice: 0 },
                                ]);
                                consumptionMetaForm.reset({
                                  guestName: "",
                                  guestPhone: "",
                                });
                                setOccurredYmd(defaultOccurredAtLocal().slice(0, 10));
                                setOccurredTime(defaultOccurredAtLocal().slice(11, 16));
                              } catch (e: unknown) {
                                notifyApiFailure(
                                  e,
                                  "Could not save consumption",
                                );
                              } finally {
                                setConsumptionSaving(false);
                              }
                            }}
                          >
                            Save consumption
                          </PendingButton>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeSection === "report" && (
                  <div className="space-y-6 md:space-y-8 focus-visible:outline-none">
                    <Card className="gap-0 overflow-hidden py-0 shadow-md border-border/80">
                      <CardHeader className="px-5 pb-4 pt-6 md:px-6 md:pb-5 md:pt-8">
                        <CardTitle className="text-lg md:text-xl leading-snug">
                          Usage by date
                        </CardTitle>
                        <CardDescription className="mt-2 max-w-prose leading-relaxed">
                          Filter when the meal was recorded. Hotel store
                          accounts cannot open this report.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 px-5 pb-8 pt-2 md:px-6 md:pb-10 md:space-y-8">
                        <div className="flex flex-wrap items-end gap-4 md:gap-5">
                          <HotelDayPicker
                            label="From"
                            value={reportFrom}
                            onChange={setReportFrom}
                            className="min-w-[180px]"
                          />
                          <HotelDayPicker
                            label="To"
                            value={reportTo}
                            onChange={setReportTo}
                            className="min-w-[180px]"
                          />
                          <PendingButton
                            type="button"
                            className="min-h-11 px-6"
                            pending={reportLoading}
                            onClick={() => void loadReport()}
                          >
                            Run report
                          </PendingButton>
                        </div>
                        <div className="flex flex-wrap items-end gap-4 md:gap-5">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                              Company
                            </Label>
                            <Select
                              value={reportCompanyFilter}
                              onValueChange={setReportCompanyFilter}
                            >
                              <SelectTrigger className="h-10 w-[220px]">
                                <SelectValue placeholder="All companies" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All companies</SelectItem>
                                {reportCompanyOptions.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                              Staff / Phone search
                            </Label>
                            <Input
                              value={reportSearchDraft}
                              onChange={(e) => setReportSearchDraft(e.target.value)}
                              placeholder="Search person name or phone"
                              className="h-10 w-[260px]"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-11 px-6"
                            onClick={() => setReportSearchTerm(reportSearchDraft)}
                          >
                            Search
                          </Button>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-border/70 p-4">
                          <DataTable
                            columns={reportColumns}
                            data={visibleReportRows}
                            emptyMessage="No usage rows match your filters."
                          />
                        </div>
                      </CardContent>
                    </Card>
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
