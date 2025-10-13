'use client';

// Importamos React porque definiremos componentes y funciones que usan JSX.
import React from "react";
// Importamos los tipos de columna de TanStack Table para describir la estructura de la tabla.
import type { ColumnDef } from "@tanstack/react-table";
// Importamos los iconos para las acciones de edición y eliminación.
import { Pencil, Trash2 } from "lucide-react";
// Importamos el botón reutilizable de la librería shadcn/ui.
import { Button } from "@/components/ui/button";
// Importamos el encabezado estándar para columnas que habilita ordenamiento.
import { DataTableColumnHeader } from "@/components/data-table-column-header";

// Definimos el tipo que representa una fila de la tabla de facultades.
export type FacultyRow = {
  // Identificador interno que usamos para acciones, pero no mostramos en la tabla.
  id: number;
  // Código único de la facultad mostrado en una columna.
  codigo: string;
  // Nombre completo de la facultad mostrado en otra columna.
  nombre: string;
  // Nombre corto opcional para facilitar la lectura.
  nombre_corto: string | null;
  // Nombre del campus al que pertenece la facultad.
  campus_nombre: string;
  // Estado activo o inactivo representado como booleano.
  activo: boolean;
  // Fecha de creación en formato ISO que formatearemos en la tabla.
  creado_en: string;
};

// Esta función arma la lista de columnas que la tabla utilizará para mostrar las facultades.
export function facultyColumns(
  // Recibimos un callback para manejar la acción de edición.
  onEdit: (row: FacultyRow) => void,
  // Recibimos otro callback para manejar la acción de eliminación.
  onDelete: (row: FacultyRow) => void
): ColumnDef<FacultyRow>[] {
  // Retornamos un arreglo con la definición de cada columna.
  return [
    {
      // Esta columna toma el valor del campo código.
      accessorKey: "codigo",
      // Definimos metadatos para integraciones futuras (por ejemplo exportaciones).
      meta: { label: "Código" },
      // Renderizamos un encabezado reutilizable que soporta ordenamiento.
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Código" />
      ),
      // Impedimos que el usuario pueda ocultar esta columna porque es clave.
      enableHiding: false,
    },
    {
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
    },
    {
      accessorKey: "nombre_corto",
      meta: { label: "Nombre corto" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre corto" />
      ),
      // Cuando el nombre corto está vacío mostramos un guion para clarificar la ausencia de datos.
      cell: ({ getValue }) => getValue<string | null>() ?? "-",
    },
    {
      accessorKey: "campus_nombre",
      meta: { label: "Campus" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Campus" />
      ),
    },
    {
      accessorKey: "activo",
      meta: { label: "Estado" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      // Convertimos el booleano en un texto comprensible.
      cell: ({ getValue }) => (getValue<boolean>() ? "Activo" : "Inactivo"),
    },
    {
      accessorKey: "creado_en",
      meta: { label: "Creado en" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Creado en" />
      ),
      // Formateamos la fecha ISO a un texto corto en español.
      cell: ({ row }) => {
        // Obtenemos la fecha original.
        const iso = row.original.creado_en;
        // Intentamos crear un objeto Date valido.
        const parsed = new Date(iso);
        // Si la fecha no se puede interpretar devolvemos un guion.
        if (Number.isNaN(parsed.getTime())) {
          return "-";
        }
        // Caso contrario devolvemos el formato dd/mm/aaaa.
        return parsed.toLocaleDateString("es-BO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      },
    },
    {
      // Columna especial para botones de acción.
      id: "acciones",
      header: "Acciones",
      // Renderizamos un grupo de botones para editar o eliminar.
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(row.original)}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(row.original)}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      // Deshabilitamos el ordenamiento porque no tiene sentido para acciones.
      enableSorting: false,
      // También evitamos que se oculte ya que las acciones deben quedar accesibles.
      enableHiding: false,
    },
  ];
}
