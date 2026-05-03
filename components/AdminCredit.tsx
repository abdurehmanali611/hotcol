/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { creditLevelSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Form } from "./ui/form";
import CustomFormField, { formFieldTypes } from "./customFormField";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import {
  CreateCreditLevel,
  creditLevel,
  CreditRegistration,
  DeleteCreditLevel,
  fetchCreditLevels,
  fetchCreditRegistrations,
  UpdateCreditLevel,
} from "@/lib/actions";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";
import { toast } from "sonner";
import { Edit, Trash, Plus, CreditCard, Clock, Coins } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import Credittor from "@/app/Credittor/page";
import { Separator } from "./ui/separator";

interface AdminCreditProps {
  hotelName: string;
}

const AdminCredit = ({ hotelName }: AdminCreditProps) => {
  const [loading, setLoading] = useState(false);
  const [creditLevels, setCreditLevels] = useState<creditLevel[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [persons, setPersons] = useState<CreditRegistration[]>([]);

  const form = useForm<z.infer<typeof creditLevelSchema>>({
    resolver: zodResolver(creditLevelSchema),
    defaultValues: {
      level: "Bronze",
      requiredAmount: 0,
      timeFrame: "Daily",
      timeInterval: 0,
      HotelName: hotelName,
    },
  });

  useEffect(() => {
    fetchCreditLevelsData();
    fetchingPersons();
  }, [hotelName]);

  const fetchingPersons = async () => {
    try {
      const data = await fetchCreditRegistrations();
      if (Array.isArray(data)) {
        const HotelItems = data.filter((item) => rowHotelMatchesTenantScope(item.HotelName, hotelName));
        setPersons(HotelItems);
      } else {
        setPersons([]);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  const fetchCreditLevelsData = async () => {
    setIsFetching(true);
    try {
      const data = await fetchCreditLevels();
      if (Array.isArray(data)) {
        const hotelCreditLevels = data.filter(
          (item) => rowHotelMatchesTenantScope(item.HotelName, hotelName)
        );
        setCreditLevels(hotelCreditLevels);
      } else {
        setCreditLevels([]);
      }
    } catch {
      toast.error("Error fetching credit levels");
      setCreditLevels([]);
    } finally {
      setIsFetching(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof creditLevelSchema>) => {
    try {
      setLoading(true);
      if (!editingId) {
        const levelExists = creditLevels.some((level) => level.level === values.level);
        if (levelExists) {
          toast.error("This credit level already exists");
          return;
        }
      }

      if (editingId) {
        await UpdateCreditLevel({ ...values, id: editingId });
        toast.success("Credit level updated successfully");
        setEditingId(null);
      } else {
        await CreateCreditLevel(values);
        toast.success("Credit level created successfully");
      }

      await fetchCreditLevelsData();
      form.reset({
        level: "Bronze",
        requiredAmount: 0,
        timeFrame: "Daily",
        timeInterval: 0,
        HotelName: hotelName,
      });
    } catch {
      toast.error("An error occurred during submission.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (creditLevel: creditLevel) => {
    setEditingId(creditLevel.id);
    form.reset({
      level: creditLevel.level as "Bronze" | "Silver" | "Gold",
      requiredAmount: creditLevel.requiredAmount,
      timeFrame: creditLevel.timeFrame as "Daily" | "Weekly" | "Monthly",
      timeInterval: creditLevel.timeInterval,
      HotelName: creditLevel.HotelName,
    });
  };

  const handleDelete = async (id: number, levelName: string) => {
    try {
      await DeleteCreditLevel(id);
      toast.success(`${levelName} deleted`);
      await fetchCreditLevelsData();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    form.reset({
      level: "Bronze",
      requiredAmount: 0,
      timeFrame: "Daily",
      timeInterval: 0,
      HotelName: hotelName,
    });
  };

  // Helper for color coding levels
  const getLevelColor = (level: string) => {
    switch (level) {
      case "Gold": return "text-amber-500 border-amber-500/20 bg-amber-500/5";
      case "Silver": return "text-slate-400 border-slate-400/20 bg-slate-400/5";
      case "Bronze": return "text-orange-700 border-orange-700/20 bg-orange-700/5";
      default: return "text-primary";
    }
  };

  return (
    <div className="space-y-8 p-1">
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Credit Management</CardTitle>
              <CardDescription>Configure customer credit tiers and requirements</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8">
          <div className="bg-muted/30 p-6 rounded-xl border border-border/50 max-w-4xl mx-auto w-fit">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {editingId ? "Modify Tier" : "New Tier Configuration"}
            </h2>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <CustomFormField
                    name="level"
                    control={form.control}
                    fieldType={formFieldTypes.SELECT}
                    label="Tier Level"
                    listdisplay={[{ id: 1, name: "Gold" }, { id: 2, name: "Silver" }, { id: 3, name: "Bronze" }]}
                    inputClassName="h-fit p-2 w-56"
                  />
                  <CustomFormField
                    name="requiredAmount"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Required Amount (ETB)"
                    type="number"
                    inputClassName="h-fit p-2 w-56"
                  />
                  <CustomFormField
                    name="timeInterval"
                    control={form.control}
                    fieldType={formFieldTypes.INPUT}
                    label="Time Interval"
                    type="number"
                    inputClassName="h-fit p-2 w-56"
                  />
                  <CustomFormField
                    name="timeFrame"
                    control={form.control}
                    fieldType={formFieldTypes.SELECT}
                    label="Time Frame"
                    listdisplay={[{ id: 1, name: "Daily" }, { id: 2, name: "Weekly" }, { id: 3, name: "Monthly" }]}
                    inputClassName="h-fit p-2 w-56"
                  />
                </div>

                <div className="flex flex-row-reverse gap-3 pt-2 justify-center">
                  <Button
                    type="submit"
                    className="flex-1 md:flex-none md:w-48 font-medium shadow-sm transition-all active:scale-95"
                    disabled={loading}
                  >
                    {loading ? "Processing..." : editingId ? "Save Changes" : "Create Level"}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="flex-1 md:flex-none md:w-40"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>

          <Separator className="opacity-50" />

          {/* Display Grid */}
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold">Active Credit Tiers</h3>
              <p className="text-sm text-muted-foreground">Current levels available for {hotelName}</p>
            </div>

            {isFetching ? (
              <div className="flex justify-center py-12">
                <div className="animate-pulse text-muted-foreground">Syncing tiers...</div>
              </div>
            ) : creditLevels.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/20">
                <p className="text-muted-foreground">No credit tiers defined yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {creditLevels.map((level) => (
                  <Card
                    key={level.id}
                    className={`group relative overflow-hidden transition-all duration-300 hover:shadow-md border-l-4 ${getLevelColor(level.level).split(' ')[1]}`}
                  >
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-background"
                        onClick={() => handleEdit(level)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {level.level} Tier?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the credit requirements for this level. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex justify-end gap-3 pt-4">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              onClick={() => handleDelete(level.id, level.level)}
                            >
                              Confirm Delete
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    <CardContent className="pt-8">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mb-4 border ${getLevelColor(level.level)}`}>
                        {level.level.toUpperCase()}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Coins className="w-4 h-4" />
                            Requirement
                          </div>
                          <span className="font-bold text-lg">{level.requiredAmount.toLocaleString()} <small className="text-[10px] text-muted-foreground">ETB</small></span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Clock className="w-4 h-4" />
                            Cycle
                          </div>
                          <span className="font-medium">{level.timeInterval} {level.timeFrame}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-12">
        <Credittor credittor={persons}/>
      </div>
    </div>
  );
};

export default AdminCredit;