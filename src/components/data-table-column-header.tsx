import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Column } from "@tanstack/react-table";

export function DataTableColumnHeader<T>({
    column,
    title,
}: {
    column: Column<T, unknown>;
    title: string;
}) {
    return (
        <Button
          variant='ghost'
          className="px-0 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
            {title}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    )
}