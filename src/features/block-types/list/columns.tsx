"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { Badge } from "@/components/ui/badge";

export type BlockTypeRow = {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
};

export function blockTypeColumns(
  onEdit?: (blockType: BlockTypeRow) => void,
  onDelete?: (blockType: BlockTypeRow) => void
): ColumnDef<BlockTypeRow>[] {
  // Devolvemos las columnas que la tabla utiliza para presentar la informacion del catalogo.
  return [
    {
      // Asociamos la columna con la propiedad "nombre" que llega desde la API.
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
    },
    {
      // Esta columna muestra la descripcion breve del tipo de bloque.
      accessorKey: "descripcion",
      meta: { label: "Descripcion" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descripcion" />
      ),
    },
    {
      // El estado activo llega como booleano y lo transformamos en texto legible.
      accessorKey: "activo",
      meta: { label: "Estado" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      cell: ({ getValue }) => {
        const active = getValue<boolean>();
        return (
          <Badge variant={active ? "secondary" : "outline"}>
            {active ? "Activo" : "Inactivo"}
          </Badge>
        );
      },
    },
    {
      // La columna de acciones agrupa los botones disponibles por fila.
      id: "acciones",
      meta: { label: "Acciones" },
      header: "Acciones",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {/* Boton dedicado a iniciar la edicion de la fila. */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Editar tipo de bloque"
            title="Editar tipo de bloque"
            onClick={() => onEdit?.(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {/* Boton reservado para la futura funcionalidad de eliminacion. */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Eliminar tipo de bloque"
            title="Eliminar tipo de bloque"
            onClick={() => onDelete?.(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
