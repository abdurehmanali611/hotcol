/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { updateWaiter, Waiter } from "@/lib/actions";
import { updateWaiterSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { Form } from "./ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { Button } from "./ui/button";

interface updateWaiterFormProps {
  waiter: Waiter;
  onSuccess: () => void;
}
const UpdateWaiterForm = ({ waiter, onSuccess }: updateWaiterFormProps) => {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof updateWaiterSchema>>({
    resolver: zodResolver(updateWaiterSchema) as any,
    defaultValues: {
      id: waiter.id,
      name: waiter.name,
      age: waiter.age,
      sex: waiter.sex as "Male" | "Female",
      experience: waiter.experience,
      phoneNumber: waiter.phoneNumber,
    },
  });

  const onSubmit = async (data: z.infer<typeof updateWaiterSchema>) => {
    try {
      setLoading(true);
      await updateWaiter({
        ...data,
        HotelName: localStorage.getItem("hotel_name") || "",
      });
      form.reset()
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex items-center gap-5">
          <CustomFormField
            name="name"
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Name: "
            inputClassName="h-fit p-2 w-56"
          />
          <CustomFormField
            name="sex"
            control={form.control}
            fieldType={formFieldTypes.RADIO_BUTTON}
            label="Sex: "
            inputClassName="h-fit p-2 w-56"
            listdisplay={["Male", "Female"]}
          />
        </div>
        <div className="flex items-center gap-5">
          <CustomFormField
            name="age"
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Age: "
            inputClassName="h-fit p-2 w-56"
            type="number"
          />
          <CustomFormField
            name="experience"
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Experience: : "
            inputClassName="h-fit p-2 w-56"
            type="number"
          />
        </div>
        <div className="flex justify-center w-full">
          <CustomFormField
            name="phoneNumber"
            control={form.control}
            fieldType={formFieldTypes.PHONE_INPUT}
            label="Phone Number: "
            inputClassName="h-fit p-2 w-56"
          />
        </div>
        <Button type="submit" className="cursor-pointer bg-green-500">{loading ? "Updating..." : "Update"}</Button>
      </form>
    </Form>
  );
};

export default UpdateWaiterForm;
