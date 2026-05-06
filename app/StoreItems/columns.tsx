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
} from "@/lib/actions";
import {
  itemPaymentBucket,
  itemPaymentLabel,
  lineOwedETB,
} from "@/lib/hotelInventoryPayment";
import { HOTEL_STORE_STOCK_OUT_STAKEHOLDERS } from "@/lib/hotelDailyStation";
import { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, MoreVertical, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  dutyFee: number;
  supplierName: string;
  supplierPhone: string;
  Address: string;
  supplierLevel: string;
  paidAmount: number;
  status?: string;
  statusBy?: string;
  HotelName: string;
};

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

  const handleDelete = async () => {
    try {
      await DeleteItemRegistration(itemId);
      toast.success(`${itemName} deleted successfully`);
      setOpen(false);
      onDelete();
      refresh?.();
    } catch {
      toast.error(`Failed to delete ${itemName}`);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 cursor-pointer hover:bg-red-600"
            onClick={handleDelete}
          >
            Delete
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
}: {
  data: items;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [statusBy, setStatusBy] = useState<string>("");
  const [amountDeduct, setAmountDeduct] = useState<number>(0);

  const handleStockOut = async () => {
    try {
      if (!statusBy.trim()) {
        toast.error("Select or enter where stock is going");
        return;
      }
      if (hotelStockApprovals) {
        if (data.amount - amountDeduct < 1) {
          toast.error(
            "At least 1 unit must remain in stock. Reduce the quantity.",
          );
          return;
        }
        await createStockOutRequestApi({
          itemRegistrationId: data.id,
          movementType: "STOCK_OUT",
          amount: amountDeduct,
          stakeHolderOrReason: statusBy.trim(),
        });
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
          supplierLevel: data.supplierLevel,
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
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
          <div className="flex flex-col gap-6">
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
            <Label htmlFor="Amount">Amount:</Label>
            <Input
              type="number"
              value={amountDeduct}
              onChange={(e) => setAmountDeduct(Number(e.target.value))}
              placeholder="Enter amount..."
              className="h-fit p-2 w-full rounded-md"
            />
          </div>
          <div className="flex items-center justify-end gap-7">
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-blue-600"
              onClick={() => handleStockOut()}
            >
              Stock Out
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
}: {
  data: items;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [statusBy, setStatusBy] = useState<string>("");
  const [amountDeduct, setAmountDeduct] = useState<number>(0);

  const handleWastage = async () => {
    try {
      if (!statusBy.trim()) {
        toast.error("Enter a short reason for wastage");
        return;
      }
      if (hotelStockApprovals) {
        if (data.amount - amountDeduct < 1) {
          toast.error(
            "At least 1 unit must remain in stock. Reduce the quantity.",
          );
          return;
        }
        await createStockOutRequestApi({
          itemRegistrationId: data.id,
          movementType: "WASTAGE",
          amount: amountDeduct,
          stakeHolderOrReason: statusBy.trim(),
        });
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
          supplierLevel: data.supplierLevel,
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
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
          <div className="flex flex-col gap-6">
            <Label htmlFor="Reason">Reason:</Label>
            <Input
              type="text"
              value={statusBy}
              onChange={(e) => setStatusBy(e.target.value)}
              placeholder="Enter reason..."
              className="h-fit p-2 w-full"
            />
            <Label htmlFor="Amount">Amount:</Label>
            <Input
              type="number"
              value={amountDeduct}
              onChange={(e) => setAmountDeduct(Number(e.target.value))}
              placeholder="Enter amount..."
              className="h-fit p-2 w-full rounded-md"
            />
          </div>
          <div className="flex items-center justify-end gap-7">
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-yellow-600"
              onClick={() => handleWastage()}
            >
              Wasted
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
}: {
  data: items;
  refresh?: () => void;
  hotelStockApprovals?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [statusBy, setStatusBy] = useState<string>("");
  const [amountDeduct, setAmountDeduct] = useState<number>(0);

  const handleReturned = async () => {
    try {
      if (!statusBy.trim()) {
        toast.error("Enter the return reason / reference");
        return;
      }
      if (hotelStockApprovals) {
        if (data.amount - amountDeduct < 1) {
          toast.error(
            "At least 1 unit must remain in stock. Reduce the quantity.",
          );
          return;
        }
        await createStockOutRequestApi({
          itemRegistrationId: data.id,
          movementType: "RETURN_SUPPLIER",
          amount: amountDeduct,
          stakeHolderOrReason: statusBy.trim(),
        });
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
          supplierLevel: data.supplierLevel,
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
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
          <div className="flex flex-col gap-6">
            <Label htmlFor="Reason">Reason:</Label>
            <Input
              type="text"
              value={statusBy}
              onChange={(e) => setStatusBy(e.target.value)}
              placeholder="Enter reason..."
              className="h-fit p-2 w-full"
            />
            <Label htmlFor="Amount">Amount:</Label>
            <Input
              type="number"
              value={amountDeduct}
              onChange={(e) => setAmountDeduct(Number(e.target.value))}
              placeholder="Enter amount..."
              className="h-fit p-2 w-full rounded-md"
            />
          </div>
          <div className="flex items-center justify-end gap-7">
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-amber-600"
              onClick={() => handleReturned()}
            >
              Done
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
  opts?: { hotelStockApprovals?: boolean; readOnly?: boolean },
): ColumnDef<items>[] => {
  const defs: ColumnDef<items>[] = [
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
    header: "Value + Fees",
    cell: ({ row }) => {
      const total = lineOwedETB(row.original);
      return (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-primary">ETB {total.toLocaleString()}</span>
          {row.original.dutyFee > 0 && (
            <span className="text-[10px] text-orange-600 font-medium">Incl. ETB {row.original.dutyFee} fee</span>
          )}
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
    accessorKey: "supplierName",
    header: "Source",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Truck size={12} className="text-muted-foreground" />
          {row.original.supplierName}
        </div>
        <Badge variant="outline" className="w-fit text-[9px] h-4 px-1.5 border-primary/20 bg-primary/5 text-primary">
          {row.original.supplierLevel} Grade
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "paidAmount",
    header: "Supplier payment",
    cell: ({ row }) => {
      const owed = lineOwedETB(row.original);
      const paid = row.original.paidAmount;
      const bucket = itemPaymentBucket(row.original);
      const pct = owed > 0.01 ? Math.min((paid / owed) * 100, 100) : paid > 0 ? 100 : 0;
      const label = itemPaymentLabel(bucket);
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

  if (!opts?.readOnly) {
    defs.push({
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const [openDrop, setOpenDrop] = useState(false);
      return (
        <DropdownMenu open={openDrop} onOpenChange={setOpenDrop}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-67 p-2">
             <DropdownMenuGroup className="space-y-1">
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2">Management</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Button variant="ghost" className="w-64 justify-start h-9 text-sm font-normal" onClick={() => { setOpenDrop(false); onEdit?.(row.original); }}>
                    Edit Details
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                  <DeleteButton itemName={row.original.name} itemId={row.original.id} onDelete={() => setOpenDrop(false)} refresh={refresh} />
                </DropdownMenuItem>
             </DropdownMenuGroup>
             <DropdownMenuSeparator className="my-2" />
             <DropdownMenuGroup className="space-y-1">
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2">Inventory Movements</DropdownMenuLabel>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                  <StockOut
                    data={row.original}
                    refresh={refresh}
                    hotelStockApprovals={opts?.hotelStockApprovals}
                  />
                </DropdownMenuItem>
                <div className="grid grid-cols-2 gap-8.5 mt-1">
                   <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                    <Wastage
                      data={row.original}
                      refresh={refresh}
                      hotelStockApprovals={opts?.hotelStockApprovals}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                    <Returned
                      data={row.original}
                      refresh={refresh}
                      hotelStockApprovals={opts?.hotelStockApprovals}
                    />
                  </DropdownMenuItem>
                </div>
             </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  });
  }

  return defs;
};
