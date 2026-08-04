"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DataTableRef = {
  resetRowSelection: () => void;
  setRowSelectionByIds: (ids: string[]) => void;
};

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  enableRowSelection?: boolean;
  getRowId?: (row: TData) => string;
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  /** Hide search bar and column visibility controls */
  hideToolbar?: boolean;
  /** Column id used for the toolbar search filter (auto-detected when omitted). */
  searchColumnId?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  /** Initial column sort (e.g. voucher ascending). */
  initialSorting?: SortingState;
  /** Rows per page (TanStack default is 10). */
  pageSize?: number;
  /**
   * Optional footer summary rendered next to the record count. Receives the
   * rows currently visible after sorting/search filtering so totals stay in
   * sync with the in-table search box.
   */
  footerSummary?: (filteredRows: TData[]) => React.ReactNode;
  /** When set, rows with children become expandable (e.g. same-name inventory groups). */
  getSubRows?: (row: TData) => TData[] | undefined;
}

function DataTableInner<TData extends { id?: number }, TValue>(
  {
    columns,
    data,
    enableRowSelection = false,
    getRowId = (row) => String(row.id ?? ""),
    onRowSelectionChange,
    hideToolbar = false,
    searchColumnId,
    searchPlaceholder = "Search…",
    emptyMessage = "No records found for this period.",
    className,
    initialSorting,
    pageSize = 10,
    footerSummary,
    getSubRows,
  }: DataTableProps<TData, TValue>,
  ref: React.ForwardedRef<DataTableRef>,
) {
  const [sorting, setSorting] = React.useState<SortingState>(
    () => initialSorting ?? [],
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const lastSelectionSig = React.useRef("");
  // Keep notify stable across parent re-renders so selection sync is driven only by
  // rowSelection/data — not by an inline callback identity flip.
  const onRowSelectionChangeRef = React.useRef(onRowSelectionChange);
  onRowSelectionChangeRef.current = onRowSelectionChange;

  const selectColumn = React.useMemo<ColumnDef<TData, unknown>>(
    () => ({
      id: "select",
      enableHiding: false,
      size: 40,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all on this page"
        />
      ),
      cell: ({ row }) => {
        if (!row.getCanSelect()) return null;
        return (
          <Checkbox
            checked={row.getIsSelected()}
            // selectChildren: false — selecting a leaf must not cascade; parents are
            // already non-selectable, but this keeps mixed top-level + nested picks additive.
            onCheckedChange={(v) =>
              row.toggleSelected(!!v, { selectChildren: false })
            }
            aria-label={`Select ${String((row.original as { name?: string }).name ?? "row")}`}
          />
        );
      },
    }),
    [],
  );

  const mergedColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns;
    return [selectColumn, ...columns];
  }, [columns, enableRowSelection, selectColumn]);

  const table = useReactTable({
    data,
    columns: mergedColumns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, expanded },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getSubRows ? getExpandedRowModel() : undefined,
    getSubRows,
    enableRowSelection: enableRowSelection
      ? (row) => !(row.original as { isAggregated?: boolean }).isAggregated
      : false,
    getRowId,
    initialState: {
      pagination: { pageSize },
    },
  });

  React.useLayoutEffect(() => {
    const notify = onRowSelectionChangeRef.current;
    if (!enableRowSelection || !notify) return;

    // Resolve from rowSelection keys + core rowsById (includes nested leaves even
    // when the aggregated parent is not selected). Mixing top-level rows with
    // same-name group lines previously dropped one side in the batch bar/dialog.
    const rowsById = table.getCoreRowModel().rowsById;
    const selected: TData[] = [];
    const ids: string[] = [];
    for (const [id, isOn] of Object.entries(rowSelection)) {
      if (!isOn) continue;
      if (id.startsWith("agg-")) continue;
      const row = rowsById[id];
      if (!row) continue;
      if ((row.original as { isAggregated?: boolean }).isAggregated) continue;
      selected.push(row.original);
      ids.push(id);
    }
    const sig = ids.slice().sort().join(",");
    if (sig === lastSelectionSig.current) return;
    lastSelectionSig.current = sig;
    notify(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `table` from useReactTable changes identity each render
  }, [enableRowSelection, rowSelection, data]);

  React.useImperativeHandle(
    ref,
    () => ({
      resetRowSelection: () => {
        setRowSelection({});
        lastSelectionSig.current = "";
        // Must notify parent immediately: the selection-sync effect compares `sig` to
        // `lastSelectionSig`, and both are "" for an empty selection, so it would skip
        // `onRowSelectionChange([])` and leave stale batch selection in the parent.
        onRowSelectionChange?.([]);
      },
      setRowSelectionByIds: (ids: string[]) => {
        const next: RowSelectionState = {};
        for (const id of ids) next[id] = true;
        setRowSelection(next);
      },
    }),
    [onRowSelectionChange],
  );

  const searchColumn = React.useMemo(() => {
    if (hideToolbar) return undefined;

    const all = table.getAllColumns();
    const byId = (id: string) => all.find((c) => c.id === id);

    if (searchColumnId) {
      const explicit = byId(searchColumnId);
      if (explicit) return explicit;
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[DataTable] searchColumnId "${searchColumnId}" not found; using fallback. Columns: ${all.map((c) => c.id).join(", ")}`,
        );
      }
    }

    for (const candidate of [
      searchColumnId,
      "name",
      "itemName",
      "staff",
      "displayName",
    ]) {
      if (!candidate) continue;
      const col = byId(candidate);
      if (col) return col;
    }

    const firstAccessor = columns.find(
      (c) =>
        "accessorKey" in c &&
        typeof c.accessorKey === "string" &&
        c.id !== "select" &&
        c.id !== "actions",
    );
    if (firstAccessor && "accessorKey" in firstAccessor) {
      const col = byId(String(firstAccessor.accessorKey));
      if (col) return col;
    }

    return all.find((c) => c.id !== "select" && c.id !== "actions");
  }, [hideToolbar, searchColumnId, table, columns]);

  return (
    <div className={cn("space-y-4", className)}>
      {!hideToolbar ? (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {searchColumn ? (
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={(searchColumn.getFilterValue() as string) ?? ""}
            onChange={(e) => searchColumn.setFilterValue(e.target.value)}
            className="pl-8 h-9 shadow-sm"
          />
        </div>
        ) : (
          <div />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-full gap-2 sm:ml-auto sm:w-auto">
              <Settings2 className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table
              .getAllColumns()
              .filter((c) => c.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(!!v)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      ) : null}

      <div className="rounded-lg border bg-card shadow-sm w-full min-w-0 overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-9 px-2 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(
                    "hover:bg-muted/30 transition-colors data-[state=selected]:bg-muted/50",
                    row.depth > 0 && "bg-muted/25 border-l-2 border-l-primary/25",
                    (row.original as { isAggregated?: boolean }).isAggregated &&
                      "bg-muted/40 hover:bg-muted/50",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-2 py-2 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={mergedColumns.length}
                  className="h-32 text-center text-muted-foreground italic"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between sm:px-2">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
          <p className="text-xs text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {table.getFilteredRowModel().rows.length}
            </span>{" "}
            records
          </p>
          {footerSummary
            ? footerSummary(
                table.getFilteredRowModel().rows.map((r) => r.original),
              )
            : null}
        </div>
        <div className="flex items-center justify-center gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export const DataTable = React.forwardRef(DataTableInner) as <
  TData extends { id?: number },
  TValue,
>(
  props: DataTableProps<TData, TValue> & {
    ref?: React.ForwardedRef<DataTableRef>;
  },
) => React.ReactElement;
