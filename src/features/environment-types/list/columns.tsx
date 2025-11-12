"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table-column-header";

// Definimos la forma que adopta cada fila proveniente del backend.
export type EnvironmentTypeRow = {
  // id representa el identificador unico del tipo de ambiente.
  id: number;
  // nombre es el titulo principal que veran las personas usuarias.
  nombre: string;
  // descripcion describe el uso del clasificador.
  descripcion: string;
  // descripcion_corta es opcional y sirve como alias breve.
  descripcion_corta?: string | null;
  // activo indica si puede asignarse actualmente.
  activo: boolean;
  // creado_en indica cuando se registro el clasificador.
  creado_en: string;
  // actualizado_en indica la ultima modificacion.
  actualizado_en: string;
};

export function environmentTypeColumns(
  onEdit?: (environmentType: EnvironmentTypeRow) => void,
  onDelete?: (environmentType: EnvironmentTypeRow) => void
): ColumnDef<EnvironmentTypeRow>[] {
  // Retornamos la lista de columnas que la tabla necesita para mostrar el catalogo.
  return [
    {
      // Asociamos la columna con la propiedad "nombre" recibida desde la API.
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
    },
    {
      // Esta columna expone la descripcion completa del tipo de ambiente.
      accessorKey: "descripcion",
      meta: { label: "Descripcion" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descripcion" />
      ),
      cell: ({ getValue }) => {
        const value = getValue<string>() ?? "";
        return (
          <span className="block max-w-[28rem] whitespace-normal break-words">
            {value}
          </span>
        );
      },
    },
    {
      // Mostramos el alias corto o un mensaje cuando no exista valor configurado.
      accessorKey: "descripcion_corta",
      meta: { label: "Alias" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Alias" />
      ),
      cell: ({ getValue }) => getValue<string>() ?? "Sin alias",
    },
    {
      // Transformamos el indicador booleano en una etiqueta legible.
      accessorKey: "activo",
      meta: { label: "Estado" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      cell: ({ getValue }) => (getValue<boolean>() ? "Activo" : "Inactivo"),
    },
    {
      // La columna de acciones concentra los botones para editar o eliminar el registro.
      id: "acciones",
      meta: { label: "Acciones" },
      header: "Acciones",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {/* Botón para disparar la edición del tipo de ambiente. */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Editar tipo de ambiente"
            title="Editar tipo de ambiente"
            onClick={() => onEdit?.(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {/* Botón para iniciar el flujo de eliminación. */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Eliminar tipo de ambiente"
            title="Eliminar tipo de ambiente"
            onClick={() => onDelete?.(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
