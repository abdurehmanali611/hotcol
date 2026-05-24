"use client";

import Link from "next/link";
import { Clock, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  APEX_WHATSAPP_SUPPORT,
  SETUP_APPROVAL_WAIT_MINUTES,
} from "@/lib/signupPayment";

type SignupPendingApprovalScreenProps = {
  businessName: string;
  username: string;
};

export function SignupPendingApprovalScreen({
  businessName,
  username,
}: SignupPendingApprovalScreenProps) {
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
        <CardHeader className="space-y-3 border-b border-border/60 pb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="h-7 w-7" aria-hidden />
          </div>
          <CardTitle className="text-2xl tracking-tight">
            Registration submitted
          </CardTitle>
          <CardDescription className="text-pretty leading-relaxed">
            <span className="font-medium text-foreground">{businessName}</span>{" "}
            is registered. Apex is verifying your setup payment before access is
            enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">
              Please wait about {SETUP_APPROVAL_WAIT_MINUTES} minutes
            </p>
            <p className="mt-2 text-pretty">
              You cannot sign in until the Apex team approves your setup fee. We
              will unlock your account once verification is complete.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Need help or faster approval?
            </p>
            <p className="text-sm text-muted-foreground text-pretty">
              Message Apex support on WhatsApp with your business name and
              payment reference.
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
      </Card>
    </div>
  );
}

/** Shown on the signup form before submission when a setup fee applies. */
export function SignupApprovalNotice() {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-left text-sm leading-relaxed text-muted-foreground">
      <p className="font-medium text-foreground">New registration?</p>
      <p className="mt-1 text-pretty">
        Wait about {SETUP_APPROVAL_WAIT_MINUTES} minutes for Apex to approve your
        setup fee. Login stays disabled until then.
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
