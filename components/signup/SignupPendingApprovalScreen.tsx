"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  APEX_SOLUTION_CBE_ACCOUNT,
  APEX_WHATSAPP_SUPPORT,
  SETUP_APPROVAL_WAIT_MINUTES,
  SIGNUP_PAYMENT_CHANNEL_META,
  SIGNUP_PAYMENT_CHANNELS,
  type SignupPaymentChannel,
} from "@/lib/signupPayment";
import {
  clearSignupRegistrationReceipt,
  fetchSignupRegistrationStatus,
  resubmitSignupSetupPayment,
  type SignupRegistrationStatus,
} from "@/lib/api/signupRegistration";
import { formatETB } from "@/lib/subscriptionModules";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SignupPendingApprovalScreenProps = {
  businessName: string;
  username: string;
  initialStatus?: SignupRegistrationStatus | null;
};

function StatusShell({
  children,
}: {
  children: ReactNode;
}) {
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
      <Card className="w-full max-w-lg border-primary/15 bg-card/95 shadow-2xl backdrop-blur-sm">
        {children}
      </Card>
    </div>
  );
}

function WhatsAppSupport() {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
      <p className="text-sm font-medium text-foreground">
        Need help or faster approval?
      </p>
      <p className="text-sm text-muted-foreground text-pretty">
        Message Apex support on WhatsApp with your business name and payment
        reference.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {APEX_WHATSAPP_SUPPORT.map((line) => (
          <Button
            key={line.waMe}
            asChild
            variant="outline"
            className="justify-center gap-2"
          >
            <a
              href={`https://wa.me/${line.waMe}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              {line.e164}
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}

export function SignupPendingApprovalScreen({
  businessName,
  username,
  initialStatus = null,
}: SignupPendingApprovalScreenProps) {
  const [status, setStatus] = useState<SignupRegistrationStatus | null>(
    initialStatus,
  );
  const [loading, setLoading] = useState(!initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [paymentChannel, setPaymentChannel] = useState<SignupPaymentChannel>(
    SIGNUP_PAYMENT_CHANNELS[0],
  );
  const [transactionRef, setTransactionRef] = useState("");
  const [resubmitting, setResubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchSignupRegistrationStatus(username);
      setStatus(next);
      setError(null);
      if (next.status === "approved") {
        clearSignupRegistrationReceipt();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (status?.status !== "pending") return;
    const id = window.setInterval(() => {
      void refresh();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [status?.status, refresh]);

  const displayName = status?.businessName || businessName;
  const current = status?.status ?? "pending";

  const handleResubmit = async () => {
    const ref = transactionRef.trim();
    if (!password.trim()) {
      toast.error("Enter your account password to resubmit");
      return;
    }
    if (ref.length < 4) {
      toast.error("Enter a valid transaction reference");
      return;
    }
    setResubmitting(true);
    try {
      const next = await resubmitSignupSetupPayment({
        username,
        password,
        paymentChannel,
        transactionRef: ref,
      });
      setStatus(next);
      setPassword("");
      setTransactionRef("");
      toast.success("Payment resubmitted — waiting for Apex review");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resubmit failed");
    } finally {
      setResubmitting(false);
    }
  };

  if (loading && !status) {
    return (
      <StatusShell>
        <CardHeader className="space-y-3 border-b border-border/60 pb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          </div>
          <CardTitle className="text-2xl tracking-tight">
            Checking registration…
          </CardTitle>
          <CardDescription>
            Looking up setup approval status for {username}.
          </CardDescription>
        </CardHeader>
      </StatusShell>
    );
  }

  if (error && !status) {
    return (
      <StatusShell>
        <CardHeader className="space-y-3 border-b border-border/60 pb-6 text-center">
          <CardTitle className="text-2xl tracking-tight">
            Couldn’t load status
          </CardTitle>
          <CardDescription className="text-pretty">{error}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
          >
            Try again
          </Button>
          <Button asChild variant="ghost" className="h-11 w-full">
            <Link href="/">Back to sign in</Link>
          </Button>
        </CardContent>
      </StatusShell>
    );
  }

  if (current === "approved") {
    return (
      <StatusShell>
        <CardHeader className="space-y-3 border-b border-border/60 pb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </div>
          <CardTitle className="text-2xl tracking-tight">
            Setup approved
          </CardTitle>
          <CardDescription className="text-pretty leading-relaxed">
            <span className="font-medium text-foreground">{displayName}</span>{" "}
            is ready. You can sign in with username{" "}
            <span className="font-medium text-foreground">{username}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4 text-sm leading-relaxed text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
            Apex verified your setup payment. Staff accounts unlock after you
            sign in as the property admin/manager.
          </div>
          <Button asChild className="h-11 w-full bg-green-600 hover:bg-green-700">
            <Link href="/">Go to login</Link>
          </Button>
        </CardContent>
      </StatusShell>
    );
  }

  if (current === "rejected") {
    const channelMeta = SIGNUP_PAYMENT_CHANNEL_META[paymentChannel];
    return (
      <StatusShell>
        <CardHeader className="space-y-3 border-b border-border/60 pb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <XCircle className="h-7 w-7" aria-hidden />
          </div>
          <CardTitle className="text-2xl tracking-tight">
            Setup payment rejected
          </CardTitle>
          <CardDescription className="text-pretty leading-relaxed">
            Apex could not verify the payment for{" "}
            <span className="font-medium text-foreground">{displayName}</span>.
            Resubmit a corrected reference below — refreshing will keep this
            status screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 p-4 text-sm leading-relaxed text-rose-950 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
            <p className="font-semibold">Reason from Apex</p>
            <p className="mt-2 text-pretty">
              {status?.rejectionReason ||
                "Your setup payment was rejected. Please resubmit a corrected reference."}
            </p>
          </div>

          <div className="space-y-4 rounded-xl border p-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Apex CBE account
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-primary">
                {APEX_SOLUTION_CBE_ACCOUNT}
              </p>
              {status?.setupFeeETB ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Setup fee: {formatETB(status.setupFeeETB)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Payment channel</Label>
              <RadioGroup
                value={paymentChannel}
                onValueChange={(value) =>
                  setPaymentChannel(value as SignupPaymentChannel)
                }
                className="grid gap-2"
              >
                {SIGNUP_PAYMENT_CHANNELS.map((channel) => (
                  <Label
                    key={channel}
                    htmlFor={`resubmit-${channel}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm",
                      paymentChannel === channel &&
                        "border-primary bg-primary/5",
                    )}
                  >
                    <RadioGroupItem id={`resubmit-${channel}`} value={channel} />
                    {SIGNUP_PAYMENT_CHANNEL_META[channel].shortLabel}
                  </Label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground text-pretty">
                {channelMeta.hint}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resubmit-ref">
                {channelMeta.transactionFieldLabel}
              </Label>
              <Input
                id="resubmit-ref"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder={channelMeta.transactionPlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resubmit-password">
                Account password for {username}
              </Label>
              <Input
                id="resubmit-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Confirm it’s you"
              />
            </div>

            <Button
              type="button"
              className="h-11 w-full bg-green-600 hover:bg-green-700"
              disabled={resubmitting}
              onClick={() => void handleResubmit()}
            >
              {resubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resubmitting…
                </>
              ) : (
                "Resubmit setup payment"
              )}
            </Button>
          </div>

          <WhatsAppSupport />
          <Button asChild variant="outline" className="h-11 w-full">
            <Link href="/">Back to sign in</Link>
          </Button>
        </CardContent>
      </StatusShell>
    );
  }

  return (
    <StatusShell>
      <CardHeader className="space-y-3 border-b border-border/60 pb-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <Clock className="h-7 w-7" aria-hidden />
        </div>
        <CardTitle className="text-2xl tracking-tight">
          Registration submitted
        </CardTitle>
        <CardDescription className="text-pretty leading-relaxed">
          <span className="font-medium text-foreground">{displayName}</span> is
          registered. Apex is verifying your setup payment before access is
          enabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">
            Please wait about {SETUP_APPROVAL_WAIT_MINUTES} minutes
          </p>
          <p className="mt-2 text-pretty">
            You cannot sign in until the Apex team approves your setup fee.
            Refreshing this page keeps your pending status — it will not return
            you to the signup form.
          </p>
          {status?.paymentTransactionRef ? (
            <p className="mt-3 font-mono text-xs">
              Ref: {status.paymentTransactionRef}
              {status.paymentChannel ? ` · ${status.paymentChannel}` : ""}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm text-muted-foreground">
          <span>Status: pending Apex review</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => void refresh()}
          >
            <Loader2
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        <WhatsAppSupport />

        <div className="flex items-start gap-3 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-pretty leading-relaxed">
            After approval, sign in with username{" "}
            <span className="font-medium text-foreground">{username}</span>.
            Staff accounts stay locked until setup is approved.
          </p>
        </div>

        <Button asChild className="h-11 w-full bg-green-600 hover:bg-green-700">
          <Link href="/">Go to login</Link>
        </Button>
      </CardContent>
    </StatusShell>
  );
}

/** Shown on the signup form before submission when a setup fee applies. */
export function SignupApprovalNotice() {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-left text-sm leading-relaxed text-muted-foreground">
      <p className="font-medium text-foreground">New registration?</p>
      <p className="mt-1 text-pretty">
        Wait about {SETUP_APPROVAL_WAIT_MINUTES} minutes for Apex to approve your
        setup fee. Login stays disabled until then. Refreshing the page will keep
        your pending status screen.
      </p>
      <p className="mt-2 text-pretty">
        Support on WhatsApp:{" "}
        {APEX_WHATSAPP_SUPPORT.map((line, index) => (
          <span key={line.waMe}>
            {index > 0 ? " or " : null}
            <a
              href={`https://wa.me/${line.waMe}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {line.e164}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
