import { describe, expect, it } from "vitest";
import {
  bloqueDashboardFiltersSchema,
  bloqueDashboardGlobalResponseSchema,
} from "@/features/bloque-dashboard/schema";

describe("bloqueDashboardFiltersSchema", () => {
  it("aplica defaults esperados cuando no recibe filtros", () => {
    const parsed = bloqueDashboardFiltersSchema.parse({});

    expect(parsed.campusIds).toEqual([]);
    expect(parsed.facultadIds).toEqual([]);
    expect(parsed.bloqueIds).toEqual([]);
    expect(parsed.tipoBloqueIds).toEqual([]);
    expect(parsed.includeInactive).toBe(true);
    expect(parsed.slotMinutes).toBe(45);
    expect(parsed.dias).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("acepta coercion y filtros validos", () => {
    const parsed = bloqueDashboardFiltersSchema.parse({
      campusIds: "1,2",
      facultadIds: ["10", "11"],
      bloqueIds: "100,101",
      tipoBloqueIds: ["1", "3"],
      includeInactive: "0",
      slotMinutes: "60",
      dias: "1,2,5",
    });

    expect(parsed.campusIds).toEqual([1, 2]);
    expect(parsed.facultadIds).toEqual([10, 11]);
    expect(parsed.bloqueIds).toEqual([100, 101]);
    expect(parsed.tipoBloqueIds).toEqual([1, 3]);
    expect(parsed.includeInactive).toBe(false);
    expect(parsed.slotMinutes).toBe(60);
    expect(parsed.dias).toEqual([1, 2, 5]);
  });

  it("rechaza slotMinutes fuera de 15|30|45|60|90", () => {
    expect(() =>
      bloqueDashboardFiltersSchema.parse({
        slotMinutes: "20",
      })
    ).toThrow();
  });

  it("rechaza dias fuera del rango 0..6", () => {
    expect(() =>
      bloqueDashboardFiltersSchema.parse({
        dias: "0,7",
      })
    ).toThrow();
  });
});

describe("bloqueDashboardGlobalResponseSchema", () => {
  it("acepta payload global valido del contrato", () => {
    const payload = {
      schemaVersion: 2,
      filtersApplied: {
        campusIds: [1],
        facultadIds: [10],
        bloqueIds: [100],
        tipoBloqueIds: [2],
        includeInactive: true,
        slotMinutes: 45,
        dias: [0, 1, 2, 3, 4, 5, 6],
      },
      layout: { mode: "global" },
      data: {
        kpis: {
          campus: { activos: 1, inactivos: 0 },
          facultades: { activos: 2, inactivos: 1 },
          bloques: { activos: 3, inactivos: 1 },
          ambientes: { activos: 10, inactivos: 2 },
          capacidad: { total: 500, examen: 430 },
          activos: { asignados: 120, noAsignadosGlobal: 20 },
          ocupacion: { pctPromedioGlobal: 63 },
        },
        charts: {
          tiposBloque: [{ tipoBloqueId: 1, tipoBloqueNombre: "Academico", cantidad: 3 }],
          ambientesPorBloque: [{ bloqueId: 100, bloqueNombre: "Bloque A", ambientes: 8 }],
          capacidadPorBloque: [
            {
              bloqueId: 100,
              bloqueNombre: "Bloque A",
              capacidadTotal: 200,
              capacidadExamen: 150,
            },
          ],
          activosPorBloque: [
            { bloqueId: 100, bloqueNombre: "Bloque A", activosAsignados: 40 },
          ],
          ocupacionHeatmapSemanal: [
            {
              dia: 1,
              franja: "07:00-07:45",
              slotsOcupados: 10,
              slotsTotales: 20,
              pctOcupacion: 50,
            },
          ],
          ocupacionPorBloque: [
            {
              bloqueId: 100,
              bloqueNombre: "Bloque A",
              slotsOcupados: 55,
              slotsTotales: 100,
              pctOcupacion: 55,
            },
          ],
          topBloquesUtilizacion: {
            sobrecargadosTop10: [
              {
                bloqueId: 100,
                bloqueNombre: "Bloque A",
                pctOcupacion: 95,
                slotsOcupados: 95,
                slotsTotales: 100,
              },
            ],
            subutilizadosTop10: [
              {
                bloqueId: 101,
                bloqueNombre: "Bloque B",
                pctOcupacion: 20,
                slotsOcupados: 20,
                slotsTotales: 100,
              },
            ],
          },
          topPisosUtilizacion: {
            sobrecargadosTop10: [
              {
                bloqueId: 100,
                bloqueNombre: "Bloque A",
                piso: 3,
                pctOcupacion: 90,
                slotsOcupados: 45,
                slotsTotales: 50,
              },
            ],
            subutilizadosTop10: [
              {
                bloqueId: 101,
                bloqueNombre: "Bloque B",
                piso: 1,
                pctOcupacion: 15,
                slotsOcupados: 6,
                slotsTotales: 40,
              },
            ],
          },
        },
        tables: {
          resumenBloques: [
            {
              bloqueId: 100,
              bloqueNombre: "Bloque A",
              campusNombre: "Central",
              facultadNombre: "Ingenieria",
              tipoBloqueNombre: "Academico",
              pisos: 4,
              activo: true,
              ambientes: 8,
              capacidadTotal: 200,
              capacidadExamen: 150,
              activosAsignados: 40,
              slotsOcupados: 55,
              slotsTotales: 100,
              pctOcupacion: 55,
            },
          ],
          pisosUtilizacion: [
            {
              bloqueId: 100,
              bloqueNombre: "Bloque A",
              piso: 1,
              ambientes: 2,
              capacidadTotal: 50,
              capacidadExamen: 40,
              activosAsignados: 10,
              slotsOcupados: 12,
              slotsTotales: 20,
              pctOcupacion: 60,
            },
          ],
        },
      },
    };

    expect(() => bloqueDashboardGlobalResponseSchema.parse(payload)).not.toThrow();
  });

  it("rechaza schemaVersion distinta de 2", () => {
    const payload = {
      schemaVersion: 1,
      filtersApplied: {
        includeInactive: true,
        slotMinutes: 45,
      },
      layout: { mode: "global" },
      data: {
        kpis: {
          campus: { activos: 0, inactivos: 0 },
          facultades: { activos: 0, inactivos: 0 },
          bloques: { activos: 0, inactivos: 0 },
          ambientes: { activos: 0, inactivos: 0 },
          capacidad: { total: 0, examen: 0 },
          activos: { asignados: 0, noAsignadosGlobal: 0 },
          ocupacion: { pctPromedioGlobal: 0 },
        },
        charts: {
          tiposBloque: [],
          ambientesPorBloque: [],
          capacidadPorBloque: [],
          activosPorBloque: [],
          ocupacionHeatmapSemanal: [],
          ocupacionPorBloque: [],
          topBloquesUtilizacion: { sobrecargadosTop10: [], subutilizadosTop10: [] },
          topPisosUtilizacion: { sobrecargadosTop10: [], subutilizadosTop10: [] },
        },
        tables: {
          resumenBloques: [],
          pisosUtilizacion: [],
        },
      },
    };

    expect(() => bloqueDashboardGlobalResponseSchema.parse(payload)).toThrow();
  });
});
