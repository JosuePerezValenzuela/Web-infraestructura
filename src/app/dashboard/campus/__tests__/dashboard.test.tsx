import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import CampusDashboardPage from "../page";
import CampusDashboardDetailPage from "../[campusId]/page";
import { apiFetch } from "@/lib/api";

// Mantenemos una referencia mutable a los query params simulados para cada escenario.
let currentSearchParams = "";

// Creamos un mock del router de Next para capturar navegaciones sin modificar la URL real.
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  // useRouter nos devuelve el mock de push para verificar a dónde navegamos.
  useRouter: () => ({ push: pushMock }),
  // useSearchParams expone los query params configurados en currentSearchParams.
  useSearchParams: () => new URLSearchParams(currentSearchParams),
  // usePathname fija la ruta actual al dashboard global para las pruebas.
  usePathname: () => "/dashboard/campus",
}));

// Interceptamos apiFetch para devolver respuestas controladas y evitar llamadas reales.
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

// Datos base de campus que usaremos tanto para el multiselect como para las filas de tabla.
const campusCatalog = [
  // Cada objeto representa un campus disponible para filtrar o navegar.
  { id: 1, nombre: "Campus Central" },
  { id: 2, nombre: "Campus Sur" },
  { id: 5, nombre: "Campus Norte" },
];

// Stub del payload global que la página debería consumir para pintar KPIs y tabla.
const dashboardGlobalResponse = {
  schemaVersion: 1,
  filtersApplied: {
    campusIds: [1, 2],
    includeInactive: true,
  },
  layout: { mode: "global" },
  data: {
    kpis: {},
    charts: {},
    table: {
      // Filas mínimas para probar navegación por clic.
      rows: [
        { campusId: 5, campusName: "Campus Norte", totalAmbientes: 12 },
        { campusId: 1, campusName: "Campus Central", totalAmbientes: 8 },
      ],
    },
  },
};

// Helper para configurar el mock de apiFetch según el path solicitado.
function mockApiFetchImplementation() {
  vi.mocked(apiFetch).mockImplementation(async (path: string) => {
    // Si pedimos catálogos de campus devolvemos la lista completa.
    if (path.startsWith("/campus")) {
      return {
        items: campusCatalog,
        meta: { page: 1, take: 20, pages: 1, total: campusCatalog.length },
      } as unknown as Awaited<ReturnType<typeof apiFetch>>;
    }

    // Si pedimos el dashboard global devolvemos el payload preparado.
    if (path.startsWith("/dashboards/campus/global")) {
      return dashboardGlobalResponse as Awaited<ReturnType<typeof apiFetch>>;
    }

    // Cualquier ruta no contemplada generará un error explícito para detectar llamadas inesperadas.
    throw new Error(`Ruta no mockeada: ${path}`);
  });
}

describe("Dashboard Campus - vista global", () => {
  beforeEach(() => {
    // Aseguramos que cada prueba arranque sin query params salvo que se indique lo contrario.
    currentSearchParams = "";
    // Limpiamos el historial del router para que las aserciones sean independientes.
    pushMock.mockClear();
    // Configuramos la implementación de apiFetch antes de cada caso.
    mockApiFetchImplementation();
  });

  afterEach(() => {
    // Reiniciamos todos los mocks para evitar filtraciones entre pruebas.
    vi.clearAllMocks();
  });

  it("muestra el switch 'Mostrar inactivos' activado por defecto y el botón de administrar", async () => {
    // Renderizamos la página del dashboard global en su estado inicial (sin query params).
    render(<CampusDashboardPage />);

    // Esperamos a que la cabecera sticky se monte para poder consultar sus controles.
    const inactiveSwitch = await screen.findByRole("switch", {
      name: /mostrar inactivos/i,
    });

    // Verificamos que el switch aparezca activado porque includeInactive debe ser true por defecto.
    expect(inactiveSwitch).toBeChecked();

    // Confirmamos que exista el botón que redirige al listado de administración de campus.
    const adminButton = screen.getByRole("link", {
      name: /administrar campus/i,
    });

    // Validamos que el enlace apunte a la ruta esperada de gestión `/dashboard/campus/list`.
    expect(adminButton).toHaveAttribute("href", "/dashboard/campus/list");
  });

  it("refleja los campus seleccionados desde query params en el multiselect", async () => {
    // Establecemos query params iniciales con dos campus y includeInactive activo.
    currentSearchParams = "campusIds=1,2&includeInactive=true";

    // Renderizamos la página ya con los filtros provenientes de la URL.
    render(<CampusDashboardPage />);

    // Localizamos el disparador del multiselect por su etiqueta visible.
    const multiselectTrigger = await screen.findByRole("button", {
      name: /campus/i,
    });

    // El trigger debería mostrar un resumen de los campus seleccionados (2 en este caso).
    expect(multiselectTrigger).toHaveTextContent(/2 seleccionados/i);

    // Al abrir el multiselect, los campus marcados deben coincidir con los IDs del query param.
    await userEvent.click(multiselectTrigger);
    expect(
      screen.getByRole("option", { name: /Campus Central/i })
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /Campus Sur/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("navega al detalle de un campus al hacer clic en una fila y conserva includeInactive", async () => {
    // Activamos el query param includeInactive para validar que se propaga a la navegación.
    currentSearchParams = "includeInactive=true";

    // Renderizamos la página con la tabla que contiene filas clicables.
    render(<CampusDashboardPage />);

    // Esperamos a que la fila del campus aparezca en el DOM antes de interactuar.
    const campusRow = await screen.findByText(/Campus Norte/i);

    // Simulamos el clic en la fila para abrir el detalle.
    await userEvent.click(campusRow);

    // Verificamos que el router reciba la ruta con el campusId y el query includeInactive preservado.
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/dashboard/campus/5?includeInactive=true"
      );
    });
  });
});

