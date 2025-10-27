"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table-column-header";

export type BlockTypeRow = {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
};

export function blockTypeColumns(): ColumnDef<BlockTypeRow>[] {
  // Retornamos el arreglo de columnas que la tabla usará para dibujar cada dato.
  return [
    {
      // Mapeamos la columna hacia la propiedad "nombre" que llega desde la API.
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      // Mostramos un encabezado reutilizando el componente compartido para mantener estilo consistente.
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
    },
    {
      // Definimos la columna que mostrará la explicación del tipo de bloque.
      accessorKey: "descripcion",
      meta: { label: "Descripción" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descripción" />
      ),
    },
    {
      // Esta columna representa el estado activo del registro.
      accessorKey: "activo",
      meta: { label: "Estado" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      // Convertimos el valor booleano en un texto legible para cualquier persona.
      cell: ({ getValue }) => (getValue<boolean>() ? "Activo" : "Inactivo"),
    },
    {
      // Agregamos una columna dedicada a las acciones para futuras operaciones sobre el registro.
      id: "acciones",
      meta: { label: "Acciones" },
      header: "Acciones",
      enableSorting: false,
      enableHiding: false,
      // Renderizamos botones que permitirán editar y eliminar el tipo de bloque cuando las historias correspondientes estén listas.
      cell: () => (
        <div className="flex items-center gap-2">
          {/* Mostramos un botón fantasma con icono de lápiz para señalar la acción futura de edición. */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Editar tipo de bloque"
            title="Editar tipo de bloque"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {/* Añadimos un botón fantasma con icono de papelera para la acción futura de eliminación. */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Eliminar tipo de bloque"
            title="Eliminar tipo de bloque"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
