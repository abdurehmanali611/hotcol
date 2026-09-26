"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  fetchCrystalNames,
  proposeCrystalName,
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
  /** registration | purchase | recipe | other */
  source?: string;
  /** When false, hide Add-as-new (e.g. Apex merge picker). Default true. */
  allowPropose?: boolean;
};

const VISIBLE_LIMIT = 80;

/** Module cache — load once per page session (no refetch on every keystroke). */
let crystalCache: CrystalNameRow[] | null = null;
let crystalCachePromise: Promise<CrystalNameRow[]> | null = null;

export function clearCrystalNameCache() {
  crystalCache = null;
  crystalCachePromise = null;
}

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
  const am = row.amharic?.trim() || "";
  const rom = row.romanized?.trim() || "";
  if (am && rom) return `${am} / ${rom}`;
  if (am) return am;
  if (rom) return rom;
  return row.english?.trim() || row.crystalLabel || "";
}

function parseCrystalValue(value: string): CrystalNameRow | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("|").map((p) => p.trim());
  if (parts.length >= 3) {
    return {
      id: -1,
      amharic: parts[0],
      romanized: parts[1],
      english: parts.slice(2).join("|"),
      crystalLabel: trimmed,
    };
  }
  // Pending proposals / free-text names are not yet in the catalog and may
  // not be the Amharic|Romanized|English triple — still show what was applied.
  return {
    id: -1,
    amharic: "",
    romanized: trimmed,
    english: "",
    crystalLabel: trimmed,
  };
}

/** Prefer API crystalLabel; else compose from language fields; else rawText. */
function labelFromProposal(proposal: {
  crystalLabel?: string | null;
  amharic?: string | null;
  romanized?: string | null;
  english?: string | null;
  rawText?: string | null;
}): string {
  const crystal = String(proposal.crystalLabel || "").trim();
  if (crystal) return crystal;
  const amharic = String(proposal.amharic || "").trim();
  const romanized = String(proposal.romanized || "").trim();
  const english = String(proposal.english || "").trim();
  if (amharic || romanized || english) {
    return `${amharic}|${romanized}|${english}`;
  }
  return String(proposal.rawText || "").trim();
}

function hasEthiopic(text: string): boolean {
  return /[\u1200-\u137F]/.test(text);
}

/** Prefill propose dialog / quick-Enter draft from typed text. */
function draftFromSearch(search: string): {
  amharic: string;
  romanized: string;
  english: string;
} {
  const raw = search.trim();
  if (!raw) return { amharic: "", romanized: "", english: "" };
  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return {
      amharic: parts[0],
      romanized: parts[1],
      english: parts.slice(2).join("|"),
    };
  }
  if (hasEthiopic(raw)) {
    return { amharic: raw, romanized: "", english: "" };
  }
  // Latin / mixed typed text — leave Amharic blank; Apex can complete it.
  return { amharic: "", romanized: raw, english: raw };
}

/** Treat em-dash / ellipsis placeholders as empty optional fields. */
function normalizeLangPart(value: string): string {
  const t = value.trim();
  if (!t || t === "—" || t === "-" || t === "…" || t === "...") return "";
  return t;
}

/**
 * Searchable crystal-name picker (all tenants).
 * Keyboard: typing auto-highlights top match; ↑/↓ move; Enter selects
 * highlighted row, or proposes typed text as new when nothing matches.
 */
