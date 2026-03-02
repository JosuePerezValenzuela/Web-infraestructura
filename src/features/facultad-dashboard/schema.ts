import { z } from "zod";

function parseCsvNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number.parseInt(String(item), 10))
      .filter((item) => Number.isInteger(item) && item > 0);
  }

  if (typeof value === "string") {
    if (!value.trim().length) return [];
    return value
      .split(",")
      .map((item) => Number.parseInt(item.trim(), 10))
      .filter((item) => Number.isInteger(item) && item > 0);
  }

  return [];
}

function parseCsvDayArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number.parseInt(String(item), 10))
      .filter((item) => Number.isInteger(item));
  }

  if (typeof value === "string") {
    if (!value.trim().length) return [];
    return value
      .split(",")
      .map((item) => Number.parseInt(item.trim(), 10))
      .filter((item) => Number.isInteger(item));
  }

  return [];
}

const positiveIntArraySchema = z.array(z.coerce.number().int().positive());
const dayArraySchema = z.array(z.coerce.number().int().min(0).max(6));
const slotMinutesSchema = z
  .coerce
  .number()
  .int()
  .refine((value) => [15, 30, 45, 60].includes(value), {
    message: "slotMinutes debe ser 15, 30, 45 o 60",
  });

export const facultadDashboardFiltersSchema = z.object({
  campusIds: z.preprocess(parseCsvNumberArray, positiveIntArraySchema).default([]),
  facultadIds: z.preprocess(parseCsvNumberArray, positiveIntArraySchema).default([]),
  includeInactive: z
    .preprocess((value) => {
      if (typeof value === "string") {
        if (value === "1" || value.toLowerCase() === "true") return true;
        if (value === "0" || value.toLowerCase() === "false") return false;
      }
      return value;
    }, z.boolean())
    .default(true),
  slotMinutes: z.preprocess((value) => value ?? 45, slotMinutesSchema).default(45),
  dias: z
    .preprocess((value) => (value === undefined ? [0, 1, 2, 3, 4, 5, 6] : parseCsvDayArray(value)), dayArraySchema)
    .default([0, 1, 2, 3, 4, 5, 6]),
});

const stateCountSchema = z.object({
  activos: z.number().nonnegative(),
  inactivos: z.number().nonnegative(),
});

const commonKpisSchema = z.object({
  facultades: stateCountSchema,
  bloques: stateCountSchema,
  ambientes: stateCountSchema,
  capacidad: z.object({
    total: z.number().nonnegative(),
    examen: z.number().nonnegative(),
  }),
  activos: z.object({
    asignados: z.number().nonnegative(),
    noAsignadosGlobal: z.number().nonnegative(),
  }),
});

const utilizationRowSchema = z.object({
  ambienteNombre: z.string(),
  bloqueNombre: z
    .preprocess(
      (value) => (value === null || value === undefined ? "Sin bloque" : value),
      z.string()
    ),
  pctOcupacion: z.number().nonnegative(),
  slotsOcupados: z.number().nonnegative(),
  slotsTotales: z.number().nonnegative(),
});

const commonChartsSchema = z.object({
  tiposBloque: z.array(
    z.object({
      tipoBloqueNombre: z.string(),
      cantidad: z.number().nonnegative(),
    })
  ),
  tiposAmbiente: z.array(
    z.object({
      tipoAmbienteNombre: z.string(),
      cantidad: z.number().nonnegative(),
    })
  ),
  capacidadPorBloque: z.array(
    z.object({
      bloqueNombre: z.string(),
      capacidadTotal: z.number().nonnegative(),
      capacidadExamen: z.number().nonnegative(),
    })
  ),
  activosPorBloque: z.array(
    z.object({
      bloqueNombre: z.string(),
      activosAsignados: z.number().nonnegative(),
    })
  ),
  ambientesActivosInactivosPorBloque: z.array(
    z.object({
      bloqueNombre: z.string(),
      activos: z.number().nonnegative(),
      inactivos: z.number().nonnegative(),
    })
  ),
  ocupacionHeatmapSemanal: z.array(
    z.object({
      dia: z.number().int().min(0).max(6),
      franja: z.string(),
      slotsOcupados: z.number().nonnegative(),
      slotsTotales: z.number().nonnegative(),
      pctOcupacion: z.number().nonnegative(),
    })
  ),
  ocupacionPorBloque: z.array(
    z.object({
      bloqueNombre: z.string(),
      pctOcupacion: z.number().nonnegative(),
      slotsOcupados: z.number().nonnegative(),
      slotsTotales: z.number().nonnegative(),
    })
  ),
  topAmbientesUtilizacion: z.object({
    sobrecargados: z.array(utilizationRowSchema),
    subutilizados: z.array(utilizationRowSchema),
  }),
});

const commonTablesSchema = z.object({
  resumenBloques: z.array(
    z.object({
      bloqueNombre: z.string(),
      tipoBloqueNombre: z.string(),
      pisos: z.number().nonnegative(),
      activo: z.boolean(),
      ambientes: z.number().nonnegative(),
      tiposAmbiente: z.number().nonnegative(),
      capacidadTotal: z.number().nonnegative(),
      capacidadExamen: z.number().nonnegative(),
      activosAsignados: z.number().nonnegative(),
    })
  ),
  ambientesUtilizacion: z.array(utilizationRowSchema),
});

export const facultadDashboardGlobalResponseSchema = z.object({
  schemaVersion: z.literal(2),
  filtersApplied: facultadDashboardFiltersSchema,
  layout: z.object({ mode: z.literal("global") }),
  data: z.object({
    kpis: commonKpisSchema,
    charts: commonChartsSchema,
    tables: commonTablesSchema,
  }),
});

export const facultadDashboardDetailResponseSchema = z.object({
  schemaVersion: z.literal(2),
  filtersApplied: z.object({
    facultadId: z.coerce.number().int().positive(),
    includeInactive: facultadDashboardFiltersSchema.shape.includeInactive,
    slotMinutes: slotMinutesSchema.default(45),
    dias: dayArraySchema.default([0, 1, 2, 3, 4, 5, 6]),
  }),
  layout: z.object({ mode: z.literal("detail") }),
  data: z.object({
    facultad: z.object({
      id: z.number().int().positive(),
      nombre: z.string(),
      nombreCorto: z.string().nullable().optional(),
      activo: z.boolean(),
      campusId: z.number().int().positive(),
      campusNombre: z.string(),
    }),
    kpis: commonKpisSchema,
    charts: commonChartsSchema,
    tables: commonTablesSchema,
  }),
});

export type FacultadDashboardFilters = z.infer<
  typeof facultadDashboardFiltersSchema
>;
export type FacultadDashboardGlobalResponse = z.infer<
  typeof facultadDashboardGlobalResponseSchema
>;
export type FacultadDashboardDetailResponse = z.infer<
  typeof facultadDashboardDetailResponseSchema
>;
