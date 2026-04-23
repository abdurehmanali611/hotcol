/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Phone, Briefcase, Save, Loader2 } from "lucide-react";

export default function UpdateWaiter({ waiter, hotelName, onUpdate }: any) {
  const [formData, setFormData] = useState({
    name: waiter.name,
    age: waiter.age.toString(),
    sex: waiter.sex,
    experience: waiter.experience.toString(),
    phoneNumber: waiter.phoneNumber,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async () => {
    setIsUpdating(true);
    try {
      await onUpdate({
        ...formData,
        age: parseInt(formData.age),
        experience: parseInt(formData.experience),
        HotelName: hotelName,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/> Full Name</Label>
        <Input 
          value={formData.name} 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Age</Label>
          <Input 
            type="number" 
            value={formData.age} 
            onChange={(e) => setFormData({ ...formData, age: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label>Sex</Label>
          <Select value={formData.sex} onValueChange={(v) => setFormData({ ...formData, sex: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground"/> Experience (Yrs)</Label>
          <Input 
            type="number" 
            value={formData.experience} 
            onChange={(e) => setFormData({ ...formData, experience: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/> Phone</Label>
          <Input 
            value={formData.phoneNumber} 
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} 
          />
        </div>
      </div>

      <Button className="w-full gap-2" onClick={handleSubmit} disabled={isUpdating}>
        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {isUpdating ? "Updating Staff..." : "Save Staff Details"}
      </Button>
    </div>
  );
}