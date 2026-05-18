"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ItemRegistration } from "@/lib/actions";
import {
  approveItemRegistrationsFinanceBatchApi,
  approveItemRegistrationFinanceApi,
  authorizeItemRegistrationsManagerBatchApi,
  authorizeItemRegistrationManagerApi,
  checkItemRegistrationsCCBatchApi,
  checkItemRegistrationCCApi,
  fetchCostControllerProfiles,
  notifyApiFailure,
  rejectItemRegistrationsFinanceBatchApi,
  rejectItemRegistrationFinanceApi,
  type CostControllerProfileRow,
} from "@/lib/actions";
import { StoreItemRegistrationReceipt } from "./StoreItemRegistrationReceipt";
import { formatItemRegistrationStatus } from "@/lib/hotelDisplayLabels";
import { DataTable, type DataTableRef } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import type { ColumnDef } from "@tanstack/react-table";
import { VOUCHER_TABLE_SORT } from "@/lib/voucherSort";
import { buildVoucherColumn } from "@/lib/dataTableColumns/voucherColumn";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

type RoleMode = "CostControl" | "Finance" | "Manager";

export function HotelItemReceiptApprovals({
  items,
  role,
  propertyName,
  propertyTin,
  logoUrl,
  onRefresh,
}: {
  items: ItemRegistration[];
  role: RoleMode;
  propertyName: string;
  propertyTin?: string | null;
  logoUrl?: string | null;
  onRefresh: () => void;
}) {
  const [ccProfiles, setCcProfiles] = useState<CostControllerProfileRow[]>([]);
  const [ccProfileId, setCcProfileId] = useState<string>("");
  const [preview, setPreview] = useState<ItemRegistration | null>(null);
  const [selectedRows, setSelectedRows] = useState<ItemRegistration[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<DataTableRef>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });
  const { isPending, run } = useConcurrentActions();

  useEffect(() => {
    if (role !== "CostControl") return;
    void fetchCostControllerProfiles().then((rows) => {
      setCcProfiles(rows);
      if (rows[0]) setCcProfileId(String(rows[0].id));
    });
  }, [role]);

  const pending = useMemo(() => {
    if (role === "CostControl") {
      return items.filter((i) => i.approvalStatus === "PENDING_CC");
    }
    if (role === "Finance") {
      return items.filter((i) => i.approvalStatus === "PENDING_FINANCE");
    }
    return items.filter((i) => i.approvalStatus === "PENDING_MANAGER");
  }, [items, role]);

  const pendingIdSet = useMemo(
    () => new Set(pending.map((row) => row.id).filter((id): id is number => typeof id === "number")),
    [pending],
  );

  const act = useCallback(async (row: ItemRegistration) => {
    if (role === "CostControl") {
      const pid = Number(ccProfileId);
      if (!pid) throw new Error("Select cost controller identity");
      await checkItemRegistrationCCApi(row.id, pid);
    } else if (role === "Finance") {
      await approveItemRegistrationFinanceApi(row.id);
    } else {
      await authorizeItemRegistrationManagerApi(row.id);
    }
    await Promise.resolve(onRefresh());
  }, [ccProfileId, onRefresh, role]);

  const reject = useCallback(async (row: ItemRegistration) => {
    await rejectItemRegistrationFinanceApi(row.id, "Rejected by finance");
    await Promise.resolve(onRefresh());
  }, [onRefresh]);

  const label =
    role === "CostControl"
      ? "Check"
      : role === "Finance"
        ? "Approve"
        : "Authorize";

  const selectedIds = useMemo(
    () =>
      selectedRows
        .map((row) => row.id)
        .filter(
          (id): id is number => typeof id === "number" && pendingIdSet.has(id),
        ),
    [pendingIdSet, selectedRows],
  );

  const clearSelection = useCallback(() => {
    tableRef.current?.resetRowSelection();
    setSelectedRows([]);
  }, []);

  const handleBatchAct = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (role === "CostControl") {
      const pid = Number(ccProfileId);
      if (!pid) {
        toast.error("Select cost controller identity");
        return;
      }
    }
    void run(`item-reg-batch-${role}-act`, async () => {
      try {
        if (role === "CostControl") {
          await checkItemRegistrationsCCBatchApi(selectedIds, Number(ccProfileId));
        } else if (role === "Finance") {
          await approveItemRegistrationsFinanceBatchApi(selectedIds);
        } else {
          await authorizeItemRegistrationsManagerBatchApi(selectedIds);
        }
        clearSelection();
        await Promise.resolve(onRefresh());
      } catch (e) {
        notifyApiFailure(e, `${label} failed`);
      }
    });
  }, [ccProfileId, clearSelection, label, onRefresh, role, run, selectedIds]);

  const handleBatchReject = useCallback(() => {
    if (role !== "Finance" || selectedIds.length === 0) return;
    void run("item-reg-batch-finance-reject", async () => {
      try {
        await rejectItemRegistrationsFinanceBatchApi(selectedIds);
        clearSelection();
        await Promise.resolve(onRefresh());
      } catch (e) {
        notifyApiFailure(e, "Rejection failed");
      }
    });
  }, [clearSelection, onRefresh, role, run, selectedIds]);

  const columns: ColumnDef<ItemRegistration>[] = useMemo(
    () => [
      {
        ...buildVoucherColumn<ItemRegistration>(),
      },
      { accessorKey: "name", header: "Item" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="outline">
            {formatItemRegistrationStatus(row.original.approvalStatus || "")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const actKey = `item-reg-row-${role}-act-${row.original.id}`;
          const rejectKey = `item-reg-row-${role}-reject-${row.original.id}`;
          return (
            <ApprovalRowActions
              role={role}
              label={label}
              onPrint={() => {
                setPreview(row.original);
                requestAnimationFrame(() => handlePrint());
              }}
              onAct={() =>
                void run(actKey, async () => {
                  try {
                    await act(row.original);
                  } catch (e) {
                    notifyApiFailure(e, `${label} failed`);
                  }
                })
              }
              onReject={() =>
                void run(rejectKey, async () => {
                  try {
                    await reject(row.original);
                  } catch (e) {
                    notifyApiFailure(e, "Rejection failed");
                  }
                })
              }
              pendingAct={isPending(actKey)}
              pendingReject={isPending(rejectKey)}
            />
          );
        },
      },
    ],
    [act, handlePrint, isPending, label, reject, role, run],
  );

  return (
    <div className="space-y-4">
      {role === "CostControl" && ccProfiles.length > 0 ? (
        <Select value={ccProfileId} onValueChange={setCcProfileId}>
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Cost controller identity" />
          </SelectTrigger>
          <SelectContent>
            {ccProfiles.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {pending.length > 0 ? (
        <Card className="border-dashed border-primary/25 bg-primary/5 shadow-sm">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Checkbox
                checked={
                  selectedIds.length === pending.length
                    ? true
                    : selectedIds.length > 0
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    tableRef.current?.setRowSelectionByIds(
                      pending.map((row) => String(row.id)),
                    );
                    setSelectedRows(pending);
                  } else {
                    clearSelection();
                  }
                }}
                aria-label="Select all registrations"
              />
              <span>Select all</span>
            </label>
            <PendingButton
              size="sm"
              className="shadow-sm"
              pending={isPending(`item-reg-batch-${role}-act`)}
              disabled={selectedIds.length === 0}
              onClick={handleBatchAct}
            >
              {label} selected ({selectedIds.length})
            </PendingButton>
            {role === "Finance" ? (
              <PendingButton
                size="sm"
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                pending={isPending("item-reg-batch-finance-reject")}
                disabled={selectedIds.length === 0}
                onClick={handleBatchReject}
              >
                Reject selected ({selectedIds.length})
              </PendingButton>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      <DataTable
        ref={tableRef}
        columns={columns}
        data={pending}
        enableRowSelection
        getRowId={(row) => String(row.id ?? "")}
        onRowSelectionChange={setSelectedRows}
        searchColumnId="name"
        initialSorting={VOUCHER_TABLE_SORT}
        emptyMessage="No registrations awaiting action."
      />
      <div className="sr-only" aria-hidden>
        <div ref={printRef}>
          {preview ? (
            <StoreItemRegistrationReceipt
              item={preview}
              propertyName={propertyName}
              propertyTin={propertyTin}
              logoUrl={logoUrl}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ApprovalRowActions({
  role,
  label,
  onPrint,
  onAct,
  onReject,
  pendingAct,
  pendingReject,
}: {
  role: RoleMode;
  label: string;
  onPrint: () => void;
  onAct: () => void;
  onReject: () => void;
  pendingAct: boolean;
  pendingReject: boolean;
}) {
  return (
    <div className="flex gap-2 justify-end">
      <Button size="sm" variant="outline" onClick={onPrint}>
        <Printer className="h-3.5 w-3.5 mr-1" />
        Print
      </Button>
      <PendingButton size="sm" pending={pendingAct} onClick={onAct}>
        {label}
      </PendingButton>
      {role === "Finance" ? (
        <PendingButton size="sm" variant="destructive" pending={pendingReject} onClick={onReject}>
          Reject
        </PendingButton>
      ) : null}
    </div>
  );
}
