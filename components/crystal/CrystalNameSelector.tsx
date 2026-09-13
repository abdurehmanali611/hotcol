"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  fetchCrystalNames,
  type CrystalNameRow,
} from "@/lib/api/crystalNames";
import { filterAndRankCrystalRows } from "@/lib/crystalNameSearch";

type CrystalNameSelectorProps = {
  id?: string;
  value: string;
  onChange: (crystalLabel: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const VISIBLE_LIMIT = 80;

/** Module cache — load once per page session (no refetch on every keystroke). */
let crystalCache: CrystalNameRow[] | null = null;
let crystalCachePromise: Promise<CrystalNameRow[]> | null = null;

async function loadCrystalCache(): Promise<CrystalNameRow[]> {
  if (crystalCache) return crystalCache;
  if (!crystalCachePromise) {
    crystalCachePromise = fetchCrystalNames({ take: 2000 })
      .then((list) => {
        crystalCache = list;
        return crystalCache;
      })
      .catch((err) => {
        crystalCachePromise = null;
        throw err;
      });
  }
  return crystalCachePromise;
}

function displayPrimary(row: CrystalNameRow): string {
  return `${row.amharic} / ${row.romanized}`;
}

function parseCrystalValue(value: string): CrystalNameRow | null {
  if (!value) return null;
  const parts = value.split("|").map((p) => p.trim());
  if (parts.length < 3) return null;
  return {
    id: -1,
    amharic: parts[0],
    romanized: parts[1],
    english: parts.slice(2).join("|"),
    crystalLabel: value,
  };
}

/**
 * Searchable crystal-name picker (all tenants).
 * Option row: Amharic / Romanized … English (right).
 * Stored value: full crystalLabel `Amharic|Romanized|English`.
 */
export function CrystalNameSelector({
  id,
  value,
  onChange,
  placeholder = "Search crystal name…",
  disabled = false,
  className,
}: CrystalNameSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CrystalNameRow[]>(crystalCache ?? []);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 80);
    return () => window.clearTimeout(t);
  }, [search]);

  const ensureLoaded = useCallback(async () => {
    if (crystalCache) {
      setRows(crystalCache);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const list = await loadCrystalCache();
      setRows(list);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load crystal names",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void ensureLoaded();
  }, [open, ensureLoaded]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  // Parent Dialog/ScrollArea often swallows wheel events; scroll this list ourselves.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      el.scrollTop += event.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, rows, debouncedSearch, loading]);

  const selected = useMemo(() => {
    const exact = rows.find((r) => r.crystalLabel === value);
    if (exact) return exact;
    return parseCrystalValue(value);
  }, [rows, value]);

  const { visible, totalMatches } = useMemo(
    () => filterAndRankCrystalRows(rows, debouncedSearch, VISIBLE_LIMIT),
    [rows, debouncedSearch],
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full min-w-0 justify-between px-3 font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {selected ? (
              <>
                <span className="truncate text-left">
                  {displayPrimary(selected)}
                </span>
                <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground">
                  {selected.english}
                </span>
              </>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[80] w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-2rem,320px)] max-w-[min(100vw-2rem,520px)] p-0"
        align="start"
        side="bottom"
        sideOffset={6}
        avoidCollisions={false}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const root = e.currentTarget as HTMLElement;
          const input = root.querySelector<HTMLInputElement>(
            "[data-slot=command-input]",
          );
          input?.focus();
        }}
      >
        <Command shouldFilter={false} className="overflow-hidden">
          <CommandInput
            placeholder="Type letters in order — e.g. sg finds sega…"
            value={search}
            onValueChange={setSearch}
          />
          {/* Native scroll container — avoids cmdk/Dialog wheel conflicts */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-[min(34vh,260px)] overflow-y-auto overscroll-contain scroll-py-1"
          >
            {loading && rows.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : loadError ? (
              <div className="px-3 py-6 text-center text-sm text-destructive">
                {loadError}
              </div>
            ) : (
              <>
                <CommandEmpty>No crystal name found.</CommandEmpty>
                <CommandGroup>
                  {visible.map((row) => (
                    <CommandItem
                      key={row.id > 0 ? row.id : row.crystalLabel}
                      value={row.crystalLabel}
                      onSelect={() => {
                        onChange(row.crystalLabel);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === row.crystalLabel
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {displayPrimary(row)}
                      </span>
                      <span className="max-w-[40%] shrink-0 truncate text-right text-xs text-muted-foreground">
                        {row.english}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {totalMatches > VISIBLE_LIMIT ? (
                  <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                    Showing {VISIBLE_LIMIT} of {totalMatches} — type more to
                    narrow
                  </p>
                ) : null}
              </>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
