"use client";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import {
  SignupModuleSelector,
  SignupPricingSummary,
} from "@/components/signup/SignupModuleSelector";
import { SignupPendingApprovalScreen, SignupApprovalNotice } from "@/components/signup/SignupPendingApprovalScreen";
import { SignupPaymentSection } from "@/components/signup/SignupPaymentSection";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { handleCredential, uploadImage } from "@/lib/actions";
import { SignUpSchema } from "@/lib/validations";
import {
  BUSINESS_TYPES,
  SIGNUP_REQUIRED_MODULES_CAFE,
  type BusinessType,
} from "@/constants";
import {
  calculateSignupPricing,
  getDefaultSignupModules,
  normalizeSignupModules,
} from "@/lib/subscriptionModules";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
    const normalized = normalizeSignupModules(
      businessType,
      getDefaultSignupModules(businessType),
    );
    form.setValue("modules", normalized);
  }, [businessType, form]);

  const pricing = useMemo(
    () =>
      calculateSignupPricing(
        businessType,
        selectedModules ?? getDefaultSignupModules(businessType),
      ),
    [businessType, selectedModules],
  );

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
      <Card className="w-full max-w-3xl border-primary/15 bg-card/95 shadow-2xl backdrop-blur-sm">
        <CardHeader className="space-y-2 border-b border-border/60 pb-6">
          <CardTitle className="text-2xl tracking-tight">Create an account</CardTitle>
          <CardDescription className="max-w-xl text-pretty leading-relaxed">
            Register your café or hotel, choose modules, pay the setup fee to Apex
            Solution, and start using HotCol.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form
              className="flex flex-col gap-8"
              onSubmit={form.handleSubmit(async (values) => {
                try {
                  const modules = normalizeSignupModules(values.type, values.modules);
                  const fees = calculateSignupPricing(values.type, modules);
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
                    setPendingApproval({
                      businessName: values.HotelName.trim(),
                      username: values.UserName.trim(),
                    });
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
                <CustomFormField
                  name="type"
                  control={form.control}
                  fieldType={formFieldTypes.RADIO_BUTTON}
                  label="Business type"
                  listdisplay={[...BUSINESS_TYPES]}
                  inputClassName="flex flex-row flex-wrap gap-4 items-center h-auto min-h-0 py-1"
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
              </SignupSection>

              <SignupPaymentSection
                control={form.control}
                setupFeeETB={pricing.setupFeeETB}
              />

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

              {pricing.setupFeeETB > 0 ? <SignupApprovalNotice /> : null}

              <Button
                type="submit"
                className="h-12 cursor-pointer bg-green-600 text-base font-semibold shadow-md hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading
                  ? "Creating account…"
                  : pricing.setupFeeETB > 0
                    ? `Submit registration · ${pricing.setupFeeETB.toLocaleString("en-ET")} ETB setup`
                    : "Submit registration"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
