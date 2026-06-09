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
import { formatPurchaseStatus, formatQtyWithUnit } from "@/lib/hotelDisplayLabels";
import {
  buildStoreUnitPriceRevisionDisplayPool,
  filterPurchaseUnitPricePendingForRole,
  filterPurchaseRowsByVoucherSearch,
  getPurchaseUnitPriceEditBlockReason,
  groupPurchaseRequestsByVoucher,
  purchaseUnitPricePendingForRole,
  summarizeStoreUnitPricePool,
  type PurchaseVoucherGroup,
  type UnitPriceApproverRole,
} from "@/lib/purchaseRequestUnitPriceVoucher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { sortRowsByFifo } from "@/lib/requestOrdering";
import { rowsOnSameVoucher } from "@/lib/requestStatusFilters";
import { toast } from "sonner";
import {
  AlertCircle,
  Lock,
  Receipt,
  Search,
  Tag,
} from "lucide-react";

export function PurchaseRequestUnitPriceRevisions({
  rows,
  role,
  onRefresh,
}: {
  rows: PurchaseRequestRow[];
  role: "Store" | UnitPriceApproverRole;
  onRefresh: () => void;
}) {
  const [voucherQuery, setVoucherQuery] = useState("");
  const [storeGroupPage, setStoreGroupPage] = useState(0);
  const [draftPrice, setDraftPrice] = useState<Record<number, string>>({});
  const [ccProfileId, setCcProfileId] = useState("");
  const [approverFilter, setApproverFilter] = useState("");

  const STORE_GROUPS_PAGE_SIZE = 6;
  const { isPending, run } = useConcurrentActions();
  const { requestRejectionReason, RejectionReasonDialog } =
    useRejectionReasonDialog();

  const storeDisplayPool = useMemo(
    () => buildStoreUnitPriceRevisionDisplayPool(rows),
    [rows],
  );

  const storeFilteredRows = useMemo(() => {
    const q = voucherQuery.trim();
    if (!q) return storeDisplayPool;
    return filterPurchaseRowsByVoucherSearch(storeDisplayPool, q);
  }, [storeDisplayPool, voucherQuery]);

  const storeGroups = useMemo(
    () => groupPurchaseRequestsByVoucher(storeFilteredRows),
    [storeFilteredRows],
  );

  const storeSummary = useMemo(
    () => summarizeStoreUnitPricePool(storeFilteredRows),
    [storeFilteredRows],
  );

  const storeGroupPageCount = Math.max(
    1,
    Math.ceil(storeGroups.length / STORE_GROUPS_PAGE_SIZE),
  );
  const safeStoreGroupPage = Math.min(
    storeGroupPage,
    Math.max(0, storeGroupPageCount - 1),
  );
  const storeGroupsPage = useMemo(() => {
    const start = safeStoreGroupPage * STORE_GROUPS_PAGE_SIZE;
    return storeGroups.slice(start, start + STORE_GROUPS_PAGE_SIZE);
  }, [storeGroups, safeStoreGroupPage]);

  const pendingForRole = useMemo(
    () =>
      role === "Store"
        ? []
        : filterPurchaseUnitPricePendingForRole(rows, role),
    [rows, role],
  );

  const approverGroups = useMemo(() => {
    if (role === "Store") return [];
    const approverRole = role as UnitPriceApproverRole;
    if (!pendingForRole.length && !approverFilter.trim()) return [];

    const receiptPool = expandApproverPool(pendingForRole, rows);
    const pool = approverFilter.trim()
      ? filterPurchaseRowsByVoucherSearch(receiptPool, approverFilter)
      : receiptPool;

    return groupPurchaseRequestsByVoucher(pool).filter((group) =>
      group.rows.some((r) => purchaseUnitPricePendingForRole(r, approverRole)),
    );
  }, [rows, pendingForRole, role, approverFilter]);

  if (role === "Store") {
    return (
      <Card className="overflow-hidden border-dashed">
        {RejectionReasonDialog}
        <CardHeader className="space-y-1 border-b border-border/40 bg-muted/20 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base">Revise unit price by voucher</CardTitle>
              <CardDescription>
                Vouchers with manager-authorized lines are listed below. Filter by
                receipt number (partial or range e.g.{" "}
                <span className="font-mono text-xs">10-20</span>) or item name. Approved
                revisions update the original estimated unit price.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="pr-voucher-search" className="text-xs">
                Search vouchers or items
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pr-voucher-search"
                  className="pl-9 bg-background/80"
                  placeholder="Filter: 0045, 10-20, or item name…"
                  value={voucherQuery}
                  onChange={(e) => {
                    setVoucherQuery(e.target.value);
                    setStoreGroupPage(0);
                  }}
                />
              </div>
            </div>
            {voucherQuery.trim() ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setVoucherQuery("");
                  setStoreGroupPage(0);
                }}
              >
                Clear filter
              </Button>
            ) : null}
          </div>

          {storeDisplayPool.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              No manager-authorized purchase requests yet. Unit price can be revised
              after authorization.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-normal tabular-nums">
                  {storeSummary.voucherCount} voucher
                  {storeSummary.voucherCount !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className="font-normal tabular-nums">
                  {storeSummary.lineCount} line
                  {storeSummary.lineCount !== 1 ? "s" : ""}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/5 font-normal tabular-nums text-emerald-800 dark:text-emerald-300"
                >
                  {storeSummary.editableCount} editable
                </Badge>
                {voucherQuery.trim() ? (
                  <span className="text-xs text-muted-foreground self-center">
                    Filtered by &ldquo;{voucherQuery.trim()}&rdquo;
                  </span>
                ) : null}
              </div>

              {storeGroups.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No vouchers match your filter.
                </p>
              ) : (
                <>
                  <div className="space-y-4">
                    {storeGroupsPage.map((group) => (
                      <VoucherRevisionGroup
                        key={group.key}
                        group={group}
                        role="Store"
                        draftPrice={draftPrice}
                        setDraftPrice={setDraftPrice}
                        isPending={isPending}
                        run={run}
                        onRefresh={onRefresh}
                      />
                    ))}
                  </div>
                  {storeGroups.length > STORE_GROUPS_PAGE_SIZE ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span>
                        Vouchers {safeStoreGroupPage * STORE_GROUPS_PAGE_SIZE + 1}–
                        {Math.min(
                          (safeStoreGroupPage + 1) * STORE_GROUPS_PAGE_SIZE,
                          storeGroups.length,
                        )}{" "}
                        of {storeGroups.length}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={safeStoreGroupPage <= 0}
                          onClick={() =>
                            setStoreGroupPage((p) => Math.max(0, p - 1))
                          }
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={safeStoreGroupPage >= storeGroupPageCount - 1}
                          onClick={() =>
                            setStoreGroupPage((p) =>
                              Math.min(storeGroupPageCount - 1, p + 1),
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
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

  if (pendingForRole.length === 0 && !approverFilter.trim()) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Unit price revisions</CardTitle>
          <CardDescription>
            No unit price changes awaiting {approverLabel}. When the store submits a
            revision, lines are grouped by voucher (receipt) number.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const displayGroups =
    approverGroups.length > 0
      ? approverGroups
      : groupPurchaseRequestsByVoucher(pendingForRole);

  return (
    <>
      {RejectionReasonDialog}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
          <CardTitle className="text-base">Unit price revisions</CardTitle>
          <CardDescription>
            {pendingForRole.length} line(s) awaiting {approverLabel}, grouped by
            voucher. Authorizing updates the store&apos;s original estimated unit price
            on that line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="approver-voucher-filter" className="text-xs">
                Filter by voucher (optional)
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="approver-voucher-filter"
                  className="pl-9"
                  placeholder="Voucher or range"
                  value={approverFilter}
                  onChange={(e) => setApproverFilter(e.target.value)}
                />
              </div>
            </div>
          </div>

          {role === "CostControl" ? (
            <CcProfileSelect value={ccProfileId} onChange={setCcProfileId} />
          ) : null}

          {displayGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No revisions match this voucher filter.
            </p>
          ) : (
            displayGroups.map((group) => (
              <VoucherRevisionGroup
                key={group.key}
                group={group}
                role={role}
                ccProfileId={ccProfileId}
                draftPrice={draftPrice}
                setDraftPrice={setDraftPrice}
                isPending={isPending}
                run={run}
                onRefresh={onRefresh}
                requestRejectionReason={requestRejectionReason}
              />
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}

function expandApproverPool(
  pending: PurchaseRequestRow[],
  pool: readonly PurchaseRequestRow[],
): PurchaseRequestRow[] {
  const seen = new Set<number>();
  const out: PurchaseRequestRow[] = [];
  for (const anchor of pending) {
    for (const row of rowsOnSameVoucher(anchor, pool)) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }
  return sortRowsByFifo(out);
}

function VoucherRevisionGroup({
  group,
  role,
  ccProfileId = "",
  draftPrice,
  setDraftPrice,
  isPending,
  run,
  onRefresh,
  requestRejectionReason,
}: {
  group: PurchaseVoucherGroup<PurchaseRequestRow>;
  role: "Store" | UnitPriceApproverRole;
  ccProfileId?: string;
  draftPrice: Record<number, string>;
  setDraftPrice: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  isPending: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => void;
  onRefresh: () => void;
  requestRejectionReason?: (opts: {
    title: string;
    description: string;
  }) => Promise<string | null>;
}) {
  const editableCount = group.rows.filter(
    (r) => !getPurchaseUnitPriceEditBlockReason(r),
  ).length;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-semibold tracking-wide">
            Voucher {group.label}
          </span>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {group.rows.length} line{group.rows.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        {role === "Store" ? (
          <span className="text-xs text-muted-foreground">
            {editableCount} editable
          </span>
        ) : null}
      </div>
      <ul className="divide-y">
        {group.rows.map((r) => (
          <li key={r.id} className="px-4 py-3">
            <PurchaseLineUnitPriceRow
              row={r}
              role={role}
              ccProfileId={ccProfileId}
              draftPrice={draftPrice}
              setDraftPrice={setDraftPrice}
              isPending={isPending}
              run={run}
              onRefresh={onRefresh}
              requestRejectionReason={requestRejectionReason}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PurchaseLineUnitPriceRow({
  row,
  role,
  ccProfileId,
  draftPrice,
  setDraftPrice,
  isPending,
  run,
  onRefresh,
  requestRejectionReason,
}: {
  row: PurchaseRequestRow;
  role: "Store" | UnitPriceApproverRole;
  ccProfileId: string;
  draftPrice: Record<number, string>;
  setDraftPrice: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  isPending: (key: string) => boolean;
  run: (key: string, fn: () => Promise<void>) => void;
  onRefresh: () => void;
  requestRejectionReason?: (opts: {
    title: string;
    description: string;
  }) => Promise<string | null>;
}) {
  const blockReason = getPurchaseUnitPriceEditBlockReason(row);
  const canActAsApprover =
    role !== "Store" && purchaseUnitPricePendingForRole(row, role);

  if (role === "Store") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-sm">{row.itemName}</p>
          <p className="text-xs text-muted-foreground">
            {formatQtyWithUnit(row.quantity, row.measuredBy)} · Current est.{" "}
            <span className="tabular-nums font-medium text-foreground">
              {row.estimatedUnitPrice} ETB
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatPurchaseStatus(row.status)}
          </p>
          {blockReason ? (
            <p className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-200/90">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{blockReason}</span>
            </p>
          ) : null}
        </div>
        {!blockReason ? (
          <>
            <Input
              type="number"
              min={0}
              step="any"
              className="w-full sm:w-36"
              placeholder="New unit price"
              value={draftPrice[row.id] ?? ""}
              onChange={(e) =>
                setDraftPrice((m) => ({ ...m, [row.id]: e.target.value }))
              }
            />
            <PendingButton
              size="sm"
              pending={isPending(`pr-price-${row.id}`)}
              onClick={() =>
                void run(`pr-price-${row.id}`, async () => {
                  const price = Number(draftPrice[row.id]);
                  if (!(price >= 0)) {
                    toast.error("Enter a valid unit price");
                    return;
                  }
                  try {
                    await submitPurchaseRequestUnitPriceChangeApi(row.id, price);
                    setDraftPrice((m) => {
                      const next = { ...m };
                      delete next[row.id];
                      return next;
                    });
                    await onRefresh();
                  } catch (e) {
                    notifyApiFailure(e, "Submit failed");
                  }
                })
              }
            >
              Submit revision
            </PendingButton>
          </>
        ) : (
          <Badge
            variant="outline"
            className="shrink-0 gap-1 border-amber-500/30 text-amber-800 dark:text-amber-200"
          >
            <AlertCircle className="h-3 w-3" />
            Not editable
          </Badge>
        )}
      </div>
    );
  }

  const showRevision =
    row.pendingUnitPrice != null && row.unitPriceChangeStatus?.startsWith("PENDING");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm">{row.itemName}</p>
          <p className="text-xs text-muted-foreground">
            {formatQtyWithUnit(row.quantity, row.measuredBy)}
          </p>
        </div>
        {showRevision ? (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {row.unitPriceChangeStatus?.replace("PENDING_", "Awaiting ")}
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
            {formatPurchaseStatus(row.status)}
          </Badge>
        )}
      </div>

      {showRevision ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Proposed </span>
          <span className="font-semibold tabular-nums">{row.pendingUnitPrice} ETB</span>
          <span className="text-muted-foreground"> (was </span>
          <span className="tabular-nums">{row.estimatedUnitPrice} ETB</span>
          <span className="text-muted-foreground">)</span>
        </p>
      ) : (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No revision pending your step on this line — shown for voucher context (
            {formatPurchaseStatus(row.status).toLowerCase()}).
          </span>
        </p>
      )}

      {canActAsApprover && requestRejectionReason ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <PendingButton
            size="sm"
            pending={isPending(`up-${row.id}`)}
            onClick={() =>
              void run(`up-${row.id}`, async () => {
                try {
                  if (role === "CostControl") {
                    const pid = Number(ccProfileId);
                    if (!pid) throw new Error("Select cost controller");
                    await checkPurchaseRequestUnitPriceCCApi(row.id, pid);
                  } else if (role === "Finance") {
                    await approvePurchaseRequestUnitPriceFinanceApi(row.id);
                  } else {
                    await authorizePurchaseRequestUnitPriceManagerApi(row.id);
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
                  description: "Provide a reason for the store team.",
                });
                if (!reason) return;
                try {
                  await rejectPurchaseRequestUnitPriceApi(row.id, reason);
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
      ) : null}
    </div>
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
