/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConcurrentActions } from "@/hooks/useConcurrentActions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DeleteItemRegistration,
  CreateItemStatus,
  UpdateItemRegistration,
  createStockOutRequestApi,
  type StockOutRequestRow,
} from "@/lib/actions";
import {
  aggregatedCreditETB,
  aggregatedLineOwedETB,
  isAggregatedInventoryRow,
} from "@/lib/inventoryAggregation";
import {
  isVatEnabled,
  itemPaymentBucket,
  itemPaymentLabel,
} from "@/lib/hotelInventoryPayment";
import { cn } from "@/lib/utils";
import { HOTEL_STORE_STOCK_OUT_STAKEHOLDERS } from "@/lib/hotelDailyStation";
import { buildOptimisticStockOutRequestRow } from "@/lib/hotelOptimisticStock";
import { DepartmentLeaderSelect } from "@/components/hotel/DepartmentLeaderSelect";
import { REQUESTED_BY_DEPARTMENT_CODES } from "@/lib/departments";
import { ColumnDef } from "@tanstack/react-table";
import { buildVoucherColumn } from "@/lib/dataTableColumns/voucherColumn";
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  MoreVertical,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export type InventorySupplierLine = {
  registrationId: number;
  supplierName: string;
  supplierPhone: string;
  supplierTinNumber?: string;
  Address: string;
  amount: number;
  paidAmount: number;
  unitPrice: number;
  registrationDate: Date;
  purchaseWithVat?: boolean;
};

export type items = {
  id: number;
  name: string;
  imageUrl: string;
  category: string;
  amount: number;
  measuredBy: string;
  unitPrice: number;
  registrationDate: Date;
  expireDate: Date;
  supplierName: string;
  supplierPhone: string;
  Address: string;
  purchaseWithVat?: boolean;
  supplierTinNumber?: string;
  paidAmount: number;
  voucherNumber?: number | null;
  voucherDisplay?: string | null;
  status?: string;
  statusBy?: string;
  HotelName: string;
  isAggregated?: boolean;
  registrationLines?: items[];
  suppliers?: InventorySupplierLine[];
};

function SuppliersSourceCell({ row }: { row: items }) {
  const lines =
    row.suppliers ??
    (isAggregatedInventoryRow(row) ? row.suppliers : undefined);

  if (lines && lines.length > 1) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-auto min-h-9 max-w-[220px] justify-between gap-2 border-dashed px-2.5 py-1.5 text-left font-normal"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Truck size={12} className="shrink-0 text-primary" />
                {lines.length} suppliers
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {lines.map((s) => s.supplierName).join(" · ")}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <SupplierLinesList lines={lines} measuredBy={row.measuredBy} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <SupplierLinesList
      lines={
        lines?.length
          ? lines
          : [
              {
                registrationId: row.id,
                supplierName: row.supplierName,
                supplierPhone: row.supplierPhone,
                supplierTinNumber: row.supplierTinNumber,
                Address: row.Address,
                amount: row.amount,
                paidAmount: row.paidAmount,
                unitPrice: row.unitPrice,
                registrationDate: row.registrationDate,
                purchaseWithVat: row.purchaseWithVat,
              },
            ]
      }
      measuredBy={row.measuredBy}
      compact
    />
  );
}

