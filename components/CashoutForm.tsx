/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
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
import { Plus, Trash2 } from "lucide-react";

const CashoutItem = ({ index, form, removeItem }: any) => (
  <div className="flex flex-col sm:flex-row gap-3 items-start border p-3 mb-3">
    <div className="flex-1">
      <CustomFormField
        name={`items.${index}`}
        control={form.control}
        fieldType={formFieldTypes.INPUT}
        label="Item Name"
        placeholder="eg: Flour, Sugar, Oil"
        inputClassName="h-fit p-2 w-full"
      />
    </div>
    
    <div className="flex-1">
      <CustomFormField
        name={`measuredBy.${index}`}
        control={form.control}
        fieldType={formFieldTypes.SELECT}
        label="Unit"
        placeholder="Select unit"
        listdisplay={[
          { id: 1, name: "Litre" },
          { id: 2, name: "Kilogram" },
          { id: 3, name: "Piece" },
          { id: 4, name: "Packet" },
          { id: 5, name: "Dozen" },
          { id: 6, name: "Other" },
        ]}
        inputClassName="h-fit p-2 w-full"
      />
    </div>
    
    <div className="flex-1">
      <CustomFormField
        name={`prices.${index}`}
        control={form.control}
        fieldType={formFieldTypes.INPUT}
        label="Unit Price (ETB)"
        placeholder="0.00"
        type="number"
        inputClassName="h-fit p-2 w-full"
      />
    </div>
    
    <div className="flex-1">
      <CustomFormField
        name={`requiredAmount.${index}`}
        control={form.control}
        fieldType={formFieldTypes.INPUT}
        label="Quantity"
        placeholder="eg: 5"
        type="number"
        inputClassName="h-fit p-2 w-full"
      />
    </div>
    
    <div className="flex items-end h-12">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => removeItem(index)}
        className="cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export default function CashoutForm() {
  const form = useForm<z.infer<typeof cashoutSchema>>({
    resolver: zodResolver(cashoutSchema) as any,
    defaultValues: {
      prices: [],
      items: [],
      measuredBy: [],
      requiredAmount: [],
      HotelName: localStorage.getItem("hotel_name") || "",
    },
  });

  const items = form.watch("items");
  const prices = form.watch("prices");
  const measuredBy = form.watch("measuredBy");
  const requiredAmount = form.watch("requiredAmount");

  const addNewItem = () => {
    form.setValue("items", [...items, ""]);
    form.setValue("measuredBy", [...measuredBy, ""]);
    form.setValue("prices", [...prices, 0]);
    form.setValue("requiredAmount", [...requiredAmount, 0]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    const newMeasuredBy = measuredBy.filter((_, i) => i !== index);
    const newPrices = prices.filter((_, i) => i !== index);
    const newRequiredAmount = requiredAmount.filter((_, i) => i !== index);
    
    form.setValue("items", newItems);
    form.setValue("measuredBy", newMeasuredBy);
    form.setValue("prices", newPrices);
    form.setValue("requiredAmount", newRequiredAmount);
  };

  const calculateItemTotal = (index: number) => {
    const price = prices[index] || 0;
    const amount = requiredAmount[index] || 0;
    return (price * amount).toFixed(2);
  };

  const calculateGrandTotal = () => {
    let total = 0;
    const minLength = Math.min(prices.length, requiredAmount.length);
    for (let i = 0; i < minLength; i++) {
      const price = prices[i] || 0;
      const amount = requiredAmount[i] || 0;
      total += price * amount;
    }
    return total.toFixed(2);
  };

  const onSubmit = async (values: z.infer<typeof cashoutSchema>) => {
    try {
      const totalCalc = parseFloat(calculateGrandTotal());
      const payload = {
        ...values,
        totalCalc,
      };
      await CreateCashout(payload);
      toast.success("Cashout created successfully!");
      form.reset();
    } catch (error:any) {
      toast.error(`Failed to create cashout: ${error}`);
      console.error(error.message);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 w-full max-w-7xl mx-auto p-4">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Create Cashout</CardTitle>
          <CardDescription className="text-sm">
            Add items with their details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="flex flex-col gap-5"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              {/* Header Row for Item Columns */}
              <div className="hidden sm:grid sm:grid-cols-5 gap-3 mb-2 p-3">
                <div className="font-semibold">Item Name</div>
                <div className="font-semibold">Unit</div>
                <div className="font-semibold">Unit Price (ETB)</div>
                <div className="font-semibold">Quantity</div>
                <div className="font-semibold">Action</div>
              </div>

              {/* Dynamic Items */}
              {items.map((_, index) => (
                <CashoutItem
                  key={index}
                  index={index}
                  form={form}
                  removeItem={removeItem}
                />
              ))}

              {/* Add Item Button */}
              <Button
                type="button"
                variant="outline"
                onClick={addNewItem}
                className="cursor-pointer border-dashed border-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Item
              </Button>

              <Button
                type="submit"
                className="cursor-pointer bg-green-500 hover:bg-green-600 w-full sm:w-auto sm:self-center mt-5"
                disabled={form.formState.isSubmitting || items.length === 0}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Processing...
                  </>
                ) : (
                  "Submit Cashout"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="flex-1 max-w-md">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Cashout Summary</CardTitle>
          <CardDescription className="text-sm">
            Review your cashout details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Itemized List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-500 mb-2">Item Details:</h3>
              {items.length === 0 ? (
                <p className="text-gray-500 text-sm">No items added yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2 border-b"
                    >
                      <div className="flex-1">
                        <span className="font-medium">{item || "Unnamed Item"}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          ({requiredAmount[index] || 0} {measuredBy[index] || "units"})
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                        <span className="text-gray-600">
                          {(prices[index] || 0).toFixed(2)} × {requiredAmount[index] || 0} ETB
                        </span>
                        <span className="font-semibold">
                          = {calculateItemTotal(index)} ETB
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">Number of Items:</span>
                <span>{items.length}</span>
              </div>
              
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Grand Total:</span>
                <span className="text-green-600">{calculateGrandTotal()} ETB</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <h4 className="font-semibold text-blue-700 mb-1">Hotel Information</h4>
              <p className="text-sm text-gray-700">
                Hotel: <span className="font-medium">{form.getValues("HotelName")}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Cashout will be recorded under this hotel
              </p>
            </div>

            {/* Validation Status */}
            {items.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-md">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-green-700">
                    Ready to submit {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}