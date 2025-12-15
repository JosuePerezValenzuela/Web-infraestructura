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

// Estructura esperada del payload del dashboard global.
export const campusDashboardGlobalResponseSchema = z.object({
  schemaVersion: z.literal(1),
  filtersApplied: campusDashboardFiltersSchema,
  layout: z.object({ mode: z.literal("global") }),
  data: z.object({
    kpis: z.record(z.string(), z.unknown()).default({}),
    charts: z.record(z.string(), z.unknown()).default({}),
    table: z.object({
      rows: z.array(z.record(z.string(), z.unknown())).default([]),
    }),
  }),
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
    kpis: z.record(z.string(), z.unknown()).default({}),
    charts: z.record(z.string(), z.unknown()).default({}),
    tables: z
      .object({
        facultades: z.object({
          rows: z.array(z.record(z.string(), z.unknown())).default([]),
        }),
      })
      .partial()
      .default({}),
  }),
});

export type CampusDashboardFilters = z.infer<typeof campusDashboardFiltersSchema>;
export type CampusDashboardGlobalResponse = z.infer<
  typeof campusDashboardGlobalResponseSchema
>;
export type CampusDashboardDetailResponse = z.infer<
  typeof campusDashboardDetailResponseSchema
>;
