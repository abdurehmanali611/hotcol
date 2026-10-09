"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { lodgingFieldClass } from "@/components/hotel/lodgingChrome";
import { cn } from "@/lib/utils";

export type LodgingComboboxOption = {
  value: string;
  label: string;
  hint?: string;
  /** Optional badge node rendered after the label (e.g. company check-in chip). */
  badge?: React.ReactNode;
  /** Extra text matched by search but never rendered (phone, Fayda, room…). */
  keywords?: string;
};

/** Searchable single-select — same pattern as hotel store item registration. */
export function LodgingOptionCombobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  emptyText = "No matches.",
  searchPlaceholder = "Search…",
  disabled = false,
  className,
  id,
  align = "start",
}: {
  value: string;
  onChange: (value: string) => void;
  options: LodgingComboboxOption[];
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.hint || ""} ${o.keywords || ""} ${o.value}`.toLowerCase();
      return hay.includes(query);
    });
  }, [options, query]);

  const selected = options.find((o) => o.value === value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            lodgingFieldClass,
            "justify-between font-normal",
            className,
          )}
        >
          <span
            className={cn(
              "flex min-w-0 items-center gap-2 text-left",
              !selected && "text-muted-foreground",
            )}
          >
            <span className="min-w-0 truncate">
              {selected?.label || placeholder}
            </span>
            {selected?.badge ? (
              <span className="shrink-0">{selected.badge}</span>
            ) : null}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align={align}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((o) => {
                  const on = o.value === value;
                  return (
                    <CommandItem
                      key={o.value}
                      value={`${o.value}-${o.label}`}
                      onSelect={() => {
                        onChange(o.value);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          on ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="min-w-0 truncate">
                          {o.label}
                          {o.hint ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {o.hint}
                            </span>
                          ) : null}
                        </span>
                        {o.badge ? (
                          <span className="shrink-0">{o.badge}</span>
                        ) : null}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
