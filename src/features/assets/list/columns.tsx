import { Eye } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { Button } from "@/components/ui/button";
import type { ColumnDef } from "@tanstack/react-table";

export type AssetRow = {
  id: number;
  nia: string;
  nombre: string;
  descripcion?: string | null;
  creado_en?: string | null;
  ambiente_id?: number | null;
  ambiente_nombre?: string | null;
  ambiente_codigo?: string | null;
};

// Generamos las columnas de la tabla de activos.
export function assetColumns(onView: (row: AssetRow) => void): ColumnDef<AssetRow>[] {
  return [
    {
      accessorKey: "nia",
      header: ({ column }) => <DataTableColumnHeader column={column} title="NIA" />,
    },
    {
      accessorKey: "nombre",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    },
    {
      accessorKey: "descripcion",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descripción" />
      ),
      cell: ({ getValue }) => {
        const value = getValue<string | null | undefined>();
        return value && value.trim().length ? value : "-";
      },
    },
    {
      accessorKey: "ambiente_nombre",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ambiente" />
      ),
      cell: ({ row }) => row.original.ambiente_nombre ?? "-",
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      // Exponemos la acción de ver también como propiedad auxiliar para facilitar pruebas.
      // @ts-expect-error: propiedad auxiliar para pruebas
      onView,
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Ver ${row.original.nombre}`}
          title="Ver detalle del activo"
          onClick={() => onView(row.original)}
        >
          <Eye className="h-4 w-4" aria-hidden />
        </Button>
      ),
    },
  ];
}
