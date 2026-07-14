"use client";

import { useRef, useState } from "react";
import { ChefHat, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { menuRecipeToJson, type MenuRecipe } from "@/lib/cafeRecipe";

const UNIT_OPTIONS = [
  "Litre",
  "Kilogram",
  "Piece",
  "Packet",
  "Dozen",
  "Other",
] as const;

const LINE_GRID_DEFAULT =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_92px_116px_120px_40px] lg:items-end lg:gap-x-2.5";

const LINE_GRID_EMBEDDED =
  "grid grid-cols-1 gap-3 sm:grid-cols-2";

const EMBEDDED_FIELD_LABEL =
  "text-xs font-semibold text-foreground";

const DECIMAL_INPUT_PATTERN = /^\d*\.?\d*$/;

function formatDecimalDisplay(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return String(value);
}

function parseDecimalInput(raw: string): number {
  if (raw === "" || raw === ".") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function DecimalInput({
  value,
  onChange,
  placeholder,
  className,
  align = "left",
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const [draft, setDraft] = useState(() => formatDecimalDisplay(value));
  const [focused, setFocused] = useState(false);

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={focused ? draft : formatDecimalDisplay(value)}
      placeholder={placeholder}
      className={cn(
        "tabular-nums",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
      onFocus={() => {
        setFocused(true);
        setDraft(formatDecimalDisplay(value));
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseDecimalInput(draft);
        onChange(parsed);
        setDraft(formatDecimalDisplay(parsed));
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !DECIMAL_INPUT_PATTERN.test(raw)) return;
        setDraft(raw);
        onChange(parseDecimalInput(raw));
      }}
    />
  );
}

type RecipeLine = {
  name: string;
  amount: number;
  measuredBy: string;
  unitPrice: number;
};

type RecipeIngredientEditorProps = {
  value: MenuRecipe | null;
  onChange: (recipe: MenuRecipe | null) => void;
  itemName?: string;
  /** `embedded` — compact layout for update dialog modals */
  variant?: "default" | "embedded";
  /** Menu price — shows estimated margin in embedded mode */
  menuPrice?: number;
};

function emptyLine(): RecipeLine {
  return { name: "", amount: 0, measuredBy: "", unitPrice: 0 };
}

function linesFromRecipe(recipe: MenuRecipe | null): RecipeLine[] {
  if (!recipe?.ingredients?.length) return [];
  return recipe.ingredients.map((ing) => ({
    name: ing.name,
    amount: ing.amount,
    measuredBy: ing.measuredBy,
    unitPrice: ing.unitPrice,
  }));
}

function RecipeColumnHeaders({ embedded }: { embedded: boolean }) {
  return (
    <div
      className={cn(
        embedded ? LINE_GRID_EMBEDDED : LINE_GRID_DEFAULT,
        "mb-1 hidden px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid",
        !embedded && "lg:grid",
      )}
    >
      <span className={embedded ? "sm:col-span-2" : undefined}>Ingredient</span>
      <span className={embedded ? "text-left" : "text-center"}>Qty</span>
      <span>Unit</span>
      <span className={embedded ? undefined : "text-right"}>Unit price</span>
      {!embedded ? <span className="sr-only">Remove</span> : null}
    </div>
  );
}

function EmbeddedRecipeLineRow({
  index,
  line,
  onChange,
  onRemove,
  lineTotal,
}: {
  index: number;
  line: RecipeLine;
  onChange: (line: RecipeLine) => void;
  onRemove: () => void;
  lineTotal: string;
}) {
  const fieldClass = "h-9 w-full min-w-0 text-sm";

  const unitOptions =
    line.measuredBy &&
    !UNIT_OPTIONS.includes(line.measuredBy as (typeof UNIT_OPTIONS)[number])
      ? [line.measuredBy, ...UNIT_OPTIONS]
      : [...UNIT_OPTIONS];

  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm ring-1 ring-amber-500/10">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-700 dark:text-amber-400">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-foreground">
            Ingredient line
          </span>
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 border-amber-500/20 bg-amber-500/5 text-[11px] font-semibold tabular-nums text-amber-800 dark:text-amber-300"
        >
          {lineTotal} ETB
        </Badge>
      </div>

      <div className="space-y-3 p-3">
        <div className="space-y-1.5">
          <Label className={EMBEDDED_FIELD_LABEL}>Ingredient</Label>
          <Input
            value={line.name}
            onChange={(e) => onChange({ ...line, name: e.target.value })}
            placeholder="Tomato, flour, oil…"
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          <div className="space-y-1.5">
            <Label className={EMBEDDED_FIELD_LABEL}>Quantity</Label>
            <DecimalInput
              value={line.amount}
              onChange={(amount) => onChange({ ...line, amount })}
              placeholder="0"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={EMBEDDED_FIELD_LABEL}>Unit</Label>
            <Select
              value={line.measuredBy || undefined}
              onValueChange={(v) => onChange({ ...line, measuredBy: v })}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className={EMBEDDED_FIELD_LABEL}>Unit price (ETB)</Label>
            <DecimalInput
              value={line.unitPrice}
              onChange={(unitPrice) => onChange({ ...line, unitPrice })}
              placeholder="0.00"
              align="right"
              className={fieldClass}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemove}
          className="h-9 w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
          aria-label={`Remove line ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
          Remove line
        </Button>
      </div>
    </article>
  );
}

function RecipeLineRow({
  index,
  line,
  onChange,
  onRemove,
  lineTotal,
  embedded,
}: {
  index: number;
  line: RecipeLine;
  onChange: (line: RecipeLine) => void;
  onRemove: () => void;
  lineTotal: string;
  embedded: boolean;
}) {
  const fieldClass = "h-9 w-full min-w-0 max-w-full text-sm sm:h-10";

  const unitOptions =
    line.measuredBy &&
    !UNIT_OPTIONS.includes(line.measuredBy as (typeof UNIT_OPTIONS)[number])
      ? [line.measuredBy, ...UNIT_OPTIONS]
      : [...UNIT_OPTIONS];

  const gridClass = embedded ? LINE_GRID_EMBEDDED : LINE_GRID_DEFAULT;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm",
        embedded
          ? "ring-1 ring-amber-500/10"
          : "rounded-2xl bg-linear-to-br from-card via-card to-muted/20 ring-1 ring-black/5 dark:ring-white/5",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30",
          embedded ? "px-3 py-2" : "px-4 py-2.5",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-700 dark:text-amber-400",
              embedded ? "h-6 w-6" : "h-7 w-7",
            )}
          >
            {index + 1}
          </span>
          {line.name.trim() ? (
            <span className="truncate text-sm font-medium text-foreground">
              {line.name.trim()}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">New ingredient</span>
          )}
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 border-amber-500/20 bg-amber-500/5 text-[11px] font-semibold tabular-nums text-amber-800 dark:text-amber-300"
        >
          {lineTotal} ETB
        </Badge>
      </div>

      <div className={cn(gridClass, embedded ? "p-3 pt-2.5" : "p-4 pt-3")}>
        <div
          className={cn(
            "min-w-0 space-y-1",
            embedded ? "sm:col-span-2" : "sm:col-span-2 lg:col-span-1",
          )}
        >
          <Label className="text-xs font-medium text-muted-foreground sm:sr-only">
            Ingredient
          </Label>
          <Input
            value={line.name}
            onChange={(e) => onChange({ ...line, name: e.target.value })}
            placeholder="Tomato, flour, oil…"
            className={fieldClass}
          />
        </div>

        <div className="min-w-0 space-y-1">
          <Label className="text-xs font-medium text-muted-foreground sm:sr-only">
            Quantity
          </Label>
          <DecimalInput
            value={line.amount}
            onChange={(amount) => onChange({ ...line, amount })}
            placeholder="0"
            align="center"
            className={fieldClass}
          />
        </div>

        <div className="min-w-0 space-y-1">
          <Label className="text-xs font-medium text-muted-foreground sm:sr-only">
            Unit
          </Label>
          <Select
            value={line.measuredBy || undefined}
            onValueChange={(v) => onChange({ ...line, measuredBy: v })}
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-1">
          <Label className="text-xs font-medium text-muted-foreground sm:sr-only">
            Unit price (ETB)
          </Label>
          <DecimalInput
            value={line.unitPrice}
            onChange={(unitPrice) => onChange({ ...line, unitPrice })}
            placeholder="0.00"
            align="right"
            className={fieldClass}
          />
        </div>

        <div
          className={cn(
            "flex items-end",
            embedded
              ? "sm:col-span-2 sm:justify-end"
              : "sm:col-span-2 lg:col-span-1 lg:justify-end",
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            className={cn(
              "shrink-0 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive",
              embedded
                ? "h-9 w-full sm:w-auto"
                : "h-10 w-full sm:w-auto lg:h-9 lg:w-9 lg:px-0",
            )}
            aria-label={`Remove line ${index + 1}`}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span className="lg:sr-only">Remove line</span>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function RecipeIngredientEditor({
  value,
  onChange,
  itemName,
  variant = "default",
  menuPrice,
}: RecipeIngredientEditorProps) {
  const embedded = variant === "embedded";

  const initial = (() => {
    const lines = linesFromRecipe(value);
    return {
      rowKeys: lines.map((_, i) => `line-init-${i}`),
      lines,
      nextId: lines.length,
    };
  })();

  const rowIdRef = useRef(initial.nextId);
  const [rowKeys, setRowKeys] = useState<string[]>(initial.rowKeys);
  const [lines, setLines] = useState<RecipeLine[]>(initial.lines);

  const emitChange = (nextLines: RecipeLine[]) => {
    const recipe = menuRecipeToJson({
      ingredients: nextLines
        .filter((line) => line.name.trim())
        .map((line) => ({
          name: line.name.trim(),
          amount: line.amount,
          measuredBy: line.measuredBy.trim(),
          unitPrice: line.unitPrice,
        })),
    });
    onChange(recipe);
  };

  const updateLines = (nextLines: RecipeLine[]) => {
    setLines(nextLines);
    emitChange(nextLines);
  };

  const addLine = () => {
    rowIdRef.current += 1;
    const nextLines = [...lines, emptyLine()];
    setRowKeys((keys) => [...keys, `line-${rowIdRef.current}`]);
    updateLines(nextLines);
  };

  const removeLine = (index: number) => {
    setRowKeys((keys) => keys.filter((_, i) => i !== index));
    updateLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, line: RecipeLine) => {
    const next = [...lines];
    next[index] = line;
    updateLines(next);
  };

  const lineTotal = (index: number) => {
    const line = lines[index];
    if (!line) return "0.00";
    return ((Number(line.amount) || 0) * (Number(line.unitPrice) || 0)).toFixed(
      2,
    );
  };

  const servingCost = () => {
    let total = 0;
    for (const line of lines) {
      total += (Number(line.amount) || 0) * (Number(line.unitPrice) || 0);
    }
    return total.toFixed(2);
  };

  const hasLines = rowKeys.length > 0;
  const label = itemName?.trim() || "This menu item";
  const costNum = Number(servingCost());
  const priceNum = Number(menuPrice) || 0;
  const margin =
    embedded && hasLines && priceNum > 0
      ? (priceNum - costNum).toFixed(2)
      : null;

  const shellClass = embedded
    ? "space-y-3"
    : "rounded-xl border border-border/70 bg-muted/15 p-4 sm:p-5";

  return (
    <div className={shellClass}>
      {!hasLines ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/25 bg-amber-500/5 text-center",
            embedded ? "px-4 py-8" : "rounded-2xl bg-muted/15 px-6 py-10",
          )}
        >
          <div
            className={cn(
              "mb-3 flex items-center justify-center rounded-2xl bg-amber-500/10",
              embedded ? "h-12 w-12" : "mb-4 h-14 w-14",
            )}
          >
            <ChefHat
              className={cn(
                "text-amber-600/80",
                embedded ? "h-6 w-6" : "h-7 w-7",
              )}
            />
          </div>
          <p className={cn("font-semibold", embedded ? "text-base" : "text-lg")}>
            No recipe yet
          </p>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Add ingredients to track cost and profit for{" "}
            <span className="font-medium text-foreground">{label}</span>.
          </p>
          <Button
            type="button"
            variant="default"
            size={embedded ? "default" : "lg"}
            className="mt-4 gap-2 shadow-sm"
            onClick={addLine}
          >
            <Plus className="h-4 w-4" />
            Add first ingredient
          </Button>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/15 bg-amber-500/5",
              embedded ? "px-3 py-2" : "rounded-xl bg-muted/30 px-4 py-2.5",
            )}
          >
            <div className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm font-semibold">Ingredients</p>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {rowKeys.length}
              </Badge>
            </div>
            {!embedded ? (
              <p className="text-xs text-muted-foreground sm:text-sm">
                Item:{" "}
                <span className="font-medium text-foreground">{label}</span>
              </p>
            ) : null}
          </div>

          {!embedded ? <RecipeColumnHeaders embedded={false} /> : null}

          <ScrollArea
            className={cn(
              embedded ? "h-[min(28vh,240px)]" : "h-[min(42vh,420px)]",
            )}
          >
            <div className="space-y-3 pr-3 sm:pr-4">
              {rowKeys.map((key, index) =>
                embedded ? (
                  <EmbeddedRecipeLineRow
                    key={key}
                    index={index}
                    line={lines[index] ?? emptyLine()}
                    onChange={(line) => updateLine(index, line)}
                    onRemove={() => removeLine(index)}
                    lineTotal={lineTotal(index)}
                  />
                ) : (
                  <RecipeLineRow
                    key={key}
                    index={index}
                    line={lines[index] ?? emptyLine()}
                    onChange={(line) => updateLine(index, line)}
                    onRemove={() => removeLine(index)}
                    lineTotal={lineTotal(index)}
                    embedded={false}
                  />
                ),
              )}
            </div>
          </ScrollArea>

          <Button
            type="button"
            variant="outline"
            onClick={addLine}
            className="w-full border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add ingredient
          </Button>

          <div
            className={cn(
              "rounded-xl border border-amber-500/20 bg-linear-to-br from-amber-500/5 to-transparent",
              embedded ? "px-3 py-3" : "rounded-2xl border-border/70 bg-background px-5 py-4 shadow-sm",
            )}
          >
            <div
              className={cn(
                "flex flex-wrap items-end justify-between gap-3",
                embedded && margin !== null && "gap-2",
              )}
            >
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Cost per serving
                </p>
                <p
                  className={cn(
                    "font-bold tracking-tight text-amber-700 dark:text-amber-400",
                    embedded ? "text-xl" : "text-2xl",
                  )}
                >
                  {servingCost()} ETB
                </p>
              </div>
              {margin !== null ? (
                <div className="text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Est. margin
                  </p>
                  <p
                    className={cn(
                      "text-lg font-bold tabular-nums",
                      Number(margin) >= 0
                        ? "text-emerald-600"
                        : "text-destructive",
                    )}
                  >
                    {margin} ETB
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Menu {priceNum.toLocaleString()} − ingredients
                  </p>
                </div>
              ) : null}
            </div>
            {!embedded ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {rowKeys.length} ingredient line{rowKeys.length !== 1 ? "s" : ""}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
