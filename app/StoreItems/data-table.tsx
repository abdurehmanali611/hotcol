"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
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

export type DataTableRef = {
  resetRowSelection: () => void;
};

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  enableRowSelection?: boolean;
  getRowId?: (row: TData) => string;
  onRowSelectionChange?: (selectedRows: TData[]) => void;
}

function DataTableInner<TData extends { id?: number }, TValue>(
  {
    columns,
    data,
    enableRowSelection = false,
    getRowId = (row) => String(row.id ?? ""),
    onRowSelectionChange,
  }: DataTableProps<TData, TValue>,
  ref: React.ForwardedRef<DataTableRef>,
) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const lastSelectionSig = React.useRef("");

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
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label={`Select ${String((row.original as { name?: string }).name ?? "row")}`}
        />
      ),
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
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection,
    getRowId,
  });

  React.useEffect(() => {
    if (!enableRowSelection || !onRowSelectionChange) return;
    const selected = table
      .getFilteredSelectedRowModel()
      .rows.map((r) => r.original);
    const sig = selected
      .map((r) => String((r as { id?: number }).id ?? ""))
      .sort()
      .join(",");
    if (sig === lastSelectionSig.current) return;
    lastSelectionSig.current = sig;
    onRowSelectionChange(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `table` from useReactTable changes identity each render
  }, [enableRowSelection, onRowSelectionChange, rowSelection, data]);

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
    }),
    [onRowSelectionChange],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(e) =>
              table.getColumn("name")?.setFilterValue(e.target.value)
            }
            className="pl-8 h-9 shadow-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-9 gap-2">
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

      <div className="rounded-lg border bg-card shadow-sm w-full min-w-0 overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 text-[11px] font-bold uppercase tracking-wider"
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
                  className="hover:bg-muted/30 transition-colors data-[state=selected]:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
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
                  No records found for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {table.getFilteredRowModel().rows.length}
          </span>{" "}
          records
        </p>
        <div className="flex items-center space-x-2">
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
