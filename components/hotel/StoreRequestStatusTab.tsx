"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchPurchaseRequests,
  fetchStockOutRequests,
  type PurchaseRequestRow,
  type StockOutRequestRow,
} from "@/lib/actions";
import {
  formatPurchaseStatus,
  formatMovementType,
  formatQtyWithUnit,
  formatStockOutRequestStatus,
} from "@/lib/hotelDisplayLabels";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function purchaseBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "REJECTED_CC" || status === "REJECTED_FINANCE")
    return "destructive";
  if (status === "APPROVED_FINANCE") return "default";
  return "secondary";
}

function stockBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "REJECTED") return "destructive";
  if (status === "APPROVED") return "default";
  return "secondary";
}

export default function StoreRequestStatusTab() {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<PurchaseRequestRow[]>([]);
  const [stocks, setStocks] = useState<StockOutRequestRow[]>([]);
  const [userName, setUserName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const name =
        typeof window !== "undefined"
          ? (localStorage.getItem("user_name")?.trim() ?? "")
          : "";
      setUserName(name);
      const [pr, so] = await Promise.all([
        fetchPurchaseRequests(),
        fetchStockOutRequests(),
      ]);
      setPurchases(pr);
      setStocks(so);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not load request status";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const myPurchases = purchases.filter(
    (p) => userName && p.storeUserName === userName,
  );
  const myStocks = stocks.filter(
    (s) => userName && s.requestedByUserName === userName,
  );

  const sortByDateDesc = <T extends { createdAt: string }>(rows: T[]) =>
    [...rows].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your requests…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Your request status</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Purchase requests you opened and stock movements you submitted. After
            finance approves a purchase, register the item under{" "}
            <strong>Register</strong> when it arrives.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => load()}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {!userName && (
        <p className="text-sm text-amber-700 dark:text-amber-300 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          Sign in again if your name is missing — requests are matched to your
          username.
        </p>
      )}

      <Card className="border-border/80 shadow-md overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg">Purchase requests</CardTitle>
          <CardDescription>
            {myPurchases.length} request{myPurchases.length !== 1 ? "s" : ""}{" "}
            under your login
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {myPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No purchase requests from you yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortByDateDesc(myPurchases).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.itemName}</TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatQtyWithUnit(r.quantity, r.measuredBy)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={purchaseBadgeVariant(r.status)}>
                        {formatPurchaseStatus(r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.financeApprovedAt
                        ? new Date(r.financeApprovedAt).toLocaleString()
                        : r.ccApprovedAt
                          ? new Date(r.ccApprovedAt).toLocaleString()
                          : new Date(r.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-md overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg">Stock / wastage / return requests</CardTitle>
          <CardDescription>
            {myStocks.length} movement request
            {myStocks.length !== 1 ? "s" : ""} you submitted
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {myStocks.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              No movement requests from you yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortByDateDesc(myStocks).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {r.itemName?.trim()
                        ? r.itemName
                        : "Unknown item (saved name missing)"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatMovementType(r.movementType)}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {formatQtyWithUnit(r.amount, "")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={stockBadgeVariant(r.status)}>
                        {formatStockOutRequestStatus(r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.decidedAt
                        ? new Date(r.decidedAt).toLocaleString()
                        : new Date(r.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
