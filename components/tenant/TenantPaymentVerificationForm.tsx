"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Smartphone } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatETB } from "@/lib/subscriptionModules";
import {
  APEX_SOLUTION_CBE_ACCOUNT,
  SIGNUP_PAYMENT_CHANNEL_META,
  SIGNUP_PAYMENT_CHANNELS,
  type SignupPaymentChannel,
} from "@/lib/signupPayment";
import {
  tenantPaymentSchema,
  type TenantPaymentFormValues,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
import type { TenantPaymentKind } from "@/lib/tenantAccessMode";

const CHANNEL_ICONS: Record<SignupPaymentChannel, typeof Smartphone> = {
  Telebirr: Smartphone,
  "Commercial Bank of Ethiopia": Building2,
};

export function TenantPaymentVerificationForm({
  paymentKind,
  amountETB,
  pendingMessage,
  onSubmit,
  submitting,
}: {
  paymentKind: TenantPaymentKind;
  amountETB: number;
  pendingMessage?: string | null;
  onSubmit: (values: TenantPaymentFormValues) => Promise<void>;
  submitting?: boolean;
}) {
  const form = useForm<TenantPaymentFormValues>({
    resolver: zodResolver(tenantPaymentSchema),
    defaultValues: {
      paymentChannel: undefined,
      paymentTransactionRef: "",
    },
  });

  const title =
    paymentKind === "setup"
      ? "Setup fee verification"
      : "Quarterly subscription payment";
  const description =
    paymentKind === "setup"
      ? "Pay the one-time setup fee to Apex Solution, then submit your transfer reference for verification."
      : "Your paid quarter has ended. Pay the quarterly fee within the grace period and submit your transfer reference.";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Apex Solution — CBE account (all transfers)
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
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
        <p className="text-sm font-medium text-foreground">
          Amount due: {formatETB(amountETB)}
        </p>
      </div>

      {pendingMessage ? (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          role="status"
        >
          {pendingMessage}
        </div>
      ) : null}

      <Form {...form}>
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
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
                      form.setValue("paymentTransactionRef", "");
                    }}
                  >
                    {SIGNUP_PAYMENT_CHANNELS.map((channel) => {
                      const meta = SIGNUP_PAYMENT_CHANNEL_META[channel];
                      const Icon = CHANNEL_ICONS[channel];
                      const selected = field.value === channel;
                      return (
                        <Label
                          key={channel}
                          htmlFor={`tenant-pay-${channel}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                            selected
                              ? "border-primary/50 bg-primary/5 shadow-sm"
                              : "border-border/80 bg-background/80 hover:bg-muted/30",
                          )}
                        >
                          <RadioGroupItem
                            id={`tenant-pay-${channel}`}
                            value={channel}
                            className="mt-1"
                          />
                          <div className="min-w-0 space-y-1">
                            <span className="flex items-center gap-2 text-sm font-semibold">
                              <Icon className="h-4 w-4 shrink-0 text-primary" />
                              {meta.shortLabel}
                            </span>
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
            control={form.control}
            name="paymentChannel"
            render={({ field: channelField }) => {
              const channel = channelField.value as
                | SignupPaymentChannel
                | undefined;
              const meta = channel
                ? SIGNUP_PAYMENT_CHANNEL_META[channel]
                : null;

              return (
                <FormField
                  control={form.control}
                  name="paymentTransactionRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {meta?.transactionFieldLabel ?? "Transaction reference"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!channel || submitting}
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

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for Apex verification"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
