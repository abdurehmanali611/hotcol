/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  creditLevel,
  DeleteCreditRegistration,
  fetchCreditLevels,
  UpdateCreditRegistration,
} from "@/lib/actions";
import { formatCreditCycle } from "@/lib/creditCycleLabel";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { creditRegistrationSchemaUpdate } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, ImageIcon, Trash, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import Image from "next/image";
import { Form } from "@/components/ui/form";

export type Credittors = {
  id: number;
  name: string;
  imageUrl: string;
  sex: string;
  creditLevel: string;
  phoneNumber: string;
  amount: number;
  timeInterval: number;
  timeFrame: string;
  paidAmount: number;
  registrationDate: Date;
  HotelName: string;
};

// Separate component for edit form
function EditForm({
  customer,
  onSuccess,
}: {
  customer: Credittors;
  onSuccess: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    customer.imageUrl,
  );
  const [loading, setLoading] = useState(false);
  const [creditLevels, setCreditLevels] = useState<creditLevel[]>([]);
  const registrationDate =
    customer.registrationDate instanceof Date
      ? customer.registrationDate
      : new Date(customer.registrationDate);

  const form = useForm<z.infer<typeof creditRegistrationSchemaUpdate>>({
    resolver: zodResolver(creditRegistrationSchemaUpdate),
    defaultValues: {
      id: customer.id,
      name: customer.name,
      imageUrl: customer.imageUrl,
      sex: customer.sex as any,
      creditLevel: customer.creditLevel as any,
      phoneNumber: customer.phoneNumber,
      registrationDate,
      paidAmount: customer.paidAmount,
      HotelName: customer.HotelName,
    },
  });

  useEffect(() => {
    fetchCreditLevels()
      .then((response) => {
        if (Array.isArray(response)) {
          const hotelCredits = response.filter(
            (item) => rowHotelMatchesTenantScope(item.HotelName, customer.HotelName),
          );
          setCreditLevels(hotelCredits);
        }
      })
      .catch(console.error);
  }, [customer.HotelName]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_NAME || "",
      );

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );
      const data = await response.json();
      form.setValue("imageUrl", data.secure_url);
      setPreviewUrl(data.secure_url);
      toast.success("Image updated");
    } catch {
      toast.error("Upload failed");
    }
  };

  const onSubmit = async (
    values: z.infer<typeof creditRegistrationSchemaUpdate>,
  ) => {
    try {
      setLoading(true);
      const levelData = creditLevels.find(
        (item) => item.level === values.creditLevel,
      );
      const previousLevelData = creditLevels.find(
        (item) => item.level === customer.creditLevel,
      );
      const usedCredit = Math.max(
        (previousLevelData?.requiredAmount ?? customer.amount) - customer.amount,
        0,
      );
      const updatedAmount =
        values.creditLevel === customer.creditLevel
          ? customer.amount
          : Math.max((levelData?.requiredAmount ?? 0) - usedCredit, 0);

      const payload = {
        ...values,
        amount: updatedAmount,
        timeInterval: levelData?.timeInterval ?? 0,
        timeFrame: levelData?.timeFrame ?? "",
        id: customer.id,
        registrationDate,
      };
      await UpdateCreditRegistration(payload);
      toast.success("Updated successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = (errors: Record<string, { message?: string }>) => {
    const firstError = Object.values(errors)[0];
    toast.error(firstError?.message || "Please fix the form and try again");
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          className="space-y-4 flex flex-col items-center"
        >
          <div className="grid grid-cols-2 gap-4 items-center">
            <CustomFormField
              name="name"
              control={form.control}
              fieldType={formFieldTypes.INPUT}
              label="Name"
              inputClassName="h-fit p-2 w-56"
            />
            <CustomFormField
              name="phoneNumber"
              control={form.control}
              fieldType={formFieldTypes.PHONE_INPUT}
              label="Phone"
              inputClassName="h-fit p-2 w-59"
            />
          </div>

          <CustomFormField
            name="sex"
            control={form.control}
            fieldType={formFieldTypes.RADIO_BUTTON}
            label="Gender"
            listdisplay={["Male", "Female"]}
          />
          <div className="flex items-center gap-6">
            <CustomFormField
              name="creditLevel"
              control={form.control}
              fieldType={formFieldTypes.SELECT}
              label="Tier"
              listdisplay={creditLevels.map((l) => ({
                id: l.id,
                name: l.level,
              }))}
              inputClassName="h-fit p-2 w-56"
            />
            
            <CustomFormField
              name="paidAmount"
              control={form.control}
              fieldType={formFieldTypes.INPUT}
              label="Paid Amount"
              type="number"
              inputClassName="h-fit p-2 w-56"
            />
          </div>
          <div className="relative h-40 w-40 rounded-md border overflow-hidden group">
            {previewUrl && (
              <Image
                src={previewUrl}
                alt="Profile"
                fill
                className="object-cover"
              />
            )}
            <div
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
              onClick={() =>
                document.getElementById(`upload-${customer.id}`)?.click()
              }
            >
              <ImageIcon className="text-white h-5 w-5" />
            </div>
            <input
              id={`upload-${customer.id}`}
              type="file"
              className="hidden"
              onChange={handleImageUpload}
              accept="image/*"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Form>
    </FormProvider>
  );
}

export const columns = (refresh: () => void): ColumnDef<Credittors>[] => [
  {
    accessorKey: "name",
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 border">
          <AvatarImage src={row.original.imageUrl} alt={row.original.name} />
          <AvatarFallback className="bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-medium text-sm leading-none">
            {row.original.name}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
            {row.original.sex}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "creditLevel",
    header: "Tier",
    cell: ({ row }) => {
      const level = row.original.creditLevel;
      const variants: Record<string, string> = {
        Gold: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        Silver: "bg-slate-400/10 text-slate-600 border-slate-400/20",
        Bronze: "bg-orange-700/10 text-orange-700 border-orange-700/20",
      };
      return (
        <Badge
          variant="outline"
          className={`${variants[level] || ""} font-bold px-2 py-0.5`}
        >
          {level}
        </Badge>
      );
    },
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone",
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.phoneNumber}</span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Credit Info",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-sm font-semibold">
          {row.original.amount.toLocaleString()} ETB
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatCreditCycle(row.original.timeInterval, row.original.timeFrame)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "paidAmount",
    header: "Payment Status",
    cell: ({ row }) => {
      const percentage = Math.min(
        (row.original.paidAmount / row.original.amount) * 100,
        100,
      );
      return (
        <div className="w-30 space-y-1.5">
          <div className="flex justify-between text-[10px] font-medium">
            <span>{row.original.paidAmount} ETB</span>
            <span className={percentage === 100 ? "text-green-600" : ""}>
              {Math.round(percentage)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${percentage === 100 ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "registrationDate",
    header: "Registered",
    cell: ({ row }) => {
      const date = new Date(row.original.registrationDate);
      return (
        <div className="text-xs text-muted-foreground">
          {date.toLocaleDateString()}
        </div>
      );
    },
  },
  {
    id: "Action",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const [open, setOpen] = useState(false);

      const handleDelete = async () => {
        try {
          await DeleteCreditRegistration(row.original.id);
          toast.success(`${row.original.name} Deleted`);
          refresh();
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      const handleSuccess = () => {
        setOpen(false);
        refresh();
      };

      return (
        <div className="flex items-center justify-end gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-145">
                    <DialogHeader>
                      <DialogTitle>Edit Customer Details</DialogTitle>
                      <DialogDescription>
                        Make changes to {row.original.name}&apos;s profile.
                      </DialogDescription>
                    </DialogHeader>
                    <EditForm
                      customer={row.original}
                      onSuccess={handleSuccess}
                    />
                  </DialogContent>
                </Dialog>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure? This will permanently remove {row.original.name}{" "}
                  from the system.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex justify-end gap-3 mt-4">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];
