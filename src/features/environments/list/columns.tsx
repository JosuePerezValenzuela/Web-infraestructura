"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Clock3, Link2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { Badge } from "@/components/ui/badge";

type BaseEnvironmentRow = {
  id: number;
  codigo: string;
  nombre: string;
  piso: number;
  clases: boolean;
  activo: boolean;
  bloque_id: number;
  tipo_ambiente_id: number;
  capacidad?: Record<string, unknown> | string | null;
};

export type EnvironmentRow = BaseEnvironmentRow & Record<string, unknown>;

function resolveRelatedLabel(
  row: EnvironmentRow,
  options: { directKeys: string[]; relationKeys?: string[]; fallback?: string }
): string {
  // Convertimos la fila completa en un registro flexible para acceder a propiedades dinamicas.
  const record = row as Record<string, unknown>;
  // Recorremos las claves directas que podrian tener el texto ya listo.
  for (const key of options.directKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length) {
      return value.trim();
    }
  }
  // Si no encontramos nada directo revisamos si existe un objeto relacionado que contenga el nombre.
  for (const relationKey of options.relationKeys ?? []) {
    const relation = record[relationKey];

    if (relation && typeof relation === "object" && !Array.isArray(relation)) {
      const relationRecord = relation as Record<string, unknown>;
      const candidate =
        relationRecord.nombre ??
        relationRecord.nombre_corto ??
        relationRecord.nombreCorto ??
        relationRecord.descripcion ??
        relationRecord.codigo;
      if (typeof candidate === "string" && candidate.trim().length) {
        return candidate.trim();
      }
    }
  }
  // Si ninguna ruta funciono devolvemos el texto de respaldo configurado.
  return options.fallback ?? "-";
}

type CapacityValues = {
  total: number | null;
  exam: number | null;
};

function parseCapacityRecord(
  row: EnvironmentRow
): Record<string, unknown> | null {
  const record = row as Record<string, unknown>;
  const rawValue =
    record.capacidad ??
    record.capacidad_total ??
    record.capacity ??
    record.capacidadJson;

  if (!rawValue) {
    return null;
  }

  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue) as Record<string, unknown>;
      return parsed;
    } catch {
      return null;
    }
  }

  if (typeof rawValue === "object" && !Array.isArray(rawValue)) {
    return rawValue as Record<string, unknown>;
  }

  return null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function getCapacityValues(row: EnvironmentRow): CapacityValues | null {
  const parsed = parseCapacityRecord(row);
  if (!parsed) {
    return null;
  }

  const totalValue =
    parsed.total ?? parsed.capacidad_total ?? parsed.totalGeneral;

  const examValue = parsed.examen ?? parsed.examenes ?? parsed.capacidad_examen;
  const total = toNumberOrNull(totalValue);
  const exam = toNumberOrNull(examValue);

  if (total === null && exam === null) {
    return null;
  }

  return { total, exam };
}