export function CrystalNameSelector({
  id,
  value,
  onChange,
  placeholder = "Search crystal name…",
  disabled = false,
  className,
  source = "other",
  allowPropose = true,
}: CrystalNameSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CrystalNameRow[]>(crystalCache ?? []);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [draft, setDraft] = useState({
    amharic: "",
    romanized: "",
    english: "",
  });
  /** Index of keyboard/mouse-hovered row in `visible` (0 = top). */
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const proposingRef = useRef(false);
  /** Preserved when the popover closes (which clears `search`) so propose still has typed text. */
  const proposeRawRef = useRef("");

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
    if (!open) {
      setSearch("");
      setHighlightIndex(0);
    }
  }, [open]);

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

  // Typing / result changes → always hover the top match.
  useEffect(() => {
    if (!open) return;
    setHighlightIndex(0);
  }, [open, debouncedSearch, visible.length]);

  // Keep highlighted row in view.
  useEffect(() => {
    if (!open || visible.length === 0 || !listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(
      `[data-crystal-idx="${highlightIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [open, highlightIndex, visible.length]);

  const canPropose =
    allowPropose && search.trim().length > 0 && !loading && !loadError;

  const applyProposalResult = useCallback(
    async (proposal: Awaited<ReturnType<typeof proposeCrystalName>>) => {
      // Prefer full crystal label; otherwise keep what the user typed.
      const label = labelFromProposal(proposal);
      if (!label) {
        toast.error("Could not apply proposed name");
        return;
      }
      onChange(label);
      setProposeOpen(false);
      setOpen(false);
      if (proposal.status === "approved" && proposal.mergedIntoId) {
        clearCrystalNameCache();
        void ensureLoaded();
        toast.success("Matched an existing crystal name");
      } else if (proposal.status === "pending") {
        toast.success(
          "Saved with this name — Apex will review and may merge it",
        );
      } else {
        toast.success("Crystal name applied");
      }
    },
    [ensureLoaded, onChange],
  );

  const proposeWithDraft = useCallback(
    async (
      nextDraft: { amharic: string; romanized: string; english: string },
      rawText: string,
    ) => {
      const typed = rawText.trim() || proposeRawRef.current.trim();
      const amharic = normalizeLangPart(nextDraft.amharic);
      const romanized = normalizeLangPart(nextDraft.romanized);
      const english = normalizeLangPart(nextDraft.english);
      // Prefer any filled language fields, then the typed search text.
      const fallbackRaw =
        typed ||
        [amharic, romanized, english].filter(Boolean).join("|") ||
        romanized ||
        english ||
        amharic;
      if (!fallbackRaw) {
        toast.error("Type a name first");
        return;
      }
      if (proposingRef.current) return;
      proposingRef.current = true;
      setProposing(true);
      try {
        // All language fields are optional — send only what the user filled.
        const proposal = await proposeCrystalName({
          rawText: fallbackRaw,
          amharic: amharic || undefined,
          romanized: romanized || undefined,
          english: english || undefined,
          source,
        });
        await applyProposalResult(proposal);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not propose name");
      } finally {
        proposingRef.current = false;
        setProposing(false);
      }
    },
    [applyProposalResult, source],
  );

  const openPropose = () => {
    const typed = search.trim();
    proposeRawRef.current = typed;
    setDraft(draftFromSearch(typed));
    setProposeOpen(true);
    setOpen(false);
  };

  /** Enter with no matches: typed text only → Apex fills the triple later. */
  const quickProposeFromSearch = useCallback(() => {
    if (!canPropose) return;
    const typed = search.trim();
    proposeRawRef.current = typed;
    void proposeWithDraft(
      { amharic: "", romanized: "", english: "" },
      typed,
    );
  }, [canPropose, proposeWithDraft, search]);

  const selectRow = useCallback(
    (row: CrystalNameRow) => {
      onChange(row.crystalLabel);
      setOpen(false);
    },
    [onChange],
  );

  const moveHighlight = useCallback(
    (delta: number) => {
      if (visible.length === 0) return;
      setHighlightIndex((prev) => {
        const next = Math.min(visible.length - 1, Math.max(0, prev + delta));
        return next;
      });
    },
    [visible.length],
  );

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      moveHighlight(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      moveHighlight(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (visible.length > 0) {
        const idx = Math.min(
          visible.length - 1,
          Math.max(0, highlightIndex),
        );
        selectRow(visible[idx]!);
        return;
      }
      if (canPropose) {
        quickProposeFromSearch();
      }
      return;
    }
  };

  return (
    <>
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
              "h-10 w-full min-w-0 max-w-full justify-between gap-2 px-3 font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              {selected ? (
                <>
                  <span className="min-w-0 truncate text-left">
                    {displayPrimary(selected)}
                  </span>
                  <span className="ml-auto max-w-[45%] shrink truncate text-xs text-muted-foreground">
                    {selected.english}
                  </span>
                </>
              ) : (
                <span className="truncate">{placeholder}</span>
              )}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
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
              placeholder="Type to recommend — Enter selects top / adds new…"
              value={search}
              onValueChange={setSearch}
              onKeyDown={onSearchKeyDown}
            />
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
                  {visible.length === 0 ? (
                    <CommandEmpty>
                      {canPropose
                        ? "No match — press Enter to add as new for Apex review."
                        : "No crystal name found."}
                    </CommandEmpty>
                  ) : null}
                  <CommandGroup>
                    {visible.map((row, index) => (
                      <CommandItem
                        key={row.id > 0 ? row.id : row.crystalLabel}
                        value={row.crystalLabel}
                        data-crystal-idx={index}
                        onSelect={() => selectRow(row)}
                        onMouseEnter={() => setHighlightIndex(index)}
                        className={cn(
                          "flex items-center gap-2",
                          index === highlightIndex &&
                            "bg-accent text-accent-foreground",
                        )}
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
            {canPropose ? (
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full gap-2"
                  onClick={openPropose}
                >
                  <Plus className="h-4 w-4" />
                  Add “{search.trim()}” as new…
                </Button>
                <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                  ↑↓ move · Enter select · Enter with no match adds as new
                </p>
              </div>
            ) : null}
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={proposeOpen} onOpenChange={setProposeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Propose crystal name</DialogTitle>
            <DialogDescription>
              Optional: fill any of Amharic, Romanized, or English now — leave
              blanks for Apex to complete when approving. What you typed is
              saved and usable on this form right away.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="propose-am">Amharic</Label>
              <Input
                id="propose-am"
                value={draft.amharic}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, amharic: e.target.value }))
                }
                placeholder="ዳቦ"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="propose-rom">Romanized</Label>
              <Input
                id="propose-rom"
                value={draft.romanized}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, romanized: e.target.value }))
                }
                placeholder="Dabo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="propose-en">English</Label>
              <Input
                id="propose-en"
                value={draft.english}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, english: e.target.value }))
                }
                placeholder="Bread"
              />
            </div>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Preview:{" "}
              <code className="text-foreground">
                {`${normalizeLangPart(draft.amharic) || "…"}|${normalizeLangPart(draft.romanized) || "…"}|${normalizeLangPart(draft.english) || "…"}`}
              </code>
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={proposing}
              onClick={() => setProposeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={proposing}
              onClick={() =>
                void proposeWithDraft(
                  draft,
                  proposeRawRef.current || search.trim(),
                )
              }
            >
              {proposing ? "Saving…" : "Use & send to Apex"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
