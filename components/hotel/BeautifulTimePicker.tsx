"use client";

import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Parse "HH:mm" (24h) into parts. */
export function parseHm(hm: string): { hour24: number; minute: number } {
  const [h, m] = String(hm || "12:00")
    .split(":")
    .map((x) => Number(x));
  return {
    hour24: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 12,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

export function formatHm(hour24: number, minute: number) {
  return `${pad2(hour24)}:${pad2(minute)}`;
}

function to12h(hour24: number): { hour12: number; period: "AM" | "PM" } {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, period };
}

function from12h(hour12: number, period: "AM" | "PM"): number {
  const h = hour12 % 12;
  return period === "PM" ? h + 12 : h;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * Polished arrival/departure time control — 12h hour chips, 5-min steps, AM/PM.
 */
export function BeautifulTimePicker({
  label = "Time",
  value,
  onChange,
  className,
}: {
  label?: string;
  /** "HH:mm" 24-hour */
  value: string;
  onChange: (hm: string) => void;
  className?: string;
}) {
  const { hour24, minute } = parseHm(value);
  const snappedMinute = Math.round(minute / 5) * 5;
  const minuteSafe = snappedMinute >= 60 ? 55 : snappedMinute;
  const { hour12, period } = to12h(hour24);

  const setHour12 = (h: number) => {
    onChange(formatHm(from12h(h, period), minuteSafe));
  };
  const setMinute = (m: number) => {
    onChange(formatHm(hour24, m));
  };
  const setPeriod = (p: "AM" | "PM") => {
    onChange(formatHm(from12h(hour12, p), minuteSafe));
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-card via-card to-primary/6 p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground tabular-nums">
            {pad2(hour12)}:{pad2(minuteSafe)} {period}
          </p>
        </div>
      </div>

      <div className="relative space-y-3">
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Hour
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHour12(h)}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium tabular-nums transition-all",
                  hour12 === h
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                    : "bg-muted/50 text-foreground hover:bg-muted",
                )}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Minute
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinute(m)}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium tabular-nums transition-all",
                  minuteSafe === m
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "bg-muted/50 text-foreground hover:bg-muted",
                )}
              >
                {pad2(m)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {(["AM", "PM"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "flex-1 h-10 rounded-xl text-sm font-semibold tracking-wide transition-all",
                period === p
                  ? "bg-foreground text-background shadow-md"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