export function environmentColumns(
  onEdit?: (row: EnvironmentRow) => void,
  onDelete?: (row: EnvironmentRow) => void,
  onAssociateAssets?: (row: EnvironmentRow) => void,
  onAssignSchedules?: (row: EnvironmentRow) => void
): ColumnDef<EnvironmentRow>[] {
  // Construimos y devolvemos la configuracion completa de columnas para la tabla de ambientes.
  return [
    {
      // Presentamos el codigo publico que identifica rapidamente al ambiente.
      accessorKey: "codigo",
      meta: { label: "Codigo" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Codigo" />
      ),
      enableHiding: false,
    },
    {
      // Mostramos el nombre completo utilizado en reportes formales.
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
    },
    {
      // Exponemos el tipo de ambiente segun el catalogo para entender su uso.
      id: "tipo_ambiente",
      meta: { label: "Tipo de ambiente" },
      accessorFn: (row) =>
        resolveRelatedLabel(row, {
          directKeys: [
            "tipo_ambiente",
            "tipoAmbiente",
            "tipo_ambiente_nombre",
            "tipoAmbienteNombre",
          ],
          relationKeys: [
            "tipo_ambiente_detalle",
            "tipoAmbienteDetalle",
            "tipoAmbiente",
          ],
          fallback: "-",
        }),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tipo" />
      ),
      cell: ({ row }) =>
        resolveRelatedLabel(row.original, {
          directKeys: [
            "tipo_ambiente",
            "tipoAmbiente",
            "tipo_ambiente_nombre",
            "tipoAmbienteNombre",
          ],
          relationKeys: [
            "tipo_ambiente_detalle",
            "tipoAmbienteDetalle",
            "tipoAmbiente",
          ],
          fallback: "-",
        }),
    },
    {
      // Indicamos el bloque al que pertenece para mantener el contexto fisico.
      id: "bloque",
      meta: { label: "Bloque" },
      accessorFn: (row) =>
        resolveRelatedLabel(row, {
          directKeys: [
            "bloque",
            "bloque_nombre",
            "bloqueNombre",
            "bloque_label",
          ],
          relationKeys: ["bloque_detalle", "bloqueDetalle", "bloqueInfo"],
          fallback: "-",
        }),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Bloque" />
      ),
      cell: ({ row }) =>
        resolveRelatedLabel(row.original, {
          directKeys: [
            "bloque",
            "bloque_nombre",
            "bloqueNombre",
            "bloque_label",
          ],
          relationKeys: ["bloque_detalle", "bloqueDetalle", "bloqueInfo"],
          fallback: "-",
        }),
    },
    {
      // Reproducimos el numero de piso que ayuda a ubicarlo en el edificio.
      accessorKey: "piso",
      meta: { label: "Piso" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Piso" />
      ),
    },
    {
      // Mostramos la capacidad total y de examenes en un formato compacto.
      id: "capacidad",
      meta: { label: "Capacidad" },
      accessorFn: (row) => {
        const capacity = getCapacityValues(row);
        return capacity?.total ?? capacity?.exam ?? 0; // Usamos la capacidad total como criterio de ordenamiento.
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Capacidad" />
      ),
      cell: ({ row }) => {
        const capacity = getCapacityValues(row.original);
        if (!capacity) {
          return (
            <span className="text-sm text-muted-foreground">Sin datos</span>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="w-fit justify-start">
              Total: {capacity.total ?? 0}
            </Badge>
            <Badge variant="outline" className="w-fit justify-start">
              Examen: {capacity.exam ?? 0}
            </Badge>
          </div>
        );
      },
    },
    {
      // Visibilizamos si el espacio esta habilitado para dictar clases.
      accessorKey: "clases",
      meta: { label: "Uso academico" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Uso" />
      ),
      cell: ({ getValue }) => {
        const teaches = getValue<boolean>();
        return (
          <Badge variant={teaches ? "secondary" : "outline"}>
            {teaches ? "Dicta clases" : "No dicta clases"}
          </Badge>
        );
      },
    },
    {
      // Indicamos el estado activo/inactivo para planificar mejor las asignaciones.
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
      // Agregamos la columna que agrupa las acciones solicitadas (editar/eliminar).
      id: "acciones",
      meta: { label: "Acciones" },
      header: "Acciones",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Asignar horarios"
            title="Asignar horarios"
            onClick={() => onAssignSchedules?.(row.original)}
          >
            <Clock3 className="h-4 w-4" aria-hidden />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Asociar activos"
            title="Asociar activos"
            onClick={() => onAssociateAssets?.(row.original)}
          >
            <Link2 className="h-4 w-4" aria-hidden />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Editar ambiente"
            title="Editar ambiente"
            onClick={() => onEdit?.(row.original)}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Eliminar ambiente"
            title="Eliminar ambiente"
            onClick={() => onDelete?.(row.original)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ),
    },
  ];
}
