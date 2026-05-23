"use client";

import { useEffect, useMemo, useState } from "react";
import type { PurchaseRequestRow } from "@/lib/actions";
import {
  submitPurchaseRequestUnitPriceChangeApi,
  checkPurchaseRequestUnitPriceCCApi,
  approvePurchaseRequestUnitPriceFinanceApi,
  authorizePurchaseRequestUnitPriceManagerApi,
  rejectPurchaseRequestUnitPriceApi,
  fetchCostControllerProfiles,
} from "@/lib/actions";
import { isPurchaseAuthorized } from "@/lib/hotelApproval";
import { formatVoucherDisplay } from "@/lib/voucherFormat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { notifyApiFailure } from "@/lib/actions";
import { toast } from "sonner";

const STORE_PAGE_SIZE = 8;

export function PurchaseRequestUnitPriceRevisions({
  rows,
  role,
  onRefresh,
}: {
  rows: PurchaseRequestRow[];
  role: "Store" | "CostControl" | "Finance" | "Manager";
  onRefresh: () => void;
}) {
  const eligible = rows.filter((r) => isPurchaseAuthorized(r.status));
  const pending = rows.filter(
    (r) =>
      r.unitPriceChangeStatus &&
      !["AUTHORIZED", "REJECTED", null, ""].includes(
        String(r.unitPriceChangeStatus),
      ),
  );
  const [draftPrice, setDraftPrice] = useState<Record<number, string>>({});
  const [ccProfileId, setCcProfileId] = useState("");
  const [storePage, setStorePage] = useState(0);
  const { isPending, run } = useConcurrentActions();

  const storePageCount = Math.max(1, Math.ceil(eligible.length / STORE_PAGE_SIZE));
  const storePageItems = useMemo(() => {
    const start = storePage * STORE_PAGE_SIZE;
    return eligible.slice(start, start + STORE_PAGE_SIZE);
  }, [eligible, storePage]);

  if (role === "Store") {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Revise unit price</CardTitle>
          <CardDescription>
            After goods arrive, submit an updated unit price for manager-approved
            purchase requests. Finance and manager must authorize before the estimate
            changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {eligible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No authorized purchase requests available.
            </p>
          ) : (
            <>
            {eligible.length > STORE_PAGE_SIZE ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Showing {storePage * STORE_PAGE_SIZE + 1}–
                  {Math.min((storePage + 1) * STORE_PAGE_SIZE, eligible.length)} of{" "}
                  {eligible.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={storePage <= 0}
                    onClick={() => setStorePage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={storePage >= storePageCount - 1}
                    onClick={() =>
                      setStorePage((p) => Math.min(storePageCount - 1, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
            {storePageItems.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-end gap-2 border rounded-lg p-3"
              >
                <PrRow>
                  <p className="font-medium text-sm">{r.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    Current est. {r.estimatedUnitPrice} ETB · Voucher{" "}
                    {formatVoucherDisplay(r.voucherNumber, r.voucherDisplay)}
                  </p>
                </PrRow>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-32"
                  placeholder="New unit price"
                  value={draftPrice[r.id] ?? ""}
                  onChange={(e) =>
                    setDraftPrice((m) => ({ ...m, [r.id]: e.target.value }))
                  }
                />
                <PendingButton
                  size="sm"
                  pending={isPending(`pr-price-${r.id}`)}
                  disabled={!!r.unitPriceChangeStatus?.startsWith("PENDING")}
                  onClick={() =>
                    void run(`pr-price-${r.id}`, async () => {
                      const price = Number(draftPrice[r.id]);
                      if (!(price >= 0)) {
                        toast.error("Enter a valid unit price");
                        return;
                      }
                      try {
                        await submitPurchaseRequestUnitPriceChangeApi(
                          r.id,
                          price,
                        );
                        await onRefresh();
                      } catch (e) {
                        notifyApiFailure(e, "Submit failed");
                      }
                    })
                  }
                >
                  Submit revision
                </PendingButton>
              </div>
            ))}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const approverLabel =
    role === "CostControl"
      ? "cost control check"
      : role === "Finance"
        ? "finance approval"
        : "manager authorization";

  if (pending.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Unit price revisions</CardTitle>
          <CardDescription>
            No unit price changes awaiting {approverLabel}. Authorized purchase
            requests with a submitted revision appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Unit price revisions</CardTitle>
        <CardDescription>
          {pending.length} revision(s) awaiting {approverLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {role === "CostControl" ? (
          <CcProfileSelect value={ccProfileId} onChange={setCcProfileId} />
        ) : null}
        {pending.map((r) => (
          <div key={r.id} className="border rounded-lg p-3 space-y-2">
            <p className="font-medium text-sm">
              {r.itemName} → {r.pendingUnitPrice} ETB (was {r.estimatedUnitPrice})
            </p>
            <div className="flex gap-2">
              <PendingButton
                size="sm"
                pending={isPending(`up-${r.id}`)}
                onClick={() =>
                  void run(`up-${r.id}`, async () => {
                    try {
                      if (role === "CostControl") {
                        const pid = Number(ccProfileId);
                        if (!pid) throw new Error("Select cost controller");
                        await checkPurchaseRequestUnitPriceCCApi(r.id, pid);
                      } else if (role === "Finance") {
                        await approvePurchaseRequestUnitPriceFinanceApi(r.id);
                      } else {
                        await authorizePurchaseRequestUnitPriceManagerApi(r.id);
                      }
                      await onRefresh();
                    } catch (e) {
                      notifyApiFailure(e, "Action failed");
                    }
                  })
                }
              >
                {role === "CostControl"
                  ? "Check"
                  : role === "Finance"
                    ? "Approve"
                    : "Authorize"}
              </PendingButton>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() =>
                  void rejectPurchaseRequestUnitPriceApi(r.id, "Rejected")
                    .then(onRefresh)
                    .catch((e) => notifyApiFailure(e, "Reject failed"))
                }
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CcProfileSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [profiles, setProfiles] = useState<
    { id: number; displayName: string }[]
  >([]);

  useEffect(() => {
    void fetchCostControllerProfiles().then((rows) =>
      setProfiles(rows.map((p) => ({ id: p.id, displayName: p.displayName }))),
    );
  }, []);

  return (
    <div className="space-y-1 max-w-xs">
      <Label className="text-xs">Cost controller</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select identity" />
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
  );
}

function PrRow({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 min-w-[140px]">{children}</div>;
}
