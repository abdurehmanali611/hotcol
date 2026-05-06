"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { lineOwedETB } from "@/lib/hotelInventoryPayment";
import { ColumnDef } from "@tanstack/react-table";
import { Package, Shield, ShieldAlert, ShieldCheck, Truck } from "lucide-react";

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
  registeredAmount?: number;
  registeredValue?: number;
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

export const columns: ColumnDef<items>[] = [
  {
    accessorKey: "name",
    header: "Product Details",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
          <AvatarImage src={row.original.imageUrl} alt={row.original.name} />
          <AvatarFallback className="bg-primary/5 text-primary">
            <Package size={16} />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-sm leading-none">{row.original.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
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
      <div className="font-medium text-sm">
        {row.original.amount} <span className="text-muted-foreground text-xs font-normal">{row.original.measuredBy}</span>
      </div>
    ),
  },
  {
    id: "remainingDays",
    header: "Expiry Status",
    cell: ({ row }) => {
      const days = getRemainingDays(row.original.expireDate);
      const { text, color } = getExpiryStatus(days);
      return (
        <Badge variant="outline" className={`font-bold uppercase tracking-tighter text-[10px] ${color} border-none`}>
          {text}
        </Badge>
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
          {row.original.supplierPhone}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "supplierLevel",
    header: "Tier",
    cell: ({ row }) => {
      const level = row.original.supplierLevel;
      const styles = 
        level === "Gold" ? "text-amber-600 bg-amber-50" : 
        level === "Silver" ? "text-slate-600 bg-slate-50" : 
        "text-orange-600 bg-orange-50";
      
      return (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md w-fit font-bold text-[10px] uppercase ${styles}`}>
          {level === "Gold" ? <ShieldCheck size={12} /> : level === "Silver" ? <Shield size={12} /> : <ShieldAlert size={12} />}
          {level}
        </div>
      );
    },
  },
  {
    accessorKey: "paidAmount",
    header: "Payment Completion",
    cell: ({ row }) => {
      const total = lineOwedETB(row.original);
      const pct = total > 0 ? (row.original.paidAmount / total) * 100 : 0;
      return (
        <div className="w-44 space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase">
            <span className="text-muted-foreground">Paid: ETB {row.original.paidAmount.toLocaleString()}</span>
            <span className={pct === 100 ? "text-emerald-600" : "text-primary"}>{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/20">
            <div 
              className={`h-full transition-all duration-700 ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`} 
              style={{ width: `${pct}%` }} 
            />
          </div>
        </div>
      );
    },
  },
];
