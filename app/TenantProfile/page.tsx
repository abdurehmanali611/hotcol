"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  Clock3,
  Loader2,
  MessageCircle,
  Receipt,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TenantFeedbackCenter } from "@/components/feedback/TenantFeedbackCenter";
import { SignupPricingSummary } from "@/components/signup/SignupModuleSelector";
import { MODULE_OPTIONS, type BusinessType, type ModuleOption } from "@/constants";
import {
  MODULE_DESCRIPTIONS,
  formatETB,
  isModuleDisabledAtSignup,
} from "@/lib/subscriptionModules";
import {
  readTenantBillingFromStorage,
  readTenantModulesFromStorage,
} from "@/lib/tenantModules";
import {
  getSubscriptionPeriodStatus,
  isAdminOrManagerRole,
  readLoggedInRole,
  subscriptionBlockMessage,
} from "@/lib/tenantAccess";
import {
  isLodgingBusinessType,
  readBusinessTypeFromStorage,
  subscriptionRenewalAmountETB,
} from "@/lib/subscriptionBillingPeriod";
import { requestTenantModuleChange } from "@/lib/actions";

type TenantProfileState = {
  role: string;
  userName: string;
  displayName: string;
  tenantKey: string;
  tinNumber: string;
  logoUrl: string;
  businessType: BusinessType;
  modules: ModuleOption[];
};

type ModuleRequestMode = "add" | "remove";

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatBooleanStatus(value: boolean, yes: string, no: string): string {
  return value ? yes : no;
}

function formatSubscriptionStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildTenantLandingPath(profile: TenantProfileState): string {
  const basePath = profile.role === "Admin" ? "/Admin" : "/Manager";
  const params = new URLSearchParams({
    hotel: profile.tenantKey,
    logo: profile.logoUrl || "",
    role: profile.role,
  });
  return `${basePath}?${params.toString()}`;
}

function readTenantProfileState(): TenantProfileState | null {
  if (typeof window === "undefined") return null;
  const role = localStorage.getItem("user_role")?.trim() || "";
  const businessType = readBusinessTypeFromStorage();
  const tinNumber = localStorage.getItem("tin_number")?.trim() || "";
  const tenantKey =
    tinNumber || localStorage.getItem("hotel_name")?.trim() || "";
  if (!role || !businessType) return null;
  return {
    role,
    userName: localStorage.getItem("user_name")?.trim() || "Tenant user",
    displayName: localStorage.getItem("hotel_display_name")?.trim() || "Your property",
    tenantKey,
    tinNumber,
    logoUrl: localStorage.getItem("logo_url")?.trim() || "",
    businessType: businessType as BusinessType,
    modules: readTenantModulesFromStorage(),
  };
}

