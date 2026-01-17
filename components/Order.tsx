/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Item } from "@/lib/actions";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Utensils,
  Coffee,
  ArrowRight,
  ShoppingBag,
  Plus,
  Minus,
} from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import BatchOrderModal from "./BatchOrderModal";

interface OrderProps {
  items: Item[];
  hotelName: string;
  onItemSelect: (item: Item) => void;
  onGoToPayment: () => void;
  onBatchOrderSuccess?: () => void;
}

export default function OrderComponent({
  items,
  hotelName,
  onItemSelect,
  onGoToPayment,
  onBatchOrderSuccess,
}: OrderProps) {
  const [searchedText, setSearchedText] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>(
    {}
  );

  const Types = items.map((item) => item.type);
  const uniqueTypes = [...new Set(Types)];

  const foodItems = items.filter((item) => {
    const searchFilter =
      !searchedText ||
      item.name.toLowerCase().includes(searchedText.toLowerCase());
    const typeFilter = selectedType === "All" || item.type === selectedType;
    if (!typeFilter) return false;
    if (!searchFilter) return false;
    return (
      item.HotelName === hotelName && item.category.toLowerCase() === "food"
    );
  });

  const beverageItems = items.filter((item) => {
    const searchFilter =
      !searchedText ||
      item.name.toLowerCase().includes(searchedText.toLowerCase());
    const typeFilter = selectedType === "All" || item.type === selectedType;
    if (!typeFilter) return false;
    if (!searchFilter) return false;
    return (
      item.HotelName === hotelName && item.category.toLowerCase() === "beverage"
    );
  });

  const othersItems = items.filter((item) => {
    const searchFilter =
      !searchedText ||
      item.name.toLowerCase().includes(searchedText.toLowerCase());
    const typeFilter = selectedType === "All" || item.type === selectedType;
    if (!typeFilter) return false;
    if (!searchFilter) return false;
    return (
      item.HotelName === hotelName && item.category.toLowerCase() === "others"
    );
  });

  const handleItemCheck = (item: Item, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => {
        const newItems = [...prev, item];
        if (!itemQuantities[item.id]) {
          setItemQuantities((prev) => ({ ...prev, [item.id]: 1 }));
        }
        return newItems;
      });
    } else {
      setSelectedItems((prev) => {
        const newItems = prev.filter((i) => i.id !== item.id);
        const newQuantities = { ...itemQuantities };
        delete newQuantities[item.id];
        setItemQuantities(newQuantities);
        return newItems;
      });
    }
  };

  const updateItemQuantity = (itemId: number, amount: number) => {
    setItemQuantities((prev) => {
      const current = prev[itemId] || 1;
      const newQuantity = Math.max(1, current + amount);
      return { ...prev, [itemId]: newQuantity };
    });
  };

  const handleBatchOrder = () => {
    if (selectedItems.length > 0) {
      const itemsWithQuantities = selectedItems.map((item) => ({
        ...item,
        orderAmount: itemQuantities[item.id] || 1,
      }));


      setShowBatchModal(true);
    }
  };

  const handleBatchOrderClose = () => {
    setShowBatchModal(false);
  };

  const handleBatchOrderSuccess = () => {
    setSelectedItems([]);
    setItemQuantities({});
    setShowBatchModal(false);

    if (onBatchOrderSuccess) {
      onBatchOrderSuccess();
    }
  };

  const totalSelectedQuantity = selectedItems.reduce(
    (sum, item) => sum + (itemQuantities[item.id] || 1),
    0
  );

  const totalSelectedAmount = selectedItems.reduce(
    (sum, item) => sum + item.price * (itemQuantities[item.id] || 1),
    0
  );

  return (
    <div className="space-y-8 p-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">New Order</h2>
          <p className="text-sm text-muted-foreground">
            Select items to add to the ticket
          </p>
        </div>
        <div className="flex items-center gap-5">
          <Input
            placeholder="search name..."
            type="text"
            className="h-fit p-2 w-72"
            value={searchedText}
            onChange={(e) => setSearchedText(e.target.value)}
          />
          <Select
            value={selectedType}
            onValueChange={(value) => setSelectedType(value)}
          >
            <SelectTrigger className="w-42 cursor-pointer">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>select type: </SelectLabel>
                <SelectItem value="All">All</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-8 px-3">
                {selectedItems.length} items
              </Badge>
              <Button
                onClick={handleBatchOrder}
                variant="default"
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <ShoppingBag size={16} />
                Order Now
              </Button>
            </div>
          )}
          <Button onClick={onGoToPayment} variant="secondary" className="gap-2">
            View Pending <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ShoppingBag className="text-primary" size={20} />
              <div>
                <p className="font-semibold">
                  {selectedItems.length} item
                  {selectedItems.length > 1 ? "s" : ""} selected •{" "}
                  {totalSelectedQuantity} unit
                  {totalSelectedQuantity > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  Click &qout;Order Now&qout; to proceed with batch ordering
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Total Amount</p>
              <p className="text-xl font-bold text-primary">
                {totalSelectedAmount.toFixed(2)} ETB
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <Section
          title="Kitchen"
          icon={Utensils}
          data={foodItems}
          selectedItems={selectedItems}
          itemQuantities={itemQuantities}
          onItemCheck={handleItemCheck}
          onItemSelect={onItemSelect}
          onUpdateQuantity={updateItemQuantity}
        />
        <Section
          title="Bar"
          icon={Coffee}
          data={beverageItems}
          selectedItems={selectedItems}
          itemQuantities={itemQuantities}
          onItemCheck={handleItemCheck}
          onItemSelect={onItemSelect}
          onUpdateQuantity={updateItemQuantity}
        />
        <Section
          title="Others"
          icon={Utensils}
          data={othersItems}
          selectedItems={selectedItems}
          itemQuantities={itemQuantities}
          onItemCheck={handleItemCheck}
          onItemSelect={onItemSelect}
          onUpdateQuantity={updateItemQuantity}
        />
      </div>

      {items.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <ShoppingCart
            size={48}
            className="mx-auto text-muted-foreground/20 mb-4"
          />
          <h3 className="text-lg font-medium">No items found</h3>
          <p className="text-muted-foreground">
            Add items in the admin dashboard to get started.
          </p>
        </div>
      )}

      <BatchOrderModal
        items={selectedItems.map((item) => ({
          ...item,
          orderAmount: itemQuantities[item.id] || 1,
        }))}
        isOpen={showBatchModal}
        onClose={handleBatchOrderClose}
        hotelName={hotelName}
        onSubmitSuccess={handleBatchOrderSuccess}
      />
    </div>
  );
}

