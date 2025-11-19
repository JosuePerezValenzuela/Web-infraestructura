"use client";

import type { EnvironmentUpdateInput } from "../schema";

type JsonRecord = Record<string, unknown>;

export type EnvironmentDetail = {
  id: number;
  codigo?: string | null;
  nombre?: string | null;
  nombre_corto?: string | null;
  piso?: unknown;
  clases?: boolean | null;
  activo?: boolean | null;
  tipo_ambiente_id?: number | null;
  tipoAmbienteId?: number | null;
  bloque_id?: number | null;
  bloqueId?: number | null;
  capacidad?: unknown;
  capacidad_total?: unknown;
  capacidad_examen?: unknown;
  dimension?: unknown;
  dimension_largo?: unknown;
  dimension_ancho?: unknown;
  dimension_alto?: unknown;
  dimension_unidad?: unknown;
} & Record<string, unknown>;

// Esta funcion intenta convertir cualquier valor flexible en un objeto JSON usable.
function parseRecord(value: unknown): JsonRecord | null {
  // Si recibimos un string asumimos que es JSON y lo intentamos convertir.
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as JsonRecord;
    } catch {
      return null;
    }
  }

  // Cuando ya viene como objeto lo devolvemos directamente.
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return null;
}

// Esta rutina busca la primera clave disponible dentro de un objeto para obtener su valor.
function resolveFromRecord(
  record: JsonRecord | null,
  keys: string[]
): unknown {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    // Recorremos cada clave candidata respetando el orden de prioridad.
    if (key in record) {
      const candidate = record[key];
      if (candidate !== undefined) {
        return candidate;
      }
    }
  }

  return undefined;
}

// Convierte numeros o strings en un valor textual amigable para el formulario.
function toFormValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed;
  }

  return "";
}

// Algunas APIs devuelven unidades vacias, asi que aseguramos el valor "metros".
function toUnitValue(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "metros";
}

function resolveNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function resolveRelationId(
  record: Record<string, unknown>,
  relationKeys: string[]
): number | null {
  for (const relationKey of relationKeys) {
    const relation = record[relationKey];
    if (relation && typeof relation === "object" && !Array.isArray(relation)) {
      const relationRecord = relation as Record<string, unknown>;
      const candidate = resolveNumber(
        relationRecord.id ?? relationRecord.ID ?? relationRecord.Id
      );
      if (candidate !== null) {
        return candidate;
      }
    }
  }
  return null;
}

// Esta funcion traduce el detalle del backend en los valores que espera React Hook Form.
export function mapEnvironmentDetailToFormValues(
  detail: EnvironmentDetail
): EnvironmentUpdateInput {
  // Convertimos el detalle a un registro para leer propiedades dinamicas como *_json.
  const record = detail as Record<string, unknown>;

  // Leemos la capacidad desde distintos formatos posibles.
  const capacityRecord =
    parseRecord(detail.capacidad) ??
    parseRecord(record["capacidad_json"]) ??
    parseRecord(record["capacidadJson"]) ??
    null;

  // Repetimos el proceso para las dimensiones del ambiente.
  const dimensionRecord =
    parseRecord(detail.dimension) ??
    parseRecord(record["dimension_json"]) ??
    parseRecord(record["dimensionJson"]) ??
    null;

  // Extraemos el total y el valor para examenes revisando todas las claves conocidas.
  const capacityTotalValue =
    resolveFromRecord(capacityRecord, ["total", "capacidad_total", "totalGeneral"]) ??
    detail.capacidad_total;
  const capacityExamValue =
    resolveFromRecord(capacityRecord, ["examen", "capacidad_examen", "examenes"]) ??
    detail.capacidad_examen;

  // Normalizamos los atributos geométricos (largo, ancho, alto y unidad).
  const dimensionLengthValue =
    resolveFromRecord(dimensionRecord, ["largo", "dimension_largo"]) ??
    detail.dimension_largo;
  const dimensionWidthValue =
    resolveFromRecord(dimensionRecord, ["ancho", "dimension_ancho"]) ??
    detail.dimension_ancho;
  const dimensionHeightValue =
    resolveFromRecord(dimensionRecord, ["alto", "dimension_alto"]) ??
    detail.dimension_alto;
  const dimensionUnitValue =
    resolveFromRecord(dimensionRecord, ["unid_med", "unidad", "dimension_unidad"]) ??
    detail.dimension_unidad;

  // Finalmente devolvemos la estructura que entiende el formulario, siempre como strings seguros.
  return {
    codigo: detail.codigo ?? "",
    nombre: detail.nombre ?? "",
    nombre_corto: detail.nombre_corto ?? "",
    piso: toFormValue(detail.piso),
    clases: Boolean(detail.clases ?? true),
    activo: Boolean(detail.activo ?? true),
    capacidad_total: toFormValue(capacityTotalValue),
    capacidad_examen: toFormValue(capacityExamValue),
    dimension_largo: toFormValue(dimensionLengthValue),
    dimension_ancho: toFormValue(dimensionWidthValue),
    dimension_alto: toFormValue(dimensionHeightValue),
    dimension_unidad: toUnitValue(dimensionUnitValue),
    tipo_ambiente_id: (() => {
      const raw =
        detail.tipo_ambiente_id ??
        detail.tipoAmbienteId ??
        resolveFromRecord(record, ["tipo_ambiente_id", "tipoAmbienteId"]) ??
        resolveRelationId(record, [
          "tipo_ambiente",
          "tipoAmbiente",
          "tipo_ambiente_detalle",
          "tipoAmbienteDetalle",
        ]);
      const parsed = resolveNumber(raw);
      return parsed !== null ? String(parsed) : "";
    })(),
    bloque_id: (() => {
      const raw =
        detail.bloque_id ??
        detail.bloqueId ??
        resolveFromRecord(record, ["bloque_id", "bloqueId"]) ??
        resolveRelationId(record, ["bloque", "bloque_detalle", "bloqueDetalle"]);
      const parsed = resolveNumber(raw);
      return parsed !== null ? String(parsed) : "";
    })(),
  };
}
