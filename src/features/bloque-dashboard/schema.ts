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
});

const stateCountSchema = z.object({
  activos: z.number().nonnegative(),
  inactivos: z.number().nonnegative(),
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
        })
      ),
    }),
  }),
});

// Bloque detail KPIs (nuevo contrato schemaVersion 2)
const bloqueDetailKpisSchema = z.object({
  ambientes: z.object({
    total: z.number().nonnegative(),
    activos: z.number().nonnegative(),
    inactivos: z.number().nonnegative(),
  }),
  capacidad: z.object({
    total: z.number().nonnegative(),
    examen: z.number().nonnegative(),
  }),
  activos: z.object({
    asignados: z.number().nonnegative(),
    sinAsignarGlobal: z.number().nonnegative(),
  }),
});

// Bloque detail response
export const bloqueDashboardDetailResponseSchema = z.object({
  schemaVersion: z.literal(2),
  filtersApplied: z.object({
    bloqueId: z.coerce.number().int().positive(),
    includeInactive: z.boolean(),
  }),
  layout: z.object({ mode: z.literal("detail") }),
  data: z.object({
    bloque: z.object({
      id: z.number(),
      nombre: z.string(),
      nombreCorto: z.string().nullable(),
      activo: z.boolean(),
      pisos: z.number(),
      tipoBloqueId: z.number(),
      tipoBloqueNombre: z.string(),
      facultadId: z.number(),
      facultadNombre: z.string(),
      campusId: z.number(),
      campusNombre: z.string(),
    }),
    kpis: bloqueDetailKpisSchema,
    charts: z.object({
      tiposAmbiente: z.array(
        z.object({
          tipo: z.string(),
          cantidad: z.number().nonnegative(),
        })
      ),
    }),
    porAmbiente: z.array(
      z.object({
        id: z.number(),
        nombre: z.string(),
        piso: z.number(),
        capacidad: z.object({
          total: z.number(),
          examen: z.number(),
        }),
        tipoAmbiente: z.string(),
        activos: z.object({
          asignados: z.number(),
        }),
      })
    ),
  }),
});

export type BloqueDashboardFilters = z.infer<typeof bloqueDashboardFiltersSchema>;
export type BloqueDashboardGlobalResponse = z.infer<
  typeof bloqueDashboardGlobalResponseSchema
>;
export type BloqueDashboardDetailResponse = z.infer<
  typeof bloqueDashboardDetailResponseSchema
>;
