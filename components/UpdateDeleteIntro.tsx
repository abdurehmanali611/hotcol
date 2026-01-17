/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

  const filteredItems = (cat: string) =>
    items.filter((i: any) => i.category.toLowerCase() === cat.toLowerCase());

  const handleUpdateSuccess = async () => {
    setEditingItem(null);
    if (onUpdate) await onUpdate();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="food">
        <TabsList className="grid w-full max-w-100 grid-cols-3">
          <TabsTrigger value="Food" className="gap-2">
            <Utensils className="h-4 w-4" /> Food
          </TabsTrigger>
          <TabsTrigger value="beverage" className="gap-2">
            <GlassWater className="h-4 w-4" /> Beverages
          </TabsTrigger>
          <TabsTrigger value="Others" className="gap-2">
            <Disc className="h-4 w-4" /> Others
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
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="secondary" className="h-8 w-8 shadow-md" onClick={() => setEditingItem(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-8 w-8 shadow-md" onClick={() => setDeletingItem(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">{item.name}</p>
                        <p className="text-primary font-semibold text-sm">{item.price.toFixed(2)} ETB</p>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">{item.type}</Badge>
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

      <Dialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
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
                onClick={() => setDeletingItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  onDelete(deletingItem.id);
                  setDeletingItem(null);
                }}
              >
                Delete Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
