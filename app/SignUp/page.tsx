"use client";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { SignupBusinessTypeSelector } from "@/components/signup/SignupBusinessTypeSelector";
import {
  SignupModuleSelector,
  SignupPricingSummary,
} from "@/components/signup/SignupModuleSelector";
import { SignupPendingApprovalScreen, SignupApprovalNotice } from "@/components/signup/SignupPendingApprovalScreen";
import { SignupPaymentSection } from "@/components/signup/SignupPaymentSection";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { handleCredential, uploadImage } from "@/lib/actions";
import {
  persistSignupRegistrationReceipt,
  readSignupRegistrationReceipt,
} from "@/lib/api/signupRegistration";
import {
  SIGNUP_REQUIRED_MODULES_CAFE,
  type BusinessType,
} from "@/constants";
import { SignUpSchema } from "@/lib/validations";
import { SignupCafeOrderModeSelector } from "@/components/signup/SignupCafeOrderModeSelector";
import { cafeModuleSelected, type CafeOrderMode } from "@/lib/cafeOrderMode";
import { fetchSignupPricingPreview } from "@/lib/api/pricing";
import { useSignupPricing } from "@/lib/hooks/useSignupPricing";
import {
  getDefaultSignupModules,
  isBusinessTypeComingSoon,
  normalizeSignupModules,
} from "@/lib/subscriptionModules";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

function SignupSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground text-pretty">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function SignUp() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{
    businessName: string;
    username: string;
  } | null>(null);
  const form = useForm<z.infer<typeof SignUpSchema>>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      HotelName: "",
      LogoUrl: "",
      UserName: "",
      Password: "",
      tinNumber: "",
      type: "Cafe and Restaurant",
      modules: [...SIGNUP_REQUIRED_MODULES_CAFE],
      cafeOrderMode: "digital",
      paymentChannel: undefined,
      paymentTransactionRef: "",
    },
  });

  const businessType = useWatch({
    control: form.control,
    name: "type",
  }) as BusinessType;

  const selectedModules = useWatch({
    control: form.control,
    name: "modules",
  });

  useEffect(() => {
    const receipt = readSignupRegistrationReceipt();
    if (receipt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration localStorage receipt
      setPendingApproval({
        businessName: receipt.businessName,
        username: receipt.username,
      });
    }
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    if (isBusinessTypeComingSoon(businessType)) {
      form.setValue("type", "Cafe and Restaurant");
      return;
    }
    const normalized = normalizeSignupModules(
      businessType,
      getDefaultSignupModules(businessType),
    );
    form.setValue("modules", normalized);
  }, [businessType, form]);

  const modulesForPricing =
    selectedModules ?? getDefaultSignupModules(businessType);
  const pricing = useSignupPricing(businessType, modulesForPricing);

  if (!bootstrapped) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          backgroundImage: "url('/assets/signup.jpg')",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      />
    );
  }

  if (pendingApproval) {
    return (
      <SignupPendingApprovalScreen
        businessName={pendingApproval.businessName}
        username={pendingApproval.username}
      />
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-10 px-4 py-10"
      style={{
        backgroundImage: "url('/assets/signup.jpg')",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <Card className="mx-auto w-full max-w-2xl border-primary/15 bg-card/95 shadow-2xl backdrop-blur-sm">
        <CardHeader className="space-y-2 border-b border-border/60 pb-6">
          <CardTitle className="text-2xl tracking-tight">Create an account</CardTitle>
          <CardDescription className="max-w-xl text-pretty leading-relaxed">
            Register your café or hotel, choose modules, and pay the setup fee to
            Apex Solution. Resort and pension sign-up are coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form
              className="flex flex-col gap-8"
              onSubmit={form.handleSubmit(async (values) => {
                try {
                  const modules = normalizeSignupModules(values.type, values.modules);
                  const fees = await fetchSignupPricingPreview(values.type, modules);
                  await handleCredential(
                    {
                      ...values,
                      modules,
                      setupFeeETB: fees.setupFeeETB,
                      quarterlyFeeETB: fees.quarterlyFeeETB,
                      paymentChannel: fees.setupFeeETB > 0 ? values.paymentChannel : undefined,
                      paymentTransactionRef:
                        fees.setupFeeETB > 0
                          ? (values.paymentTransactionRef ?? "").trim()
                          : undefined,
                    },
                    setIsLoading,
                  );
                  if (fees.setupFeeETB > 0) {
                    const username = values.UserName.trim();
                    const businessName = values.HotelName.trim();
                    persistSignupRegistrationReceipt({ username, businessName });
                    setPendingApproval({ businessName, username });
                    return;
                  }
                  form.reset({
                    HotelName: "",
                    LogoUrl: "",
                    UserName: "",
                    Password: "",
                    tinNumber: "",
                    type: "Cafe and Restaurant",
                    modules: [...SIGNUP_REQUIRED_MODULES_CAFE],
                    cafeOrderMode: "digital",
                    paymentChannel: undefined,
                    paymentTransactionRef: "",
                  });
                  setPreviewUrl(null);
                  toast.success("Created successfully");
                } catch (e: unknown) {
                  const msg =
                    e instanceof Error ? e.message : "Registration failed";
                  toast.error(msg);
                }
              })}
            >
              <SignupSection
                title="Business details"
                description="Legal name and optional TIN for your property."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <CustomFormField
                    name="HotelName"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Business name"
                    placeholder="Your registered business name"
                    inputClassName="h-11 w-full"
                  />
                  <CustomFormField
                    name="tinNumber"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="TIN (optional)"
                    placeholder="10 digits, or leave blank"
                    inputClassName="h-11 w-full"
                  />
                </div>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Business type</FormLabel>
                      <SignupBusinessTypeSelector
                        value={field.value as BusinessType}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SignupSection>

              <Separator />

              <SignupSection
                title="Owner account"
                description="Credentials for the first admin or manager login."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <CustomFormField
                    name="UserName"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Username"
                    placeholder="Choose a username"
                    inputClassName="h-11 w-full"
                  />
                  <CustomFormField
                    name="Password"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Password"
                    placeholder="Choose a password"
                    inputClassName="h-11 w-full"
                    type="password"
                  />
                </div>
              </SignupSection>

              <Separator />

              <SignupSection title="Modules & pricing">
                <FormField
                  control={form.control}
                  name="modules"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="sr-only">Modules</FormLabel>
                      <SignupModuleSelector
                        businessType={businessType}
                        value={field.value ?? []}
                        onChange={(next) =>
                          field.onChange(normalizeSignupModules(businessType, next))
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <SignupPricingSummary
                  businessType={businessType}
                  modules={selectedModules ?? getDefaultSignupModules(businessType)}
                />
                {cafeModuleSelected(selectedModules ?? []) ? (
                  <FormField
                    control={form.control}
                    name="cafeOrderMode"
                    render={({ field }) => (
                      <FormItem className="space-y-3 pt-2">
                        <FormLabel>Café ordering mode</FormLabel>
                        <SignupCafeOrderModeSelector
                          value={(field.value as CafeOrderMode) || "digital"}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </SignupSection>

              {!pricing.loading ? (
                <SignupPaymentSection
                  control={form.control}
                  setupFeeETB={pricing.setupFeeETB}
                />
              ) : null}

              <Separator />

              <SignupSection title="Branding">
                <CustomFormField
                  name="LogoUrl"
                  control={form.control}
                  fieldType={formFieldTypes.IMAGE_UPLOADER}
                  label="Business logo"
                  placeholder="Upload your logo"
                  previewUrl={previewUrl}
                  handleCloudinary={(result) =>
                    uploadImage(result, form, setPreviewUrl, "LogoUrl")
                  }
                />
              </SignupSection>

              {!pricing.loading && pricing.setupFeeETB > 0 ? (
                <SignupApprovalNotice />
              ) : null}

              <PendingButton
                type="submit"
                pending={isLoading || pricing.loading}
                className="h-12 cursor-pointer bg-green-600 text-base font-semibold shadow-md hover:bg-green-700"
              >
                {isLoading
                  ? "Creating account…"
                  : pricing.loading
                    ? "Loading pricing…"
                    : pricing.setupFeeETB > 0
                      ? `Submit registration · ${pricing.setupFeeETB.toLocaleString("en-ET")} ETB setup`
                      : "Submit registration"}
              </PendingButton>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col border-t border-border/60 bg-muted/30 p-0">
          <div className="flex w-full flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2.5">
                <LogIn className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold tracking-tight">
                  Already have an account?
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  Sign in with the username and password you registered. If setup
                  is still pending or was rejected, open Sign up again to see your
                  status.
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="h-11 shrink-0 border-primary/25 font-semibold hover:bg-primary/5 sm:min-w-40"
            >
              <Link href="/">Back to sign in</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
