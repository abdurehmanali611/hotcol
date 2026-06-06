"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TenantPaymentVerificationForm } from "@/components/tenant/TenantPaymentVerificationForm";
import { logoutAction, submitTenantPaymentAction } from "@/lib/actions";
import { readTenantPaymentKind, readTenantAccessMode } from "@/lib/tenantAccessMode";
import { readTenantSubscriptionFromStorage } from "@/lib/tenantModules";
import { computeSubscriptionPeriodStatus } from "@/lib/subscriptionQuarter";
import type { TenantPaymentFormValues } from "@/lib/validations";

function PaymentVerificationContent() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [propertyLabel, setPropertyLabel] = useState("Your property");
  const paymentKind = readTenantPaymentKind() ?? "quarterly";
  const sub = readTenantSubscriptionFromStorage();
  const status = computeSubscriptionPeriodStatus(sub);

  const amountETB =
    paymentKind === "setup" ? sub.setupFeeETB : sub.quarterlyFeeETB;

  const pendingMessage = useMemo(() => {
    if (status === "pending_approval" && !sub.setupFeeApproved) {
      return "Submit your setup fee transfer reference. Staff terminals stay locked until Apex approves.";
    }
    if (status === "grace") {
      return "Your quarter has ended. Submit quarterly payment during this 10-day grace period — after day 10, all logins are disabled until Apex approves.";
    }
    if (status === "expired") {
      return "The grace period has ended. Submit quarterly payment and contact Apex to restore access.";
    }
    return null;
  }, [status, sub.setupFeeApproved]);

  useEffect(() => {
    if (readTenantAccessMode() !== "payment_portal") {
      router.replace("/");
      return;
    }
    const role = localStorage.getItem("user_role");
    if (role !== "Admin" && role !== "Manager") {
      router.replace("/");
      return;
    }
    setPropertyLabel(
      localStorage.getItem("hotel_display_name")?.trim() || "Your property",
    );
    setAllowed(true);
  }, [router]);

  const handleSubmit = async (values: TenantPaymentFormValues) => {
    setSubmitting(true);
    try {
      await submitTenantPaymentAction({
        paymentKind,
        paymentChannel: values.paymentChannel,
        transactionRef: values.paymentTransactionRef,
      });
      toast.success(
        "Payment reference submitted. Apex will verify and activate your access.",
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not submit payment reference",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        backgroundImage: "url('/assets/signin.jpg')",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-xl font-serif font-semibold">
            Payment verification
          </CardTitle>
          <CardDescription className="text-pretty">
            {propertyLabel} — complete payment verification to unlock the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TenantPaymentVerificationForm
            paymentKind={paymentKind}
            amountETB={amountETB}
            pendingMessage={pendingMessage}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => logoutAction()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentVerificationContent />
    </Suspense>
  );
}
