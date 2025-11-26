// Importamos render y screen para montar el componente y consultar los nodos en pantalla.
import { render, screen, within } from "@testing-library/react";
// Importamos vi para crear mocks que controlen las dependencias del formulario.
import { vi, type Mock } from "vitest";
// Importamos el formulario que vamos a validar; la prueba falla hasta que acomodemos el layout.
import FacultyForm from "../FacultyForm";
// Importamos apiFetch para poder interceptar las llamadas HTTP que hace el formulario al cargar campus.
import { apiFetch } from "@/lib/api";

// Mockeamos next/dynamic para reemplazar el mapa por un marcador simple y evitar dependencias de Leaflet en pruebas.
vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="map-picker-mock" />,
}));

// Mockeamos notify para no mostrar toasts reales durante la prueba.
vi.mock("@/lib/notify", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mockeamos apiFetch para controlar la respuesta del catálogo de campus.
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

describe("FacultyForm layout", () => {
  // Definimos una respuesta base con campus mínimos para poblar el selector.
  const campusResponse = {
    items: [
      { id: 1, nombre: "Campus Central", codigo: "CMP-001", lat: -17.39, lng: -66.15 },
    ],
  };

  // Antes de cada prueba configuramos la promesa resuelta de apiFetch con el catálogo anterior.
  beforeEach(() => {
    (apiFetch as Mock).mockResolvedValue(campusResponse);
  });

  // Después de cada prueba limpiamos los mocks para no arrastrar estado.
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("ubica el nombre corto y el selector de campus en el mismo grid de dos columnas", async () => {
    // Renderizamos el formulario; el mock de apiFetch evita llamadas reales.
    render(<FacultyForm />);

    // Buscamos el contenedor de grid que debería agrupar ambos campos en columnas.
    const shortCampusGrid = await screen.findByTestId("faculty-short-campus-grid");

    // Validamos que el contenedor tenga clases de grid con dos columnas en pantallas grandes.
    expect(shortCampusGrid.className).toContain("grid");
    expect(shortCampusGrid.className).toContain("grid-cols-2");

    // Obtenemos el input de nombre corto dentro del grid para confirmar que vive en ese contenedor.
    const shortNameInput = within(shortCampusGrid).getByLabelText(/nombre corto/i);
    expect(shortNameInput).toBeInTheDocument();

    // Obtenemos el label del selector de campus para confirmar que comparte el mismo contenedor de grid.
    const campusLabel = within(shortCampusGrid).getByText(/Seleccione un campus/i);
    expect(campusLabel).toBeInTheDocument();
  });
});
