/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { updateWaiter, Waiter } from "@/lib/actions";
import { updateWaiterSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { PendingButton } from "./ui/pending-button";
import { useWaiterOrderingEnabled } from "@/hooks/useWaiterOrderingEnabled";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Switch } from "@/components/ui/switch";

interface updateWaiterFormProps {
  waiter: Waiter;
  onSuccess: () => void;
}
const UpdateWaiterForm = ({ waiter, onSuccess }: updateWaiterFormProps) => {
  const waiterOrderingEnabled = useWaiterOrderingEnabled();
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
      passkey: waiter.passkey || "",
      isActive: waiter.isActive !== false,
    },
  });

  const onSubmit = async (data: z.infer<typeof updateWaiterSchema>) => {
    try {
      setLoading(true);
      await updateWaiter({
        ...data,
        HotelName: localStorage.getItem("hotel_name") || "",
        passkey: waiterOrderingEnabled ? data.passkey || null : undefined,
        isActive: waiterOrderingEnabled ? data.isActive : undefined,
      });
      form.reset();
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        className="flex w-full min-w-0 flex-col gap-4 sm:gap-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          <CustomFormField
            name="name"
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Name: "
            inputClassName="h-fit w-full p-2 sm:w-56"
          />
          <CustomFormField
            name="sex"
            control={form.control}
            fieldType={formFieldTypes.RADIO_BUTTON}
            label="Sex: "
            inputClassName="h-fit w-full p-2 sm:w-56"
            listdisplay={["Male", "Female"]}
          />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          <CustomFormField
            name="age"
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Age: "
            inputClassName="h-fit w-full p-2 sm:w-56"
            type="number"
          />
          <CustomFormField
            name="experience"
            control={form.control}
            fieldType={formFieldTypes.INPUT}
            label="Experience: "
            inputClassName="h-fit w-full p-2 sm:w-56"
            type="number"
          />
        </div>
        <CustomFormField
          name="phoneNumber"
          control={form.control}
          fieldType={formFieldTypes.PHONE_INPUT}
          label="Phone Number: "
          inputClassName="h-fit w-full p-2 sm:max-w-sm"
        />
        {waiterOrderingEnabled ? (
          <>
            <FormField
              control={form.control}
              name="passkey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Portal passkey (6 digits)</FormLabel>
                  <FormControl>
                    <InputOTP
                      maxLength={6}
                      value={field.value || ""}
                      onChange={field.onChange}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <FormLabel className="m-0">Active (can log in & order)</FormLabel>
                  <FormControl>
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        ) : null}
        <PendingButton
          type="submit"
          pending={loading}
          className="h-11 w-full cursor-pointer bg-green-500 sm:h-10"
        >
          {loading ? "Updating…" : "Update waiter"}
        </PendingButton>
      </form>
    </Form>
  );
};

export default UpdateWaiterForm;
