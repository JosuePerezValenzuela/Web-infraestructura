import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import EnvironmentTypeListPage from "../page";

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

// Configuramos un API base estable para que las URLs generadas por la pagina sean deterministicas.
const API_BASE_URL = "https://api.infra.test";

// Definimos la respuesta que simula el contrato real del backend para listar tipos de ambientes.
const environmentTypeResponse = {
  // items contiene las filas que la tabla debera renderizar.
  items: [
    {
      // id representa el identificador interno del tipo de ambiente.
      id: 4,
      // nombre es el titulo visible del clasificador.
      nombre: "Aula de clases",
      // descripcion describe el uso del tipo de ambiente.
      descripcion: "Ambiente destinado para clases",
      // descripcion_corta provee un alias breve que mostraremos como columna dedicada.
      descripcion_corta: "Clases",
      // activo indica si el registro puede ser asignado actualmente.
      activo: true,
      // marcas temporales utilizadas para auditoria futura.
      creado_en: "2025-09-24T15:20:30.767Z",
      actualizado_en: "2025-09-24T15:20:30.767Z",
    },
  ],
  // meta resume la paginacion retornada desde el backend.
  meta: {
    page: 1,
    take: 8,
    pages: 3,
    total: 12,
  },
};

describe("EnvironmentTypeListPage", () => {
  // Antes de cada escenario preparamos los valores por defecto necesarios por la pagina.
  beforeEach(() => {
    // Aseguramos que la variable de entorno usada por fetch apunte al dominio simulado.
    process.env.NEXT_PUBLIC_API_BASE_URL = API_BASE_URL;

    // Interceptamos fetch para devolver la respuesta controlada.
    vi.spyOn(global, "fetch").mockResolvedValue({
      // ok comunica que la llamada fue exitosa.
      ok: true,
      // json convierte la respuesta ficticia en el formato que espera la pagina.
      json: async () => environmentTypeResponse,
    } as unknown as Response);
  });

  // Despues de cada escenario limpiamos los espias para no compartir estado entre pruebas.
  afterEach(() => {
    // Restauramos cualquier implementacion reemplazada durante la prueba.
    vi.restoreAllMocks();
    // Limpiamos los contadores de llamadas para iniciar el siguiente escenario en cero.
    vi.clearAllMocks();
    // Volvemos la pagina actual a 1 para que otras pruebas comiencen desde el primer listado.
    environmentTypeResponse.meta.page = 1;
  });

  it("muestra el catalogo inicial con todas las columnas clave", async () => {
    // Renderizamos la pagina que sera puesta a prueba.
    render(<EnvironmentTypeListPage />);

    // Esperamos a que el nombre del tipo de ambiente aparezca en pantalla.
    await screen.findByText("Aula de clases");

    // Confirmamos que la descripcion larga se muestre dentro de la tabla.
    expect(screen.getByText("Ambiente destinado para clases")).toBeInTheDocument();

    // Validamos que la descripcion corta se presente para facilitar identificaciones rapidas.
    expect(screen.getByText("Clases")).toBeInTheDocument();

    // Revisamos que el estado booleano se transforme en el texto legible esperado.
    expect(screen.getByText(/activo/i)).toBeInTheDocument();

    // Comprobamos que exista el campo de busqueda accesible para filtrar por nombre.
    expect(
      screen.getByLabelText("Buscar tipos de ambientes")
    ).toBeInTheDocument();

    // Verificamos que el boton primario para crear nuevos registros este disponible.
    expect(
      screen.getByRole("button", { name: /nuevo tipo de ambientes/i })
    ).toBeInTheDocument();

    // Confirmamos que la columna de acciones se encuentre disponible para futuras operaciones.
    expect(
      screen.getByRole("columnheader", { name: /acciones/i })
    ).toBeInTheDocument();

    // Verificamos que los botones de editar y eliminar existan en la fila.
    expect(
      screen.getByRole("button", { name: /editar tipo de ambiente/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /eliminar tipo de ambiente/i })
    ).toBeInTheDocument();
  });

  it("incluye el termino de busqueda dentro de la consulta remota", async () => {
    // Creamos una persona usuaria virtual para simular la escritura en el campo de busqueda.
    const user = userEvent.setup();

    // Renderizamos la pagina objetivo de la HU.
    render(<EnvironmentTypeListPage />);

    // Esperamos a que la tabla cargue para garantizar que la UI esta lista.
    await screen.findByText("Aula de clases");

    // Localizamos el input de busqueda mediante su placeholder descriptivo.
    const searchInput = screen.getByPlaceholderText("Buscar por nombre");

    // Escribimos un termino que deberia viajar como query param al backend.
    await user.type(searchInput, "aula");

    // Verificamos que fetch haya sido invocado con el parametro search configurado.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("search=aula"),
        expect.anything()
      );
    });
  });

  it("solicita una pagina nueva cuando se usa la paginacion", async () => {
    // Configuramos el usuario virtual que accionara los botones de paginacion.
    const user = userEvent.setup();

    // Renderizamos la pagina bajo prueba.
    render(<EnvironmentTypeListPage />);

    // Esperamos a que la primera pagina del listado se cargue correctamente.
    await screen.findByText("Aula de clases");

    // Actualizamos la respuesta simulada para que refleje que el backend devolvera la pagina 2.
    environmentTypeResponse.meta.page = 2;

    // Localizamos el boton que avanza hacia la siguiente pagina de resultados.
    const nextButton = screen.getByRole("button", {
      name: /go to next page/i,
    });

    // Ejecutamos el clic en el boton de siguiente pagina.
    await user.click(nextButton);

    // Confirmamos que fetch fue llamado solicitando la pagina numero 2.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
        expect.anything()
      );
    });
  });

  it("abre el modal de creacion y muestra los campos solicitados por la HU 17", async () => {
    // Generamos una persona usuaria virtual para interactuar con la pantalla.
    const user = userEvent.setup();

    // Renderizamos la pagina para iniciar la prueba.
    render(<EnvironmentTypeListPage />);

    // Esperamos a que el listado inicial aparezca para confirmar que la UI esta lista.
    await screen.findByText("Aula de clases");

    // Ubicamos el boton que abre el modal de creacion y lo activamos.
    const createButton = screen.getByRole("button", {
      name: /nuevo tipo de ambientes/i,
    });
    await user.click(createButton);

    // Confirmamos que el modal muestre el encabezado correcto.
    await screen.findByRole("heading", { name: /crear tipo de ambiente/i });

    // Verificamos la presencia de cada campo requerido por el formulario.
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Descripcion$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripcion corta/i)).toBeInTheDocument();

    // Validamos que exista el boton que enviara el formulario.
    expect(screen.getByRole("button", { name: /guardar/i })).toBeInTheDocument();
  });

  it("crea un tipo de ambiente y refresca la tabla tras el exito", async () => {
    // Configuramos el mock del API para simular que el backend acepta el registro.
    vi.mocked(apiFetch).mockResolvedValueOnce({ id: 99 });

    // Creamos un usuario virtual para llenar el formulario.
    const user = userEvent.setup();

    // Renderizamos la pagina bajo prueba.
    render(<EnvironmentTypeListPage />);

    // Esperamos los datos iniciales para garantizar que la pantalla esta lista.
    await screen.findByText("Aula de clases");

    // Abrimos el modal de creacion.
    await user.click(
      screen.getByRole("button", { name: /nuevo tipo de ambientes/i })
    );

    // Esperamos a que aparezca el encabezado del modal.
    await screen.findByRole("heading", { name: /crear tipo de ambiente/i });

    // Llenamos cada campo siguiendo el contrato de la HU.
    await user.type(screen.getByLabelText(/nombre/i), "Laboratorio verde");
    await user.type(
      screen.getByLabelText(/^Descripcion$/i),
      "Espacios dedicados a investigacion practica."
    );
    await user.type(
      screen.getByLabelText(/descripcion corta/i),
      "Laboratorio"
    );

    // Enviamos el formulario mediante el boton principal.
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    // Confirmamos que se llamo al API con el payload esperado.
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/tipo_ambientes", {
        method: "POST",
        json: {
          nombre: "Laboratorio verde",
          descripcion: "Espacios dedicados a investigacion practica.",
          descripcion_corta: "Laboratorio",
        },
      });
    });

    // Validamos que se mostro el toast de exito.
    expect(notify.success).toHaveBeenCalledWith({
      title: "Tipo de ambiente creado",
      description: "El catalogo se actualizo correctamente.",
    });

    // Verificamos que la tabla se recargo pidiendo de nuevo los datos.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    // Confirmamos que el modal se cerro automaticamente tras la creacion.
    expect(
      screen.queryByRole("heading", { name: /crear tipo de ambiente/i })
    ).not.toBeInTheDocument();
  });

  it("muestra un mensaje de error cuando la creacion falla y mantiene el modal abierto", async () => {
    // Indicamos que el API devolvera un error controlado.
    vi.mocked(apiFetch).mockRejectedValueOnce({
      message: "Duplicado detectado",
    });

    // Creamos el usuario virtual que interactuara con el formulario.
    const user = userEvent.setup();

    // Renderizamos la pagina.
    render(<EnvironmentTypeListPage />);

    // Esperamos a que el listado inicial se cargue.
    await screen.findByText("Aula de clases");

    // Abrimos el modal haciendo clic en el boton principal.
    await user.click(
      screen.getByRole("button", { name: /nuevo tipo de ambientes/i })
    );

    // Aseguramos que el modal se muestre.
    await screen.findByRole("heading", { name: /crear tipo de ambiente/i });

    // Llenamos los campos requeridos.
    await user.type(screen.getByLabelText(/nombre/i), "Laboratorio verde");
    await user.type(
      screen.getByLabelText(/^Descripcion$/i),
      "Espacios dedicados a investigacion practica."
    );
    await user.type(
      screen.getByLabelText(/descripcion corta/i),
      "Laboratorio"
    );

    // Intentamos guardar el registro.
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    // Esperamos a que se informe el error mediante el toast correspondiente.
    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith({
        title: "No se pudo crear el tipo de ambiente",
        description: "Revisa los datos e intentalo nuevamente.",
      });
    });

    // Verificamos que el modal permanezca abierto para permitir correcciones.
    expect(
      screen.getByRole("heading", { name: /crear tipo de ambiente/i })
    ).toBeInTheDocument();
  });

  it("abre el modal de edicion y precarga los datos del tipo seleccionado", async () => {
    // Generamos una persona usuaria para ejecutar interacciones en la UI.
    const user = userEvent.setup();

    // Renderizamos la pagina objetivo.
    render(<EnvironmentTypeListPage />);

    // Esperamos a que los datos iniciales se muestren.
    await screen.findByText("Aula de clases");

    // Hacemos clic en el boton de editar asociado a la fila.
    await user.click(
      screen.getByRole("button", { name: /editar tipo de ambiente/i })
    );

    // Verificamos que el modal de edicion aparezca.
    await screen.findByRole("heading", { name: /editar tipo de ambiente/i });

    // Confirmamos que los campos del formulario muestren los datos originales.
    expect(screen.getByDisplayValue("Aula de clases")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Ambiente destinado para clases")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Clases")).toBeInTheDocument();

    // Revisamos que el estado activo se refleje en el checkbox.
    expect(
      screen.getByRole("checkbox", { name: /activo/i })
    ).toBeChecked();

    // Confirmamos que el formulario impide guardar mientras no existan cambios.
    expect(
      screen.getByRole("button", { name: /guardar cambios/i })
    ).toBeDisabled();
  });

  it("permite actualizar un tipo de ambiente desde el modal de edicion", async () => {
    // Configuramos el mock del API para simular una actualizacion exitosa.
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    // Instanciamos usuario virtual.
    const user = userEvent.setup();

    // Renderizamos la pagina principal.
    render(<EnvironmentTypeListPage />);

    // Esperamos la carga inicial.
    await screen.findByText("Aula de clases");

    // Abrimos el modal de edicion.
    await user.click(
      screen.getByRole("button", { name: /editar tipo de ambiente/i })
    );

    // Verificamos que el modal aparezca.
    await screen.findByRole("heading", { name: /editar tipo de ambiente/i });

    // Ajustamos los campos para reflejar los cambios requeridos.
    const nameInput = screen.getByLabelText(/nombre/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Aula multimedia");

    const descriptionInput = screen.getByLabelText(/^Descripcion$/i);
    await user.clear(descriptionInput);
    await user.type(
      descriptionInput,
      "Espacios equipados con herramientas multimedia."
    );

    const shortDescriptionInput = screen.getByLabelText(
      /descripcion corta/i
    );
    await user.clear(shortDescriptionInput);
    await user.type(shortDescriptionInput, "Multimedia");

    // Desactivamos el registro para probar el cambio en el estado.
    const activeCheckbox = screen.getByRole("checkbox", { name: /activo/i });
    await user.click(activeCheckbox);

    // Enviamos el formulario.
    await user.click(
      screen.getByRole("button", { name: /guardar cambios/i })
    );

    // Validamos que la llamada al API incluya los datos modificados.
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/tipo_ambientes/4", {
        method: "PATCH",
        json: {
          nombre: "Aula multimedia",
          descripcion: "Espacios equipados con herramientas multimedia.",
          descripcion_corta: "Multimedia",
          activo: false,
        },
      });
    });

    // Confirmamos que se informe el exito mediante un toast.
    expect(notify.success).toHaveBeenCalledWith({
      title: "Tipo de ambiente actualizado",
      description: "Se guardaron los cambios correctamente.",
    });

    // Verificamos que se haya refrescado el listado.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    // Comprobamos que el modal se cierre al finalizar.
    expect(
      screen.queryByRole("heading", { name: /editar tipo de ambiente/i })
    ).not.toBeInTheDocument();
  });

  it("mantiene el modal abierto y muestra un error cuando la edicion falla", async () => {
    // Definimos un error controlado proveniente del backend.
    vi.mocked(apiFetch).mockRejectedValueOnce({
      message: "Conflicto de datos",
    });

    // Creamos el usuario virtual que interactuara con la UI.
    const user = userEvent.setup();

    // Renderizamos la pagina.
    render(<EnvironmentTypeListPage />);

    // Esperamos a que se cargue la tabla.
    await screen.findByText("Aula de clases");

    // Abrimos el modal de edicion.
    await user.click(
      screen.getByRole("button", { name: /editar tipo de ambiente/i })
    );

    // Esperamos al encabezado para confirmar que el modal se abrio.
    await screen.findByRole("heading", { name: /editar tipo de ambiente/i });

    // Realizamos un pequeño ajuste en el nombre para que el formulario se considere modificado.
    const nameInput = screen.getByLabelText(/nombre/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Aula de clases 2");

    // Intentamos guardar los cambios.
    await user.click(
      screen.getByRole("button", { name: /guardar cambios/i })
    );

    // Esperamos a que el toast de error se dispare con el mensaje adecuado.
    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith({
        title: "No se pudo actualizar el tipo de ambiente",
        description: "Conflicto de datos",
      });
    });

    // Validamos que el modal permanezca abierto para permitir correcciones.
    expect(
      screen.getByRole("heading", { name: /editar tipo de ambiente/i })
    ).toBeInTheDocument();
  });

  it("abre el modal de eliminacion y muestra los datos del tipo seleccionado", async () => {
    const user = userEvent.setup();
    render(<EnvironmentTypeListPage />);
    await screen.findByText("Aula de clases");

    await user.click(
      screen.getByRole("button", { name: /eliminar tipo de ambiente/i })
    );

    await screen.findByRole("heading", { name: /eliminar tipo de ambiente/i });

    expect(
      screen.getByText(/Aula de clases/, { selector: "span" })
    ).toBeInTheDocument();
  });

  it("elimina un tipo de ambiente y refresca la tabla", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<EnvironmentTypeListPage />);
    await screen.findByText("Aula de clases");

    await user.click(
      screen.getByRole("button", { name: /eliminar tipo de ambiente/i })
    );

    await screen.findByRole("heading", { name: /eliminar tipo de ambiente/i });

    await user.click(screen.getByRole("button", { name: /eliminar/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/tipo_ambientes/4", {
        method: "DELETE",
      });
    });

    expect(notify.success).toHaveBeenCalledWith({
      title: "Tipo de ambiente eliminado",
      description: "El registro se elimino correctamente.",
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    expect(
      screen.queryByRole("heading", { name: /eliminar tipo de ambiente/i })
    ).not.toBeInTheDocument();
  });

  it("mantiene el modal abierto cuando la eliminacion falla", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce({
      message: "No se pudo eliminar",
    });

    const user = userEvent.setup();
    render(<EnvironmentTypeListPage />);
    await screen.findByText("Aula de clases");

    await user.click(
      screen.getByRole("button", { name: /eliminar tipo de ambiente/i })
    );

    await screen.findByRole("heading", { name: /eliminar tipo de ambiente/i });

    await user.click(screen.getByRole("button", { name: /eliminar/i }));

    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith({
        title: "No se pudo eliminar el tipo de ambiente",
        description: "No se pudo eliminar",
      });
    });

    expect(
      screen.getByRole("heading", { name: /eliminar tipo de ambiente/i })
    ).toBeInTheDocument();
  });
});
