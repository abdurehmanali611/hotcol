/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@/components/ui/button";
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

export default function WaiterAndTable({
  waiters,
  tables,
  hotelName,
  onAddWaiter,
  onAddTable
}: any) {
  const [waiterOpen, setWaiterOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
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
            <DialogContent className="max-h-[min(90dvh,640px)] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Waiter</DialogTitle>
                <DialogDescription>Enter the waiter details.</DialogDescription>
              </DialogHeader>
              <Form {...waiterForm}>
                <form
                  className="flex flex-col gap-5"
                  onSubmit={waiterForm.handleSubmit((values) =>
                    {
                      onAddWaiter(values)
                      waiterForm.reset()
                      setWaiterOpen(false)
                    }
                  )}
                >
                  <div className="flex items-center gap-12">
                    <CustomFormField
                      name="name"
                      control={waiterForm.control}
                      fieldType={formFieldTypes.INPUT}
                      label="Name: "
                      placeholder="Enter waiter name"
                      inputClassName="h-fit p-2 w-56"
                    />
                    <CustomFormField
                      name="sex"
                      control={waiterForm.control}
                      fieldType={formFieldTypes.RADIO_BUTTON}
                      label="Sex: "
                      placeholder="select waiter Gender"
                      listdisplay={["Male", "Female"]}
                      inputClassName="h-fit p-2 w-56"
                    />
                  </div>
                  <div className="flex items-center gap-12">
                    <CustomFormField
                      name="age"
                      control={waiterForm.control}
                      fieldType={formFieldTypes.INPUT}
                      label="Age: "
                      placeholder="Enter waiter age"
                      inputClassName="h-fit p-2 w-56"
                      type="number"
                    />
                    <CustomFormField
                      name="experience"
                      control={waiterForm.control}
                      fieldType={formFieldTypes.INPUT}
                      label="Expereince: "
                      placeholder="select waiter year of exp"
                      inputClassName="h-fit p-2 w-42"
                      type="number"
                    />
                  </div>
                  <div className="flex justify-center">
                    <CustomFormField
                      name="phoneNumber"
                      control={waiterForm.control}
                      fieldType={formFieldTypes.PHONE_INPUT}
                      label="Phone Number: "
                      placeholder="select waiter phone number"
                      inputClassName="h-fit p-2 w-72"
                    />
                  </div>
                  <Button type="submit" className="cursor-pointer bg-green-500 self-center">
                    Register
                  </Button>
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
            <DialogContent className="flex max-h-[min(90dvh,640px)] w-full flex-col gap-6 overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center">Add Table</DialogTitle>
                <DialogDescription className="text-center">Enter the table details.</DialogDescription>
              </DialogHeader>
              <Form {...tableForm}>
                <form
                  className="flex flex-col gap-5 items-center"
                  onSubmit={tableForm.handleSubmit((values) =>
                    {
                      onAddTable(values)
                      tableForm.reset()
                      setTableOpen(false)
                    }
                  )}
                >
                  <CustomFormField 
                  name="tableNo"
                  control={tableForm.control}
                  fieldType={formFieldTypes.INPUT}
                  label="Table Number"
                  placeholder="Enter the table number"
                  inputClassName="h-fit p-2 w-42"
                  type="number"
                  />
                  <CustomFormField 
                   name="capacity"
                   control={tableForm.control}
                   fieldType={formFieldTypes.INPUT}
                   label="Capacity"
                   placeholder="Enter the table capacity"
                   inputClassName="h-fit p-2 w-42"
                   type="number" 
                  />
                  <CustomFormField
                    name="orderCaption"
                    control={tableForm.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Order caption (optional)"
                    placeholder="e.g. Takeaway, Delivery"
                    inputClassName="h-fit p-2 w-full max-w-sm"
                  />
                  <p className="text-xs text-muted-foreground text-center max-w-sm">
                    When staff order from this table, this label is stored on the
                    order (e.g. takeaway or delivery).
                  </p>
                  <Button type="submit" className="cursor-pointer bg-green-500 w-full">Register</Button>
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2 cursor-pointer w-full sm:w-auto"
                onClick={async () => {
                  try {
                    const exportData = prepareWaiterExportData(hotelWaiters);
                    await exportToExcel(exportData);
                  } catch {
                  }
                }}
              >
                <Download className="h-4 w-4" /> Export Excel
              </Button>
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2 cursor-pointer w-full sm:w-auto"
                onClick={async () => {
                  try {
                    const exportData = prepareTableExportData(hotelTables);
                    await exportToExcel(exportData);
                  } catch {
                  }
                }}
              >
                <Download className="h-4 w-4" /> Export Excel
              </Button>
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
