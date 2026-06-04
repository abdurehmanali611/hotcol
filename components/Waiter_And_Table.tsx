/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { prepareWaiterExportData, prepareTableExportData, exportToExcel } from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { responsiveFormDialogClassName } from "@/lib/responsiveDialog";

export default function WaiterAndTable({
  waiters,
  tables,
  hotelName,
  onAddWaiter,
  onAddTable
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
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      <AdminIncomeRankings
        waiters={waiters}
        tables={tables}
        hotelName={hotelName}
      />
    <Tabs defaultValue="waiters" className="w-full min-w-0">
      <div className="mb-4 flex w-full min-w-0 flex-col gap-3 sm:mb-6 lg:flex-row lg:items-center lg:justify-between">
        <TabsList className="grid h-10 w-full grid-cols-2 lg:h-9 lg:w-auto">
          <TabsTrigger value="waiters" className="gap-1.5 px-2 text-xs sm:gap-2 sm:text-sm">
            <Users className="hidden h-4 w-4 sm:inline" /> Waiters
          </TabsTrigger>
          <TabsTrigger value="tables" className="gap-1.5 px-2 text-xs sm:gap-2 sm:text-sm">
            <Grid2X2 className="hidden h-4 w-4 sm:inline" /> Tables
          </TabsTrigger>
        </TabsList>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Dialog open={waiterOpen} onOpenChange={setWaiterOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full gap-2 cursor-pointer sm:w-auto">
                <UserPlus className="h-4 w-4" /> Add Waiter
              </Button>
            </DialogTrigger>
            <DialogContent className={responsiveFormDialogClassName}>
              <DialogHeader>
                <DialogTitle>Add Waiter</DialogTitle>
                <DialogDescription className="text-pretty">
                  Enter the waiter details.
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
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
                    <CustomFormField
                      name="name"
                      control={waiterForm.control}
                      fieldType={formFieldTypes.INPUT}
                      label="Name: "
                      placeholder="Enter waiter name"
                      inputClassName="h-fit w-full p-2 sm:w-56"
                    />
                    <CustomFormField
                      name="sex"
                      control={waiterForm.control}
                      fieldType={formFieldTypes.RADIO_BUTTON}
                      label="Sex: "
                      placeholder="select waiter Gender"
                      listdisplay={["Male", "Female"]}
                      inputClassName="h-fit w-full p-2 sm:w-56"
                    />
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
                    <CustomFormField
                      name="age"
                      control={waiterForm.control}
                      fieldType={formFieldTypes.INPUT}
                      label="Age: "
                      placeholder="Enter waiter age"
                      inputClassName="h-fit w-full p-2 sm:w-56"
                      type="number"
                    />
                    <CustomFormField
                      name="experience"
                      control={waiterForm.control}
                      fieldType={formFieldTypes.INPUT}
                      label="Experience: "
                      placeholder="Years of experience"
                      inputClassName="h-fit w-full p-2 sm:w-56"
                      type="number"
                    />
                  </div>
                  <CustomFormField
                    name="phoneNumber"
                    control={waiterForm.control}
                    fieldType={formFieldTypes.PHONE_INPUT}
                    label="Phone Number: "
                    placeholder="Phone number"
                    inputClassName="h-fit w-full p-2 sm:max-w-sm"
                  />
                  <PendingButton
                    type="submit"
                    pending={waiterSubmitting}
                    className="h-11 w-full cursor-pointer bg-green-500 sm:h-10"
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
                className="w-full gap-2 cursor-pointer sm:w-auto"
              >
                <SquarePlus className="h-4 w-4" /> Add Table
              </Button>
            </DialogTrigger>
            <DialogContent className={responsiveFormDialogClassName}>
              <DialogHeader>
                <DialogTitle>Add Table</DialogTitle>
                <DialogDescription className="text-pretty">
                  Enter the table details.
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
                      label="Table Number"
                      placeholder="Table number"
                      inputClassName="h-fit w-full p-2"
                      type="number"
                    />
                    <CustomFormField
                      name="capacity"
                      control={tableForm.control}
                      fieldType={formFieldTypes.INPUT}
                      label="Capacity"
                      placeholder="Seats"
                      inputClassName="h-fit w-full p-2"
                      type="number"
                    />
                  </div>
                  <CustomFormField
                    name="orderCaption"
                    control={tableForm.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Order caption (optional)"
                    placeholder="e.g. Takeaway, Delivery"
                    inputClassName="h-fit w-full p-2"
                  />
                  <p className="text-pretty text-xs text-muted-foreground">
                    Optional label shown to staff when ordering (e.g. Delivery,
                    Takeaway). Use any table number — the caption does not change
                    the number stored on orders.
                  </p>
                  <PendingButton
                    type="submit"
                    pending={tableSubmitting}
                    className="h-11 w-full cursor-pointer bg-green-500 sm:h-10"
                  >
                    {tableSubmitting ? "Registering…" : "Register table"}
                  </PendingButton>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <TabsContent value="waiters" className="w-full min-w-0">
        <Card className="min-w-0 overflow-hidden border-border/50">
          <CardHeader className="px-3 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg">Staff Management</CardTitle>
                <CardDescription>
                  Manage your front-of-house service team.
                </CardDescription>
              </div>
              <PendingButton
                type="button"
                variant="outline"
                size="sm"
                pending={exportingWaiters}
                className="gap-2 cursor-pointer w-full sm:w-auto"
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
          </CardHeader>
          <CardContent className="min-w-0 px-2 pb-4 pt-0 sm:px-6 sm:pb-6">
            <WaiterTable waiter={hotelWaiters} hotelName={hotelName}/>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tables" className="w-full min-w-0">
        <Card className="min-w-0 overflow-hidden border-border/50">
          <CardHeader className="px-3 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg">Table Layout</CardTitle>
                <CardDescription>
                  Configure floor capacity and table numbers.
                </CardDescription>
              </div>
              <PendingButton
                type="button"
                variant="outline"
                size="sm"
                pending={exportingTables}
                className="gap-2 cursor-pointer w-full sm:w-auto"
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
          </CardHeader>
          <CardContent className="min-w-0 px-2 pb-4 pt-0 sm:px-6 sm:pb-6">
            <TableTable Table={hotelTables} hotelName={hotelName}/>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    </div>
  );
}
