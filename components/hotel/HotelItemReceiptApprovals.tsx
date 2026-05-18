"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemRegistration } from "@/lib/actions";
import {
  approveItemRegistrationFinanceApi,
  authorizeItemRegistrationManagerApi,
  checkItemRegistrationCCApi,
  fetchCostControllerProfiles,
  rejectItemRegistrationFinanceApi,
  type CostControllerProfileRow,
} from "@/lib/actions";
import { StoreItemRegistrationReceipt } from "./StoreItemRegistrationReceipt";
import { formatItemRegistrationStatus } from "@/lib/hotelDisplayLabels";
import { DataTable } from "@/app/StoreItems/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatVoucherDisplay } from "@/lib/voucherFormat";

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
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

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

  const act = async (row: ItemRegistration) => {
    if (role === "CostControl") {
      const pid = Number(ccProfileId);
      if (!pid) throw new Error("Select cost controller identity");
      await checkItemRegistrationCCApi(row.id, pid);
    } else if (role === "Finance") {
      await approveItemRegistrationFinanceApi(row.id);
    } else {
      await authorizeItemRegistrationManagerApi(row.id);
    }
    onRefresh();
  };

  const reject = async (row: ItemRegistration) => {
    await rejectItemRegistrationFinanceApi(row.id, "Rejected by finance");
    onRefresh();
  };

  const label =
    role === "CostControl"
      ? "Check"
      : role === "Finance"
        ? "Approve"
        : "Authorize";

  const columns: ColumnDef<ItemRegistration>[] = [
    { accessorKey: "name", header: "Item" },
    {
      id: "voucher",
      header: "Voucher",
      cell: ({ row }) =>
        formatVoucherDisplay(
          row.original.voucherNumber,
          row.original.voucherDisplay,
        ),
    },
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
      cell: ({ row }) => (
        <ApprovalRowActions
          role={role}
          label={label}
          onPrint={() => {
            setPreview(row.original);
            requestAnimationFrame(() => handlePrint());
          }}
          onAct={() => void act(row.original)}
          onReject={() => void reject(row.original)}
        />
      ),
    },
  ];

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
      <DataTable
        columns={columns}
        data={pending}
        searchColumnId="name"
        emptyMessage="No registrations awaiting action."
      />
      <div className="sr-only" aria-hidden>
        <div ref={printRef}>
          {preview ? (
            <StoreItemRegistrationReceipt
              items={[preview]}
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
}: {
  role: RoleMode;
  label: string;
  onPrint: () => void;
  onAct: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex gap-2 justify-end">
      <Button size="sm" variant="outline" onClick={onPrint}>
        <Printer className="h-3.5 w-3.5 mr-1" />
        Print
      </Button>
      <Button size="sm" onClick={onAct}>
        {label}
      </Button>
      {role === "Finance" ? (
        <Button size="sm" variant="destructive" onClick={onReject}>
          Reject
        </Button>
      ) : null}
    </div>
  );
}
