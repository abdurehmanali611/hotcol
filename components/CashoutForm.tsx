/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { cashoutSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import { Form } from "./ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { Button } from "./ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { CreateCashout } from "@/lib/actions";
import { toast } from "sonner"; 

export default function CashoutForm() {
  const form = useForm<z.infer<typeof cashoutSchema>>({
    resolver: zodResolver(cashoutSchema) as any,
    defaultValues: {
      Amount: 50,
      Reason: [],
      HotelName: localStorage.getItem("hotel_name") || "",
    },
  });
  
  const onSubmit = async (values: z.infer<typeof cashoutSchema>) => {
    try {
      CreateCashout(values)
      toast.success("Cashout created successfully!");
      form.reset(); 
    } catch (error) {
      toast.error(`Failed to create cashout: ${error}`);
    }
  };
  
  return (
    <div className="flex flex-col gap-6 md:gap-10 items-center py-4 md:py-5 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Cashout</CardTitle>
          <CardDescription className="text-sm">Here fill the cashout informations</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
              <CustomFormField
                name="Amount"
                control={form.control}
                fieldType={formFieldTypes.INPUT}
                label="Amount"
                placeholder="Enter Amount"
                type="number"
                inputClassName="h-fit p-2 w-full sm:w-56"
              />
              <CustomFormField
                name="Reason"
                control={form.control}
                fieldType={formFieldTypes.INPUT}
                label="Reason"
                placeholder="Enter Reason"
                add="reason"
                inputClassName="h-fit p-2 w-full sm:w-56"
              />
              <Button
                type="submit"
                className="cursor-pointer bg-green-500 w-full sm:w-auto sm:self-center"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}