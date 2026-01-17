/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import GrantCredential from "@/components/GrantCredential";
import Reports from "@/components/reports";
import ItemCreationForm from "@/components/ItemCreation";
import UpdateDeleteIntro from "@/components/UpdateDeleteIntro";
import UpdateCredential from "@/components/UpdateCredential";
import WaiterAndTable from "@/components/Waiter_And_Table";
import {
  fetchItems,
  fetchCredentials,
  fetchWaiters,
  fetchTables,
  fetchOrders,
  createItem,
  deleteItem,
  createCredential,
  updateCredential,
  updateAdminPassword,
  verifyAdminPassword,
  createWaiter,
  createTable,
  uploadImage,
  generateReport,
  prepareReportExportData,
  prepareInventoryExportData,
  exportToExcel,
  fetchCashout,
} from "@/lib/actions";
import {
  FileText,
  PlusCircle,
  Edit,
  Key,
  Users,
  RefreshCw,
  LogOut,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hotelName = searchParams.get("hotel") || "";
  const logoUrl = searchParams.get("logo") || "";

  const [activeTab, setActiveTab] = useState("reports");
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const results = await Promise.allSettled([
        fetchItems(),
        fetchOrders(),
        fetchWaiters(),
        fetchTables(),
        fetchCredentials(),
      ]);

      const data = results.map((result, index) => {
        if (result.status === "fulfilled") return result.value;

        const labels = ["Items", "Orders", "Waiters", "Tables", "Credentials"];
        toast.error(`Could not load ${labels[index]}`);
        return null;
      });

      if (data[0] !== null) setItems(data[0]);
      if (data[1] !== null) setOrders(data[1]);
      if (data[2] !== null) setWaiters(data[2]);
      if (data[3] !== null) setTables(data[3]);
      if (data[4] !== null) setCredentials(data[4]);
    } catch {
      toast.error("An unexpected error occurred while loading data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (hotelName) {
      loadData();
    }
  }, [hotelName, loadData]);

  const sidebarItems = [
    { id: "reports", label: "Reports", icon: <FileText className="h-4 w-4" /> },
    {
      id: "create-item",
      label: "Add Item",
      icon: <PlusCircle className="h-4 w-4" />,
    },
    {
      id: "update-item",
      label: "Update/Delete Item",
      icon: <Edit className="h-4 w-4" />,
    },
    {
      id: "waiter-table",
      label: "Waiters & Tables",
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "grant-credential",
      label: "Grant Credential",
      icon: <Key className="h-4 w-4" />,
    },
    {
      id: "update-credential",
      label: "Update Credential",
      icon: <RefreshCw className="h-4 w-4" />,
    },
  ];

  const handleLogout = () => {
    router.push("/");
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">
            Syncing dashboard data...
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "reports":
        return (
          <Reports
            orders={orders}
            hotelName={hotelName}
            onGenerateReport={async ({ date, type }: { date: Date; type: "Daily" | "Monthly" | "remain" }) => {
              try {
                if (type === "remain") {
                  return { type: "inventory" };
                }
                const cashouts = await fetchCashout(hotelName);
                return await generateReport(orders, cashouts, {
                  date,
                  type,
                  HotelName: hotelName,
                });
              } catch (error: any) {
                toast.error("Failed to generate report: " + error.message);
                throw error;
              }
            }}
            onExportReport={async (reportData: any, reportType: "Daily" | "Monthly" | "remain") => {
              try {
                if (reportType === "remain") {
                  const items = await fetchItems();
                  const cashouts = await fetchCashout(hotelName);
                  const exportData = prepareInventoryExportData(items, cashouts, hotelName);
                  await exportToExcel(exportData);
                } else {
                  const exportData = prepareReportExportData(reportData.orders, reportType);
                  await exportToExcel(exportData);
                }
              } catch (error: any) {
                toast.error("Failed to export report: " + error.message);
                throw error;
              }
            }}
          />
        );
      case "create-item":
        return (
          <ItemCreationForm
            hotelName={hotelName}
            onSubmit={async (data) => {
              await createItem(data);
              loadData(true);
            }}
            onImageUpload={uploadImage}
          />
        );
      case "update-item":
        return (
          <UpdateDeleteIntro
            items={items}
            hotelName={hotelName}
            onUpdate={() => loadData(true)}
            onDelete={async (id: number) => {
              try {
                await deleteItem(id);
                loadData(true);
              } catch (err: any) {
                toast.error(`Failed to delete: ${err.message}`);
              }
            }}
            onImageUpload={uploadImage}
          />
        );
      case "grant-credential":
        return (
          <GrantCredential
            hotelName={hotelName}
            logoUrl={logoUrl}
            onSubmit={async (data) => {
              await createCredential(data);
              loadData(true);
            }}
          />
        );
      case "waiter-table":
        return (
          <WaiterAndTable
            waiters={waiters}
            tables={tables}
            onAddWaiter={async (data: any) => {
              await createWaiter({ ...data, HotelName: hotelName });
              loadData(true);
            }}
            onAddTable={async (data: any) => {
              await createTable({ ...data, HotelName: hotelName });
              loadData(true);
            }}
          />
        );
      case "update-credential":
        return (
          <UpdateCredential
            credentials={credentials}
            hotelName={hotelName}
            onUpdateCredential={async (data) => {
              await updateCredential(data);
              loadData(true);
            }}
            onUpdateAdminPassword={updateAdminPassword}
            onVerifyPassword={verifyAdminPassword}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
        <Sidebar collapsible="icon" className="border-r">
          <SidebarHeader className="h-16 flex items-center px-4 border-b">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-1.5 text-primary-foreground">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg truncate">Admin Pro</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="py-4">
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                    tooltip={item.label}
                    className="cursor-pointer"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <div className="mt-auto px-4 pb-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center gap-2 md:gap-4 border-b bg-background px-3 md:px-6">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <h1 className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider truncate">
                {hotelName}
              </h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => loadData(true)}
                disabled={refreshing}
                className={refreshing ? "animate-spin" : ""}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8 md:h-9 md:w-9 border shadow-sm">
                <AvatarImage src={logoUrl} alt={hotelName} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {hotelName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 p-3 md:p-6 lg:p-10">
            <div className="mx-auto max-w-6xl">
              <div className="mb-4 md:mb-8">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                  {sidebarItems.find((i) => i.id === activeTab)?.label}
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Manage your hotel operations and system configurations.
                </p>
              </div>

              <Card className="border-none shadow-xl bg-card">
                <CardContent className="p-0">{renderContent()}</CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}
