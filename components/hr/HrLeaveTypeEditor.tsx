"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { notifyApiFailure } from "@/lib/actions";
import { fetchHrLeaveTypes, replaceHrLeaveTypesApi } from "@/lib/api/hr";
import { slugLeaveTypeCode, type HrLeaveTypeSetting } from "@/lib/hrLeaveTypes";

const LINE_GRID =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_110px_120px_40px] lg:items-end lg:gap-x-2.5";

type LeaveTypeLine = {
  key: string;
  code: string;
  label: string;
  defaultDays: number;
  paid: boolean;
};

function emptyLine(key: string): LeaveTypeLine {
  return { key, code: "", label: "", defaultDays: 0, paid: true };
}

function linesFromSettings(types: HrLeaveTypeSetting[]): LeaveTypeLine[] {
  return types.map((type, index) => ({
    key: `saved-${type.code}-${index}`,
    code: type.code,
    label: type.label,
    defaultDays: type.defaultDays,
    paid: type.paid,
  }));
}

function settingsFromLines(lines: LeaveTypeLine[]): HrLeaveTypeSetting[] {
  const seen = new Set<string>();
  const next: HrLeaveTypeSetting[] = [];
  for (const line of lines) {
    const label = line.label.trim();
    if (!label) continue;
    const code = line.code || slugLeaveTypeCode(label);
    if (!code) continue;
    let unique = code;
    let n = 2;
    while (seen.has(unique)) unique = `${code}_${n++}`;
    seen.add(unique);
    next.push({
      code: unique,
      label,
      paid: line.paid,
      defaultDays: Math.max(0, Math.min(366, Number(line.defaultDays) || 0)),
      active: true,
    });
  }
  return next;
}

export function HrLeaveTypeEditor() {
  const rowIdRef = useRef(0);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lines, setLines] = useState<LeaveTypeLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const types = await fetchHrLeaveTypes();
        if (cancelled) return;
        const next = linesFromSettings(types);
        rowIdRef.current = next.length;
        setLines(next);
      } catch (e) {
        notifyApiFailure(e, "Could not load leave types");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  const persist = (nextLines: LeaveTypeLine[], immediate = false) => {
    setLines(nextLines);
    if (persistTimer.current) clearTimeout(persistTimer.current);
    const run = async () => {
      try {
        const saved = await replaceHrLeaveTypesApi(settingsFromLines(nextLines));
        let savedIndex = 0;
        setLines(
          nextLines.map((line) => {
            if (!line.label.trim()) return line;
            const setting = saved[savedIndex++];
            return setting ? { ...line, code: setting.code } : line;
          }),
        );
      } catch (e) {
        notifyApiFailure(e, "Could not save leave types");
      }
    };
    if (immediate) void run();
    else persistTimer.current = setTimeout(() => void run(), 450);
  };

  const addLine = () => {
    rowIdRef.current += 1;
    persist([...lines, emptyLine(`line-${rowIdRef.current}`)], true);
  };

  const removeLine = (index: number) => {
    persist(
      lines.filter((_, i) => i !== index),
      true,
    );
  };

  const updateLine = (index: number, line: LeaveTypeLine) => {
    const next = [...lines];
    next[index] = line;
    persist(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/15 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading leave types…
      </div>
    );
  }

  const hasLines = lines.length > 0;

  return (
    <div className="rounded-xl border border-border/70 bg-muted/15 p-4 sm:p-5">
      {!hasLines ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-violet-500/25 bg-muted/15 px-6 py-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
            <CalendarDays className="h-7 w-7 text-violet-600/80 dark:text-violet-400" />
          </div>
          <p className="text-lg font-semibold">No leave types yet</p>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Add the leave types employees can request from their login. Default
            days become the starting balance for new staff.
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-4 gap-2 shadow-sm"
            onClick={addLine}
          >
            <Plus className="h-4 w-4" />
            Add first leave type
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-500/15 bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
              <p className="text-sm font-semibold">Leave types</p>
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
            <span className="text-center">Days</span>
            <span className="text-center">Paid</span>
            <span className="sr-only">Remove</span>
          </div>

          <ScrollArea className="h-[min(42vh,420px)]">
            <div className="space-y-3 pr-3 sm:pr-4">
              {lines.map((line, index) => (
                <article
                  key={line.key}
                  className="overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-card via-card to-muted/20 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-700 dark:text-violet-400">
                        {index + 1}
                      </span>
                      {line.label.trim() ? (
                        <span className="truncate text-sm font-medium text-foreground">
                          {line.label.trim()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          New leave type
                        </span>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 border-violet-500/20 bg-violet-500/5 text-[11px] font-semibold text-violet-800 dark:text-violet-300"
                    >
                      {line.paid ? "Paid" : "Unpaid"}
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
                        placeholder="Annual, sick, maternity…"
                        className="h-9 w-full min-w-0 text-sm sm:h-10"
                      />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground sm:sr-only">
                        Days
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={line.defaultDays || ""}
                        placeholder="0"
                        className="h-9 w-full min-w-0 text-center text-sm tabular-nums sm:h-10"
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
                          updateLine(index, {
                            ...line,
                            defaultDays: raw === "" || raw === "." ? 0 : Number(raw) || 0,
                          });
                        }}
                      />
                    </div>

                    <div className="flex min-w-0 flex-col items-center justify-end space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground lg:sr-only">
                        Paid
                      </Label>
                      <div className="flex h-9 w-full items-center justify-center sm:h-10">
                        <Switch
                          checked={line.paid}
                          onCheckedChange={(paid) =>
                            updateLine(index, { ...line, paid })
                          }
                          aria-label={line.paid ? "Paid leave" : "Unpaid leave"}
                        />
                      </div>
                    </div>

                    <div className="flex items-end sm:col-span-2 lg:col-span-1 lg:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLine(index)}
                        className="h-10 w-full shrink-0 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto lg:h-9 lg:w-9 lg:px-0"
                        aria-label={`Remove leave type ${index + 1}`}
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
            className="mt-3 w-full border-dashed border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add leave type
          </Button>
        </>
      )}
    </div>
  );
}
