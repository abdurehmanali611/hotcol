/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Edit,
  Trash2,
  Utensils,
  GlassWater,
  AlertTriangle,
  Disc,
} from "lucide-react";
import UpdateScreen from "./UpdateScreen";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

export default function UpdateDeleteIntro({
  items,
  onDelete,
  onUpdate,
  hotelName,
}: any) {
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [deletePending, setDeletePending] = useState(false);

  const filteredItems = (cat: string) =>
    items.filter((i: any) => i.category.toLowerCase() === cat.toLowerCase());

  const handleUpdateSuccess = async () => {
    setEditingItem(null);
    if (onUpdate) await onUpdate();
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <Tabs defaultValue="food" className="min-w-0">
        <TabsList className="grid h-10 w-full grid-cols-3 sm:max-w-md">
          <TabsTrigger value="Food" className="gap-1 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <Utensils className="hidden h-4 w-4 sm:inline" /> Food
          </TabsTrigger>
          <TabsTrigger value="beverage" className="gap-1 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <GlassWater className="hidden h-4 w-4 sm:inline" /> Drinks
          </TabsTrigger>
          <TabsTrigger value="Others" className="gap-1 px-1 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <Disc className="hidden h-4 w-4 sm:inline" /> Other
          </TabsTrigger>
        </TabsList>
        {["Food", "Beverage", "Others"].map((cat) => (
          <TabsContent key={cat} value={cat === "Beverage" ? "beverage" : cat}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems(cat).map((item: any) => (
                <Card key={item.id} className="group overflow-hidden border-none shadow-md hover:shadow-lg transition-all">
                  <CardContent className="p-0">
                    <div className="relative aspect-video">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      <div className="absolute top-2 right-2 hidden gap-1 rounded-lg bg-background/90 p-0.5 shadow-md backdrop-blur-sm transition-opacity md:flex md:opacity-0 md:group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => setEditingItem(item)}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => setDeletingItem(item)}
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-sm">{item.name}</p>
                          <p className="text-sm font-semibold text-primary">
                            {item.price.toFixed(2)} ETB
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 capitalize text-[10px]"
                        >
                          {item.type}
                        </Badge>
                      </div>
                      <div className="mt-3 flex gap-2 md:hidden">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 flex-1 gap-1.5"
                          onClick={() => setEditingItem(item)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-9 flex-1 gap-1.5"
                          onClick={() => setDeletingItem(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Menu Item</DialogTitle>
            <DialogDescription>Modify details for {editingItem?.name}</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <UpdateScreen 
              item={editingItem} 
              hotelName={hotelName} 
              onUpdateSuccess={handleUpdateSuccess} 
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeletingItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
          </DialogHeader>
          <div className="flex flex-col items-center text-center p-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-lg font-bold">Remove {deletingItem?.name}?</h3>
            <p className="text-muted-foreground text-sm mt-2">
              This will permanently delete {deletingItem?.name} from your menu.
              This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full mt-6">
              <Button
                variant="outline"
                className="flex-1"
                disabled={deletePending}
                onClick={() => setDeletingItem(null)}
              >
                Cancel
              </Button>
              <PendingButton
                variant="destructive"
                className="flex-1"
                pending={deletePending}
                onClick={async () => {
                  if (!deletingItem) return;
                  setDeletePending(true);
                  try {
                    await onDelete(deletingItem.id);
                    setDeletingItem(null);
                  } finally {
                    setDeletePending(false);
                  }
                }}
              >
                Delete Item
              </PendingButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
