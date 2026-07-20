/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, SquarePlus, Users, Grid2X2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { useForm } from "react-hook-form";
import z from "zod";
import { createTableSchema, createWaiterSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "./ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import WaiterTable from "@/app/WaiterTable/page";
import TableTable from "@/app/TableTable/page";
import AdminIncomeRankings from "@/components/AdminIncomeRankings";
import { useState } from "react";
import {
  prepareWaiterExportData,
  prepareTableExportData,
  exportToExcel,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { responsiveFormDialogClassName } from "@/lib/responsiveDialog";

export default function WaiterAndTable({
  waiters,
  tables,
  hotelName,
  onAddWaiter,
  onAddTable,
}: any) {
  const [waiterOpen, setWaiterOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [waiterSubmitting, setWaiterSubmitting] = useState(false);
  const [tableSubmitting, setTableSubmitting] = useState(false);
  const [exportingWaiters, setExportingWaiters] = useState(false);
  const [exportingTables, setExportingTables] = useState(false);
  const hotelWaiters = waiters.filter((item: any) =>
    rowHotelMatchesTenantScope(item.HotelName, hotelName),
  );
  const hotelTables = tables.filter((item: any) =>
    rowHotelMatchesTenantScope(item.HotelName, hotelName),
  );
  const waiterForm = useForm<z.infer<typeof createWaiterSchema>>({
    resolver: zodResolver(createWaiterSchema) as any,
    defaultValues: {
      name: "",
      sex: "Male",
      age: 21,
      phoneNumber: "",
      experience: 0,
    },
  });
  const tableForm = useForm<z.infer<typeof createTableSchema>>({
    resolver: zodResolver(createTableSchema) as any,
    defaultValues: {
      tableNo: 1,
      capacity: 0,
      orderCaption: "",
    },
  });

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <AdminIncomeRankings
        waiters={waiters}
        tables={tables}
        hotelName={hotelName}
      />

      <Tabs defaultValue="waiters" className="w-full min-w-0">
        <Card className="overflow-hidden border-primary/15 bg-card/95 shadow-lg ring-1 ring-black/3 dark:ring-white/6">
          <div className="h-1 bg-linear-to-r from-emerald-500 via-teal-400 to-cyan-400/90" />
          <CardHeader className="space-y-4 pb-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Waiters & tables
              </CardTitle>
              <CardDescription className="max-w-2xl text-pretty leading-relaxed">
                Register front-of-house staff and floor tables used by cashiers
                when taking orders.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabsList className="grid h-10 w-full grid-cols-2 lg:h-9 lg:w-auto lg:min-w-[240px]">
                <TabsTrigger
                  value="waiters"
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  <Users className="h-3.5 w-3.5" />
                  Waiters
                  <span className="hidden tabular-nums text-muted-foreground sm:inline">
                    ({hotelWaiters.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="tables"
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  <Grid2X2 className="h-3.5 w-3.5" />
                  Tables
                  <span className="hidden tabular-nums text-muted-foreground sm:inline">
                    ({hotelTables.length})
                  </span>
                </TabsTrigger>
              </TabsList>

              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                <Dialog open={waiterOpen} onOpenChange={setWaiterOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="w-full cursor-pointer gap-2 sm:w-auto"
                    >
                      <UserPlus className="h-4 w-4" /> Add waiter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className={responsiveFormDialogClassName}>
                    <DialogHeader>
                      <DialogTitle>Add waiter</DialogTitle>
                      <DialogDescription className="text-pretty">
                        Register a new front-of-house team member for this
                        property.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...waiterForm}>
                      <form
                        className="flex w-full min-w-0 flex-col gap-4 sm:gap-5"
                        onSubmit={waiterForm.handleSubmit(async (values) => {
                          setWaiterSubmitting(true);
                          try {
                            await onAddWaiter(values);
                            waiterForm.reset();
                            setWaiterOpen(false);
                          } finally {
                            setWaiterSubmitting(false);
                          }
                        })}
                      >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <CustomFormField
                            name="name"
                            control={waiterForm.control}
                            fieldType={formFieldTypes.INPUT}
                            label="Name"
                            placeholder="Full name"
                            inputClassName="h-10 w-full"
                          />
                          <CustomFormField
                            name="sex"
                            control={waiterForm.control}
                            fieldType={formFieldTypes.RADIO_BUTTON}
                            label="Sex"
                            placeholder="Select gender"
                            listdisplay={["Male", "Female"]}
                            inputClassName="h-fit w-full"
                          />
                          <CustomFormField
                            name="age"
                            control={waiterForm.control}
                            fieldType={formFieldTypes.INPUT}
                            label="Age"
                            placeholder="Age"
                            inputClassName="h-10 w-full"
                            type="number"
                          />
                          <CustomFormField
                            name="experience"
                            control={waiterForm.control}
                            fieldType={formFieldTypes.INPUT}
                            label="Experience (years)"
                            placeholder="Years of experience"
                            inputClassName="h-10 w-full"
                            type="number"
                          />
                        </div>
                        <CustomFormField
                          name="phoneNumber"
                          control={waiterForm.control}
                          fieldType={formFieldTypes.PHONE_INPUT}
                          label="Phone number"
                          placeholder="Phone number"
                          inputClassName="h-10 w-full"
                        />
                        <PendingButton
                          type="submit"
                          pending={waiterSubmitting}
                          className="h-11 w-full cursor-pointer sm:h-10"
                        >
                          {waiterSubmitting ? "Registering…" : "Register waiter"}
                        </PendingButton>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Dialog open={tableOpen} onOpenChange={setTableOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full cursor-pointer gap-2 sm:w-auto"
                    >
                      <SquarePlus className="h-4 w-4" /> Add table
                    </Button>
                  </DialogTrigger>
                  <DialogContent className={responsiveFormDialogClassName}>
                    <DialogHeader>
                      <DialogTitle>Add table</DialogTitle>
                      <DialogDescription className="text-pretty">
                        Configure a table number and optional caption for staff.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...tableForm}>
                      <form
                        className="flex w-full min-w-0 flex-col gap-4 sm:gap-5"
                        onSubmit={tableForm.handleSubmit(async (values) => {
                          setTableSubmitting(true);
                          try {
                            await onAddTable(values);
                            tableForm.reset();
                            setTableOpen(false);
                          } finally {
                            setTableSubmitting(false);
                          }
                        })}
                      >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <CustomFormField
                            name="tableNo"
                            control={tableForm.control}
                            fieldType={formFieldTypes.INPUT}
                            label="Table number"
                            placeholder="Table number"
                            inputClassName="h-10 w-full"
                            type="number"
                          />
                          <CustomFormField
                            name="capacity"
                            control={tableForm.control}
                            fieldType={formFieldTypes.INPUT}
                            label="Capacity"
                            placeholder="Seats"
                            inputClassName="h-10 w-full"
                            type="number"
                          />
                        </div>
                        <CustomFormField
                          name="orderCaption"
                          control={tableForm.control}
                          fieldType={formFieldTypes.INPUT}
                          label="Order caption (optional)"
                          placeholder="e.g. Takeaway, Delivery"
                          inputClassName="h-10 w-full"
                        />
                        <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
                          Optional label shown to staff when ordering. The caption
                          does not change the table number stored on orders.
                        </p>
                        <PendingButton
                          type="submit"
                          pending={tableSubmitting}
                          className="h-11 w-full cursor-pointer sm:h-10"
                        >
                          {tableSubmitting ? "Registering…" : "Register table"}
                        </PendingButton>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>

          <CardContent className="min-w-0 px-3 pb-4 pt-0 sm:px-6 sm:pb-6">
            <TabsContent value="waiters" className="mt-0 min-w-0">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {hotelWaiters.length} waiter
                  {hotelWaiters.length === 1 ? "" : "s"} registered
                </p>
                <PendingButton
                  type="button"
                  variant="outline"
                  size="sm"
                  pending={exportingWaiters}
                  className="w-full cursor-pointer gap-2 sm:w-auto"
                  onClick={async () => {
                    setExportingWaiters(true);
                    try {
                      const exportData = prepareWaiterExportData(hotelWaiters);
                      await exportToExcel(exportData);
                    } catch {
                    } finally {
                      setExportingWaiters(false);
                    }
                  }}
                >
                  <Download className="h-4 w-4" /> Export Excel
                </PendingButton>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/10">
                <WaiterTable waiter={hotelWaiters} hotelName={hotelName} />
              </div>
            </TabsContent>

            <TabsContent value="tables" className="mt-0 min-w-0">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {hotelTables.length} table
                  {hotelTables.length === 1 ? "" : "s"} configured
                </p>
                <PendingButton
                  type="button"
                  variant="outline"
                  size="sm"
                  pending={exportingTables}
                  className="w-full cursor-pointer gap-2 sm:w-auto"
                  onClick={async () => {
                    setExportingTables(true);
                    try {
                      const exportData = prepareTableExportData(hotelTables);
                      await exportToExcel(exportData);
                    } catch {
                    } finally {
                      setExportingTables(false);
                    }
                  }}
                >
                  <Download className="h-4 w-4" /> Export Excel
                </PendingButton>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/10">
                <TableTable Table={hotelTables} hotelName={hotelName} />
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
