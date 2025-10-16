'use client';

import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table-column-header";

export type FacultyRow = {
  id: number;
  codigo: string;
  nombre: string;
  nombre_corto: string | null;
  campus_nombre: string;
  activo: boolean;
  creado_en: string;
  campus_id: number;
  lat: number | null;
  lng: number | null;
};

export function facultyColumns(
  onEdit: (row: FacultyRow) => void,
  onDelete: (row: FacultyRow) => void
): ColumnDef<FacultyRow>[] {
  return [
    {
      accessorKey: "codigo",
      meta: { label: "Código" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Código" />
      ),
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
      cell: ({ getValue }) => (getValue<boolean>() ? "Activo" : "Inactivo"),
    },
    {
      accessorKey: "creado_en",
      meta: { label: "Creado en" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Creado en" />
      ),
      cell: ({ row }) => {
        const iso = row.original.creado_en;
        const parsed = new Date(iso);
        if (Number.isNaN(parsed.getTime())) {
          return "-";
        }
        return parsed.toLocaleDateString("es-BO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      },
    },
    {
      id: "acciones",
      header: "Acciones",
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
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
