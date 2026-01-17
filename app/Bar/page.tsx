/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, Suspense } from 'react'; // Added Suspense
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { toast, Toaster } from 'sonner';

import { Order, fetchOrders, updateOrderStatus, filterBaristaOrders } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Coffee, RefreshCw, CheckCircle2, XCircle, Clock, Utensils } from 'lucide-react';

// 1. Move the main logic to a separate component
function BaristaContent() {
  const searchParams = useSearchParams();
  const hotelName = searchParams.get('hotel') || 'Hotel';
  const logoUrl = searchParams.get('logo') || '';
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const allOrders = await fetchOrders();
      const filteredOrders = filterBaristaOrders(allOrders, hotelName);
      setOrders(filteredOrders);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => loadOrders(true), 30000);
    return () => clearInterval(interval);
  }, [hotelName]);

  const handleStatusUpdate = async (id: number, status: 'Completed' | 'Cancelled') => {
    setUpdatingId(id);
    const promise = updateOrderStatus(id, status);

    toast.promise(promise, {
      loading: `Marking order as ${status.toLowerCase()}...`,
      success: () => {
        loadOrders(true);
        return `Order #${id} ${status.toLowerCase()}!`;
      },
      error: 'Failed to update order status.',
    });

    try {
      await promise;
    } catch {
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingOrders = orders.filter(order => order.status === null || order.status === "Pending");

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full rounded-xl" />
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={logoUrl} alt={hotelName} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Coffee size={20} />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-bold leading-none">{hotelName} Barista</h1>
              <p className="text-xs text-muted-foreground mt-1">Live Order Monitor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex gap-1 py-1">
              <Clock size={12} className="text-orange-500" />
              {pendingOrders.length} Pending
            </Badge>
            <Button onClick={() => loadOrders()} variant="outline" size="sm" className="gap-2">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6 mt-4">
        {pendingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-background p-6 rounded-full shadow-sm mb-4">
              <Coffee size={48} className="text-muted-foreground/40" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">All clear!</h2>
            <p className="text-muted-foreground max-w-62.5 mx-auto mt-2">
              There are no pending Beverage orders at the moment.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingOrders.map((order) => (
              <Card key={order.id} className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Visual Side */}
                    <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-muted">
                      <Image
                        src={order.imageUrl || '/placeholder-drink.jpg'}
                        alt={order.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-black/60 backdrop-blur-md text-white border-none">
                          Table {order.tableNo}
                        </Badge>
                      </div>
                    </div>

                    {/* Info Side */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h2 className="text-xl font-bold tracking-tight">{order.title}</h2>
                          <p className="text-xl font-black text-primary">×{order.orderAmount}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-y-2 gap-x-6 mt-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Utensils size={14} className="text-muted-foreground" />
                            <span className="text-muted-foreground">Waiter:</span>
                            <span className="font-medium">{order.waiterName || 'Self'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Unit Price:</span>
                            <span className="font-medium">{order.price} ETB</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <Button
                          onClick={() => handleStatusUpdate(order.id, 'Cancelled')}
                          disabled={updatingId === order.id}
                          variant="ghost"
                          className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate(order.id, 'Completed')}
                          disabled={updatingId === order.id}
                          className="flex-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark Done
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function Bar() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-muted/30 p-4 md:p-8 flex items-center justify-center">
            <RefreshCw className="animate-spin text-muted-foreground" size={32} />
        </div>
    }>
      <BaristaContent />
    </Suspense>
  );
}