function SupplierLinesList({
  lines,
  measuredBy,
  compact = false,
}: {
  lines: InventorySupplierLine[];
  measuredBy: string;
  compact?: boolean;
}) {
  if (compact && lines.length === 1) {
    const s = lines[0];
    return (
      <SupplierLineCard s={s} measuredBy={measuredBy} />
    );
  }

  return (
    <div className="p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Supplier sources
      </p>
      <ScrollArea className="max-h-56 pr-2">
        <div className="space-y-2">
          {lines.map((s) => (
            <SupplierLineCard key={s.registrationId} s={s} measuredBy={measuredBy} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function SupplierLineCard({
  s,
  measuredBy,
}: {
  s: InventorySupplierLine;
  measuredBy: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5 space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <Truck size={12} className="text-primary shrink-0" />
        <span className="truncate">{s.supplierName || "—"}</span>
      </div>
      <div className="text-[10px] text-muted-foreground space-y-0.5 pl-0.5">
        <p>
          {s.amount} {measuredBy} · ETB {s.unitPrice.toLocaleString()}/unit
        </p>
        {s.supplierPhone ? <p>{s.supplierPhone}</p> : null}
        {(s.supplierTinNumber || "").trim() ? (
          <p>TIN: {(s.supplierTinNumber || "").trim()}</p>
        ) : null}
        <p className="text-[9px] opacity-80">
          Received {new Date(s.registrationDate).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

/** Largest-quantity registration line — used for row actions on aggregated rows. */
function primaryRegistrationLine(data: items): items {
  if (!isAggregatedInventoryRow(data)) return data;
  return data.registrationLines.reduce((best, line) =>
    line.amount > best.amount ? line : best,
  data.registrationLines[0]);
}

function statusExtrasFromItem(d: items) {
  return {
    purchaseWithVat: isVatEnabled(d.purchaseWithVat),
    supplierTinNumber: (d.supplierTinNumber ?? "").trim(),
  };
}

function getRemainingDays(expireDate: Date): number {
  const today = new Date();
  const expire = new Date(expireDate);

  today.setHours(0, 0, 0, 0);
  expire.setHours(0, 0, 0, 0);

  const diffTime = expire.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

function getExpiryStatus(daysRemaining: number): {
  text: string;
  color: string;
} {
  if (daysRemaining < 0) {
    return { text: "Expired", color: "bg-red-100 text-red-800" };
  } else if (daysRemaining === 0) {
    return { text: "Expires Today", color: "bg-orange-100 text-orange-800" };
  } else if (daysRemaining <= 7) {
    return {
      text: `${daysRemaining} days left`,
      color: "bg-yellow-100 text-yellow-800",
    };
  } else if (daysRemaining <= 30) {
    return {
      text: `${daysRemaining} days left`,
      color: "bg-blue-100 text-blue-800",
    };
  } else {
    return {
      text: `${daysRemaining} days left`,
      color: "bg-green-100 text-green-800",
    };
  }
}

const DeleteButton = ({
  itemName,
  itemId,
  onDelete,
  refresh,
}: {
  itemName: string;
  itemId: number;
  onDelete: () => void;
  refresh?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const { isPending, run } = useConcurrentActions();
  const deleteKey = `delete-item-${itemId}`;
  const deleting = isPending(deleteKey);

  const handleDelete = () => {
    void run(deleteKey, async () => {
      try {
        await DeleteItemRegistration(itemId);
        toast.success(`${itemName} deleted successfully`);
        setOpen(false);
        onDelete();
        refresh?.();
      } catch {
        toast.error(`Failed to delete ${itemName}`);
      }
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && deleting) return;
        setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button className="cursor-pointer bg-red-600 hover:bg-red-700 w-64">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deleting {itemName}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {itemName}? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center justify-end gap-2">
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 cursor-pointer hover:bg-red-600"
            disabled={deleting}
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
          >
            {deleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const StockOut = ({
  data,
  refresh,
  hotelStockApprovals,
  onHotelStockRequestCreated,
}: {
  data: items;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
  onHotelStockRequestCreated?: (row: StockOutRequestRow) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [statusBy, setStatusBy] = useState<string>("");
  const [amountDeduct, setAmountDeduct] = useState<number>(0);
  const [requestedByDepartment, setRequestedByDepartment] = useState("");
  const { isPending, run } = useConcurrentActions();
  const actionKey = `stock-out-${data.id}`;
  const submitting = isPending(actionKey);

  const handleStockOut = () => {
    if (!statusBy.trim()) {
      toast.error("Select or enter where stock is going");
      return;
    }
    if (hotelStockApprovals && !requestedByDepartment.trim()) {
      toast.error("Select the requesting department");
      return;
    }
    if (hotelStockApprovals && amountDeduct > data.amount) {
      toast.error("Quantity cannot exceed stock on hand.");
      return;
    }
    void run(actionKey, async () => {
      try {
        if (hotelStockApprovals) {
          const result = await createStockOutRequestApi({
            itemRegistrationId: data.id,
            movementType: "STOCK_OUT",
            amount: amountDeduct,
            stakeHolderOrReason: statusBy.trim(),
            requestedByDepartment: requestedByDepartment.trim(),
          });
          const user =
            typeof window !== "undefined"
              ? (localStorage.getItem("user_name")?.trim() ?? "")
              : "";
          onHotelStockRequestCreated?.(
            buildOptimisticStockOutRequestRow(
              {
                id: data.id,
                name: data.name,
                HotelName: data.HotelName,
              },
              "STOCK_OUT",
              amountDeduct,
              statusBy.trim(),
              result,
              user || "—",
            ),
          );
        } else {
          const payload = {
            name: data.name,
            imageUrl: data.imageUrl,
            category: data.category,
            amount: amountDeduct,
            measuredBy: data.measuredBy,
            unitPrice: data.unitPrice,
            actionDate: new Date(),
            supplierName: data.supplierName,
            supplierPhone: data.supplierPhone,
            Address: data.Address,
            ...statusExtrasFromItem(data),
            paidAmount: data.paidAmount,
            status: "Stock Out",
            statusBy: statusBy,
            HotelName: data.HotelName,
          };
          const payloadAmount = {
            ...data,
            amount: data.amount - amountDeduct,
          };
          await CreateItemStatus(payload);
          await UpdateItemRegistration(payloadAmount);
          if (payloadAmount.amount === 0) {
            await DeleteItemRegistration(data.id);
          }
          toast.success(`${data.name} status updated successfully`);
        }
        setOpen(false);
        refresh?.();
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : `Failed to update ${data.name} status`;
        toast.error(msg);
      }
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && submitting) return;
        setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button className="cursor-pointer bg-blue-600 hover:bg-blue-700 w-64">
          Stock Out
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Updating {data.name} status</AlertDialogTitle>
          <AlertDialogDescription>
            Select Where to stock out the {data.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            {hotelStockApprovals ? (
              <DepartmentLeaderSelect
                label="Requested by"
                value={requestedByDepartment}
                onChange={setRequestedByDepartment}
                allowedDepartments={REQUESTED_BY_DEPARTMENT_CODES}
              />
            ) : null}
            <Select
              value={statusBy}
              onValueChange={(value) => setStatusBy(value)}
            >
              <SelectTrigger className="w-full h-fit p-2">
                <SelectValue placeholder="Select Stakeholder" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Stakeholders:</SelectLabel>
                  {HOTEL_STORE_STOCK_OUT_STAKEHOLDERS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Label htmlFor="Amount">Quantity ({data.measuredBy}):</Label>
            <Input
              type="number"
              min={0.01}
              step="any"
              value={amountDeduct}
              onChange={(e) => setAmountDeduct(Number(e.target.value))}
              placeholder="Enter amount..."
              className="h-fit p-2 w-full rounded-md"
              max={hotelStockApprovals ? data.amount : undefined}
            />
          </div>
          <div className="flex items-center justify-end gap-7">
            <AlertDialogCancel className="cursor-pointer" disabled={submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-blue-600"
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault();
                void handleStockOut();
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Stock Out"
              )}
            </AlertDialogAction>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const Wastage = ({
  data,
  refresh,
  hotelStockApprovals,
  onHotelStockRequestCreated,
}: {
  data: items;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
  onHotelStockRequestCreated?: (row: StockOutRequestRow) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [statusBy, setStatusBy] = useState<string>("");
  const [amountDeduct, setAmountDeduct] = useState<number>(0);
  const [requestedByDepartment, setRequestedByDepartment] = useState("");
  const { isPending, run } = useConcurrentActions();
  const actionKey = `wastage-${data.id}`;
  const submitting = isPending(actionKey);

  const handleWastage = () => {
    if (!statusBy.trim()) {
      toast.error("Enter a short reason for wastage");
      return;
    }
    if (hotelStockApprovals && !requestedByDepartment.trim()) {
      toast.error("Select the requesting department");
      return;
    }
    if (hotelStockApprovals && amountDeduct > data.amount) {
      toast.error("Quantity cannot exceed stock on hand.");
      return;
    }
    void run(actionKey, async () => {
      try {
        if (hotelStockApprovals) {
          const result = await createStockOutRequestApi({
            itemRegistrationId: data.id,
            movementType: "WASTAGE",
            amount: amountDeduct,
            stakeHolderOrReason: statusBy.trim(),
            requestedByDepartment: requestedByDepartment.trim(),
          });
          const user =
            typeof window !== "undefined"
              ? (localStorage.getItem("user_name")?.trim() ?? "")
              : "";
          onHotelStockRequestCreated?.(
            buildOptimisticStockOutRequestRow(
              {
                id: data.id,
                name: data.name,
                HotelName: data.HotelName,
              },
              "WASTAGE",
              amountDeduct,
              statusBy.trim(),
              result,
              user || "—",
            ),
          );
        } else {
          const payload = {
            name: data.name,
            imageUrl: data.imageUrl,
            category: data.category,
            amount: amountDeduct,
            measuredBy: data.measuredBy,
            unitPrice: data.unitPrice,
            actionDate: new Date(),
            supplierName: data.supplierName,
            supplierPhone: data.supplierPhone,
            Address: data.Address,
            ...statusExtrasFromItem(data),
            paidAmount: data.paidAmount,
            status: "Wastage",
            statusBy: statusBy,
            HotelName: data.HotelName,
          };
          const payloadAmount = {
            ...data,
            amount: data.amount - amountDeduct,
          };
          await CreateItemStatus(payload);
          await UpdateItemRegistration(payloadAmount);
          if (payloadAmount.amount === 0) {
            await DeleteItemRegistration(data.id);
          }
          toast.success(`${data.name} status updated successfully`);
        }
        setOpen(false);
        refresh?.();
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : `Failed to update ${data.name} status`;
        toast.error(msg);
      }
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && submitting) return;
        setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button className="cursor-pointer bg-yellow-600 hover:bg-yellow-700 w-28">
          Wastage
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Updating {data.name} status</AlertDialogTitle>
          <AlertDialogDescription>
            Reason out why {data.name} is a wastage
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            {hotelStockApprovals ? (
              <DepartmentLeaderSelect
                label="Requested by"
                value={requestedByDepartment}
                onChange={setRequestedByDepartment}
                allowedDepartments={REQUESTED_BY_DEPARTMENT_CODES}
              />
            ) : null}
            <Label htmlFor="Reason">Reason:</Label>
            <Input
              type="text"
              value={statusBy}
              onChange={(e) => setStatusBy(e.target.value)}
              placeholder="Enter reason..."
              className="h-fit p-2 w-full"
            />
            <Label htmlFor="Amount">Quantity ({data.measuredBy}):</Label>
            <Input
              type="number"
              min={0.01}
              step="any"
              value={amountDeduct}
              onChange={(e) => setAmountDeduct(Number(e.target.value))}
              placeholder="Enter amount..."
              className="h-fit p-2 w-full rounded-md"
              max={hotelStockApprovals ? data.amount : undefined}
            />
          </div>
          <div className="flex items-center justify-end gap-7">
            <AlertDialogCancel className="cursor-pointer" disabled={submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-yellow-600"
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault();
                void handleWastage();
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Wasted"
              )}
            </AlertDialogAction>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const Returned = ({
  data,
  refresh,
  hotelStockApprovals,
  onHotelStockRequestCreated,
}: {
  data: items;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
  onHotelStockRequestCreated?: (row: StockOutRequestRow) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [statusBy, setStatusBy] = useState<string>("");
  const [amountDeduct, setAmountDeduct] = useState<number>(0);
  const [requestedByDepartment, setRequestedByDepartment] = useState("");
  const { isPending, run } = useConcurrentActions();
  const actionKey = `return-${data.id}`;
  const submitting = isPending(actionKey);

  const handleReturned = () => {
    if (!statusBy.trim()) {
      toast.error("Enter the return reason / reference");
      return;
    }
    if (hotelStockApprovals && !requestedByDepartment.trim()) {
      toast.error("Select the requesting department");
      return;
    }
    if (hotelStockApprovals && amountDeduct > data.amount) {
      toast.error("Quantity cannot exceed stock on hand.");
      return;
    }
    void run(actionKey, async () => {
      try {
        if (hotelStockApprovals) {
          const result = await createStockOutRequestApi({
            itemRegistrationId: data.id,
            movementType: "RETURN_SUPPLIER",
            amount: amountDeduct,
            stakeHolderOrReason: statusBy.trim(),
            requestedByDepartment: requestedByDepartment.trim(),
          });
          const user =
            typeof window !== "undefined"
              ? (localStorage.getItem("user_name")?.trim() ?? "")
              : "";
          onHotelStockRequestCreated?.(
            buildOptimisticStockOutRequestRow(
              {
                id: data.id,
                name: data.name,
                HotelName: data.HotelName,
              },
              "RETURN_SUPPLIER",
              amountDeduct,
              statusBy.trim(),
              result,
              user || "—",
            ),
          );
        } else {
          const payload = {
            name: data.name,
            imageUrl: data.imageUrl,
            category: data.category,
            amount: amountDeduct,
            measuredBy: data.measuredBy,
            unitPrice: data.unitPrice,
            actionDate: new Date(),
            supplierName: data.supplierName,
            supplierPhone: data.supplierPhone,
            Address: data.Address,
            ...statusExtrasFromItem(data),
            paidAmount: data.paidAmount,
            status: "Returned to Supplier",
            statusBy: statusBy,
            HotelName: data.HotelName,
          };
          const payloadAmount = {
            ...data,
            amount: data.amount - amountDeduct,
          };
          await CreateItemStatus(payload);
          await UpdateItemRegistration(payloadAmount);
          if (payloadAmount.amount === 0) {
            await DeleteItemRegistration(data.id);
          }
          toast.success(`${data.name} status updated successfully`);
        }
        setOpen(false);
        refresh?.();
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : `Failed to update ${data.name} status`;
        toast.error(msg);
      }
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && submitting) return;
        setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button className="cursor-pointer bg-amber-600 hover:bg-amber-700 w-28">
          Returned
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Updating {data.name} status</AlertDialogTitle>
          <AlertDialogDescription>
            Reason out why returning the {data.name} to {data.supplierName}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            {hotelStockApprovals ? (
              <DepartmentLeaderSelect
                label="Requested by"
                value={requestedByDepartment}
                onChange={setRequestedByDepartment}
                allowedDepartments={REQUESTED_BY_DEPARTMENT_CODES}
              />
            ) : null}
            <Label htmlFor="Reason">Reason:</Label>
            <Input
              type="text"
              value={statusBy}
              onChange={(e) => setStatusBy(e.target.value)}
              placeholder="Enter reason..."
              className="h-fit p-2 w-full"
            />
            <Label htmlFor="Amount">Quantity ({data.measuredBy}):</Label>
            <Input
              type="number"
              min={0.01}
              step="any"
              value={amountDeduct}
              onChange={(e) => setAmountDeduct(Number(e.target.value))}
              placeholder="Enter amount..."
              className="h-fit p-2 w-full rounded-md"
              max={hotelStockApprovals ? data.amount : undefined}
            />
          </div>
          <div className="flex items-center justify-end gap-7">
            <AlertDialogCancel className="cursor-pointer" disabled={submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-amber-600"
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault();
                void handleReturned();
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Done"
              )}
            </AlertDialogAction>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const columns = (
  onEdit?: (item: items) => void,
  refresh?: () => void,
  opts?: {
    hotelStockApprovals?: boolean;
    readOnly?: boolean;
    allowEditDelete?: boolean;
    showStoreMovementActions?: boolean;
    onHotelStockRequestCreated?: (row: StockOutRequestRow) => void;
  },
): ColumnDef<items>[] => {
  const defs: ColumnDef<items>[] = [
  ...(opts?.hotelStockApprovals ? [buildVoucherColumn<items>()] : []),
  {
    accessorKey: "name",
    header: "Product Detail",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border shadow-sm">
          <AvatarImage src={row.original.imageUrl} />
          <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
            {row.original.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-sm leading-tight">{row.original.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
            {row.original.category}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: "Inventory",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-sm font-bold">
          {row.original.amount} <span className="text-[10px] text-muted-foreground font-normal">{row.original.measuredBy}</span>
        </span>
        <span className="text-[11px] text-muted-foreground italic">
          ETB {row.original.unitPrice.toLocaleString()} / unit
        </span>
      </div>
    ),
  },
  {
    id: "totalValue",
    header: "Value",
    cell: ({ row }) => {
      const total = aggregatedLineOwedETB(row.original);
      return (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-primary">
            ETB {total.toLocaleString()}
          </span>
          {isAggregatedInventoryRow(row.original) ? (
            <span className="text-[10px] text-muted-foreground">
              {row.original.registrationLines.length} batches combined
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "purchaseVat",
    header: "VAT",
    cell: ({ row }) => {
      const mixed =
        isAggregatedInventoryRow(row.original) &&
        new Set(
          row.original.registrationLines.map((l) =>
            isVatEnabled(l.purchaseWithVat),
          ),
        ).size > 1;
      const vatOn = mixed
        ? null
        : isVatEnabled(row.original.purchaseWithVat);
      return (
        <div className="flex flex-col gap-1.5 min-w-[108px]">
          <Badge
            variant="outline"
            className={cn(
              "w-fit px-2.5 py-0.5 text-[11px] font-semibold tracking-wide border shadow-sm",
              mixed
                ? "border-amber-400/50 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                : vatOn
                  ? "border-violet-400/50 bg-linear-to-br from-violet-600 to-violet-700 text-white ring-1 ring-violet-500/25"
                  : "border-slate-300/60 bg-muted/80 text-muted-foreground dark:border-slate-600/60",
            )}
          >
            {mixed ? "Mixed VAT" : vatOn ? "With VAT" : "Without VAT"}
          </Badge>
          <span className="text-[10px] text-muted-foreground leading-snug">
            {mixed
              ? "Batches recorded with different VAT settings"
              : vatOn
                ? "Unit price includes 15% VAT"
                : "Net line (no VAT on unit)"}
          </span>
        </div>
      );
    },
  },
  {
    id: "remainingDays",
    header: "Freshness",
    cell: ({ row }) => {
      const days = getRemainingDays(row.original.expireDate);
      const { text, color } = getExpiryStatus(days);
      return (
        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tighter inline-flex items-center gap-1 ${color}`}>
          {days <= 7 && <AlertTriangle size={10} />}
          {text}
        </div>
      );
    },
  },
  {
    id: "supplierSource",
    header: "Source",
    cell: ({ row }) => <SuppliersSourceCell row={row.original} />,
  },
  {
    accessorKey: "paidAmount",
    header: "Supplier payment",
    cell: ({ row }) => {
      const owed = aggregatedLineOwedETB(row.original);
      const paid = Number(row.original.paidAmount) || 0;
      const bucket =
        isAggregatedInventoryRow(row.original) &&
        new Set(
          row.original.registrationLines.map((l) => itemPaymentBucket(l)),
        ).size > 1
          ? aggregatedCreditETB(row.original) > 0.01
            ? ("credit" as const)
            : paid >= owed - 0.02
              ? ("paid" as const)
              : ("none" as const)
          : itemPaymentBucket(row.original);
      const pct = owed > 0.01 ? Math.min((paid / owed) * 100, 100) : paid > 0 ? 100 : 0;
      const label =
        isAggregatedInventoryRow(row.original) &&
        new Set(
          row.original.registrationLines.map((l) => itemPaymentBucket(l)),
        ).size > 1
          ? "Mixed payment"
          : itemPaymentLabel(bucket);
      return (
        <div className="w-44 space-y-1.5">
          <Badge
            variant={
              bucket === "paid"
                ? "default"
                : bucket === "credit"
                  ? "secondary"
                  : "outline"
            }
            className="text-[9px] font-semibold tracking-tight"
          >
            {label}
          </Badge>
          <div className="flex justify-between text-[10px] font-medium">
            <span>ETB {paid.toLocaleString()} / {owed.toLocaleString()}</span>
            <span className={pct >= 99.5 ? "text-green-600" : ""}>{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${pct >= 99.5 ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      );
    },
  },
  ];

  const allowEditDelete = !!opts?.allowEditDelete;
  const showStoreMovementActions = !!opts?.showStoreMovementActions;
  if (!opts?.readOnly && (allowEditDelete || showStoreMovementActions)) {
    defs.push({
    id: "actions",
    header: () => (
      <span className="text-muted-foreground text-xs font-medium">Actions</span>
    ),
    cell: ({ row }) => {
      const [openDrop, setOpenDrop] = useState(false);
      const actionLine = primaryRegistrationLine(row.original);
      return (
        <DropdownMenu open={openDrop} onOpenChange={setOpenDrop}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-67 p-2">
             {allowEditDelete ? (
               <DropdownMenuGroup className="space-y-1">
                  <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2">Management</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Button
                      variant="ghost"
                      className="w-64 justify-start h-9 text-sm font-normal"
                      onClick={() => {
                        setOpenDrop(false);
                        onEdit?.(actionLine);
                      }}
                    >
                      Edit Details
                      {isAggregatedInventoryRow(row.original)
                        ? " (primary batch)"
                        : ""}
                    </Button>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                    <DeleteButton
                      itemName={actionLine.name}
                      itemId={actionLine.id}
                      onDelete={() => setOpenDrop(false)}
                      refresh={refresh}
                    />
                  </DropdownMenuItem>
               </DropdownMenuGroup>
             ) : null}
             {allowEditDelete && showStoreMovementActions ? (
               <DropdownMenuSeparator className="my-2" />
             ) : null}
             {showStoreMovementActions ? (
               <DropdownMenuGroup className="space-y-1">
                  <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2">Inventory Movements</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                    <StockOut
                      data={actionLine}
                      refresh={refresh}
                      hotelStockApprovals={opts?.hotelStockApprovals}
                      onHotelStockRequestCreated={opts?.onHotelStockRequestCreated}
                    />
                  </DropdownMenuItem>
                  <div className="grid grid-cols-2 gap-8.5 mt-1">
                     <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                      <Wastage
                        data={actionLine}
                        refresh={refresh}
                        hotelStockApprovals={opts?.hotelStockApprovals}
                        onHotelStockRequestCreated={opts?.onHotelStockRequestCreated}
                      />
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                      <Returned
                        data={actionLine}
                        refresh={refresh}
                        hotelStockApprovals={opts?.hotelStockApprovals}
                        onHotelStockRequestCreated={opts?.onHotelStockRequestCreated}
                      />
                    </DropdownMenuItem>
                  </div>
               </DropdownMenuGroup>
             ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  });
  }

  return defs;
};
