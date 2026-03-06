import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import BloquesDashboardPage from "../page";
import { apiFetch } from "@/lib/api";

let currentSearchParams = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(currentSearchParams),
  usePathname: () => "/dashboard/bloques",
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

const campusCatalog = [
  { id: 1, nombre: "Campus Central" },
  { id: 2, nombre: "Campus Norte" },
];

const facultadCatalog = [
  { id: 10, nombre: "Facultad Ingenieria", campus_id: 1 },
  { id: 11, nombre: "Facultad Ciencias", campus_id: 2 },
];

const blockCatalog = [
  { id: 100, nombre: "Bloque A", facultad_id: 10 },
  { id: 101, nombre: "Bloque B", facultad_id: 11 },
];

const blockTypeCatalog = [
  { id: 1, nombre: "Academico" },
  { id: 2, nombre: "Administrativo" },
];

const dashboardGlobalResponse = {
  schemaVersion: 2,
  filtersApplied: {
    campusIds: [1],
    facultadIds: [10],
    bloqueIds: [100],
    tipoBloqueIds: [1],
    includeInactive: true,
    slotMinutes: 45,
    dias: [0, 1, 2, 3, 4],
  },
  layout: { mode: "global" as const },
  data: {
    kpis: {
      campus: { activos: 1, inactivos: 0 },
      facultades: { activos: 2, inactivos: 0 },
      bloques: { activos: 4, inactivos: 1 },
      ambientes: { activos: 12, inactivos: 2 },
      capacidad: { total: 560, examen: 430 },
      activos: { asignados: 120, noAsignadosGlobal: 25 },
      ocupacion: { pctPromedioGlobal: 64 },
    },
    charts: {
      tiposBloque: [{ tipoBloqueId: 1, tipoBloqueNombre: "Academico", cantidad: 3 }],
      ambientesPorBloque: [{ bloqueId: 100, bloqueNombre: "Bloque A", ambientes: 8 }],
      capacidadPorBloque: [{ bloqueId: 100, bloqueNombre: "Bloque A", capacidadTotal: 200, capacidadExamen: 150 }],
      activosPorBloque: [{ bloqueId: 100, bloqueNombre: "Bloque A", activosAsignados: 80 }],
      ocupacionHeatmapSemanal: [{ dia: 1, franja: "07:00-07:45", slotsOcupados: 20, slotsTotales: 40, pctOcupacion: 50 }],
      ocupacionPorBloque: [{ bloqueId: 100, bloqueNombre: "Bloque A", pctOcupacion: 65, slotsOcupados: 65, slotsTotales: 100 }],
      topBloquesUtilizacion: {
        sobrecargadosTop10: [{ bloqueId: 100, bloqueNombre: "Bloque A", pctOcupacion: 90, slotsOcupados: 45, slotsTotales: 50 }],
        subutilizadosTop10: [{ bloqueId: 101, bloqueNombre: "Bloque B", pctOcupacion: 20, slotsOcupados: 10, slotsTotales: 50 }],
      },
      topPisosUtilizacion: {
        sobrecargadosTop10: [{ bloqueId: 100, bloqueNombre: "Bloque A", piso: 3, pctOcupacion: 88, slotsOcupados: 44, slotsTotales: 50 }],
        subutilizadosTop10: [{ bloqueId: 101, bloqueNombre: "Bloque B", piso: 1, pctOcupacion: 16, slotsOcupados: 8, slotsTotales: 50 }],
      },
    },
    tables: {
      resumenBloques: [
        {
          bloqueId: 100,
          bloqueNombre: "Bloque A",
          campusNombre: "Campus Central",
          facultadNombre: "Facultad Ingenieria",
          tipoBloqueNombre: "Academico",
          pisos: 4,
          activo: true,
          ambientes: 10,
          capacidadTotal: 200,
          capacidadExamen: 150,
          activosAsignados: 80,
          slotsOcupados: 65,
          slotsTotales: 100,
          pctOcupacion: 65,
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
          activosAsignados: 20,
          slotsOcupados: 20,
          slotsTotales: 30,
          pctOcupacion: 66,
        },
      ],
    },
  },
};

function mockApiFetchImplementation() {
  vi.mocked(apiFetch).mockImplementation(async (path: string) => {
    if (path.startsWith("/campus")) {
      return {
        items: campusCatalog,
      } as unknown as Awaited<ReturnType<typeof apiFetch>>;
    }

    if (path.startsWith("/facultades")) {
      return {
        items: facultadCatalog,
      } as unknown as Awaited<ReturnType<typeof apiFetch>>;
    }

    if (path.startsWith("/bloques?page=1&limit=200")) {
      return {
        items: blockCatalog,
      } as unknown as Awaited<ReturnType<typeof apiFetch>>;
    }

    if (path.startsWith("/tipo_bloques")) {
      return {
        items: blockTypeCatalog,
      } as unknown as Awaited<ReturnType<typeof apiFetch>>;
    }

    if (path.startsWith("/dashboards/bloques/global")) {
      return dashboardGlobalResponse as Awaited<ReturnType<typeof apiFetch>>;
    }

    throw new Error(`Ruta no mockeada: ${path}`);
  });
}

describe("Dashboard Bloques - vista global", () => {
  beforeEach(() => {
    currentSearchParams = "";
    mockApiFetchImplementation();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el switch de inactivos y el acceso a administrar bloques", async () => {
    render(<BloquesDashboardPage />);

    const inactiveSwitch = await screen.findByRole("switch", {
      name: /mostrar inactivos/i,
    });
    expect(inactiveSwitch).toBeChecked();

    const adminButton = screen.getByRole("link", {
      name: /administrar bloques/i,
    });
    expect(adminButton).toHaveAttribute("href", "/dashboard/bloques/list");
  });

  it("filtra facultades por campus seleccionado en el filtro de campus", async () => {
    currentSearchParams =
      "campusIds=1&includeInactive=true&slotMinutes=45&dias=0,1,2,3,4";

    render(<BloquesDashboardPage />);

    const facultadesTrigger = await screen.findByRole("button", {
      name: /facultades/i,
    });

    facultadesTrigger.click();

    expect(
      await screen.findByRole("option", { name: /facultad ingenieria/i })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("option", { name: /facultad ciencias/i })
    ).not.toBeInTheDocument();
  });
});
