'use client';

import type { ColumnDef } from "@tanstack/react-table";
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
  ];
}
