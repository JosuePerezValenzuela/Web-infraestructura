import { describe, expect, it } from "vitest";
import {
  facultadDashboardDetailResponseSchema,
  facultadDashboardFiltersSchema,
  facultadDashboardGlobalResponseSchema,
} from "@/features/facultad-dashboard/schema";

// Este bloque valida las reglas de filtros que vienen por URL y que luego se envían al endpoint.
describe("facultadDashboardFiltersSchema", () => {
  // Esta prueba verifica que, si no llega nada, el frontend complete los valores por defecto del contrato.
  it("aplica defaults esperados cuando no recibe filtros", () => {
    // Ejecutamos el parser con un objeto vacío para simular una URL sin query params.
    const parsed = facultadDashboardFiltersSchema.parse({});

    // Debe iniciar sin campus seleccionados.
    expect(parsed.campusIds).toEqual([]);
    // Debe iniciar sin facultades seleccionadas.
    expect(parsed.facultadIds).toEqual([]);
    // Por contrato includeInactive es true por defecto.
    expect(parsed.includeInactive).toBe(true);
    // Por contrato slotMinutes es 45 por defecto.
    expect(parsed.slotMinutes).toBe(45);
    // Por contrato días por defecto cubren toda la semana 0..6.
    expect(parsed.dias).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  // Esta prueba confirma que los filtros aceptan valores válidos enviados como strings desde la URL.
  it("acepta coerción y valores válidos de filtros", () => {
    // Simulamos query params comunes del navegador (todos llegan como string).
    const parsed = facultadDashboardFiltersSchema.parse({
      campusIds: ["1", "2"],
      facultadIds: ["10", "11"],
      includeInactive: "0",
      slotMinutes: "60",
      dias: ["1", "2", "5"],
    });

    // Verificamos que IDs de campus se conviertan a enteros positivos.
    expect(parsed.campusIds).toEqual([1, 2]);
    // Verificamos que IDs de facultad se conviertan a enteros positivos.
    expect(parsed.facultadIds).toEqual([10, 11]);
    // El valor "0" debe mapear a false.
    expect(parsed.includeInactive).toBe(false);
    // Debe conservarse el valor permitido del contrato.
    expect(parsed.slotMinutes).toBe(60);
    // Días válidos deben quedar como números.
    expect(parsed.dias).toEqual([1, 2, 5]);
  });

  // Esta prueba fuerza un error de validación cuando slotMinutes no está en los valores permitidos.
  it("rechaza slotMinutes fuera de 15|30|45|60", () => {
    // Probamos un valor inválido para asegurar defensa temprana en frontend.
    const parse = () =>
      facultadDashboardFiltersSchema.parse({
        slotMinutes: "20",
      });

    // Esperamos que Zod lance error para evitar requests incorrectos al backend.
    expect(parse).toThrow();
  });

  // Esta prueba fuerza error cuando llega un día fuera del rango 0..6.
  it("rechaza dias fuera del rango 0..6", () => {
    // Incluimos un 7 para confirmar que no se acepta.
    const parse = () =>
      facultadDashboardFiltersSchema.parse({
        dias: ["1", "7"],
      });

    // Debe lanzar error de validación.
    expect(parse).toThrow();
  });
});

// Este bloque valida la forma de la respuesta global que llega desde /dashboards/facultades/global.
describe("facultadDashboardGlobalResponseSchema", () => {
  // Esta prueba verifica el caso feliz mínimo del payload global según el contrato v2.
  it("acepta payload global válido del contrato", () => {
    // Definimos una respuesta mínima pero completa siguiendo FRONTEND_DASHBOARD_FACULTAD.md.
    const payload = {
      schemaVersion: 2,
      filtersApplied: {
        campusIds: [1],
        facultadIds: [10],
        includeInactive: true,
        slotMinutes: 45,
        dias: [1, 2, 3, 4, 5],
      },
      layout: { mode: "global" },
      data: {
        kpis: {
          facultades: { activos: 1, inactivos: 0 },
          bloques: { activos: 2, inactivos: 0 },
          ambientes: { activos: 3, inactivos: 1 },
          capacidad: { total: 120, examen: 100 },
          activos: { asignados: 25, noAsignadosGlobal: 5 },
        },
        charts: {
          tiposBloque: [{ tipoBloqueNombre: "Académico", cantidad: 2 }],
          tiposAmbiente: [{ tipoAmbienteNombre: "Laboratorio", cantidad: 4 }],
          capacidadPorBloque: [
            { bloqueNombre: "A", capacidadTotal: 60, capacidadExamen: 50 },
          ],
          activosPorBloque: [{ bloqueNombre: "A", activosAsignados: 10 }],
          ambientesActivosInactivosPorBloque: [
            { bloqueNombre: "A", activos: 4, inactivos: 1 },
          ],
          ocupacionHeatmapSemanal: [
            {
              dia: 1,
              franja: "07:00-07:45",
              slotsOcupados: 4,
              slotsTotales: 8,
              pctOcupacion: 50,
            },
          ],
          ocupacionPorBloque: [
            {
              bloqueNombre: "A",
              pctOcupacion: 45,
              slotsOcupados: 18,
              slotsTotales: 40,
            },
          ],
          topAmbientesUtilizacion: {
            sobrecargados: [
              {
                ambienteNombre: "Lab 1",
                bloqueNombre: "A",
                pctOcupacion: 88,
                slotsOcupados: 35,
                slotsTotales: 40,
              },
            ],
            subutilizados: [
              {
                ambienteNombre: "Lab 2",
                bloqueNombre: "B",
                pctOcupacion: 10,
                slotsOcupados: 4,
                slotsTotales: 40,
              },
            ],
          },
        },
        tables: {
          resumenBloques: [
            {
              bloqueNombre: "A",
              tipoBloqueNombre: "Académico",
              pisos: 3,
              activo: true,
              ambientes: 5,
              tiposAmbiente: 2,
              capacidadTotal: 120,
              capacidadExamen: 100,
              activosAsignados: 25,
            },
          ],
          ambientesUtilizacion: [
            {
              ambienteNombre: "Lab 1",
              bloqueNombre: "A",
              slotsOcupados: 35,
              slotsTotales: 40,
              pctOcupacion: 88,
            },
          ],
        },
      },
    };

    // Si no lanza excepción, el payload cumple el contrato esperado por frontend.
    expect(() => facultadDashboardGlobalResponseSchema.parse(payload)).not.toThrow();
  });

  // Esta prueba confirma que no aceptamos una versión de schema distinta a la documentada.
  it("rechaza schemaVersion distinto de 2", () => {
    // Clonamos un payload mínimo válido cambiando solo schemaVersion.
    const payload = {
      schemaVersion: 1,
      filtersApplied: {
        campusIds: [],
        facultadIds: [],
        includeInactive: true,
        slotMinutes: 45,
        dias: [0, 1, 2, 3, 4, 5, 6],
      },
      layout: { mode: "global" },
      data: {
        kpis: {
          facultades: { activos: 0, inactivos: 0 },
          bloques: { activos: 0, inactivos: 0 },
          ambientes: { activos: 0, inactivos: 0 },
          capacidad: { total: 0, examen: 0 },
          activos: { asignados: 0, noAsignadosGlobal: 0 },
        },
        charts: {
          tiposBloque: [],
          tiposAmbiente: [],
          capacidadPorBloque: [],
          activosPorBloque: [],
          ambientesActivosInactivosPorBloque: [],
          ocupacionHeatmapSemanal: [],
          ocupacionPorBloque: [],
          topAmbientesUtilizacion: { sobrecargados: [], subutilizados: [] },
        },
        tables: { resumenBloques: [], ambientesUtilizacion: [] },
      },
    };

    // Debe lanzar error porque el contrato exige schemaVersion = 2.
    expect(() => facultadDashboardGlobalResponseSchema.parse(payload)).toThrow();
  });
});

// Este bloque valida la forma de la respuesta detalle que llega desde /dashboards/facultades/:facultadId.
describe("facultadDashboardDetailResponseSchema", () => {
  // Esta prueba cubre un payload detalle válido incluyendo el objeto facultad.
  it("acepta payload detail válido del contrato", () => {
    // Construimos un payload acorde a la documentación de detalle.
    const payload = {
      schemaVersion: 2,
      filtersApplied: {
        facultadId: 22,
        includeInactive: true,
        slotMinutes: 45,
        dias: [1, 2, 3, 4, 5],
      },
      layout: { mode: "detail" },
      data: {
        facultad: {
          id: 22,
          nombre: "Facultad de Ingeniería",
          nombreCorto: "FI",
          activo: true,
          campusId: 1,
          campusNombre: "Campus Central",
        },
        kpis: {
          facultades: { activos: 1, inactivos: 0 },
          bloques: { activos: 2, inactivos: 0 },
          ambientes: { activos: 8, inactivos: 1 },
          capacidad: { total: 300, examen: 250 },
          activos: { asignados: 90, noAsignadosGlobal: 10 },
        },
        charts: {
          tiposBloque: [{ tipoBloqueNombre: "Académico", cantidad: 2 }],
          tiposAmbiente: [{ tipoAmbienteNombre: "Aula", cantidad: 7 }],
          capacidadPorBloque: [
            { bloqueNombre: "A", capacidadTotal: 200, capacidadExamen: 150 },
          ],
          activosPorBloque: [{ bloqueNombre: "A", activosAsignados: 60 }],
          ambientesActivosInactivosPorBloque: [
            { bloqueNombre: "A", activos: 7, inactivos: 1 },
          ],
          ocupacionHeatmapSemanal: [
            {
              dia: 2,
              franja: "08:00-08:45",
              slotsOcupados: 12,
              slotsTotales: 16,
              pctOcupacion: 75,
            },
          ],
          ocupacionPorBloque: [
            {
              bloqueNombre: "A",
              pctOcupacion: 64,
              slotsOcupados: 64,
              slotsTotales: 100,
            },
          ],
          topAmbientesUtilizacion: {
            sobrecargados: [
              {
                ambienteNombre: "Aula 101",
                bloqueNombre: "A",
                pctOcupacion: 92,
                slotsOcupados: 46,
                slotsTotales: 50,
              },
            ],
            subutilizados: [
              {
                ambienteNombre: "Aula 102",
                bloqueNombre: "A",
                pctOcupacion: 18,
                slotsOcupados: 9,
                slotsTotales: 50,
              },
            ],
          },
        },
        tables: {
          resumenBloques: [
            {
              bloqueNombre: "A",
              tipoBloqueNombre: "Académico",
              pisos: 3,
              activo: true,
              ambientes: 8,
              tiposAmbiente: 2,
              capacidadTotal: 300,
              capacidadExamen: 250,
              activosAsignados: 90,
            },
          ],
          ambientesUtilizacion: [
            {
              ambienteNombre: "Aula 101",
              bloqueNombre: "A",
              slotsOcupados: 46,
              slotsTotales: 50,
              pctOcupacion: 92,
            },
          ],
        },
      },
    };

    // Si el parse pasa, el frontend puede renderizar con seguridad la vista detalle.
    expect(() => facultadDashboardDetailResponseSchema.parse(payload)).not.toThrow();
  });

  // Esta prueba asegura que facultadId en filtros de detalle debe existir y ser positivo.
  it("rechaza detail sin facultadId válido en filtersApplied", () => {
    // Generamos un payload inválido sin facultadId para comprobar la validación.
    const payload = {
      schemaVersion: 2,
      filtersApplied: {
        includeInactive: true,
        slotMinutes: 45,
        dias: [1, 2],
      },
      layout: { mode: "detail" },
      data: {
        facultad: {
          id: 22,
          nombre: "Facultad de Ingeniería",
          nombreCorto: "FI",
          activo: true,
          campusId: 1,
          campusNombre: "Campus Central",
        },
        kpis: {
          facultades: { activos: 1, inactivos: 0 },
          bloques: { activos: 1, inactivos: 0 },
          ambientes: { activos: 1, inactivos: 0 },
          capacidad: { total: 1, examen: 1 },
          activos: { asignados: 1, noAsignadosGlobal: 0 },
        },
        charts: {
          tiposBloque: [],
          tiposAmbiente: [],
          capacidadPorBloque: [],
          activosPorBloque: [],
          ambientesActivosInactivosPorBloque: [],
          ocupacionHeatmapSemanal: [],
          ocupacionPorBloque: [],
          topAmbientesUtilizacion: { sobrecargados: [], subutilizados: [] },
        },
        tables: { resumenBloques: [], ambientesUtilizacion: [] },
      },
    };

    // Debe fallar porque detail requiere facultadId en los filtros aplicados.
    expect(() => facultadDashboardDetailResponseSchema.parse(payload)).toThrow();
  });
});
