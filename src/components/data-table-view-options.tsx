"use client"

import { Table } from "@tanstack/react-table";
import { Button } from "./ui/button";
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu"

type Props<TData> = { table: Table<TData> };

export function DataTableViewOptions<TData>({ table }: Props<TData>) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm'>Ver</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Columnas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                    .getAllLeafColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                        const label =
                            (column.columnDef.meta as { label?: string } | undefined)?.label
                            ?? (typeof column.columnDef.header === 'string' ? column.columnDef.header : undefined)
                            ?? column.id;

                        return (
                            <DropdownMenuCheckboxItem
                                key={column.id}
                                className="capitalize"
                                checked={column.getIsVisible()}
                                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                            >
                                {label}
                            </DropdownMenuCheckboxItem>
                        );
                    })}

            </DropdownMenuContent>
        </DropdownMenu>
    );
}