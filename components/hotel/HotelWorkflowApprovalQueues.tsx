"use client";

import { useMemo, useState } from "react";
import type { ItemRegistration, PurchaseRequestRow, StockOutRequestRow } from "@/lib/actions";
import {
  approveStockOutRequestsBatchApi,
  approveStockOutRequestsFinanceBatchApi,
  approveStockOutRequestFinanceApi,
  authorizePurchaseRequestsManagerBatchApi,
  authorizePurchaseRequestManagerApi,
  authorizeStockOutRequestsManagerBatchApi,
  authorizeStockOutRequestManagerApi,
  checkStockOutRequestCCApi,
  rejectPurchaseRequestManagerApi,
  rejectPurchaseRequestsManagerBatchApi,
  rejectStockOutRequestApi,
  rejectStockOutRequestsBatchApi,
  type CostControllerProfileRow,
} from "@/lib/actions";
import { HotelItemReceiptApprovals } from "@/components/hotel/HotelItemReceiptApprovals";
import {
  formatMovementType,
  formatPurchaseStatus,
  formatQtyWithUnit,
} from "@/lib/hotelDisplayLabels";
import { formatVoucherDisplay } from "@/lib/voucherFormat";
import {
  isStockPendingCC,
  isStockPendingFinance,
  isStockPendingManager,
} from "@/lib/hotelApproval";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { notifyApiFailure } from "@/lib/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  if (pending.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        No purchase requests awaiting manager authorization.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-dashed border-primary/25 bg-primary/5 shadow-sm">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setSelectedIds(
                selectedIds.length === pending.length ? [] : pending.map((row) => row.id),
              )
            }
          >
            {selectedIds.length === pending.length ? "Clear selection" : "Select all"}
          </Button>
          <PendingButton
            pending={isPending("mgr-pr-batch-a")}
            disabled={selectedIds.length === 0}
            onClick={() =>
              void run("mgr-pr-batch-a", async () => {
                try {
                  const results = await authorizePurchaseRequestsManagerBatchApi(
                    selectedIds,
                  );
                  for (const res of results) onPatch(res.id, res.status);
                  setSelectedIds([]);
                  onRefresh();
                } catch (e) {
                  notifyApiFailure(e, "Batch authorization failed");
                }
              })
            }
          >
            Authorize selected ({selectedIds.length})
          </PendingButton>
          <PendingButton
            variant="outline"
            className="text-destructive"
            pending={isPending("mgr-pr-batch-r")}
            disabled={selectedIds.length === 0}
            onClick={() =>
              void run("mgr-pr-batch-r", async () => {
                try {
                  const results = await rejectPurchaseRequestsManagerBatchApi(
                    selectedIds,
                    "Rejected by manager",
                  );
                  for (const res of results) onPatch(res.id, res.status);
                  setSelectedIds([]);
                  onRefresh();
                } catch (e) {
                  notifyApiFailure(e, "Batch rejection failed");
                }
              })
            }
          >
            Reject selected ({selectedIds.length})
          </PendingButton>
        </CardContent>
      </Card>

      {pending.map((r) => (
        <Card key={r.id}>
          <CardHeader className="py-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedIds.includes(r.id)}
                onCheckedChange={(checked) =>
                  setSelectedIds((prev) =>
                    checked === true
                      ? [...new Set([...prev, r.id])]
                      : prev.filter((id) => id !== r.id),
                  )
                }
                className="mt-1 shrink-0"
                aria-label={`Select purchase request ${r.itemName}`}
              />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">
                  {r.itemName} · Voucher{" "}
                  {formatVoucherDisplay(r.voucherNumber, r.voucherDisplay)}
                </CardTitle>
                <CardDescription>
                  {formatQtyWithUnit(r.quantity, r.measuredBy)} · Est.{" "}
                  {r.estimatedUnitPrice} ETB/unit · {formatPurchaseStatus(r.status)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2 pb-4">
            <PendingButton
              pending={isPending(`mgr-pr-${r.id}`)}
              onClick={() =>
                void run(`mgr-pr-${r.id}`, async () => {
                  try {
                    const res = await authorizePurchaseRequestManagerApi(r.id);
                    onPatch(r.id, res.status);
                    onRefresh();
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
                    onRefresh();
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchCcProfileId, setBatchCcProfileId] = useState("");

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
    role === "CostControl" ? "Check" : role === "Finance" ? "Approve" : "Authorize";

  if (pending.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        No stock movements in this queue.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-dashed border-primary/25 bg-primary/5 shadow-sm">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-end">
          {role === "CostControl" ? (
            <div className="min-w-[220px] flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">
                Cost controller identity for batch check
              </Label>
              <Select value={batchCcProfileId} onValueChange={setBatchCcProfileId}>
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

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setSelectedIds(
                  selectedIds.length === pending.length ? [] : pending.map((row) => row.id),
                )
              }
            >
              {selectedIds.length === pending.length ? "Clear selection" : "Select all"}
            </Button>
            <PendingButton
              pending={isPending(`so-batch-${role}-a`)}
              disabled={selectedIds.length === 0}
              onClick={() =>
                void run(`so-batch-${role}-a`, async () => {
                  try {
                    if (role === "CostControl") {
                      const pid = Number(batchCcProfileId);
                      if (!pid) throw new Error("Select cost controller identity");
                      const results = await approveStockOutRequestsBatchApi(
                        selectedIds,
                        pid,
                      );
                      for (const res of results) onPatch(res.id, res.status);
                    } else if (role === "Finance") {
                      const results = await approveStockOutRequestsFinanceBatchApi(
                        selectedIds,
                      );
                      for (const res of results) onPatch(res.id, res.status);
                    } else {
                      const results = await authorizeStockOutRequestsManagerBatchApi(
                        selectedIds,
                      );
                      for (const res of results) onPatch(res.id, res.status);
                    }
                    setSelectedIds([]);
                    onRefresh();
                  } catch (e) {
                    notifyApiFailure(e, `${actionLabel} failed`);
                  }
                })
              }
            >
              {actionLabel} selected ({selectedIds.length})
            </PendingButton>
            <PendingButton
              variant="outline"
              className="text-destructive"
              pending={isPending(`so-batch-${role}-r`)}
              disabled={selectedIds.length === 0}
              onClick={() =>
                void run(`so-batch-${role}-r`, async () => {
                  try {
                    const fallbackCcDisplayName =
                      role === "CostControl"
                        ? profiles.find((p) => p.id === Number(batchCcProfileId))?.displayName?.trim()
                        : undefined;
                    const results = await rejectStockOutRequestsBatchApi(
                      selectedIds,
                      `Rejected by ${role}`,
                      fallbackCcDisplayName,
                    );
                    for (const res of results) onPatch(res.id, res.status, res);
                    setSelectedIds([]);
                    onRefresh();
                  } catch (e) {
                    notifyApiFailure(e, "Rejection failed");
                  }
                })
              }
            >
              Reject selected ({selectedIds.length})
            </PendingButton>
          </div>
        </CardContent>
      </Card>

      {pending.map((r) => (
        <Card key={r.id}>
          <CardHeader className="py-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedIds.includes(r.id)}
                onCheckedChange={(checked) =>
                  setSelectedIds((prev) =>
                    checked === true
                      ? [...new Set([...prev, r.id])]
                      : prev.filter((id) => id !== r.id),
                  )
                }
                className="mt-1 shrink-0"
                aria-label={`Select stock movement ${r.itemName || r.itemRegistrationId}`}
              />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">
                  {r.itemName || `#${r.itemRegistrationId}`} ·{" "}
                  {formatMovementType(r.movementType)}
                </CardTitle>
                <CardDescription>
                  Voucher {formatVoucherDisplay(r.voucherNumber, r.voucherDisplay)} · Qty{" "}
                  {r.amount} · {r.stakeHolderOrReason}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pb-4 sm:flex-row">
            {role === "CostControl" ? (
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Cost controller identity
                </Label>
                <Select
                  value={ccPick[r.id] ?? ""}
                  onValueChange={(v) => setCcPick((m) => ({ ...m, [r.id]: v }))}
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
            <div className="flex items-end gap-2">
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
                      onRefresh();
                    } catch (e) {
                      notifyApiFailure(e, `${actionLabel} failed`);
                    }
                  })
                }
              >
                {actionLabel}
                {role === "CostControl"
                  ? " → finance"
                  : role === "Finance"
                    ? " → manager"
                    : " & apply"}
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
                      onRefresh();
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
