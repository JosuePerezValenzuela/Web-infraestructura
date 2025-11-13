"use client";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { notify } from "@/lib/notify";
import { apiFetch } from "@/lib/api";
import BlockCreatePage from "../page";

vi.mock("@/lib/notify", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const facultiesResponse = {
  items: [
    {
      id: 7,
      nombre: "Facultad de Tecnologia",
    },
  ],
};

const blockTypesResponse = {
  items: [
    {
      id: 2,
      nombre: "Academico",
    },
  ],
};

const mockedApiFetch = vi.mocked(apiFetch);
const mockedNotify = vi.mocked(notify);

describe("BlockCreatePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Configuramos la respuesta base para las peticiones de catálogos.
  function mockCatalogRequests() {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/facultades")) {
        return facultiesResponse as never;
      }
      if (path.startsWith("/tipo_bloques")) {
        return blockTypesResponse as never;
      }
      throw new Error(`Unexpected path ${path}`);
    });
  }

  it("muestra el formulario y los selectores una vez que cargan los catálogos", async () => {
    // Preparamos los mocks de catálogos para que la página tenga datos iniciales.
    mockCatalogRequests();
    const user = userEvent.setup();

    // Renderizamos la página de creación.
    render(<BlockCreatePage />);

    // Esperamos el encabezado principal para asegurarnos de que la vista terminó de cargar.
    await screen.findByRole("heading", { name: /registrar nuevo bloque/i });

    // Validamos que todos los campos base estén presentes en el formulario.
    expect(screen.getByLabelText(/codigo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nombre$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre corto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pisos/i)).toBeInTheDocument();

    // Abrimos el selector de facultades y comprobamos que las opciones se hayan cargado.
    const facultyTrigger = screen.getByLabelText(/facultad/i);
    await user.click(facultyTrigger);
    expect(
      await screen.findByRole("option", { name: /facultad de tecnologia/i })
    ).toBeInTheDocument();
  });

  it("exige que la latitud y la longitud se envíen de forma conjunta", async () => {
    mockCatalogRequests();
    const user = userEvent.setup();

    render(<BlockCreatePage />);

    // Esperamos al menos un campo para confirmar que el formulario está montado.
    await screen.findByLabelText(/codigo/i);

    // Completamos los campos obligatorios excepto la longitud para disparar la validación.
    await user.type(screen.getByLabelText(/codigo/i), "BLO-111");
    await user.type(screen.getByLabelText(/^nombre$/i), "Bloque Central");
    await user.type(screen.getByLabelText(/pisos/i), "4");
    await user.type(screen.getByTestId("lat-input"), "-17.39");

    // Seleccionamos los catálogos para evitar errores adicionales.
    const facultyTrigger = screen.getByLabelText(/facultad/i);
    await user.click(facultyTrigger);
    await user.click(
      await screen.findByRole("option", { name: /facultad de tecnologia/i })
    );
    const typeTrigger = screen.getByLabelText(/tipo de bloque/i);
    await user.click(typeTrigger);
    await user.click(
      await screen.findByRole("option", { name: /academico/i })
    );

    // Intentamos guardar el formulario.
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    // Confirmamos que se muestre el mensaje de validación correspondiente.
    expect(
      await screen.findByText(/latitud y longitud deben enviarse juntas/i)
    ).toBeInTheDocument();
    // Verificamos que no se haya intentado crear el bloque.
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
  });

  it("envía los datos al backend y redirige al listado cuando la creación es exitosa", async () => {
    const user = userEvent.setup();

    // Simulamos las respuestas del backend: primero los catálogos y luego la creación.
    mockedApiFetch
      .mockResolvedValueOnce(facultiesResponse as never)
      .mockResolvedValueOnce(blockTypesResponse as never)
      .mockResolvedValueOnce({ id: 42 } as never);

    render(<BlockCreatePage />);

    await screen.findByLabelText(/codigo/i);

    // Ingresamos datos válidos en cada campo.
    await user.type(screen.getByLabelText(/codigo/i), "BLO-200");
    await user.type(screen.getByLabelText(/^nombre$/i), "Bloque de Ciencias");
    await user.type(screen.getByLabelText(/nombre corto/i), "Ciencias");
    await user.type(screen.getByLabelText(/pisos/i), "5");
    await user.type(screen.getByTestId("lat-input"), "-17.38");
    await user.type(screen.getByTestId("lng-input"), "-66.15");

    // Seleccionamos la facultad disponible en el catálogo.
    const facultyTrigger = screen.getByLabelText(/facultad/i);
    await user.click(facultyTrigger);
    await user.click(
      await screen.findByRole("option", { name: /facultad de tecnologia/i })
    );

    // Seleccionamos el tipo de bloque.
    const typeTrigger = screen.getByLabelText(/tipo de bloque/i);
    await user.click(typeTrigger);
    await user.click(
      await screen.findByRole("option", { name: /academico/i })
    );

    // Enviamos el formulario para crear el registro.
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    // Verificamos que el helper de la API reciba el payload esperado.
    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenLastCalledWith("/bloques", {
        method: "POST",
        json: {
          codigo: "BLO-200",
          nombre: "Bloque de Ciencias",
          nombre_corto: "Ciencias",
          pisos: 5,
          lat: -17.38,
          lng: -66.15,
          facultad_id: 7,
          tipo_bloque_id: 2,
          activo: true,
        },
      });
    });

    // Confirmamos que se muestre la notificación de éxito y que se redirija al listado.
    expect(mockedNotify.success).toHaveBeenCalledWith({
      title: "Bloque creado",
      description: "El inventario se actualizó correctamente.",
    });
    expect(pushMock).toHaveBeenCalledWith("/dashboard/bloques/list");
  });
});