function TenantProfileContent() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [profile, setProfile] = useState<TenantProfileState | null>(null);
  const [requestMode, setRequestMode] = useState<ModuleRequestMode>("add");
  const [selectedModules, setSelectedModules] = useState<ModuleOption[]>([]);
  const [requestNote, setRequestNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const role = readLoggedInRole();
    if (!isAdminOrManagerRole(role)) {
      router.replace("/");
      return;
    }
    const next = readTenantProfileState();
    if (!next) {
      router.replace("/");
      return;
    }
    setProfile(next);
    setAllowed(true);
  }, [router]);

  const billing = readTenantBillingFromStorage();
  const subscriptionStatus = getSubscriptionPeriodStatus();

  const requestableModules = useMemo(() => {
    if (!profile) return [] as ModuleOption[];
    const current = new Set(profile.modules);
    return MODULE_OPTIONS.filter((moduleName) => {
      if (moduleName === "Credentials(Common)") return false;
      if (current.has(moduleName)) return false;
      return !isModuleDisabledAtSignup(moduleName, profile.businessType);
    }) as ModuleOption[];
  }, [profile]);

  const removableModules = useMemo(() => {
    if (!profile) return [] as ModuleOption[];
    return profile.modules.filter(
      (moduleName) => moduleName !== "Credentials(Common)",
    );
  }, [profile]);

  const moduleOptionsForMode = requestMode === "add" ? requestableModules : removableModules;

  const projectedModules = useMemo(() => {
    if (!profile) return [] as ModuleOption[];
    const set = new Set<ModuleOption>(profile.modules);
    if (requestMode === "add") {
      for (const moduleName of selectedModules) set.add(moduleName);
    } else {
      for (const moduleName of selectedModules) set.delete(moduleName);
    }
    return MODULE_OPTIONS.filter((moduleName) => set.has(moduleName)) as ModuleOption[];
  }, [profile, requestMode, selectedModules]);

  const requestVerb = requestMode === "add" ? "add" : "remove";
  const requestTitle = requestMode === "add" ? "Add modules" : "Remove modules";
  const requestEmptyState =
    requestMode === "add"
      ? "No additional modules are available to request right now for this property."
      : "There are no removable modules on this tenant right now.";
  const requestPlaceholder =
    requestMode === "add"
      ? "Example: Please enable Inventory and Financial Management before next month because our store and finance teams are starting training."
      : "Example: Please remove Cafe and Restaurant because this branch no longer runs dine-in service and we want billing aligned with active operations.";

  const handleToggleModule = (moduleName: ModuleOption, checked: boolean) => {
    setSelectedModules((prev) => {
      const set = new Set(prev);
      if (checked) set.add(moduleName);
      else set.delete(moduleName);
      return moduleOptionsForMode.filter((item) => set.has(item));
    });
  };

  const handleSubmitRequest = async () => {
    if (!profile || selectedModules.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await requestTenantModuleChange({
        changeType: requestMode,
        modules: selectedModules,
        requestNote: requestNote.trim() || undefined,
      });
      toast.success(
        requestMode === "add"
          ? "Module add request sent to Apex."
          : "Module removal request sent to Apex.",
      );
      setSelectedModules([]);
      setRequestNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send module request");
    } finally {
      setSubmitting(false);
    }
  };

  if (!allowed || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const renewalLabel = isLodgingBusinessType(profile.businessType)
    ? "Yearly renewal"
    : "Quarterly renewal";
  const renewalAmount = subscriptionRenewalAmountETB(
    billing.quarterlyFeeETB,
    profile.businessType,
  );
  const landingPath = buildTenantLandingPath(profile);
  const statusLabel = formatSubscriptionStatusLabel(subscriptionStatus);
  const billingCycleLabel = isLodgingBusinessType(profile.businessType)
    ? "Yearly billing cycle"
    : "Quarterly billing cycle";
  const overviewStats = [
    {
      label: "Subscribed modules",
      value: String(profile.modules.length),
      detail: "Currently active on this tenant",
    },
    {
      label: "Available to add",
      value: String(requestableModules.length),
      detail: "Extra modules this tenant can request",
    },
    {
      label: "Available to remove",
      value: String(removableModules.length),
      detail: "Active modules eligible for removal request",
    },
    {
      label: "Billing status",
      value: statusLabel,
      detail: subscriptionBlockMessage(subscriptionStatus),
    },
  ];
  const infoCards = [
    {
      label: "Property name",
      value: profile.displayName,
    },
    {
      label: "Tenant key",
      value: profile.tenantKey || "Not available",
      mono: true,
    },
    {
      label: "TIN number",
      value: profile.tinNumber || "Not available",
      mono: true,
    },
    {
      label: "Signed-in user",
      value: profile.userName,
    },
    {
      label: "Business type",
      value: profile.businessType,
    },
    {
      label: "Access role",
      value: profile.role,
    },
    {
      label: "Billing cycle",
      value: billingCycleLabel,
    },
    {
      label: "Billing started",
      value: formatDateLabel(billing.billingStartedAt),
    },
    {
      label: "Subscription paid until",
      value: formatDateLabel(billing.subscriptionPaidUntil),
    },
    {
      label: "Joined Apex",
      value: formatDateLabel(billing.createdAt),
    },
  ];
  const healthCards = [
    {
      label: "Setup fee approval",
      value: formatBooleanStatus(
        billing.setupFeeApproved,
        "Approved",
        "Awaiting approval",
      ),
      icon: BadgeCheck,
    },
    {
      label: "Subscription payment",
      value: formatBooleanStatus(
        billing.subscriptionPaymentApproved,
        "Approved",
        "Awaiting approval",
      ),
      icon: ShieldCheck,
    },
    {
      label: "Billing hold",
      value: formatBooleanStatus(billing.billingHold, "On hold", "Active"),
      icon: Clock3,
    },
    {
      label: "Tenant type",
      value: formatBooleanStatus(
        billing.isIllustrationTenant,
        "Illustration tenant",
        "Live tenant",
      ),
      icon: Building2,
    },
  ];
  const tenantMeta = [
    {
      label: "Awaiting self-signup setup",
      value: formatBooleanStatus(
        Boolean(billing.awaitingSelfSignupSetup),
        "Yes",
        "No",
      ),
    },
    {
      label: "Latest payment reference",
      value: billing.paymentTransactionRef || "Not submitted",
    },
    {
      label: "Projected modules after request",
      value:
        projectedModules.length > 0
          ? `${projectedModules.length} modules`
          : "No modules would remain",
    },
  ];
  const infoCardAccents = [
    "bg-linear-to-br from-sky-500/6 via-background to-background",
    "bg-linear-to-br from-violet-500/6 via-background to-background",
    "bg-linear-to-br from-cyan-500/6 via-background to-background",
    "bg-linear-to-br from-emerald-500/6 via-background to-background",
    "bg-linear-to-br from-amber-500/6 via-background to-background",
    "bg-linear-to-br from-fuchsia-500/6 via-background to-background",
  ];
  const healthCardAccents = [
    "bg-linear-to-br from-emerald-500/6 via-background/95 to-background",
    "bg-linear-to-br from-sky-500/6 via-background/95 to-background",
    "bg-linear-to-br from-amber-500/6 via-background/95 to-background",
    "bg-linear-to-br from-violet-500/6 via-background/95 to-background",
  ];
  const overviewStatAccents = [
    "bg-linear-to-br from-primary/8 via-primary/4 to-background",
    "bg-linear-to-br from-cyan-500/8 via-cyan-500/4 to-background",
    "bg-linear-to-br from-rose-500/8 via-rose-500/4 to-background",
    "bg-linear-to-br from-violet-500/8 via-violet-500/4 to-background",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 md:px-6 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push(landingPath)}>
            <ArrowLeft className="h-4 w-4" />
            Back to {profile.role} front page
          </Button>
          <div className="flex items-center gap-2">
            <TenantFeedbackCenter />
          </div>
        </div>

        <Card className="overflow-hidden border-border/70 bg-linear-to-br from-primary/5 via-violet-500/4 to-cyan-500/5 shadow-md ring-1 ring-black/5 dark:ring-white/10">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-md">
                    <AvatarImage src={profile.logoUrl} alt={profile.displayName} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Building2 className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{profile.role}</Badge>
                      <Badge variant="outline">{profile.businessType}</Badge>
                      <Badge variant="outline">{statusLabel}</Badge>
                    </div>
                    <div className="space-y-1">
                      <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                        {profile.displayName}
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Premium tenant profile with identity, billing health, active modules,
                        and polished change requests for Apex.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {profile.tinNumber ? (
                        <span className="font-mono">TIN {profile.tinNumber}</span>
                      ) : null}
                      {profile.tenantKey ? (
                        <span className="font-mono">Tenant key {profile.tenantKey}</span>
                      ) : null}
                      <span>{profile.modules.length} subscribed modules</span>
                    </div>
                  </div>
                </div>

                <div className="grid min-w-60 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-primary/12 bg-background/85 px-4 py-3 shadow-sm">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Setup fee
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatETB(billing.setupFeeETB)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-violet-500/12 bg-background/85 px-4 py-3 shadow-sm">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {renewalLabel}
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatETB(renewalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {healthCards.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`rounded-2xl border border-border/70 p-4 shadow-sm ${healthCardAccents[index % healthCardAccents.length]}`}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        <p className="text-[11px] uppercase tracking-wide">{item.label}</p>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {overviewStats.map((item, index) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl border border-border/60 p-4 shadow-sm ${overviewStatAccents[index % overviewStatAccents.length]}`}
                  >
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur-sm">
            <TabsTrigger
              value="overview"
              className="gap-2 rounded-xl border border-transparent py-2 text-sm font-semibold text-muted-foreground transition-all data-[state=active]:border-primary/15 data-[state=active]:bg-linear-to-r data-[state=active]:from-primary/12 data-[state=active]:via-violet-500/10 data-[state=active]:to-cyan-500/12 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Building2 className="h-3.5 w-3.5" />
              </span>
              Tenant overview
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="gap-2 rounded-xl border border-transparent py-2 text-sm font-semibold text-muted-foreground transition-all data-[state=active]:border-violet-500/15 data-[state=active]:bg-linear-to-r data-[state=active]:from-violet-500/12 data-[state=active]:via-primary/10 data-[state=active]:to-cyan-500/12 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/12 text-violet-600 dark:text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              Module requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
              <Card className="overflow-hidden border-border/70 bg-card/95 shadow-md ring-1 ring-black/5 dark:ring-white/10">
                <CardHeader className="border-b border-border/60 bg-linear-to-r from-primary/5 via-card to-card pb-4">
                  <CardTitle className="text-lg">Tenant identity and billing</CardTitle>
                  <CardDescription>
                    Canonical tenant information, subscription milestones, and access context
                    for the signed-in property.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 p-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {infoCards.map((item, index) => (
                      <div
                        key={item.label}
                        className={`rounded-2xl border border-border/60 p-4 shadow-sm ${infoCardAccents[index % infoCardAccents.length]}`}
                      >
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {item.label}
                        </p>
                        <p
                          className={`mt-2 text-sm font-semibold text-foreground ${item.mono ? "font-mono" : ""}`}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-primary/5 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        Subscription status
                      </p>
                      <Badge variant="outline">{statusLabel}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {subscriptionBlockMessage(subscriptionStatus)}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {tenantMeta.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm"
                      >
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="overflow-hidden border-border/70 bg-card/95 shadow-md ring-1 ring-black/5 dark:ring-white/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Tenant health</CardTitle>
                    <CardDescription>
                      High-signal status cards for setup, payment, billing state, and tenant mode.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-5">
                    {healthCards.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/80 shadow-sm">
                            <Icon className="h-4 w-4 text-primary" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              {item.label}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {item.value}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-border/70 bg-linear-to-br from-violet-500/5 via-card to-cyan-500/5 shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      <CardTitle className="text-lg">Active module stack</CardTitle>
                    </div>
                    <CardDescription>
                      The baseline module footprint used for every add or removal request.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap gap-2">
                      {profile.modules.map((moduleName) => (
                        <Badge
                          key={moduleName}
                          variant="secondary"
                          className="rounded-full px-3 py-1.5"
                        >
                          {moduleName}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Requests sent from this profile always include the exact tenant key, TIN,
                      signed-in user, current module stack, and the resulting projected module
                      set so Apex can process the right property without ambiguity.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
              <Card className="overflow-hidden border-border/70 bg-card/95 shadow-md ring-1 ring-black/5 dark:ring-white/10">
                <CardHeader className="border-b border-border/60 bg-linear-to-r from-violet-500/5 via-card to-cyan-500/5 pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <div>
                      <CardTitle className="text-lg">Module change request</CardTitle>
                      <CardDescription>
                        Prepare a premium request to add or remove modules for this tenant.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-5">
                  <div className="rounded-2xl border border-border/60 bg-linear-to-br from-primary/5 via-background to-background p-4">
                    <p className="text-sm font-semibold text-foreground">Change type</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Choose whether Apex should activate new modules or deactivate active ones.
                    </p>
                    <RadioGroup
                      value={requestMode}
                      onValueChange={(value) => {
                        setRequestMode(value as ModuleRequestMode);
                        setSelectedModules([]);
                      }}
                      className="mt-4 grid gap-3 sm:grid-cols-2"
                    >
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/12 bg-linear-to-br from-primary/5 via-background/95 to-background p-4 shadow-sm">
                        <RadioGroupItem value="add" className="mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">Add modules</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Expand this tenant with more operational features.
                          </p>
                        </div>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-violet-500/12 bg-linear-to-br from-violet-500/5 via-background/95 to-background p-4 shadow-sm">
                        <RadioGroupItem value="remove" className="mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">Remove modules</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Reduce unused modules and align the tenant footprint.
                          </p>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  {moduleOptionsForMode.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
                      {requestEmptyState}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {moduleOptionsForMode.map((moduleName) => {
                        const checked = selectedModules.includes(moduleName);
                        return (
                          <label
                            key={moduleName}
                            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-linear-to-br from-card via-card to-primary/4 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:from-primary/6 hover:to-violet-500/6"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(next) =>
                                handleToggleModule(moduleName, next === true)
                              }
                              className="mt-0.5"
                            />
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">{moduleName}</span>
                                {checked ? (
                                  <Badge variant="secondary">Selected</Badge>
                                ) : null}
                                {requestMode === "remove" ? (
                                  <Badge variant="outline">Currently active</Badge>
                                ) : null}
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {MODULE_DESCRIPTIONS[moduleName]}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div className="rounded-2xl border border-border/60 bg-linear-to-br from-cyan-500/5 via-card to-violet-500/5 p-4 shadow-sm">
                    <p className="text-sm font-semibold text-foreground">Request message</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add rollout context, billing alignment, timing, or business reasons.
                    </p>
                    <Textarea
                      value={requestNote}
                      onChange={(event) => setRequestNote(event.target.value)}
                      placeholder={requestPlaceholder}
                      className="mt-4 min-h-32 resize-y rounded-xl bg-background/80"
                      maxLength={500}
                    />
                    <p className="mt-2 text-right text-[11px] text-muted-foreground">
                      {requestNote.trim().length}/500 characters
                    </p>
                  </div>

                  <Button
                    type="button"
                    className="h-11 w-full bg-linear-to-r from-primary via-violet-500 to-cyan-500 text-primary-foreground shadow-sm hover:opacity-95"
                    disabled={selectedModules.length === 0 || submitting}
                    onClick={handleSubmitRequest}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send module change request
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="overflow-hidden border-border/70 bg-linear-to-br from-primary/5 via-violet-500/4 to-cyan-500/5 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Projected pricing</CardTitle>
                    <CardDescription>
                      Preview the module set and pricing position after this request is applied.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <SignupPricingSummary
                      businessType={profile.businessType}
                      modules={projectedModules}
                    />
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-border/70 bg-card/95 shadow-md ring-1 ring-black/5 dark:ring-white/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      <CardTitle className="text-lg">Request summary</CardTitle>
                    </div>
                    <CardDescription>
                      Final payload context before the request is sent to Apex.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-sky-500/12 bg-linear-to-br from-sky-500/5 via-background to-background p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Tenant
                        </p>
                        <p className="mt-2 text-sm font-semibold">{profile.displayName}</p>
                        <p className="text-xs text-muted-foreground">{profile.tenantKey}</p>
                      </div>
                      <div className="rounded-2xl border border-violet-500/12 bg-linear-to-br from-violet-500/5 via-background to-background p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Requested by
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {profile.userName} ({profile.role})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Return path preserves logo and landing context.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-primary/12 bg-linear-to-br from-primary/8 via-primary/4 to-background p-4">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Change request
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {selectedModules.length > 0
                          ? `${requestTitle}: ${selectedModules.join(", ")}`
                          : `Select at least one module to ${requestVerb}.`}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-cyan-500/12 bg-linear-to-br from-cyan-500/6 via-background to-background p-4">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Projected active modules
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">
                        {projectedModules.length > 0
                          ? projectedModules.join(", ")
                          : "No active modules would remain after this request."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-dashed border-violet-500/18 bg-linear-to-br from-violet-500/5 via-background to-background p-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold text-foreground">
                          Tenant verification
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        This request carries the tenant key, TIN, signed-in user, current
                        module stack, requested module delta, and landing route context.
                      </p>
                    </div>

                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function TenantProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <TenantProfileContent />
    </Suspense>
  );
}
