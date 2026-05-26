/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { Table, updateTable } from "@/lib/actions"
import { updateTableSchema } from "@/lib/validations"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import z from "zod"
import { Form } from "./ui/form"
import CustomFormField, { formFieldTypes } from "./customFormField"
import { Button } from "./ui/button"

interface UpdateTableFormProp {
    Table: Table
    onSuccess: () => void
}
const UpdateTableForm = ({ Table, onSuccess }: UpdateTableFormProp) => {
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof updateTableSchema>> ({
    resolver: zodResolver(updateTableSchema) as any,
    defaultValues: {
        id: Table.id,
        tableNo: Table.tableNo,
        capacity: Table.capacity,
        orderCaption: Table.orderCaption ?? "",
    }
  })
  const onSubmit = async (data: z.infer<typeof updateTableSchema>) => {
    setLoading(true)
    try {
      await updateTable({
        ...data,
        HotelName: localStorage.getItem("hotel_name") || ""
      })
      form.reset()
      onSuccess()
    } catch {
    } finally {
      setLoading(false)
    }
  }
  return (
    <Form {...form}>
      <form
        className="flex w-full min-w-0 flex-col gap-4 sm:gap-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CustomFormField
            name="tableNo"
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Table Number: "
            type="number"
            inputClassName="h-fit w-full p-2"
          />
          <CustomFormField
            name="capacity"
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Capacity: "
            type="number"
            inputClassName="h-fit w-full p-2"
          />
        </div>
        <CustomFormField
          name="orderCaption"
          control={form.control}
          fieldType={formFieldTypes.INPUT}
          label="Order caption (optional)"
          placeholder="e.g. Takeaway, Delivery"
          inputClassName="h-fit w-full p-2"
        />
        <p className="text-pretty text-xs text-muted-foreground">
          Applied to new orders placed from this table number.
        </p>
        <Button
          type="submit"
          className="h-11 w-full cursor-pointer bg-green-500 sm:h-10"
        >
          {loading ? "Updating..." : "Update table"}
        </Button>
      </form>
    </Form>
  )
}

export default UpdateTableForm