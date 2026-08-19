"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatETB } from "@/lib/subscriptionModules";
import {
  APEX_SOLUTION_CBE_ACCOUNT,
  APEX_WHATSAPP_SUPPORT,
  SETUP_APPROVAL_WAIT_MINUTES,
  SIGNUP_PAYMENT_CHANNEL_META,
  SIGNUP_PAYMENT_CHANNELS,
  type SignupPaymentChannel,
} from "@/lib/signupPayment";
import { cn } from "@/lib/utils";
import { Building2, Smartphone } from "lucide-react";
import type { Control } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { z } from "zod";
import { SignUpSchema } from "@/lib/validations";
import { APEX_SOLUTION } from "@/constants/branding";

export type SignUpFormValues = z.infer<typeof SignUpSchema>;

const CHANNEL_ICONS: Record<
  SignupPaymentChannel,
  typeof Smartphone
> = {
  Telebirr: Smartphone,
  "Commercial Bank of Ethiopia": Building2,
};

export function SignupPaymentSection({
  control,
  setupFeeETB,
}: {
  control: Control<SignUpFormValues>;
  setupFeeETB: number;
}) {
  const { setValue } = useFormContext<SignUpFormValues>();
  if (setupFeeETB <= 0) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 ring-1 ring-black/5 dark:ring-white/10">
      <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <a
            href={APEX_SOLUTION.website}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary hover:underline"
          >
            {APEX_SOLUTION.name}
          </a>{" "}
          — CBE account (all transfers)
        </p>
        <p className="mt-1 font-mono text-xl font-bold tracking-wide text-primary">
          {APEX_SOLUTION_CBE_ACCOUNT}
        </p>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">
          Pay via CBE directly or send from Telebirr to this Commercial Bank of
          Ethiopia account, then enter your transaction reference below.
        </p>
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight">Setup fee payment</h3>
        <p className="text-sm text-muted-foreground text-pretty">
          Pay{" "}
          <span className="font-semibold text-foreground">
            {formatETB(setupFeeETB)}
          </span>{" "}
          to{" "}
          <a
            href={APEX_SOLUTION.website}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {APEX_SOLUTION.name}
          </a>{" "}
          using one of the channels below, then enter your
          transfer reference. After you submit registration, wait about{" "}
          {SETUP_APPROVAL_WAIT_MINUTES} minutes for Apex approval — you cannot
          sign in until then. WhatsApp support:{" "}
          {APEX_WHATSAPP_SUPPORT.map((line) => line.e164).join(" or ")}.
        </p>
      </div>

      <FormField
        control={control}
        name="paymentChannel"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Payment channel</FormLabel>
            <FormControl>
              <RadioGroup
                className="grid gap-3 sm:grid-cols-2"
                value={field.value ?? ""}
                onValueChange={(v) => {
                  field.onChange(v as SignupPaymentChannel);
                  setValue("paymentTransactionRef", "");
                }}
              >
                {SIGNUP_PAYMENT_CHANNELS.map((channel) => {
                  const meta = SIGNUP_PAYMENT_CHANNEL_META[channel];
                  const Icon = CHANNEL_ICONS[channel];
                  const selected = field.value === channel;
                  return (
                    <Label
                      key={channel}
                      htmlFor={`pay-${channel}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                        selected
                          ? "border-primary/50 bg-primary/5 shadow-sm"
                          : "border-border/80 bg-background/80 hover:bg-muted/30",
                      )}
                    >
                      <RadioGroupItem
                        id={`pay-${channel}`}
                        value={channel}
                        className="mt-1"
                      />
                      <div className="min-w-0 space-y-1">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <Icon className="h-4 w-4 shrink-0 text-primary" />
                          {meta.shortLabel}
                        </span>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {channel === "Telebirr"
                            ? "Mobile money transfer"
                            : "Bank transfer to Apex Solution account"}
                        </p>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="paymentChannel"
        render={({ field: channelField }) => {
          const channel = channelField.value as SignupPaymentChannel | undefined;
          const meta = channel
            ? SIGNUP_PAYMENT_CHANNEL_META[channel]
            : null;

          return (
            <FormField
              control={control}
              name="paymentTransactionRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {meta?.transactionFieldLabel ?? "Transaction reference"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      disabled={!channel}
                      placeholder={
                        meta?.transactionPlaceholder ??
                        "Select a payment channel first"
                      }
                      className="h-11 font-mono text-sm tracking-wide"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription className="text-pretty">
                    {meta?.hint ??
                      "Choose Telebirr or Commercial Bank of Ethiopia above."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }}
      />
    </section>
  );
}
