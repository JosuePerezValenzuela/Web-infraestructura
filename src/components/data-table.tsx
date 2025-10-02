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
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious
} from '@/components/ui/pagination';
import { DataTableViewOptions } from './data-table-view-options';

type Props<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    page: number;
    pages: number;
    onPageChange: (nextPage: number) => void;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    page,
    pages,
    onPageChange
}: Props<TData, TValue>) {
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
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

    return (
        <div className='space-y-3'>
            <DataTableViewOptions table={table} />
            <div className='rounded-md border'>
                <Table>
                    {/* Encabezado de la tabla*/}
                    <TableHeader>
                        {table.getHeaderGroups().map( hg => (
                            <TableRow key={hg.id}>
                                {hg.headers.map( header => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    {/* Cuerpo de la tabla */}
                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map( row => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className='text-center py-8'>
                                    No se encontraron datos.
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
                            variant='outline'
                            size='sm'
                            disabled={page <= 1}
                            onClick={() => onPageChange(page - 1)}
                        >
                            <PaginationPrevious />
                        </Button>
                    </PaginationItem>

                    <span className='px-2 text-sm'>Pagina {page} de {pages}</span>

                    <PaginationItem>
                        <Button
                            variant='outline'
                            size='sm'
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