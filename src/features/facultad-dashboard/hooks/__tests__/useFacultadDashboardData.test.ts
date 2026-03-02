import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFacultadDashboardData } from "@/features/facultad-dashboard/hooks/useFacultadDashboardData";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/notify", () => ({
  notify: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

function buildGlobalPayload() {
  return {
    schemaVersion: 2,
    filtersApplied: {
      campusIds: [1],
      facultadIds: [10],
      includeInactive: true,
      slotMinutes: 45,
      dias: [1, 2, 3, 4, 5],
    },
    layout: { mode: "global" as const },
    data: {
      kpis: {
        facultades: { activos: 1, inactivos: 0 },
        bloques: { activos: 2, inactivos: 0 },
        ambientes: { activos: 3, inactivos: 1 },
        capacidad: { total: 100, examen: 80 },
        activos: { asignados: 20, noAsignadosGlobal: 5 },
      },
      charts: {
        tiposBloque: [{ tipoBloqueNombre: "Académico", cantidad: 2 }],
        tiposAmbiente: [{ tipoAmbienteNombre: "Lab", cantidad: 4 }],
        capacidadPorBloque: [
          { bloqueNombre: "A", capacidadTotal: 50, capacidadExamen: 40 },
        ],
        activosPorBloque: [{ bloqueNombre: "A", activosAsignados: 12 }],
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
              pctOcupacion: 80,
              slotsOcupados: 32,
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
            capacidadTotal: 100,
            capacidadExamen: 80,
            activosAsignados: 20,
          },
        ],
        ambientesUtilizacion: [
          {
            ambienteNombre: "Lab 1",
            bloqueNombre: "A",
            pctOcupacion: 80,
            slotsOcupados: 32,
            slotsTotales: 40,
          },
        ],
      },
    },
  };
}

function buildDetailPayload() {
  return {
    schemaVersion: 2,
    filtersApplied: {
      facultadId: 22,
      includeInactive: false,
      slotMinutes: 60,
      dias: [1, 3, 5],
    },
    layout: { mode: "detail" as const },
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
            pctOcupacion: 92,
            slotsOcupados: 46,
            slotsTotales: 50,
          },
        ],
      },
    },
  };
}

describe("useFacultadDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta endpoint global con filtros y retorna datos parseados", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(buildGlobalPayload());

    const { result } = renderHook(() =>
      useFacultadDashboardData({
        mode: "global",
        filters: {
          campusIds: [1],
          facultadIds: [10],
          includeInactive: true,
          slotMinutes: 45,
          dias: [1, 2, 3],
        },
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data?.layout.mode).toBe("global");
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/dashboards/facultades/global?campusIds=1&facultadIds=10&includeInactive=true&slotMinutes=45&dias=1%2C2%2C3"
    );
    expect(result.current.error).toBeNull();
  });

  it("consulta endpoint detail con facultadId path y filtros de ocupación", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(buildDetailPayload());

    const { result } = renderHook(() =>
      useFacultadDashboardData({
        mode: "detail",
        facultadId: 22,
        filters: {
          campusIds: [],
          facultadIds: [],
          includeInactive: false,
          slotMinutes: 60,
          dias: [1, 3, 5],
        },
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data?.layout.mode).toBe("detail");
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/dashboards/facultades/22?includeInactive=false&slotMinutes=60&dias=1%2C3%2C5"
    );
  });

  it("expone error y notifica cuando falla la petición", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("Fallo de red"));

    const { result } = renderHook(() =>
      useFacultadDashboardData({
        mode: "global",
        filters: {
          campusIds: [],
          facultadIds: [],
          includeInactive: true,
          slotMinutes: 45,
          dias: [0, 1, 2, 3, 4, 5, 6],
        },
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Fallo de red");
    });

    expect(notify.error).toHaveBeenCalledWith({
      title: "No se pudo cargar el dashboard",
      description: "Fallo de red",
    });
  });
});
