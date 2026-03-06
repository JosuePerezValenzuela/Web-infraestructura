import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBloqueDashboardData } from "@/features/bloque-dashboard/hooks/useBloqueDashboardData";
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
      bloqueIds: [100],
      tipoBloqueIds: [3],
      includeInactive: true,
      slotMinutes: 45,
      dias: [0, 1, 2, 3, 4, 5, 6],
    },
    layout: { mode: "global" as const },
    data: {
      kpis: {
        campus: { activos: 1, inactivos: 0 },
        facultades: { activos: 2, inactivos: 1 },
        bloques: { activos: 3, inactivos: 0 },
        ambientes: { activos: 8, inactivos: 1 },
        capacidad: { total: 300, examen: 250 },
        activos: { asignados: 90, noAsignadosGlobal: 10 },
        ocupacion: { pctPromedioGlobal: 61 },
      },
      charts: {
        tiposBloque: [{ tipoBloqueId: 3, tipoBloqueNombre: "Academico", cantidad: 3 }],
        ambientesPorBloque: [{ bloqueId: 100, bloqueNombre: "Bloque A", ambientes: 8 }],
        capacidadPorBloque: [{ bloqueId: 100, bloqueNombre: "Bloque A", capacidadTotal: 200, capacidadExamen: 150 }],
        activosPorBloque: [{ bloqueId: 100, bloqueNombre: "Bloque A", activosAsignados: 40 }],
        ocupacionHeatmapSemanal: [{ dia: 1, franja: "07:00-07:45", slotsOcupados: 10, slotsTotales: 20, pctOcupacion: 50 }],
        ocupacionPorBloque: [{ bloqueId: 100, bloqueNombre: "Bloque A", slotsOcupados: 55, slotsTotales: 100, pctOcupacion: 55 }],
        topBloquesUtilizacion: {
          sobrecargadosTop10: [{ bloqueId: 100, bloqueNombre: "Bloque A", pctOcupacion: 90, slotsOcupados: 90, slotsTotales: 100 }],
          subutilizadosTop10: [{ bloqueId: 101, bloqueNombre: "Bloque B", pctOcupacion: 20, slotsOcupados: 20, slotsTotales: 100 }],
        },
        topPisosUtilizacion: {
          sobrecargadosTop10: [{ bloqueId: 100, bloqueNombre: "Bloque A", piso: 3, pctOcupacion: 88, slotsOcupados: 44, slotsTotales: 50 }],
          subutilizadosTop10: [{ bloqueId: 101, bloqueNombre: "Bloque B", piso: 1, pctOcupacion: 18, slotsOcupados: 9, slotsTotales: 50 }],
        },
      },
      tables: {
        resumenBloques: [{ bloqueId: 100, bloqueNombre: "Bloque A", campusNombre: "Central", facultadNombre: "Ingenieria", tipoBloqueNombre: "Academico", pisos: 4, activo: true, ambientes: 8, capacidadTotal: 200, capacidadExamen: 150, activosAsignados: 40, slotsOcupados: 55, slotsTotales: 100, pctOcupacion: 55 }],
        pisosUtilizacion: [{ bloqueId: 100, bloqueNombre: "Bloque A", piso: 1, ambientes: 2, capacidadTotal: 50, capacidadExamen: 40, activosAsignados: 10, slotsOcupados: 12, slotsTotales: 20, pctOcupacion: 60 }],
      },
    },
  };
}

describe("useBloqueDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta endpoint global con filtros y retorna datos parseados", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(buildGlobalPayload());

    const { result } = renderHook(() =>
      useBloqueDashboardData({
        filters: {
          campusIds: [1],
          facultadIds: [10],
          bloqueIds: [100],
          tipoBloqueIds: [3],
          includeInactive: true,
          slotMinutes: 60,
          dias: [1, 2, 3],
        },
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data?.layout.mode).toBe("global");
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/dashboards/bloques/global?campusIds=1&facultadIds=10&bloqueIds=100&tipoBloqueIds=3&includeInactive=true&slotMinutes=60&dias=1%2C2%2C3"
    );
    expect(result.current.error).toBeNull();
  });

  it("expone error y notifica cuando falla la peticion", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("Fallo de red"));

    const { result } = renderHook(() =>
      useBloqueDashboardData({
        filters: {
          campusIds: [],
          facultadIds: [],
          bloqueIds: [],
          tipoBloqueIds: [],
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
