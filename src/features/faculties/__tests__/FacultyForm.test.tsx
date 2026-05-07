// Importamos utilidades para montar el componente, consultar nodos y disparar interacciones.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
// Importamos vi para crear mocks que controlen las dependencias del formulario.
import { vi, type Mock } from "vitest";
// Importamos el formulario que vamos a validar; la prueba falla hasta que acomodemos el layout.
import FacultyForm from "../FacultyForm";
// Importamos apiFetch para poder interceptar las llamadas HTTP que hace el formulario al cargar campus.
import { apiFetch } from "@/lib/api";

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
  // Definimos una respuesta base con campus mínimos para poblar el selector múltiple.
  const campusResponse = {
    items: [
      { id: 1, nombre: "Campus Central", codigo: "CMP-001" },
      { id: 2, nombre: "Campus Tamborada", codigo: "CMP-002" },
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

  it("muestra una seccion dedicada para asignar multiples campus", async () => {
    // Renderizamos el formulario; el mock de apiFetch evita llamadas reales.
    render(<FacultyForm />);

    // Buscamos la sección visual de campus para validar la nueva jerarquía del formulario.
    const campusSection = await screen.findByTestId("faculty-campus-section");

    // Confirmamos que existe la narrativa de multiselección y el buscador del checklist.
    expect(within(campusSection).getByText(/campus asignados/i)).toBeInTheDocument();
    expect(
      within(campusSection).getByPlaceholderText(/buscar campus por nombre o código/i)
    ).toBeInTheDocument();

    // Verificamos que ambos campus queden disponibles como opciones seleccionables.
    expect(within(campusSection).getByLabelText("Campus Central")).toBeInTheDocument();
    expect(within(campusSection).getByLabelText("Campus Tamborada")).toBeInTheDocument();
  });

  it("envia campus_ids al registrar la facultad", async () => {
    // Configuramos el mock para devolver campus al cargar y aceptar luego la creación.
    (apiFetch as Mock)
      .mockResolvedValueOnce(campusResponse)
      .mockResolvedValueOnce({ id: 99 });

    render(<FacultyForm />);

    // Completamos los campos mínimos requeridos por el formulario.
    fireEvent.change(screen.getByLabelText(/codigo de la facultad/i), {
      target: { value: "FAC-001" },
    });
    fireEvent.change(screen.getByLabelText(/nombre de la facultad/i), {
      target: { value: "Facultad de Ingeniería" },
    });

    // Marcamos dos campus para verificar el payload de multiselección.
    fireEvent.click(await screen.findByLabelText("Campus Central"));
    fireEvent.click(screen.getByLabelText("Campus Tamborada"));

    // Enviamos el formulario y comprobamos que el payload cambió a campus_ids.
    fireEvent.click(screen.getByRole("button", { name: /crear facultad/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/facultades", {
        method: "POST",
        json: {
          codigo: "FAC-001",
          nombre: "Facultad de Ingeniería",
          nombre_corto: undefined,
          campus_ids: [1, 2],
        },
      });
    });
  });
});
