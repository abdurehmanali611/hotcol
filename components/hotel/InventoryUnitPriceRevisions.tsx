"use client";

import { useEffect, useState } from "react";
import type { ItemRegistration } from "@/lib/actions";
import {
  submitItemRegistrationUnitPriceChangeApi,
  checkItemRegistrationUnitPriceCCApi,
  approveItemRegistrationUnitPriceFinanceApi,
  authorizeItemRegistrationUnitPriceManagerApi,
  rejectItemRegistrationUnitPriceApi,
  fetchCostControllerProfiles,
} from "@/lib/actions";
import { isItemRegAuthorized } from "@/lib/hotelApproval";
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
import { useRejectionReasonDialog } from "@/hooks/useRejectionReasonDialog";
import { notifyApiFailure } from "@/lib/actions";
import { toast } from "sonner";

export function InventoryUnitPriceRevisions({
  rows,
  role,
  onRefresh,
}: {
  rows: ItemRegistration[];
  role: "Store" | "CostControl" | "Finance" | "Manager";
  onRefresh: () => void;
}) {
  const eligible = rows.filter((r) => isItemRegAuthorized(r.approvalStatus));
  const pending = rows.filter(
    (r) =>
      r.unitPriceChangeStatus &&
      !["AUTHORIZED", "REJECTED", null, ""].includes(
        String(r.unitPriceChangeStatus),
      ),
  );
  const [draftPrice, setDraftPrice] = useState<Record<number, string>>({});
  const [ccProfileId, setCcProfileId] = useState("");
  const { isPending, run } = useConcurrentActions();
  const { requestRejectionReason, RejectionReasonDialog } =
    useRejectionReasonDialog();

  if (role === "Store") {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Revise inventory unit price</CardTitle>
          <CardDescription>
            Submit an updated unit price for registered stock. Cost control, finance,
            and manager must authorize before the inventory unit price changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {eligible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No authorized inventory items available.
            </p>
          ) : (
            eligible.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-end gap-2 border rounded-lg p-3"
              >
                <ItemRow>
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Current {r.unitPrice} ETB · Voucher{" "}
                    {formatVoucherDisplay(r.voucherNumber, r.voucherDisplay)}
                  </p>
                </ItemRow>
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
                  pending={isPending(`inv-price-${r.id}`)}
                  disabled={!!r.unitPriceChangeStatus?.startsWith("PENDING")}
                  onClick={() =>
                    void run(`inv-price-${r.id}`, async () => {
                      const price = Number(draftPrice[r.id]);
                      if (!(price >= 0)) {
                        toast.error("Enter a valid unit price");
                        return;
                      }
                      try {
                        await submitItemRegistrationUnitPriceChangeApi(
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
            ))
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
          <CardTitle className="text-base">Inventory unit price revisions</CardTitle>
          <CardDescription>
            No unit price changes awaiting {approverLabel}. Authorized inventory
            with a submitted revision appears here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      {RejectionReasonDialog}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Inventory unit price revisions</CardTitle>
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
              {r.name} → {r.pendingUnitPrice} ETB (was {r.unitPrice})
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Voucher {formatVoucherDisplay(r.voucherNumber, r.voucherDisplay)}
            </p>
            <div className="flex gap-2">
              <PendingButton
                size="sm"
                pending={isPending(`inv-up-${r.id}`)}
                onClick={() =>
                  void run(`inv-up-${r.id}`, async () => {
                    try {
                      if (role === "CostControl") {
                        const pid = Number(ccProfileId);
                        if (!pid) throw new Error("Select cost controller");
                        await checkItemRegistrationUnitPriceCCApi(r.id, pid);
                      } else if (role === "Finance") {
                        await approveItemRegistrationUnitPriceFinanceApi(r.id);
                      } else {
                        await authorizeItemRegistrationUnitPriceManagerApi(r.id);
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
                  void (async () => {
                    const reason = await requestRejectionReason({
                      title: "Reject unit price revision",
                      description:
                        "Provide a reason for the store team.",
                    });
                    if (!reason) return;
                    try {
                      await rejectItemRegistrationUnitPriceApi(r.id, reason);
                      await onRefresh();
                    } catch (e) {
                      notifyApiFailure(e, "Reject failed");
                    }
                  })()
                }
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
    </>
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

function ItemRow({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 min-w-[140px]">{children}</div>;
}
