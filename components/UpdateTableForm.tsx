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
        capacity: Table.capacity
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
        <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
            <CustomFormField 
            name="tableNo"
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Table Number: "
            type="number"
            />
            <CustomFormField 
            name="capacity"
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Capacity: "
            type="number"
            />
            <Button type="submit" className="cursor-pointer bg-green-500">{loading ? "Updating..." : "Update"}</Button>
        </form>
    </Form>
  )
}

export default UpdateTableForm