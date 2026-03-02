import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import FacultadDashboardPage from "../page";
import { apiFetch } from "@/lib/api";

let currentSearchParams = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(currentSearchParams),
  usePathname: () => "/dashboard/facultades",
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

const campusCatalog = [
  { id: 1, nombre: "Campus Central" },
  { id: 2, nombre: "Campus Norte" },
];

const facultyCatalog = [
  { id: 10, nombre: "Facultad de Ingenieria", campus_id: 1 },
  { id: 11, nombre: "Facultad de Ciencias", campus_id: 2 },
];

const dashboardGlobalResponse = {
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
      facultades: { activos: 2, inactivos: 1 },
      bloques: { activos: 4, inactivos: 1 },
      ambientes: { activos: 12, inactivos: 2 },
      capacidad: { total: 560, examen: 430 },
      activos: { asignados: 120, noAsignadosGlobal: 25 },
    },
    charts: {
      tiposBloque: [{ tipoBloqueNombre: "Academico", cantidad: 3 }],
      tiposAmbiente: [{ tipoAmbienteNombre: "Aula", cantidad: 7 }],
      capacidadPorBloque: [
        { bloqueNombre: "Bloque A", capacidadTotal: 200, capacidadExamen: 150 },
      ],
      activosPorBloque: [{ bloqueNombre: "Bloque A", activosAsignados: 80 }],
      ambientesActivosInactivosPorBloque: [
        { bloqueNombre: "Bloque A", activos: 6, inactivos: 1 },
      ],
      ocupacionHeatmapSemanal: [
        {
          dia: 1,
          franja: "07:00-07:45",
          slotsOcupados: 20,
          slotsTotales: 40,
          pctOcupacion: 50,
        },
      ],
      ocupacionPorBloque: [
        {
          bloqueNombre: "Bloque A",
          pctOcupacion: 65,
          slotsOcupados: 65,
          slotsTotales: 100,
        },
      ],
      topAmbientesUtilizacion: {
        sobrecargados: [
          {
            ambienteNombre: "Aula 101",
            bloqueNombre: "Bloque A",
            pctOcupacion: 90,
            slotsOcupados: 45,
            slotsTotales: 50,
          },
        ],
        subutilizados: [
          {
            ambienteNombre: "Aula 102",
            bloqueNombre: "Bloque A",
            pctOcupacion: 20,
            slotsOcupados: 10,
            slotsTotales: 50,
          },
        ],
      },
    },
    tables: {
      resumenBloques: [
        {
          bloqueNombre: "Bloque A",
          tipoBloqueNombre: "Academico",
          pisos: 4,
          activo: true,
          ambientes: 10,
          tiposAmbiente: 2,
          capacidadTotal: 200,
          capacidadExamen: 150,
          activosAsignados: 80,
        },
      ],
      ambientesUtilizacion: [
        {
          ambienteNombre: "Aula 101",
          bloqueNombre: "Bloque A",
          pctOcupacion: 90,
          slotsOcupados: 45,
          slotsTotales: 50,
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
        meta: { page: 1, take: 20, pages: 1, total: campusCatalog.length },
      } as unknown as Awaited<ReturnType<typeof apiFetch>>;
    }

    if (path.startsWith("/facultades")) {
      return {
        items: facultyCatalog,
        meta: { page: 1, take: 20, pages: 1, total: facultyCatalog.length },
      } as unknown as Awaited<ReturnType<typeof apiFetch>>;
    }

    if (path.startsWith("/dashboards/facultades/global")) {
      return dashboardGlobalResponse as Awaited<ReturnType<typeof apiFetch>>;
    }

    throw new Error(`Ruta no mockeada: ${path}`);
  });
}

describe("Dashboard Facultades - vista global", () => {
  beforeEach(() => {
    currentSearchParams = "";
    mockApiFetchImplementation();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el switch de inactivos y el acceso a administrar facultades", async () => {
    render(<FacultadDashboardPage />);

    const inactiveSwitch = await screen.findByRole("switch", {
      name: /mostrar inactivos/i,
    });
    expect(inactiveSwitch).toBeChecked();

    const adminButton = screen.getByRole("link", {
      name: /administrar facultades/i,
    });
    expect(adminButton).toHaveAttribute("href", "/dashboard/facultades/list");
  });

  it("filtra facultades por campus seleccionado en el filtro de campus", async () => {
    currentSearchParams = "campusIds=1&includeInactive=true&slotMinutes=45&dias=1,2,3,4,5";

    render(<FacultadDashboardPage />);

    const facultadesTrigger = await screen.findByRole("button", {
      name: /facultades/i,
    });

    facultadesTrigger.click();

    expect(
      await screen.findByRole("option", { name: /facultad de ingenieria/i })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("option", { name: /facultad de ciencias/i })
    ).not.toBeInTheDocument();
  });
});
