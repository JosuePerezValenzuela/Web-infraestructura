"use client";

import type { ColumnDef } from "@tanstack/react-table"; // Importamos el tipo que describe las columnas de la tabla.
import { Pencil, Trash2 } from "lucide-react"; // Usamos íconos claros para las acciones disponibles.
import { Button } from "@/components/ui/button"; // Botón reutilizable que mantiene la identidad visual del sistema.
import { DataTableColumnHeader } from "@/components/data-table-column-header"; // Encabezado que habilita ordenamiento accesible.
import { Badge } from "@/components/ui/badge";

type BaseBlockRow = {
  id: number; // Identificador único que utilizaremos más adelante para editar o eliminar.
  codigo: string; // Código público del bloque.
  nombre: string; // Nombre completo.
  nombre_corto: string | null; // Nombre corto opcional.
  pisos: number; // Cantidad de pisos construidos.
  activo: boolean; // Estado lógico del bloque.
  facultad_id: number; // Identificador interno de la facultad.
  tipo_bloque_id: number; // Identificador interno del tipo de bloque.
  creado_en: string; // Fecha ISO con el momento de creación.
};

// Extendemos con un índice flexible para cubrir los distintos formatos que puede enviar el backend (snake_case, camelCase u objetos anidados).
export type BlockRow = BaseBlockRow & Record<string, unknown>;

function resolveRelatedLabel(
  row: BlockRow,
  options: { directKeys: string[]; relationKeys?: string[]; fallback?: string }
): string {
  const record = row as Record<string, unknown>;

  for (const key of options.directKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length) {
      return value;
    }
  }

  for (const key of options.relationKeys ?? []) {
    const relation = record[key];
    if (
      relation &&
      typeof relation === "object" &&
      !Array.isArray(relation)
    ) {
      const relationRecord = relation as Record<string, unknown>;
      const nestedValue =
        relationRecord.nombre ??
        relationRecord.nombre_corto ??
        relationRecord.nombreCorto ??
        relationRecord.descripcion ??
        relationRecord.codigo;

      if (typeof nestedValue === "string" && nestedValue.trim().length) {
        return nestedValue;
      }
    }
  }

  return options.fallback ?? "-";
}

// Obtiene el nombre visible de la facultad para reutilizar en celdas y ordenamiento.
const getFacultyLabel = (row: BlockRow) =>
  resolveRelatedLabel(row, {
    directKeys: [
      "facultad",
      "facultad_nombre",
      "facultadName",
      "facultad_label",
    ],
    relationKeys: [
      "facultad_detalle",
      "facultadInfo",
      "facultad_relacion",
      "facultadData",
    ],
    fallback: "-",
  });

// Obtiene el nombre visible del tipo de bloque para reutilizar en celdas y ordenamiento.
const getBlockTypeLabel = (row: BlockRow) =>
  resolveRelatedLabel(row, {
    directKeys: [
      "tipo_bloque",
      "tipoBloque",
      "tipo_bloque_nombre",
      "tipoBloqueNombre",
    ],
    relationKeys: [
      "tipo_bloque_detalle",
      "tipoBloqueInfo",
      "tipo_bloque_relacion",
      "tipoBloqueData",
    ],
    fallback: "-",
  });

// Definimos las columnas que la tabla necesita para representar cada bloque.
export function blockColumns(
  onEdit: (row: BlockRow) => void,
  onDelete: (row: BlockRow) => void
): ColumnDef<BlockRow>[] {
  // Devolvemos el arreglo con cada columna declarada explícitamente.
  return [
    {
      // Mostramos el código legible que identifica rápidamente a cada bloque.
      accessorKey: "codigo",
      meta: { label: "Código" },
      header: ({ column }) => (
        // Utilizamos el encabezado genérico para habilitar ordenar por código.
        <DataTableColumnHeader column={column} title="Código" />
      ),
      enableHiding: false, // Este campo siempre debe estar visible para facilitar búsquedas manuales.
    },
    {
      // Nombre completo del bloque para las descripciones formales.
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
    },
    {
      // Número de pisos construido.
      accessorKey: "pisos",
      meta: { label: "Pisos" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Pisos" />
      ),
    },
    {
      // Facultad propietaria.
      id: "facultad",
      accessorFn: (row) => getFacultyLabel(row),
      meta: { label: "Facultad" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Facultad" />
      ),
      cell: ({ getValue }) => getValue<string>(),
    },
    {
      // Tipo de bloque según el catálogo.
      id: "tipo_bloque",
      accessorFn: (row) => getBlockTypeLabel(row),
      meta: { label: "Tipo de bloque" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tipo de bloque" />
      ),
      cell: ({ getValue }) => getValue<string>(),
    },
    {
      // Estado lógico transformado en un texto fácil de entender.
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
      // Columna final que agrupa las acciones disponibles sobre cada fila.
      id: "acciones",
      meta: { label: "Acciones" },
      header: "Acciones",
      enableSorting: false, // No tiene sentido ordenar por acciones.
      enableHiding: false, // Siempre debe estar visible para mantener la usabilidad.
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {/* Botón para editar el bloque seleccionado. */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Editar bloque"
            title="Editar bloque"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          {/* Botón para iniciar el flujo de eliminación del bloque. */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Eliminar bloque"
            title="Eliminar bloque"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ),
    },
  ];
}
