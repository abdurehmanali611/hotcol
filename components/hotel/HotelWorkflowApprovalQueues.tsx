"use client";

import { useMemo } from "react";
import type { ItemRegistration, PurchaseRequestRow, StockOutRequestRow } from "@/lib/actions";
import {
  authorizePurchaseRequestManagerApi,
  authorizeStockOutRequestManagerApi,
  approveStockOutRequestFinanceApi,
  checkStockOutRequestCCApi,
  rejectPurchaseRequestManagerApi,
  rejectStockOutRequestApi,
  type CostControllerProfileRow,
} from "@/lib/actions";
import { HotelItemReceiptApprovals } from "@/components/hotel/HotelItemReceiptApprovals";
import { formatMovementType, formatPurchaseStatus, formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import { formatVoucherDisplay } from "@/lib/voucherFormat";
import { isStockPendingCC, isStockPendingFinance, isStockPendingManager } from "@/lib/hotelApproval";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { notifyApiFailure } from "@/lib/actions";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type TerminalRole = "CostControl" | "Finance" | "Manager";

export function HotelRegistrationApprovalsBlock({
  role,
  items,
  propertyName,
  propertyTin,
  logoUrl,
  onRefresh,
}: {
  role: TerminalRole;
  items: ItemRegistration[];
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  onRefresh: () => void;
}) {
  return (
    <HotelItemReceiptApprovals
      role={role}
      items={items}
      propertyName={propertyName}
      propertyTin={propertyTin}
      logoUrl={logoUrl}
      onRefresh={onRefresh}
    />
  );
}

export function HotelPurchaseManagerQueue({
  purchases,
  onPatch,
  onRefresh,
}: {
  purchases: PurchaseRequestRow[];
  onPatch: (id: number, status: string) => void;
  onRefresh: () => void;
}) {
  const pending = purchases.filter((p) => p.status === "PENDING_MANAGER");
  const { isPending, run } = useConcurrentActions();

  if (pending.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center">
        No purchase requests awaiting manager authorization.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((r) => (
        <Card key={r.id}>
          <CardHeader className="py-4">
            <CardTitle className="text-base">
              {r.itemName} · Voucher{" "}
              {formatVoucherDisplay(r.voucherNumber, r.voucherDisplay)}
            </CardTitle>
            <CardDescription>
              {formatQtyWithUnit(r.quantity, r.measuredBy)} · Est.{" "}
              {r.estimatedUnitPrice} ETB/unit · {formatPurchaseStatus(r.status)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2 pb-4">
            <PendingButton
              pending={isPending(`mgr-pr-${r.id}`)}
              onClick={() =>
                void run(`mgr-pr-${r.id}`, async () => {
                  try {
                    const res = await authorizePurchaseRequestManagerApi(r.id);
                    onPatch(r.id, res.status);
                    await onRefresh();
                  } catch (e) {
                    notifyApiFailure(e, "Authorization failed");
                  }
                })
              }
            >
              Authorize
            </PendingButton>
            <PendingButton
              variant="outline"
              className="text-destructive"
              pending={isPending(`mgr-pr-r-${r.id}`)}
              onClick={() =>
                void run(`mgr-pr-r-${r.id}`, async () => {
                  try {
                    const res = await rejectPurchaseRequestManagerApi(
                      r.id,
                      "Rejected by manager",
                    );
                    onPatch(r.id, res.status);
                    await onRefresh();
                  } catch (e) {
                    notifyApiFailure(e, "Rejection failed");
                  }
                })
              }
            >
              Reject
            </PendingButton>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function HotelStockWorkflowQueue({
  role,
  stocks,
  profiles,
  onPatch,
  onRefresh,
}: {
  role: TerminalRole;
  stocks: StockOutRequestRow[];
  profiles: CostControllerProfileRow[];
  onPatch: (id: number, status: string, row?: StockOutRequestRow) => void;
  onRefresh: () => void;
}) {
  const { isPending, run } = useConcurrentActions();
  const [ccPick, setCcPick] = useState<Record<number, string>>({});

  const pending = useMemo(() => {
    if (role === "CostControl") {
      return stocks.filter((s) => isStockPendingCC(s.status));
    }
    if (role === "Finance") {
      return stocks.filter((s) => isStockPendingFinance(s.status));
    }
    return stocks.filter((s) => isStockPendingManager(s.status));
  }, [stocks, role]);

  const actionLabel =
    role === "CostControl"
      ? "Check"
      : role === "Finance"
        ? "Approve"
        : "Authorize";

  if (pending.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center">
        No stock movements in this queue.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((r) => (
        <Card key={r.id}>
          <CardHeader className="py-4">
            <CardTitle className="text-base">
              {r.itemName || `#${r.itemRegistrationId}`} ·{" "}
              {formatMovementType(r.movementType)}
            </CardTitle>
            <CardDescription>
              Voucher {formatVoucherDisplay(r.voucherNumber, r.voucherDisplay)} ·
              Qty {r.amount} · {r.stakeHolderOrReason}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 pb-4">
            {role === "CostControl" ? (
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Cost controller identity
                </Label>
                <Select
                  value={ccPick[r.id] ?? ""}
                  onValueChange={(v) =>
                    setCcPick((m) => ({ ...m, [r.id]: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select name" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="flex gap-2 items-end">
              <PendingButton
                pending={isPending(`so-${role}-${r.id}`)}
                onClick={() =>
                  void run(`so-${role}-${r.id}`, async () => {
                    try {
                      if (role === "CostControl") {
                        const pid = Number(ccPick[r.id]);
                        if (!pid) throw new Error("Select cost controller identity");
                        const res = await checkStockOutRequestCCApi(r.id, pid);
                        onPatch(r.id, res.status, res as StockOutRequestRow);
                      } else if (role === "Finance") {
                        const res = await approveStockOutRequestFinanceApi(r.id);
                        onPatch(r.id, res.status);
                      } else {
                        const res = await authorizeStockOutRequestManagerApi(r.id);
                        onPatch(r.id, res.status);
                      }
                      await onRefresh();
                    } catch (e) {
                      notifyApiFailure(e, `${actionLabel} failed`);
                    }
                  })
                }
              >
                {actionLabel}
                {role === "CostControl" ? " → finance" : role === "Finance" ? " → manager" : " & apply"}
              </PendingButton>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() =>
                  void run(`so-r-${r.id}`, async () => {
                    try {
                      const res = await rejectStockOutRequestApi(
                        r.id,
                        `Rejected by ${role}`,
                      );
                      onPatch(r.id, res.status, res);
                      await onRefresh();
                    } catch (e) {
                      notifyApiFailure(e, "Rejection failed");
                    }
                  })
                }
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
