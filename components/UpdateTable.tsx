/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UpdateTable({ table, hotelName, onUpdate }: any) {
  const [formData, setFormData] = useState({
    tableNo: table.tableNo.toString(),
    capacity: table.capacity.toString(),
  });

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Table Number</Label>
          <Input 
            type="number" 
            value={formData.tableNo} 
            onChange={(e) => setFormData({ ...formData, tableNo: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label>Capacity (Seats)</Label>
          <Input 
            type="number" 
            value={formData.capacity} 
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} 
          />
        </div>
      </div>
      <Button 
        className="w-full" 
        onClick={() => onUpdate({ ...formData, HotelName: hotelName })}
      >
        Save Table Changes
      </Button>
    </div>
  );
}