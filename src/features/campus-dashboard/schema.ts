import { z } from "zod";

// Filtros comunes para ambas vistas del dashboard (admiten strings en query params).
export const campusDashboardFiltersSchema = z.object({
  campusIds: z
    .array(z.coerce.number().int().positive())
    .default([]),
  includeInactive: z
    .preprocess(
      (value) => {
        if (typeof value === "string") {
          return value === "true";
        }
        return value;
      },
      z.boolean()
    )
    .default(true),
});

// KPIs globales según contrato v1.
const campusDashboardGlobalKpisSchema = z.object({
  campus: z.object({
    activos: z.number().nonnegative(),
    inactivos: z.number().nonnegative(),
  }),
  facultades: z.object({
    activos: z.number().nonnegative(),
    inactivos: z.number().nonnegative(),
  }),
  bloques: z.object({
    activos: z.number().nonnegative(),
    inactivos: z.number().nonnegative(),
  }),
  ambientes: z.object({
    activos: z.number().nonnegative(),
    inactivos: z.number().nonnegative(),
  }),
  capacidad: z.object({
    total: z.number().nonnegative(),
    examen: z.number().nonnegative(),
  }),
  activos: z.object({
    total: z.number().nonnegative(),
    asignados: z.number().nonnegative(),
    noAsignadosGlobal: z.number().nonnegative(),
  }),
});

// Charts globales según contrato v1.
const campusDashboardGlobalChartsSchema = z.object({
  rankingAmbientesPorCampus: z.array(
    z.object({
      campusId: z.number().nullable(),
      campusNombre: z.string(),
      ambientes: z.number(),
      pctGlobal: z.number(),
    })
  ),
  capacidadTotalPorCampus: z.array(
    z.object({
      campusId: z.number().nullable(),
      campusNombre: z.string(),
      capacidadTotal: z.number(),
      pctGlobal: z.number().optional(),
    })
  ),
  capacidadExamenPorCampus: z.array(
    z.object({
      campusId: z.number().nullable(),
      campusNombre: z.string(),
      capacidadExamen: z.number(),
      pctGlobal: z.number().optional(),
    })
  ),
  activosPorCampus: z.array(
    z.object({
      campusId: z.number().nullable(),
      campusNombre: z.string(),
      asignados: z.number(),
      noAsignados: z.number(),
      pctGlobal: z.number().optional(),
    })
  ),
  ambientesActivosInactivosPorCampus: z.array(
    z.object({
      campusId: z.number().nullable(),
      campusNombre: z.string(),
      activos: z.number(),
      inactivos: z.number(),
    })
  ),
});

// Tabla global según contrato v1.
const campusDashboardGlobalTableSchema = z.object({
  campusResumen: z.array(
    z.object({
      campusId: z.number(),
      campusNombre: z.string(),
      facultades: z.number(),
      bloques: z.number(),
      tiposBloque: z.number(),
      ambientes: z.number(),
      tiposAmbiente: z.number(),
      capacidadTotal: z.number(),
      capacidadExamen: z.number(),
      activosAsignados: z.number(),
    })
  ),
});

// Estructura esperada del payload del dashboard global.
export const campusDashboardGlobalResponseSchema = z.object({
  schemaVersion: z.literal(1),
  filtersApplied: campusDashboardFiltersSchema,
  layout: z.object({ mode: z.literal("global") }),
  data: z.object({
    kpis: campusDashboardGlobalKpisSchema,
    charts: campusDashboardGlobalChartsSchema,
    table: campusDashboardGlobalTableSchema,
  }),
});

// KPIs detalle según contrato v1.
const campusDashboardDetailKpisSchema = z.object({
  facultades: z.object({
    activos: z.number().nonnegative(),
    inactivos: z.number().nonnegative(),
  }),
  bloques: z.object({
    activos: z.number().nonnegative(),
    inactivos: z.number().nonnegative(),
  }),
  ambientes: z.object({
    activos: z.number().nonnegative(),
    inactivos: z.number().nonnegative(),
  }),
  capacidad: z.object({
    total: z.number().nonnegative(),
    examen: z.number().nonnegative(),
  }),
  activos: z.object({
    asignados: z.number().nonnegative(),
    noAsignadosGlobal: z.number().nonnegative(),
  }),
});

// Charts detalle según contrato v1.
const campusDashboardDetailChartsSchema = z.object({
  tiposBloque: z.array(
    z.object({
      tipoBloqueId: z.number(),
      tipoBloqueNombre: z.string(),
      cantidad: z.number(),
    })
  ),
  tiposAmbiente: z.array(
    z.object({
      tipoAmbienteId: z.number(),
      tipoAmbienteNombre: z.string(),
      cantidad: z.number(),
    })
  ),
});

// Tablas detalle según contrato v1.
const campusDashboardDetailTablesSchema = z.object({
  facultadesResumen: z.array(
    z.object({
      facultadId: z.number(),
      facultadNombre: z.string(),
      bloques: z.number(),
      tiposBloque: z.number(),
      ambientes: z.number(),
      tiposAmbiente: z.number(),
      capacidadTotal: z.number(),
      capacidadExamen: z.number(),
      activosAsignados: z.number(),
    })
  ),
});

// Estructura esperada del payload del dashboard detalle.
export const campusDashboardDetailResponseSchema = z.object({
  schemaVersion: z.literal(1),
  filtersApplied: campusDashboardFiltersSchema
    .extend({
      campusId: z.coerce.number().int().positive(),
    })
    .partial({
      campusIds: true,
    }),
  layout: z.object({ mode: z.literal("detail") }),
  data: z.object({
    campus: z
      .object({
        id: z.number(),
        nombre: z.string(),
        activo: z.boolean().optional(),
      })
      .optional(),
    kpis: campusDashboardDetailKpisSchema,
    charts: campusDashboardDetailChartsSchema,
    tables: campusDashboardDetailTablesSchema,
  }),
});

export type CampusDashboardFilters = z.infer<typeof campusDashboardFiltersSchema>;
export type CampusDashboardGlobalResponse = z.infer<
  typeof campusDashboardGlobalResponseSchema
>;
export type CampusDashboardDetailResponse = z.infer<
  typeof campusDashboardDetailResponseSchema
>;
