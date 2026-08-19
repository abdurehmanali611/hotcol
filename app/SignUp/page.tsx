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
import { AUTH_BAND, AUTH_BUTTON, AUTH_CARD_CLASS, AUTH_EYEBROW, AUTH_LINK, AUTH_MUTED, AUTH_PANEL_COOL, AUTH_PANEL_WARM, AUTH_SUBTITLE, AUTH_TITLE, AuthPageShell } from "@/components/AuthPageShell";
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
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";

type SignUpValues = z.infer<typeof SignUpSchema>;

const SIGNUP_STEPS = [
  {
    label: "Business",
    title: "Your property",
    description: "Business details and the first Admin or Manager login.",
    fields: [
      "HotelName",
      "tinNumber",
      "type",
      "UserName",
      "Password",
    ] as const satisfies readonly FieldPath<SignUpValues>[],
  },
  {
    label: "Modules",
    title: "Modules & pricing",
    description: "Choose what you need. Fees update as you go.",
    fields: ["modules", "cafeOrderMode"] as const satisfies readonly FieldPath<SignUpValues>[],
  },
  {
    label: "Finish",
    title: "Pay & finish",
    description: "Upload your logo and send the setup payment reference.",
    fields: [
      "LogoUrl",
      "paymentChannel",
      "paymentTransactionRef",
    ] as const satisfies readonly FieldPath<SignUpValues>[],
  },
] as const;

function SignupSection({
  title,
  description,
  children,
  tone = "warm",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "warm" | "cool";
}) {
  return (
    <section
      className={cn(
        "space-y-4",
        tone === "cool" ? AUTH_PANEL_COOL : AUTH_PANEL_WARM,
      )}
    >
      <div className="space-y-1">
        <h2
          className={cn(
            "text-sm font-semibold uppercase tracking-wide",
            tone === "cool" ? "text-indigo-300" : "text-violet-300",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className={cn("text-sm text-pretty", AUTH_MUTED)}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SignupStepper({
  current,
}: {
  current: number;
}) {
  return (
    <ol className="grid grid-cols-3 gap-3">
      {SIGNUP_STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.label} className="min-w-0 space-y-2">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  done && "bg-violet-600 text-white",
                  active && "scale-110 bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/50",
                  !done && !active && "bg-white/5 text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "truncate text-xs font-medium transition-colors duration-300",
                  active ? "text-violet-100" : "text-violet-300/45",
                )}
              >
                {step.label}
              </span>
            </div>
            <div
              className={cn(
                "h-0.5 w-full rounded-full transition-colors duration-500",
                done || active ? "bg-violet-400/60" : "bg-white/10",
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}

export default function SignUp() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [step, setStep] = useState(0);
  const [stepDir, setStepDir] = useState<"forward" | "back">("forward");
  const [pendingApproval, setPendingApproval] = useState<{
    businessName: string;
    username: string;
  } | null>(null);
  const form = useForm<SignUpValues>({
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
  const lastStep = SIGNUP_STEPS.length - 1;
  const copy = SIGNUP_STEPS[step]!;

  const goNext = async () => {
    const valid = await form.trigger([...SIGNUP_STEPS[step]!.fields]);
    if (!valid) return;
    setStepDir("forward");
    setStep((current) => Math.min(current + 1, lastStep));
  };

  const goBack = () => {
    setStepDir("back");
    setStep((current) => Math.max(current - 1, 0));
  };

  if (!bootstrapped) {
    return <AuthPageShell />;
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
    <AuthPageShell>
      <Card className={cn("mx-auto w-full max-w-2xl gap-0 py-0 transition-shadow duration-500 hover:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75),0_0_64px_-10px_rgba(139,92,246,0.38)]", AUTH_CARD_CLASS)}>
        <CardHeader className={cn("space-y-6 border-b px-8 pt-9 pb-7", AUTH_BAND)}>
          <SignupStepper current={step} />
          <div key={`${step}-copy`} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <p className={AUTH_EYEBROW}>
              Step {step + 1} of {SIGNUP_STEPS.length}
            </p>
            <CardTitle className={cn("text-2xl", AUTH_TITLE)}>{copy.title}</CardTitle>
            <CardDescription className={cn("max-w-xl", AUTH_SUBTITLE)}>
              {step === lastStep && !pricing.loading && pricing.setupFeeETB <= 0
                ? "Upload your logo and submit registration."
                : copy.description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pt-7 pb-0">
          <Form {...form}>
            <form
              className="flex flex-col"
              onSubmit={(event) => {
                if (step < lastStep) {
                  event.preventDefault();
                  void goNext();
                  return;
                }
                void form.handleSubmit(async (values) => {
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
                    setStep(0);
                    toast.success("Created successfully");
                  } catch (e: unknown) {
                    const msg =
                      e instanceof Error ? e.message : "Registration failed";
                    toast.error(msg);
                  }
                })(event);
              }}
            >
              <div
                key={step}
                className={cn(
                  "flex flex-col gap-8 animate-in fade-in duration-500 fill-mode-both",
                  stepDir === "back"
                    ? "slide-in-from-left-6"
                    : "slide-in-from-right-6",
                )}
              >
              {step === 0 ? (
                <>
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
                  <SignupSection
                    title="Admin or Manager account"
                    description="Username and password for the first Admin or Manager login. This does not create an owner account."
                    tone="cool"
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
                </>
              ) : null}

              {step === 1 ? (
                <SignupSection title="Modules & pricing" tone="cool">
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
              ) : null}

              {step === 2 ? (
                <>
                  {!pricing.loading ? (
                    <SignupPaymentSection
                      control={form.control}
                      setupFeeETB={pricing.setupFeeETB}
                    />
                  ) : null}
                  <SignupSection title="Branding" tone="warm">
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
                </>
              ) : null}
              </div>

              <div className={cn("mt-8 -mx-8 flex flex-col-reverse gap-3 border-t px-8 pt-7 pb-8 sm:flex-row sm:items-center sm:justify-between", AUTH_BAND)}>
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-2 sm:min-w-28"
                    onClick={goBack}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <span className="hidden sm:block" />
                )}
                {step < lastStep ? (
                  <Button
                    type="submit"
                    className={cn(
                      "h-11 gap-2 font-semibold transition-shadow duration-300 hover:shadow-[0_0_24px_-6px_rgba(139,92,246,0.55)]",
                      AUTH_BUTTON,
                      step === 0 ? "w-full sm:ml-auto sm:w-auto sm:min-w-44" : "sm:min-w-40",
                    )}
                  >
                    Proceed
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <PendingButton
                    type="submit"
                    pending={isLoading || pricing.loading}
                    className={cn(
                      "h-11 w-full cursor-pointer font-semibold transition-shadow duration-300 hover:shadow-[0_0_24px_-6px_rgba(139,92,246,0.55)] sm:w-auto sm:min-w-48",
                      AUTH_BUTTON,
                    )}
                  >
                    {isLoading
                      ? "Creating account…"
                      : pricing.loading
                        ? "Loading pricing…"
                        : pricing.setupFeeETB > 0
                          ? `Submit · ${pricing.setupFeeETB.toLocaleString("en-ET")} ETB`
                          : "Submit registration"}
                  </PendingButton>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className={cn("justify-center border-t px-8 py-6", AUTH_BAND)}>
          <p className={cn("text-center text-sm", AUTH_MUTED)}>
            Already have an account?{" "}
            <Link
              href="/"
              className={AUTH_LINK}
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthPageShell>
  );
}