// Pruebas específicas de la vista de detalle `/dashboard/campus/:campusId`.
describe("Dashboard Campus - vista detalle", () => {
  beforeEach(() => {
    // Configuramos query params vacíos para que includeInactive adopte el valor por defecto (true).
    currentSearchParams = "";
    // Limpiamos el router para capturar navegaciones de la pantalla de detalle.
    pushMock.mockClear();
    // Definimos el pathname actual como si ya estuviéramos en el detalle de campus 5.
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: pushMock }),
      useSearchParams: () => new URLSearchParams(currentSearchParams),
      usePathname: () => "/dashboard/campus/5",
    }));
    // Aplicamos el mock de fetch para los endpoints requeridos por la vista de detalle.
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path.startsWith("/dashboards/campus/5")) {
        return {
          schemaVersion: 1,
          filtersApplied: {
            campusId: 5,
            includeInactive: true,
          },
          layout: { mode: "detail" },
          data: {
            kpis: { countAmbientes: 12, countActivos: 30 },
            charts: {},
            tables: { facultades: { rows: [] } },
          },
        } as unknown as Awaited<ReturnType<typeof apiFetch>>;
      }
      // El catálogo de campus se usa para renderizar la etiqueta/selector readonly en el header.
      if (path.startsWith("/campus")) {
        return {
          items: campusCatalog,
          meta: { page: 1, take: 20, pages: 1, total: campusCatalog.length },
        } as unknown as Awaited<ReturnType<typeof apiFetch>>;
      }
      throw new Error(`Ruta no mockeada: ${path}`);
    });
  });

  afterEach(() => {
    // Restablecemos mocks para que los escenarios no se contaminen.
    vi.clearAllMocks();
  });

  it("muestra el header sticky con identificador del campus y botón Volver", async () => {
    // Renderizamos la página de detalle para el campus 5.
    render(<CampusDashboardDetailPage params={{ campusId: "5" }} />);

    // Esperamos a que el identificador del campus aparezca en el header.
    const campusLabel = await screen.findByText(/Campus Norte/i);
    // Aseguramos que el elemento esté presente como parte de un control readonly.
    expect(campusLabel).toBeInTheDocument();

    // Verificamos que el switch de inactivos siga activo por defecto.
    const inactiveSwitch = screen.getByRole("switch", {
      name: /mostrar inactivos/i,
    });
    expect(inactiveSwitch).toBeChecked();

    // Confirmamos la existencia del botón Volver que debe regresar al modo global.
    const backButton = screen.getByRole("button", { name: /volver/i });
    expect(backButton).toBeInTheDocument();
  });

  it("renderiza dos filas de KPIs en la vista de detalle", async () => {
    // Renderizamos la vista detalle para validar la estructura de KPIs.
    render(<CampusDashboardDetailPage params={{ campusId: "5" }} />);

    // Esperamos a que se monten los contenedores de KPIs (placeholder o reales).
    const kpiItems = await screen.findAllByTestId("campus-kpi-card");

    // La vista detalle debe distribuir los KPIs en 4 columnas y 2 filas, mínimo 4 tarjetas.
    expect(kpiItems.length).toBeGreaterThanOrEqual(4);
  });

  it("permite volver al global preservando includeInactive", async () => {
    // Partimos con includeInactive habilitado por defecto.
    render(<CampusDashboardDetailPage params={{ campusId: "5" }} />);

    // Interactuamos con el botón Volver para regresar al dashboard global.
    const backButton = await screen.findByRole("button", { name: /volver/i });
    await userEvent.click(backButton);

    // Confirmamos que el router reciba la ruta global con includeInactive=true en el query.
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/dashboard/campus?includeInactive=true"
      );
    });
  });
});
