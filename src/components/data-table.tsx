'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type VisibilityState,
  type SortingState,
  type Table as ReactTableInstance,
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DataTableViewOptions } from "./data-table-view-options";
import { cn } from "@/lib/utils";

type Props<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  page: number;
  pages: number;
  onPageChange: (nextPage: number) => void;
  showViewOptions?: boolean;
  onTableReady?: (table: ReactTableInstance<TData>) => void;
  density?: "comfortable" | "compact";
  wrapCells?: boolean;
  emptyState?: {
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  page,
  pages,
  onPageChange,
  showViewOptions = true,
  onTableReady,
  density = "comfortable",
  wrapCells = true,
  emptyState,
}: Props<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility, sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
  });

  React.useEffect(() => {
    onTableReady?.(table);
  }, [table, onTableReady]);

  const rowHeightClass =
    density === "compact" ? "h-11 sm:h-12" : "h-14 sm:h-16";

  return (
    <div className="space-y-3 min-w-0">
      {showViewOptions ? (
        <div className="flex justify-end">
          <DataTableViewOptions table={table} />
        </div>
      ) : null}
      <div className="rounded-md border overflow-hidden">
        <Table className="min-w-full">
          {/* Encabezado de la tabla */}
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow
                key={hg.id}
                className="bg-muted/80 text-muted-foreground"
              >
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-normal break-words"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          {/* Cuerpo de la tabla */}
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "border-b last:border-0 transition hover:bg-muted/90 hover:shadow-sm",
                    rowHeightClass
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "align-middle px-4 text-sm text-foreground text-center",
                        wrapCells && "whitespace-normal break-words"
                      )}
                    >
                      <div className="min-w-0 flex justify-center">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyState ? (
                    <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                      <p className="text-base font-medium text-foreground">
                        {emptyState.title}
                      </p>
                      {emptyState.description ? (
                        <p className="text-sm text-muted-foreground">
                          {emptyState.description}
                        </p>
                      ) : null}
                      {emptyState.action}
                    </div>
                  ) : (
                    "No se encontraron datos."
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginacion simple */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <PaginationPrevious />
            </Button>
          </PaginationItem>

          <span className="px-2 text-sm">
            Pagina {page} de {pages}
          </span>

          <PaginationItem>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
            >
              <PaginationNext />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
