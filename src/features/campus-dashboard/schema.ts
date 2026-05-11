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

// KPIs globales según nuevo contrato.
const campusDashboardGlobalKpisSchema = z.object({
  campus: z.object({
    total: z.number().nonnegative(),
    activos: z.number().nonnegative(),
    inactivos: z.number().nonnegative(),
  }),
  facultades: z.object({
    total: z.number().nonnegative(),
    activos: z.number().nonnegative(),
    inactivos: z.number().nonnegative(),
  }),
  bloques: z.object({
    total: z.number().nonnegative(),
    activos: z.number().nonnegative(),
    inactivos: z.number().nonnegative(),
  }),
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
    sinAsignar: z.number().nonnegative(),
  }),
});

// Rankings y Distribuciones según nuevo contrato.
const campusDashboardGlobalRankingsSchema = z.object({
  porCantidadAmbientes: z.array(
    z.object({
      campusId: z.number(),
      nombre: z.string(),
      cantidad: z.number(),
    })
  ),
  porCapacidadTotal: z.array(
    z.object({
      campusId: z.number(),
      nombre: z.string(),
      capacidad: z.number(),
    })
  ),
});

const campusDashboardGlobalDistribucionesSchema = z.object({
  tiposBloquePorCampus: z.array(
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
  tiposAmbientePorCampus: z.array(
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
});

// Tabla global según nuevo contrato.
const campusDashboardGlobalPorCampusSchema = z.array(
  z.object({
    id: z.number(),
    nombre: z.string(),
    facultades: z.number(),
    bloques: z.number(),
    ambientes: z.number(),
    capacidad: z.object({
      total: z.number(),
      examen: z.number(),
    }),
    activos: z.object({
      asignados: z.number(),
      sinAsignar: z.number(),
    }),
  })
);

// Estructura esperada del payload del dashboard global.
export const campusDashboardGlobalResponseSchema = z.object({
  schemaVersion: z.literal(1),
  filtersApplied: campusDashboardFiltersSchema,
  layout: z.object({ mode: z.literal("global") }),
  data: z.object({
    kpis: campusDashboardGlobalKpisSchema,
    rankings: campusDashboardGlobalRankingsSchema,
    distribuciones: campusDashboardGlobalDistribucionesSchema,
    porCampus: campusDashboardGlobalPorCampusSchema,
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
