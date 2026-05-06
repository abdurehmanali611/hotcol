/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Form } from "./ui/form";
import { Button } from "./ui/button";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { creditRegistrationSchema } from "@/lib/validations";
import {
  CreateCreditRegistration,
  creditLevel,
  CreditRegistration,
  Item,
  fetchItems,
  fetchCreditLevels,
  fetchCreditRegistrations,
  uploadImage,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Image from "next/image";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";
import Credittor from "@/app/Credittor/page";
import { formatCreditCycle } from "@/lib/creditCycleLabel";

interface CreditRegistrationProps {
  hotelName: string;
  businessDisplayName?: string;
}

const CreditRegistrationForm = ({
  hotelName,
  businessDisplayName,
}: CreditRegistrationProps) => {
  const businessNameLabel = (businessDisplayName || "").trim() || "Cafe";
  const [loading, setLoading] = useState(false);
  const [creditLevels, setCreditLevels] = useState<creditLevel[]>([]);
  const agreementRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [creditRegistrant, setCreditRegistrant] = useState<
    CreditRegistration[]
  >([]);
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});

  const form = useForm<z.infer<typeof creditRegistrationSchema>>({
    resolver: zodResolver(creditRegistrationSchema),
    defaultValues: {
      name: "",
      imageUrl: "",
      phoneNumber: "",
      sex: "Male",
      creditLevel: "Bronze",
      registrationDate: new Date(),
      paidAmount: 0,
      HotelName:
        (typeof window !== "undefined" &&
          localStorage.getItem("hotel_name")) ||
        hotelName,
    },
  });

  useEffect(() => {
    const fetchingCreditLevel = async () => {
      try {
        const data = await fetchCreditLevels();
        if (Array.isArray(data)) {
          const filtered = data.filter((item: creditLevel) =>
            rowHotelMatchesTenantScope(item.HotelName, hotelName),
          );
          setCreditLevels(filtered);
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to fetch credit levels");
      }
    };
    const fetchingRegistrant = async () => {
      try {
        const response = await fetchCreditRegistrations();
        if (Array.isArray(response)) {
          const hotelReg = response.filter((item) =>
            rowHotelMatchesTenantScope(item.HotelName, hotelName),
          );
          setCreditRegistrant(hotelReg);
        } else {
          setCreditRegistrant([]);
        }
      } catch (error: any) {
        toast.error(error.message);
        throw error;
      }
    };
    const fetchingMenuItems = async () => {
      try {
        const rows = await fetchItems();
        if (Array.isArray(rows)) {
          const filtered = rows.filter((it: Item) =>
            rowHotelMatchesTenantScope(it.HotelName, hotelName),
          );
          setMenuItems(filtered);
        } else {
          setMenuItems([]);
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to fetch items");
      }
    };
    fetchingCreditLevel();
    fetchingRegistrant();
    fetchingMenuItems();
  }, [hotelName]);

  const watchedValues = form.watch();
  const selectedItemNames = useMemo(
    () =>
      menuItems
        .filter((it) => selectedItems[it.id])
        .map((it) => it.name),
    [menuItems, selectedItems],
  );

  const selectedLevelDetails = useMemo(() => {
    return creditLevels.find(
      (item) => item.level === watchedValues.creditLevel,
    );
  }, [creditLevels, watchedValues.creditLevel]);

  const handlePrint = useReactToPrint({
    contentRef: agreementRef,
    documentTitle: `Credit_Agreement_${form.getValues("name")}`,
  });

  const handleDownloadPDF = async () => {
    const element = agreementRef.current;
    if (!element) return;

    try {
      setLoading(true);

      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#18181b",
      });

      const pdf = new jsPDF("p", "mm", "a4");

      const img = new window.Image();
      img.src = dataUrl;

      img.onload = () => {
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (img.height * pdfWidth) / img.width;

        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Agreement_${form.getValues("name") || "User"}.pdf`);
      };

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error(`Failed to generate PDF ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof creditRegistrationSchema>) => {
    if (!selectedLevelDetails)
      return toast.error("Please select a valid credit level");

    try {
      setLoading(true);
      if (!selectedLevelDetails?.level) {
        toast.error("No Credit Level Created: Please Announce the Admin");
      } else if (values.creditLevel !== selectedLevelDetails.level) {
        toast.error(
          `${values.creditLevel} is not Created yet: Please Announce the Admin`,
        );
      } else {
        const payload = {
          ...values,
          amount: selectedLevelDetails.requiredAmount,
          timeInterval: selectedLevelDetails.timeInterval,
          timeFrame: selectedLevelDetails.timeFrame,
        };
        await CreateCreditRegistration(payload);
        toast.success("Credit registration successful");
      }
    } catch (error: any) {
      toast.error(error?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">
          Credit Registration
        </CardTitle>
        <CardDescription>
          Managing credit users for{" "}
          <span className="font-semibold text-primary">{businessNameLabel}</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border h-fit">
            <h2 className="text-xl font-semibold mb-6 border-b pb-2">
              User Information
            </h2>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomFormField
                    name="name"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Customer Name"
                    placeholder="e.g. John Doe"
                    inputClassName="h-fit p-2 w-56"
                  />
                  <CustomFormField
                    name="phoneNumber"
                    control={form.control}
                    fieldType={formFieldTypes.PHONE_INPUT}
                    label="Phone Number"
                    formItemClassName="items-center w-56"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomFormField
                    name="sex"
                    control={form.control}
                    fieldType={formFieldTypes.RADIO_BUTTON}
                    label="Gender"
                    listdisplay={["Male", "Female"]}
                    inputClassName="h-fit p-2 w-56"
                  />
                  <CustomFormField
                    name="creditLevel"
                    control={form.control}
                    fieldType={formFieldTypes.SELECT}
                    label="Credit Level"
                    listdisplay={[
                      { id: 1, name: "Bronze" },
                      { id: 2, name: "Silver" },
                      { id: 3, name: "Gold" },
                    ]}
                    inputClassName="h-fit p-2 w-56"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomFormField
                    name="registrationDate"
                    control={form.control}
                    fieldType={formFieldTypes.CALENDAR}
                    label="Registration Date"
                    inputClassName="mx-1 h-fit p-2 w-40"
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
                <CustomFormField
                  name="imageUrl"
                  control={form.control}
                  fieldType={formFieldTypes.IMAGE_UPLOADER}
                  label="Customer Image"
                  previewUrl={previewUrl}
                  handleCloudinary={(result) =>
                    uploadImage(result, form, setPreviewUrl, "imageUrl")
                  }
                />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">Select allowed items</h3>
                    <p className="text-xs text-muted-foreground">
                      Same style as hotel cashier: pick dishes/drinks this credit user can take.
                    </p>
                  </div>
                  <ScrollArea className="h-[min(22rem,45vh)] rounded-xl border border-border/70 bg-muted/10">
                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                      {menuItems.map((it) => (
                        <div
                          key={it.id}
                          className={`rounded-xl border bg-card overflow-hidden shadow-sm transition-all ${
                            selectedItems[it.id]
                              ? "ring-2 ring-primary border-primary/35 shadow-md"
                              : "border-border/70 hover:border-primary/25"
                          }`}
                        >
                          <div className="relative aspect-video bg-muted">
                            {it.imageUrl ? (
                              <Image
                                src={it.imageUrl}
                                alt={it.name}
                                fill
                                className="object-cover"
                                sizes="(max-width:640px) 90vw, 45vw"
                              />
                            ) : null}
                            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/50 to-transparent px-2.5 pb-2 pt-6">
                              <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                                {it.name}
                              </p>
                              <p className="mt-1 text-[10px] tabular-nums text-emerald-200">
                                ETB {Number(it.price).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="border-t border-border/60 bg-card/95 p-3">
                            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                              <Checkbox
                                checked={!!selectedItems[it.id]}
                                onCheckedChange={(ck) =>
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [it.id]: ck === true,
                                  }))
                                }
                                className="h-5 w-5 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              Select item
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <Button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  {loading ? "Registering..." : "Register User"}
                </Button>
              </form>
            </Form>
          </div>

          <div
            ref={agreementRef}
            className="lg:col-span-2 flex flex-col gap-4 bg-zinc-900 text-zinc-100 rounded-xl p-6 shadow-2xl border-t-4 border-indigo-500 print:h-[297mm] overflow-auto"
            style={{ height: "297mm" }}
          >
            <div className="h-[148mm] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Avatar>
                  <AvatarImage
                    src={localStorage.getItem("logo_url") || undefined}
                    alt={businessNameLabel}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {businessNameLabel.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center space-y-1 mb-4">
                  <h2 className="text-xl font-serif uppercase tracking-widest">
                    Credit Agreement
                  </h2>
                  <p className="text-xs text-zinc-400 italic">
                    {businessNameLabel} and {watchedValues.name}
                  </p>
                </div>
                <Avatar>
                  <AvatarImage
                    src={watchedValues.imageUrl || undefined}
                    alt={watchedValues.name}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {watchedValues.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-4 text-sm divide-y divide-zinc-800">
                <div className="pt-2 flex justify-between">
                  <span className="text-zinc-400 italic">Customer:</span>
                  <span className="font-medium text-indigo-300">
                    {watchedValues.name || "---"}
                  </span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-zinc-400 italic">Phone:</span>
                  <span>{watchedValues.phoneNumber || "---"}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-zinc-400 italic">Credit Level:</span>
                  <span className="font-bold text-yellow-500">
                    {watchedValues.creditLevel}
                  </span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-zinc-400 italic">Credit Limit:</span>
                  <span className="text-green-400 font-mono">
                    {selectedLevelDetails?.requiredAmount || 0} ETB
                  </span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-zinc-400 italic">Term:</span>
                  <span>
                    {formatCreditCycle(
                      selectedLevelDetails?.timeInterval || 0,
                      selectedLevelDetails?.timeFrame || "",
                    )}
                  </span>
                </div>
                <div className="pt-2 flex justify-between border-b pb-2">
                  <span className="text-zinc-400 italic">Effective Date:</span>
                  <span>
                    {watchedValues.registrationDate
                      ? new Date(watchedValues.registrationDate).toDateString()
                      : "---"}
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-zinc-400 italic block mb-1">Allowed Items:</span>
                  <span className="text-right block">
                    {selectedItemNames.length > 0 ? selectedItemNames.join(", ") : "---"}
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-4 space-y-3">
                <div className="flex justify-between items-center bg-zinc-800 p-3 rounded-lg">
                  <span className="text-xs uppercase">Initial Payment:</span>
                  <span className="text-lg font-bold">
                    {watchedValues.paidAmount} ETB
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-700">
                  <h3 className="text-center text-sm uppercase tracking-wider mb-4 text-zinc-400">
                    Agreement Signatures
                  </h3>

                  <div className="grid grid-cols-2 gap-6 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-full border-b border-zinc-500 h-7"></div>
                      <span className="mt-2 text-zinc-400">
                        Customer Signature
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-full border-b border-zinc-500 h-7"></div>
                      <span className="mt-2 text-zinc-400">
                        {businessNameLabel} Representative
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-dashed"></div>
            <div className="h-[148mm] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Avatar>
                  <AvatarImage
                    src={localStorage.getItem("logo_url") || undefined}
                    alt={businessNameLabel}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {businessNameLabel.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center space-y-1 mb-4">
                  <h2 className="text-xl font-serif uppercase tracking-widest">
                    Credit Agreement
                  </h2>
                  <p className="text-xs text-zinc-400 italic">
                    {businessNameLabel} and {watchedValues.name}
                  </p>
                </div>
                <Avatar>
                  <AvatarImage
                    src={watchedValues.imageUrl || undefined}
                    alt={watchedValues.name}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {watchedValues.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-4 text-sm divide-y divide-zinc-800">
                <div className="pt-2 flex justify-between">
                  <span className="text-zinc-400 italic">Customer:</span>
                  <span className="font-medium text-indigo-300">
                    {watchedValues.name || "---"}
                  </span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-zinc-400 italic">Phone:</span>
                  <span>{watchedValues.phoneNumber || "---"}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-zinc-400 italic">Credit Level:</span>
                  <span className="font-bold text-yellow-500">
                    {watchedValues.creditLevel}
                  </span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-zinc-400 italic">Credit Limit:</span>
                  <span className="text-green-400 font-mono">
                    {selectedLevelDetails?.requiredAmount || 0} ETB
                  </span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-zinc-400 italic">Term:</span>
                  <span>
                    {formatCreditCycle(
                      selectedLevelDetails?.timeInterval || 0,
                      selectedLevelDetails?.timeFrame || "",
                    )}
                  </span>
                </div>
                <div className="pt-2 flex justify-between border-b pb-2">
                  <span className="text-zinc-400 italic">Effective Date:</span>
                  <span>
                    {watchedValues.registrationDate
                      ? new Date(watchedValues.registrationDate).toDateString()
                      : "---"}
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-zinc-400 italic block mb-1">Allowed Items:</span>
                  <span className="text-right block">
                    {selectedItemNames.length > 0 ? selectedItemNames.join(", ") : "---"}
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-4 space-y-3">
                <div className="flex justify-between items-center bg-zinc-800 p-3 rounded-lg">
                  <span className="text-xs uppercase">Initial Payment:</span>
                  <span className="text-lg font-bold">
                    {watchedValues.paidAmount} ETB
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-700">
                  <h3 className="text-center text-sm uppercase tracking-wider mb-4 text-zinc-400">
                    Agreement Signatures
                  </h3>

                  <div className="grid grid-cols-2 gap-6 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-full border-b border-zinc-500 h-7"></div>
                      <span className="mt-2 text-zinc-400">
                        Customer Signature
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-full border-b border-zinc-500 h-7"></div>
                      <span className="mt-2 text-zinc-400">
                        {businessNameLabel} Representative
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 print:hidden">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadPDF()}
                    disabled={!watchedValues.name || !selectedLevelDetails}
                    className="w-full text-xs cursor-pointer"
                  >
                    Download PDF
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePrint()}
                    disabled={!watchedValues.name || !selectedLevelDetails}
                    className="w-full text-xs cursor-pointer"
                  >
                    Print A4
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Credittor credittor={creditRegistrant} />
      </CardContent>
    </Card>
  );
};

export default CreditRegistrationForm;
