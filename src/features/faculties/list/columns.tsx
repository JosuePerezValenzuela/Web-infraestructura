'use client';

import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { InventoryReportAction } from "@/features/reports/inventory/InventoryReportAction";

type FacultyCampus = {
  id: number;
  nombre: string;
};

export type FacultyRow = {
  id: number;
  codigo: string;
  nombre: string;
  nombre_corto: string | null;
  campus_ids: number[];
  campuses: FacultyCampus[];
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
      id: "campus",
      accessorFn: (row) => row.campuses.map((campus) => campus.nombre).join("\n"),
      meta: { label: "Campus" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Campus" />
      ),
      cell: ({ row }) => {
        if (row.original.campuses.length === 0) {
          return "-";
        }

        return (
          <div className="space-y-1 text-left">
            {row.original.campuses.map((campus) => (
              <div key={campus.id}>{campus.nombre}</div>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "activo",
      meta: { label: "Estado" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      sortingFn: (rowA, rowB, columnId) => {
        const labelA = rowA.getValue<boolean>(columnId) ? "Activo" : "Inactivo";
        const labelB = rowB.getValue<boolean>(columnId) ? "Activo" : "Inactivo";

        return labelA.localeCompare(labelB, "es");
      },
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
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <InventoryReportAction
            scope="facultad"
            scopeId={row.original.id}
            scopeLabel={row.original.nombre}
          />
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
