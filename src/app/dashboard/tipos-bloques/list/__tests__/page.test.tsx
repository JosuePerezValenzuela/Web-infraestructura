import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import BlockTypeListPage from "../page";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

// Definimos una respuesta base que representa el listado paginado retornado por el backend.
const blockTypeResponse = {
  // items contiene las filas que la tabla debe representar.
  items: [
    {
      // id interno del tipo de bloque.
      id: 7,
      // nombre visible para las personas usuarias.
      nombre: "Laboratorio",
      // descripcion breve que explica el uso del tipo de bloque.
      descripcion: "Bloques destinados a laboratorios especializados.",
      // indicador de estado activo que la UI convertira en texto.
      activo: true,
      // marcas de tiempo necesarias para acciones futuras como ordenar.
      creado_en: "2025-01-01T10:00:00Z",
      actualizado_en: "2025-01-01T10:00:00Z",
    },
  ],
  // meta describe la paginacion utilizada por la tabla.
  meta: {
    page: 1,
    take: 8,
    pages: 1,
    total: 1,
  },
};

// Agrupamos los escenarios de prueba de la pagina.
describe("BlockTypeListPage", () => {
  // Antes de cada prueba configuraremos el mock de fetch para devolver la respuesta base.
  beforeEach(() => {
    // Creamos un espia sobre fetch para controlar las peticiones de lectura.
    vi.spyOn(global, "fetch").mockResolvedValue({
      // ok indica que la respuesta fue exitosa.
      ok: true,
      // json devuelve el cuerpo de la respuesta simulada.
      json: async () => blockTypeResponse,
    } as unknown as Response);
  });

  // Despues de cada prueba restauraremos la implementacion original de fetch.
  afterEach(() => {
    // Restauramos todas las funciones espiadas para no afectar otros escenarios.
    vi.restoreAllMocks();
    // Limpiamos los registros de mocks para preparar el siguiente escenario.
    vi.clearAllMocks();
  });

  it("muestra el listado inicial de tipos de bloque y el boton para crear nuevos registros", async () => {
    // Renderizamos la pagina a probar.
    render(<BlockTypeListPage />);

    // Esperamos a que el nombre del tipo de bloque aparezca en la tabla.
    await screen.findByText("Laboratorio");

    // Verificamos que la descripcion se presente en la fila.
    expect(
      screen.getByText("Bloques destinados a laboratorios especializados.")
    ).toBeInTheDocument();

    // Confirmamos que el estado activo se transforme en texto legible.
    expect(screen.getByText(/activo/i)).toBeInTheDocument();

    // Validamos que la tabla muestre la columna de acciones para futuras operaciones.
    expect(
      screen.getByRole("columnheader", { name: /acciones/i })
    ).toBeInTheDocument();

    // Revisamos que exista un boton dedicado a la edicion del tipo de bloque.
    expect(
      screen.getByRole("button", { name: /editar tipo de bloque/i })
    ).toBeInTheDocument();

    // Revisamos que exista un boton dedicado a la eliminacion del tipo de bloque.
    expect(
      screen.getByRole("button", { name: /eliminar tipo de bloque/i })
    ).toBeInTheDocument();

    // Validamos que el boton para crear un nuevo tipo de bloque este visible.
    expect(
      screen.getByRole("button", { name: /nuevo tipo de bloque/i })
    ).toBeInTheDocument();
  });

  it("permite crear un nuevo tipo de bloque desde el dialogo y refresca la tabla", async () => {
    // Configuramos la respuesta del mock apiFetch para simular una creacion exitosa.
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    // Creamos una persona usuaria virtual para ejecutar acciones en la UI.
    const user = userEvent.setup();

    // Renderizamos la pagina objetivo.
    render(<BlockTypeListPage />);

    // Esperamos a que el listado inicial se muestre para asegurar que la vista esta lista.
    await screen.findByText("Laboratorio");

    // Localizamos el boton que abre el dialogo de creacion.
    const createButton = screen.getByRole("button", {
      name: /nuevo tipo de bloque/i,
    });

    // Abrimos el dialogo haciendo clic en el boton correspondiente.
    await user.click(createButton);

    // Llenamos el campo de nombre con un valor valido.
    await user.type(screen.getByLabelText(/nombre/i), "Edificio academico");

    // Completamos la descripcion con detalles adicionales.
    await user.type(
      screen.getByLabelText(/descripcion/i),
      "Bloques utilizados para aulas generales y oficinas administrativas."
    );

    // Buscamos el boton de guardar dentro del dialogo para enviar el formulario.
    const submitButton = screen.getByRole("button", { name: /guardar/i });

    // Ejecutamos el envio del formulario haciendo clic sobre el boton.
    await user.click(submitButton);

    // Esperamos a que el mock de apiFetch reciba la peticion con los datos correctos.
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/tipo_bloques", {
        method: "POST",
        body: JSON.stringify({
          nombre: "Edificio academico",
          descripcion:
            "Bloques utilizados para aulas generales y oficinas administrativas.",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    // Verificamos que se muestre un mensaje de exito al completar la operacion.
    expect(toast.success).toHaveBeenCalledWith("Tipo de bloque creado", {
      description: "El catalogo se actualizo correctamente.",
    });

    // Confirmamos que se haya solicitado nuevamente el listado para refrescar la tabla.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("muestra un mensaje de error cuando la creacion falla", async () => {
    // Configuramos el mock para que la peticion de creacion falle.
    vi.mocked(apiFetch).mockRejectedValueOnce({
      // message representa el error recibido desde el backend.
      message: "No se pudo crear el tipo de bloque",
    });

    // Creamos un usuario virtual para interactuar con la interfaz.
    const user = userEvent.setup();

    // Renderizamos la pagina de listados.
    render(<BlockTypeListPage />);

    // Esperamos a que el registro inicial aparezca para comenzar la accion.
    await screen.findByText("Laboratorio");

    // Abrimos el dialogo de creacion pulsando el boton correspondiente.
    await user.click(
      screen.getByRole("button", { name: /nuevo tipo de bloque/i })
    );

    // Completamos el campo de nombre con un valor de prueba.
    await user.type(screen.getByLabelText(/nombre/i), "Centro cultural");

    // Escribimos una descripcion para el nuevo tipo de bloque.
    await user.type(
      screen.getByLabelText(/descripcion/i),
      "Bloques destinados a eventos culturales y exposiciones."
    );

    // Enviamos el formulario para provocar la falla controlada.
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    // Esperamos a que el mensaje de error sea mostrado mediante un toast.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "No se pudo crear el tipo de bloque",
        {
          description: "Revisa los datos e intentalo nuevamente.",
        }
      );
    });
  });
});
