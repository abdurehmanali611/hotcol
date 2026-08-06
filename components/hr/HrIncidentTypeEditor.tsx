"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { notifyApiFailure } from "@/lib/actions";
import {
  fetchHrIncidentTypes,
  replaceHrIncidentTypesApi,
} from "@/lib/api/hr";
import {
  slugIncidentTypeCode,
  type HrIncidentTypeSetting,
} from "@/lib/hrIncidentTypes";

const LINE_GRID =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_100px_minmax(0,0.9fr)_40px] lg:items-end lg:gap-x-2.5";

type IncidentTypeLine = {
  key: string;
  code: string;
  label: string;
  deduct: boolean;
  amountETB: number;
};

function emptyLine(key: string): IncidentTypeLine {
  return { key, code: "", label: "", deduct: false, amountETB: 0 };
}

function linesFromSettings(types: HrIncidentTypeSetting[]): IncidentTypeLine[] {
  return types.map((type, index) => ({
    key: `saved-${type.code}-${index}`,
    code: type.code,
    label: type.label,
    deduct: type.deduct,
    amountETB: type.amountETB,
  }));
}

function settingsFromLines(lines: IncidentTypeLine[]): HrIncidentTypeSetting[] {
  const seen = new Set<string>();
  const next: HrIncidentTypeSetting[] = [];
  for (const line of lines) {
    const label = line.label.trim();
    if (!label) continue;
    const code = line.code || slugIncidentTypeCode(label);
    if (!code) continue;
    let unique = code;
    let n = 2;
    while (seen.has(unique)) unique = `${code}_${n++}`;
    seen.add(unique);
    next.push({
      code: unique,
      label,
      deduct: Boolean(line.deduct),
      amountETB: Math.max(0, Number(line.amountETB) || 0),
      active: true,
    });
  }
  return next;
}

export function HrIncidentTypeEditor() {
  const rowIdRef = useRef(0);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lines, setLines] = useState<IncidentTypeLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const types = await fetchHrIncidentTypes();
        if (cancelled) return;
        const next = linesFromSettings(types);
        rowIdRef.current = next.length;
        setLines(next);
      } catch (e) {
        notifyApiFailure(e, "Could not load incident types");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  const persist = (nextLines: IncidentTypeLine[], immediate = false) => {
    setLines(nextLines);
    if (persistTimer.current) clearTimeout(persistTimer.current);
    const run = async () => {
      try {
        const saved = await replaceHrIncidentTypesApi(
          settingsFromLines(nextLines),
        );
        let savedIndex = 0;
        setLines(
          nextLines.map((line) => {
            if (!line.label.trim()) return line;
            const setting = saved[savedIndex++];
            return setting ? { ...line, code: setting.code } : line;
          }),
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("hotcol-hr-incident-types"));
        }
      } catch (e) {
        notifyApiFailure(e, "Could not save incident types");
      }
    };
    if (immediate) void run();
    else persistTimer.current = setTimeout(() => void run(), 450);
  };

  const addLine = () => {
    rowIdRef.current += 1;
    persist([...lines, emptyLine(`line-${rowIdRef.current}`)], true);
  };

  const updateLine = (index: number, line: IncidentTypeLine) => {
    const next = [...lines];
    next[index] = line;
    persist(next);
  };

  const removeLine = (index: number) => {
    persist(
      lines.filter((_, i) => i !== index),
      true,
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/15 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading incident types…
      </div>
    );
  }

  return (
    <div>
      {!lines.length ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-600/80 dark:text-amber-400/80" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Start empty and add your own categories. Set Deduct when the amount
            should come off salary; leave it off to increase pay by that amount.
            If you add a type named Other, HR will use it instead of a free
            Other option.
          </p>
          <Button type="button" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" />
            Add first incident type
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/15 bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-semibold">Incident types</p>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {lines.length}
              </Badge>
            </div>
          </div>

          <div
            className={cn(
              LINE_GRID,
              "mb-1 hidden px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid",
            )}
          >
            <span>Type name</span>
            <span className="text-center">Deduct</span>
            <span className="text-center">Amount (ETB)</span>
            <span className="sr-only">Remove</span>
          </div>

          <ScrollArea className="h-[min(42vh,420px)]">
            <div className="space-y-3 pr-3 sm:pr-4">
              {lines.map((line, index) => (
                <article
                  key={line.key}
                  className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-800 dark:text-amber-300">
                        {index + 1}
                      </span>
                      {line.label.trim() ? (
                        <span className="truncate text-sm font-medium">
                          {line.label.trim()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          New incident type
                        </span>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[11px] font-semibold"
                    >
                      {line.amountETB > 0
                        ? line.deduct
                          ? `Deduct ${line.amountETB}`
                          : `Increase ${line.amountETB}`
                        : "No pay impact"}
                    </Badge>
                  </div>

                  <div className={cn(LINE_GRID, "p-4 pt-3")}>
                    <div className="min-w-0 space-y-1 sm:col-span-2 lg:col-span-1">
                      <Label className="text-xs font-medium text-muted-foreground sm:sr-only">
                        Type name
                      </Label>
                      <Input
                        value={line.label}
                        onChange={(e) =>
                          updateLine(index, { ...line, label: e.target.value })
                        }
                        placeholder="Type name"
                        className="h-9 w-full min-w-0 text-sm sm:h-10"
                      />
                    </div>

                    <div className="flex min-w-0 flex-col items-center justify-end space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground lg:sr-only">
                        Deduct
                      </Label>
                      <div className="flex h-9 w-full items-center justify-center sm:h-10">
                        <Switch
                          checked={line.deduct}
                          onCheckedChange={(deduct) =>
                            updateLine(index, { ...line, deduct })
                          }
                          aria-label={
                            line.deduct
                              ? "Salary deduction"
                              : "Salary increase"
                          }
                        />
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground sm:sr-only">
                        Amount (ETB)
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={line.amountETB || ""}
                        placeholder="0"
                        className="h-9 w-full min-w-0 text-center text-sm tabular-nums sm:h-10"
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
                          updateLine(index, {
                            ...line,
                            amountETB:
                              raw === "" || raw === "."
                                ? 0
                                : Number(raw) || 0,
                          });
                        }}
                      />
                    </div>

                    <div className="flex items-end sm:col-span-2 lg:col-span-1 lg:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLine(index)}
                        className="h-10 w-full shrink-0 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto lg:h-9 lg:w-9 lg:px-0"
                        aria-label={`Remove incident type ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4 shrink-0" />
                        <span className="lg:sr-only">Remove line</span>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </ScrollArea>

          <Button
            type="button"
            variant="outline"
            onClick={addLine}
            className="mt-3 w-full border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add incident type
          </Button>
        </>
      )}
    </div>
  );
}
