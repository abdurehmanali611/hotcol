/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PendingButton } from "@/components/ui/pending-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCredentialSchema } from "@/lib/validations";
import type { ModuleOption } from "@/constants";
import { useTenantModules } from "@/hooks/useTenantModules";
import { useCafeOrderMode } from "@/hooks/useCafeOrderMode";
import { isAnalogCafeOrderMode } from "@/lib/cafeOrderMode";
import { tenantHasModule } from "@/lib/subscriptionModules";
import { UserPlus, ShieldCheck, Hotel, KeyRound, Lock } from "lucide-react";

interface GrantCredentialProps {
  hotelName: string;
  logoUrl?: string;
  onSubmit: (data: any) => Promise<void>;
  variant?: "cafe" | "hotel";
}

const CAFE_ROLES: {
  value: string;
  label: string;
  module?: ModuleOption;
  modulesAny?: ModuleOption[];
}[] = [
  { value: "Kitchen", label: "Kitchen (Chef)", module: "Cafe and Restaurant" },
  { value: "Barista", label: "Bar (Barista)", module: "Cafe and Restaurant" },
  { value: "Cashier", label: "Cash (Cashier)", module: "Cafe and Restaurant" },
  { value: "Store", label: "Store Keeper", module: "Inventory" },
];

const HOTEL_ROLES: {
  value: string;
  label: string;
  module?: ModuleOption;
  modulesAny?: ModuleOption[];
}[] = [
  { value: "Kitchen", label: "Kitchen (Chef)", module: "Cafe and Restaurant" },
  { value: "Barista", label: "Bar (Barista)", module: "Cafe and Restaurant" },
  {
    value: "Cashier",
    label: "Cash (Cashier)",
    modulesAny: ["Cafe and Restaurant", "Credit Management"],
  },
  { value: "CostControl", label: "Cost control", module: "Financial Management" },
  { value: "Finance", label: "Finance", module: "Financial Management" },
  { value: "Store", label: "Store Keeper", module: "Inventory" },
  { value: "Reception", label: "Reception", module: "Room Management" },
  {
    value: "CMLeader",
    label: "CM leader (Cleaning & Maintenance)",
    module: "Cleaning and Maintenance",
  },
  { value: "HR", label: "HR", module: "HR Module" },
];

export default function GrantCredential({
  hotelName,
  logoUrl,
  onSubmit,
  variant = "cafe",
}: GrantCredentialProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState(hotelName);

  useEffect(() => {
    const d = localStorage.getItem("hotel_display_name")?.trim();
    if (d) setDisplayName(d);
  }, []);

  const tenantModules = useTenantModules();

  const analog = isAnalogCafeOrderMode(useCafeOrderMode());
  const roleOptions = useMemo(
    () =>
      (variant === "hotel" ? HOTEL_ROLES : CAFE_ROLES).filter((r) => {
        if (analog && (r.value === "Kitchen" || r.value === "Barista")) {
          return false;
        }
        if (r.modulesAny?.length) {
          return r.modulesAny.some((m) => tenantHasModule(tenantModules, m));
        }
        return !r.module || tenantHasModule(tenantModules, r.module);
      }),
    [variant, tenantModules, analog],
  );

  const defaultRole = (roleOptions[0]?.value ??
    (variant === "hotel" ? "Store" : "Kitchen")) as z.infer<
    typeof createCredentialSchema
  >["Role"];

  const form = useForm<z.infer<typeof createCredentialSchema>>({
    resolver: zodResolver(createCredentialSchema),
    defaultValues: {
      UserName: "",
      Password: "",
      confirmPassword: "",
      Role: defaultRole,
      HotelName: hotelName,
      LogoUrl: logoUrl || "",
    },
  });

  useEffect(() => {
    const current = form.getValues("Role");
    if (roleOptions.some((r) => r.value === current)) return;
    if (roleOptions[0]) {
      form.setValue(
        "Role",
        roleOptions[0].value as z.infer<typeof createCredentialSchema>["Role"],
      );
    }
  }, [roleOptions, form]);

  const handleSubmit = async (values: z.infer<typeof createCredentialSchema>) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset({
        UserName: "",
        Password: "",
        confirmPassword: "",
        Role: (roleOptions[0]?.value ?? defaultRole) as z.infer<
          typeof createCredentialSchema
        >["Role"],
        HotelName: hotelName,
        LogoUrl: logoUrl || "",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <Card className="overflow-hidden border-primary/15 bg-card/95 shadow-lg ring-1 ring-black/3 dark:ring-white/6">
        <div className="h-1 bg-linear-to-r from-sky-500 via-cyan-400 to-primary/80" />
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
            <UserPlus className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            Grant credential
          </CardTitle>
          <CardDescription className="max-w-2xl text-pretty leading-relaxed">
            {variant === "hotel"
              ? "Create access for reception, CM leader, cashier, chef, bar, store, and approval teams. Roles appear only for modules subscribed on this property."
              : "Create login credentials for kitchen, bar, cashier, or store staff on this property."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-5"
            >
              <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  Account details
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="UserName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. barista_john"
                            className="h-10 bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="Role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Access role</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 bg-background">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Password
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="Password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="h-10 bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="h-10 bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
                <Hotel className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">
                    Target property
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Access is scoped to{" "}
                    <strong className="text-foreground">{displayName}</strong>.
                    Staff change their own password from their terminal header.
                  </p>
                </div>
              </div>

              <PendingButton
                type="submit"
                pending={isSubmitting}
                disabled={roleOptions.length === 0}
                className="h-11 w-full cursor-pointer text-base shadow-md"
              >
                {isSubmitting ? (
                  "Creating account…"
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Grant access
                  </span>
                )}
              </PendingButton>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
