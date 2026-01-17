/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import { Order, filterUnpaidOrders } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, CreditCard, Wallet } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Icon } from "@iconify/react";

interface PaymentProps {
  orders: Order[];
  hotelName: string;
  onHandlePayment: (id: number, order: Order, sales: number, bank: boolean) => Promise<any>;
}

export default function PaymentComponent({
  orders,
  hotelName,
  onHandlePayment,
}: PaymentProps) {
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([]);
  const [processingPayment, setProcessingPayment] = useState<number | null>(
    null
  );
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    const unpaid = filterUnpaidOrders(orders, hotelName);
    const payRequire = unpaid.filter((item) => item.status != "Cancelled");
    setUnpaidOrders(payRequire);
  }, [orders, hotelName]);

  const handlePaymentMethod = async (id: number, order: Order, bank: boolean) => {
    setProcessingPayment(id);
    setDialogOpen(false);
    try {
      await onHandlePayment(id, order, order.price * order.orderAmount, bank);
    } finally {
      setProcessingPayment(null);
      setSelectedOrderId(null);
    }
  };

  const openPaymentDialog = (orderId: number) => {
    setSelectedOrderId(orderId);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedOrderId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex items-center gap-2">
        <CreditCard className="text-primary h-5 w-5 md:h-6 md:w-6" />
        <h2 className="text-xl md:text-2xl font-bold">Pending Payments</h2>
      </div>

      {unpaidOrders.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">All orders have been settled.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unpaidOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant="outline">Table {order.tableNo}</Badge>
                  <Badge
                    className={
                      order.status === "Completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-2">{order.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Qty: {order.orderAmount}
                  </span>
                  <span className="font-bold text-lg">
                    {(order.price * order.orderAmount).toFixed(2)} ETB
                  </span>
                </div>
                <AlertDialog open={dialogOpen && selectedOrderId === order.id} onOpenChange={handleDialogClose}>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="w-full gap-2"
                      disabled={
                        order.status !== "Completed" ||
                        processingPayment === order.id
                      }
                      onClick={() => openPaymentDialog(order.id)}
                    >
                      {processingPayment === order.id ? (
                        "Processing..."
                      ) : order.status !== "Completed" ? (
                        <>
                          <Clock className="h-4 w-4" /> Awaiting Kitchen/Bar
                        </>
                      ) : (
                        <>
                          <Wallet className="h-4 w-4" /> Settle Payment
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Payment Method</AlertDialogTitle>
                      <AlertDialogDescription>Select the Payment Method</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center py-4">
                      <Button
                        variant="outline"
                        size="lg"
                        className="cursor-pointer flex flex-col items-center gap-2 h-auto py-4 px-4 sm:px-6 w-full sm:w-auto"
                        onClick={() => {
                          const order = unpaidOrders.find(o => o.id === selectedOrderId);
                          if (order) {
                            handlePaymentMethod(order.id, order, false);
                          }
                        }}
                        disabled={processingPayment === selectedOrderId}
                      >
                        <Icon icon="streamline-ultimate-color:cash-briefcase" className="text-2xl sm:text-3xl" />
                        <h2 className="font-semibold text-sm sm:text-base">Cash</h2>
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="cursor-pointer flex flex-col items-center gap-2 h-auto py-4 px-4 sm:px-6 w-full sm:w-auto"
                        onClick={() => {
                          const order = unpaidOrders.find(o => o.id === selectedOrderId);
                          if (order) {
                            handlePaymentMethod(order.id, order, true);
                          }
                        }}
                        disabled={processingPayment === selectedOrderId}
                      >
                        <Icon icon="streamline-kameleon-color:bank-duo" className="text-2xl sm:text-3xl" />
                        <h2 className="font-semibold text-sm sm:text-base">Bank</h2>
                      </Button>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
