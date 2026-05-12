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

const positiveIntArraySchema = z.array(z.coerce.number().int().positive());

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
});

const stateCountSchema = z.object({
  total: z.number().nonnegative(),
  activos: z.number().nonnegative(),
  inactivos: z.number().nonnegative(),
});

const commonKpisSchema = z.object({
  facultades: stateCountSchema.optional(),
  bloques: stateCountSchema,
  ambientes: stateCountSchema,
  capacidad: z.object({
    total: z.number().nonnegative(),
    examen: z.number().nonnegative(),
  }),
  activos: z.object({
    asignados: z.number().nonnegative(),
    sinAsignarGlobal: z.number().nonnegative(),
  }),
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
});

const commonTablesSchema = z.object({
  resumenBloques: z.array(
    z.object({
      bloqueId: z.number().int().positive().optional(),
      bloqueNombre: z.string(),
      facultadNombre: z.string().optional(),
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

// Schema para modo detail (nuevo contrato)
const facultadDashboardDetailDataSchema = z.object({
  facultad: z.object({
    id: z.number().int().positive(),
    nombre: z.string(),
    nombreCorto: z.string().nullable().optional(),
    activo: z.boolean().optional(),
    campusId: z.number().int().positive(),
    campusNombre: z.string(),
  }),
  kpis: commonKpisSchema,
  rankings: z.object({
    porCantidadAmbientes: z.array(
      z.object({
        bloqueId: z.number(),
        nombre: z.string(),
        cantidad: z.number(),
      })
    ),
    porCapacidadTotal: z.array(
      z.object({
        bloqueId: z.number(),
        nombre: z.string(),
        capacidad: z.number(),
      })
    ),
  }),
  distribuciones: z.object({
    tiposAmbientePorBloque: z.array(
      z.object({
        nombre: z.string(),
        cantidadTotal: z.number(),
        tipos: z.array(
          z.object({
            tipo: z.string().nullable(),
            cantidad: z.number(),
          })
        ),
      })
    ),
  }),
  porBloque: z.array(
    z.object({
      id: z.number(),
      nombre: z.string(),
      ambientes: z.number(),
      capacidad: z.object({
        total: z.number(),
        examen: z.number(),
      }),
      activos: z.object({
        asignados: z.number(),
      }),
    })
  ),
});

export const facultadDashboardDetailResponseSchema = z.object({
  schemaVersion: z.literal(2),
  filtersApplied: z.object({
    facultadId: z.coerce.number().int().positive(),
    includeInactive: z.boolean(),
  }),
  layout: z.object({ mode: z.literal("detail") }),
  data: facultadDashboardDetailDataSchema,
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
