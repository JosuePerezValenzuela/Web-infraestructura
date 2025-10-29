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

  it("permite cerrar el dialogo sin activar validaciones cuando no se ha llenado el formulario", async () => {
    // Preparamos un usuario virtual para manipular la interfaz.
    const user = userEvent.setup();

    // Renderizamos la pagina objetivo.
    render(<BlockTypeListPage />);

    // Abrimos el dialogo de creacion para iniciar la prueba.
    await user.click(
      await screen.findByRole("button", { name: /nuevo tipo de bloque/i })
    );

    // Confirmamos que el dialogo se haya mostrado.
    await screen.findByRole("heading", { name: /crear tipo de bloque/i });

    // Cerramos el dialogo usando el boton de cierre sin haber llenado el formulario.
    await user.click(screen.getByRole("button", { name: /cerrar/i }));

    // Verificamos que el dialogo ya no se encuentre visible.
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /crear tipo de bloque/i })
      ).not.toBeInTheDocument();
    });

    // Aseguramos que no se hayan mostrado mensajes de validacion en la pantalla.
    expect(
      screen.queryByText(/el nombre es obligatorio/i)
    ).not.toBeInTheDocument();
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

  it("permite abrir el dialogo de edicion con los datos del registro seleccionado", async () => {
    // Creamos una persona usuaria virtual para controlar la interfaz.
    const user = userEvent.setup();

    // Renderizamos la pagina que contiene la tabla y los dialogos.
    render(<BlockTypeListPage />);

    // Esperamos a que la fila inicial se muestre para asegurar que la tabla esta lista.
    await screen.findByText("Laboratorio");

    // Buscamos el boton de edicion que se muestra en la columna de acciones.
    const editButton = screen.getByRole("button", {
      name: /editar tipo de bloque/i,
    });

    // Hacemos clic en el boton para abrir el dialogo emergente.
    await user.click(editButton);

    // Confirmamos que el encabezado del dialogo se muestre indicando la accion de edicion.
    await screen.findByRole("heading", { name: /editar tipo de bloque/i });

    // Verificamos que el formulario muestre el nombre actual como valor inicial.
    expect(
      screen.getByDisplayValue("Laboratorio")
    ).toBeInTheDocument();

    // Verificamos que la descripcion actual tambien se precargue en el formulario.
    expect(
      screen.getByDisplayValue(
        "Bloques destinados a laboratorios especializados."
      )
    ).toBeInTheDocument();

    // Comprobamos que el estado activo aparezca marcado al abrir el dialogo.
    expect(
      screen.getByRole("checkbox", { name: /activo/i })
    ).toBeChecked();
  });

  it("actualiza un tipo de bloque desde el dialogo de edicion y refresca la tabla", async () => {
    // Simulamos que la peticion PATCH funciona correctamente.
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    // Creamos una persona usuaria virtual para interactuar con la UI.
    const user = userEvent.setup();

    // Renderizamos la pagina objetivo.
    render(<BlockTypeListPage />);

    // Esperamos a que el listado inicial aparezca en pantalla.
    await screen.findByText("Laboratorio");

    // Buscamos el boton dedicado a la edicion de la fila.
    const editButton = screen.getByRole("button", {
      name: /editar tipo de bloque/i,
    });

    // Abrimos el dialogo de edicion con los datos de la fila seleccionada.
    await user.click(editButton);

    // Aseguramos que el formulario del dialogo se encuentre visible.
    await screen.findByRole("heading", { name: /editar tipo de bloque/i });

    // Localizamos el campo de nombre para actualizarlo.
    const nombreInput = screen.getByLabelText(/nombre/i);

    // Borramos el valor actual del campo.
    await user.clear(nombreInput);

    // Escribimos un nombre nuevo.
    await user.type(nombreInput, "Laboratorio avanzado");

    // Obtenemos el textarea de descripcion para modificarlo.
    const descripcionTextarea = screen.getByLabelText(/descripcion/i);

    // Reemplazamos la descripcion previa.
    await user.clear(descripcionTextarea);

    // Escribimos la descripcion actualizada.
    await user.type(
      descripcionTextarea,
      "Espacios para experimentacion avanzada en distintas disciplinas."
    );

    // Recuperamos el checkbox que controla el estado activo.
    const activoCheckbox = screen.getByRole("checkbox", { name: /activo/i });

    // Cambiamos el estado a inactivo.
    await user.click(activoCheckbox);

    // Localizamos el boton encargado de enviar el formulario.
    const submitButton = screen.getByRole("button", {
      name: /guardar cambios/i,
    });

    // Disparamos el envio para guardar la informacion editada.
    await user.click(submitButton);

    // Verificamos que la API reciba la ruta y datos esperados.
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/tipo_bloques/7", {
        method: "PATCH",
        json: {
          nombre: "Laboratorio avanzado",
          descripcion:
            "Espacios para experimentacion avanzada en distintas disciplinas.",
          activo: false,
        },
      });
    });

    // Confirmamos que se muestre un toast de exito informativo.
    expect(toast.success).toHaveBeenCalledWith("Tipo de bloque actualizado", {
      description: "Se guardaron los cambios correctamente.",
    });

    // Esperamos a que se vuelva a consultar el listado para refrescar la tabla.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("elimina un tipo de bloque desde el dialogo y refresca la tabla", async () => {
    // Indicamos que la peticion DELETE se resolvera correctamente.
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    // Simulamos a la persona usuaria que interactuara con la pantalla.
    const user = userEvent.setup();

    // Renderizamos la pagina que contiene la tabla y los dialogos.
    render(<BlockTypeListPage />);

    // Esperamos a que el listado inicial aparezca para comenzar la secuencia.
    await screen.findByText("Laboratorio");

    // Obtenemos el boton de eliminar asociado a la fila disponible.
    const deleteButton = screen.getByRole("button", {
      name: /eliminar tipo de bloque/i,
    });

    // Abrimos el dialogo de confirmacion haciendo clic en el boton de eliminar.
    await user.click(deleteButton);

    // Comprobamos que el encabezado del dialogo de eliminacion aparezca en pantalla.
    await screen.findByRole("heading", { name: /eliminar tipo de bloque/i });

    // Identificamos el boton que confirma la accion destructiva.
    const confirmButton = screen.getByRole("button", { name: /eliminar/i });

    // Ejecutamos la eliminacion enviando la peticion DELETE.
    await user.click(confirmButton);

    // Verificamos que se haya llamado al endpoint correspondiente con el metodo adecuado.
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/tipo_bloques/7", {
        method: "DELETE",
      });
    });

    // Confirmamos que se muestre un mensaje de exito informando la eliminacion.
    expect(toast.success).toHaveBeenCalledWith("Tipo de bloque eliminado", {
      description: "El registro se elimino correctamente.",
    });

    // Esperamos a que se dispare nuevamente la consulta de la tabla para refrescar los datos.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("mantiene el dialogo abierto y muestra un error cuando la eliminacion falla", async () => {
    // Configuramos el mock de la API para que rechace la eliminacion.
    vi.mocked(apiFetch).mockRejectedValueOnce({
      message: "No se pudo eliminar el registro.",
    });

    // Generamos una persona usuaria virtual para ejecutar acciones.
    const user = userEvent.setup();

    // Renderizamos la pagina bajo prueba.
    render(<BlockTypeListPage />);

    // Aguardamos a que el listado inicial se encuentre disponible.
    await screen.findByText("Laboratorio");

    // Localizamos el boton de eliminar presente en la tabla.
    const deleteButton = screen.getByRole("button", {
      name: /eliminar tipo de bloque/i,
    });

    // Abrimos el dialogo de confirmacion activando el boton.
    await user.click(deleteButton);

    // Verificamos que el encabezado del dialogo sea visible para la persona usuaria.
    await screen.findByRole("heading", { name: /eliminar tipo de bloque/i });

    // Seleccionamos el boton de confirmacion que intenta completar la eliminacion.
    const confirmButton = screen.getByRole("button", { name: /eliminar/i });

    // Intentamos eliminar el registro para activar el escenario de error controlado.
    await user.click(confirmButton);

    // Esperamos a que se muestre un mensaje claro notificando el problema.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "No se pudo eliminar el tipo de bloque",
        {
          description: "No se pudo eliminar el registro.",
        }
      );
    });

    // Comprobamos que el dialogo siga abierto permitiendo reintentar o cancelar la accion.
    expect(
      screen.getByRole("heading", { name: /eliminar tipo de bloque/i })
    ).toBeInTheDocument();
  });
});
