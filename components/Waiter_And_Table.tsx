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
import { useState } from "react";
import { prepareWaiterExportData, prepareTableExportData, exportToExcel } from "@/lib/actions";

export default function WaiterAndTable({
  waiters,
  tables,
  onAddWaiter,
  onAddTable
}: any) {
  const [waiterOpen, setWaiterOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
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
    },
  });
  return (
    <Tabs defaultValue="waiters" className="w-full">
      <div className="flex justify-between items-center mb-6 px-4">
        <TabsList>
          <TabsTrigger value="waiters" className="gap-2">
            <Users className="h-4 w-4" /> Waiters
          </TabsTrigger>
          <TabsTrigger value="tables" className="gap-2">
            <Grid2X2 className="h-4 w-4" /> Tables
          </TabsTrigger>
        </TabsList>

        <div className="flex gap-2">
          <Dialog open={waiterOpen} onOpenChange={setWaiterOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 cursor-pointer">
                <UserPlus className="h-4 w-4" /> Add Waiter
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                className="gap-2 cursor-pointer"
              >
                <SquarePlus className="h-4 w-4" /> Add Table
              </Button>
            </DialogTrigger>
            <DialogContent className="w-fit flex flex-col gap-8">
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
                  <Button type="submit" className="cursor-pointer bg-green-500 w-full">Register</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <TabsContent value="waiters">
        <Card className="mx-4">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Staff Management</CardTitle>
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
                    const exportData = prepareWaiterExportData(waiters);
                    await exportToExcel(exportData);
                  } catch {
                  }
                }}
              >
                <Download className="h-4 w-4" /> Export Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <WaiterTable waiter={waiters}/>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tables">
        <Card className="mx-4">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Table Layout</CardTitle>
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
                    const exportData = prepareTableExportData(tables);
                    await exportToExcel(exportData);
                  } catch {
                  }
                }}
              >
                <Download className="h-4 w-4" /> Export Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TableTable Table={tables}/>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
