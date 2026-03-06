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
const dayArraySchema = z.array(z.coerce.number().int().min(0).max(5));
const slotMinutesSchema = z.coerce.number().int().refine(
  (value) => [45, 90].includes(value),
  {
    message: "slotMinutes debe ser 45 o 90",
  }
);

export const bloqueDashboardFiltersSchema = z.object({
  campusIds: z.preprocess(parseCsvNumberArray, positiveIntArraySchema).default([]),
  facultadIds: z.preprocess(parseCsvNumberArray, positiveIntArraySchema).default([]),
  bloqueIds: z.preprocess(parseCsvNumberArray, positiveIntArraySchema).default([]),
  tipoBloqueIds: z
    .preprocess(parseCsvNumberArray, positiveIntArraySchema)
    .default([]),
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
    .preprocess(
      (value) =>
        value === undefined ? [0, 1, 2, 3, 4, 5] : parseCsvDayArray(value),
      dayArraySchema
    )
    .default([0, 1, 2, 3, 4, 5]),
});

const stateCountSchema = z.object({
  activos: z.number().nonnegative(),
  inactivos: z.number().nonnegative(),
});

const utilizationRowSchema = z.object({
  bloqueId: z.number().int().positive(),
  bloqueNombre: z.string(),
  pctOcupacion: z.number().nonnegative(),
  slotsOcupados: z.number().nonnegative(),
  slotsTotales: z.number().nonnegative(),
});

const floorUtilizationRowSchema = utilizationRowSchema.extend({
  piso: z.number().nonnegative(),
});

export const bloqueDashboardGlobalResponseSchema = z.object({
  schemaVersion: z.literal(2),
  filtersApplied: bloqueDashboardFiltersSchema,
  layout: z.object({ mode: z.literal("global") }),
  data: z.object({
    kpis: z.object({
      campus: stateCountSchema,
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
      ocupacion: z.object({
        pctPromedioGlobal: z.number().nonnegative(),
      }),
    }),
    charts: z.object({
      tiposBloque: z.array(
        z.object({
          tipoBloqueId: z.number().int().positive(),
          tipoBloqueNombre: z.string(),
          cantidad: z.number().nonnegative(),
        })
      ),
      ambientesPorBloque: z.array(
        z.object({
          bloqueId: z.number().int().positive(),
          bloqueNombre: z.string(),
          ambientes: z.number().nonnegative(),
        })
      ),
      capacidadPorBloque: z.array(
        z.object({
          bloqueId: z.number().int().positive(),
          bloqueNombre: z.string(),
          capacidadTotal: z.number().nonnegative(),
          capacidadExamen: z.number().nonnegative(),
        })
      ),
      activosPorBloque: z.array(
        z.object({
          bloqueId: z.number().int().positive(),
          bloqueNombre: z.string(),
          activosAsignados: z.number().nonnegative(),
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
      ocupacionPorBloque: z.array(utilizationRowSchema),
      topBloquesUtilizacion: z.object({
        sobrecargadosTop10: z.array(utilizationRowSchema),
        subutilizadosTop10: z.array(utilizationRowSchema),
      }),
      topPisosUtilizacion: z.object({
        sobrecargadosTop10: z.array(floorUtilizationRowSchema),
        subutilizadosTop10: z.array(floorUtilizationRowSchema),
      }),
    }),
    tables: z.object({
      resumenBloques: z.array(
        z.object({
          bloqueId: z.number().int().positive(),
          bloqueNombre: z.string(),
          campusNombre: z.string(),
          facultadNombre: z.string(),
          tipoBloqueNombre: z.string(),
          pisos: z.number().nonnegative(),
          activo: z.boolean(),
          ambientes: z.number().nonnegative(),
          capacidadTotal: z.number().nonnegative(),
          capacidadExamen: z.number().nonnegative(),
          activosAsignados: z.number().nonnegative(),
          slotsOcupados: z.number().nonnegative(),
          slotsTotales: z.number().nonnegative(),
          pctOcupacion: z.number().nonnegative(),
        })
      ),
      pisosUtilizacion: z.array(
        z.object({
          bloqueId: z.number().int().positive(),
          bloqueNombre: z.string(),
          piso: z.number().nonnegative(),
          ambientes: z.number().nonnegative(),
          capacidadTotal: z.number().nonnegative(),
          capacidadExamen: z.number().nonnegative(),
          activosAsignados: z.number().nonnegative(),
          slotsOcupados: z.number().nonnegative(),
          slotsTotales: z.number().nonnegative(),
          pctOcupacion: z.number().nonnegative(),
        })
      ),
    }),
  }),
});

export type BloqueDashboardFilters = z.infer<typeof bloqueDashboardFiltersSchema>;
export type BloqueDashboardGlobalResponse = z.infer<
  typeof bloqueDashboardGlobalResponseSchema
>;