const Section = ({
  title,
  icon: Icon,
  data,
  selectedItems,
  itemQuantities,
  onItemCheck,
  onItemSelect,
  onUpdateQuantity,
}: {
  title: string;
  icon: any;
  data: Item[];
  selectedItems: Item[];
  itemQuantities: Record<number, number>;
  onItemCheck: (item: Item, checked: boolean) => void;
  onItemSelect: (item: Item) => void;
  onUpdateQuantity: (itemId: number, amount: number) => void;
}) => {
  const getIsSelected = (item: Item) => {
    return selectedItems.some((i) => i.id === item.id);
  };

  const getQuantity = (item: Item) => {
    return itemQuantities[item.id] || 1;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-2">
        <Icon size={20} className="text-primary" />
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {data.length}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {data.map((item) => {
          const isSelected = getIsSelected(item);
          const quantity = getQuantity(item);
          const totalPrice = item.price * quantity;

          return (
            <Card
              key={item.id}
              className={`group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md ${
                isSelected ? "border-2 border-primary" : ""
              }`}
            >
              <CardContent
                className="p-3 overflow-hidden rounded-t-xl cursor-pointer"
                onClick={() => onItemSelect(item)}
              >
                <div className="aspect-video relative">
                  <Image
                    src={item.imageUrl || "/placeholder-food.jpg"}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </CardContent>
              <CardFooter className="p-3 flex flex-col gap-3">
                <div
                  className="flex flex-col gap-1 items-center cursor-pointer"
                  onClick={() => onItemSelect(item)}
                >
                  <p className="font-semibold text-sm truncate w-full text-center">
                    {item.name}
                  </p>
                  <p className="text-primary font-bold text-sm">
                    {item.price.toFixed(2)} ETB
                  </p>
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {item.type}
                  </Badge>
                </div>

                <div className="flex flex-col gap-3 w-full">
                  {isSelected && (
                    <div className="flex items-center justify-between bg-primary/5 p-2 rounded-md">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateQuantity(item.id, -1);
                          }}
                        >
                          <Minus size={14} />
                        </Button>
                        <span className="font-medium w-8 text-center">
                          {quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateQuantity(item.id, 1);
                          }}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <span className="font-bold text-sm">
                        {totalPrice.toFixed(2)} ETB
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          onItemCheck(item, checked as boolean)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm">Select</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemSelect(item);
                      }}
                    >
                      Quick Order
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
