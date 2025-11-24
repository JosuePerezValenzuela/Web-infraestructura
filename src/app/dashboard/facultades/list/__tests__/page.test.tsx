// Importamos las utilidades de pruebas para renderizar componentes y consultar la pantalla.
import { render, screen, waitFor } from "@testing-library/react";
// Importamos userEvent para simular acciones humanas como clics o tipeos.
import userEvent from "@testing-library/user-event";
// Importamos vi desde Vitest para crear dobles (mocks) de funciones globales como fetch.
import { vi } from "vitest";
// Importamos notify para validar los mensajes mostrados en la interfaz.
import { notify } from "@/lib/notify";
// Importamos la pÃ¡gina que vamos a probar; las pruebas seguirÃ¡n fallando hasta implementar la ediciÃ³n real.
import FacultyListPage from "../page";

// Reemplazamos el mÃ³dulo sonner para poder espiar los mensajes sin mostrar UI real.
vi.mock("@/lib/notify", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Declaramos una variable para reutilizar el espÃ­a de fetch en cada prueba.
let fetchSpy: ReturnType<typeof vi.spyOn>;
// Guardamos la implementaciÃ³n por defecto para poder reutilizarla en pruebas que cambien el comportamiento.
let defaultFetchImplementation: (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

// Declaramos una respuesta base para el listado de campus que el formulario necesita para popular el selector.
const campusResponse = {
  // items contiene cada campus con su identificador y nombre legible.
  items: [
    {
      id: 4,
      codigo: "CMP-001",
      nombre: "Campus Central",
      lat: -17.38,
      lng: -66.16,
    },
    {
      id: 6,
      codigo: "CMP-002",
      nombre: "Campus Norte",
      lat: -17.33,
      lng: -66.12,
    },
  ],
  // meta describe la paginaciÃ³n del endpoint de campus, aunque aquÃ­ solo usamos los elementos.
  meta: {
    page: 1,
    take: 20,
    pages: 1,
    total: 2,
  },
};

// Agrupamos las pruebas relacionadas con la pÃ¡gina de facultades para mantenerlas organizadas.
describe("FacultyListPage interactions", () => {
  // Definimos una respuesta base que el backend devolverÃ­a al listar facultades.
  const facultyResponse = {
    // La clave items contiene el arreglo de filas que la tabla debe mostrar.
    items: [
      {
        // id interno que NO debe aparecer en la tabla, pero sÃ­ estÃ¡ disponible en la respuesta.
        id: 7,
        // cÃ³digo Ãºnico de la facultad que sÃ­ debe mostrarse.
        codigo: "FAC-001",
        // nombre completo de la facultad que debe ser visible.
        nombre: "Facultad de Ciencias y Tecnologia",
        // nombre corto que tambiÃ©n debe aparecer como columna.
        nombre_corto: "FCyT",
        // nombre del campus al que pertenece; reemplaza al campus_id en la tabla.
        campus_nombre: "Campus Central",
        // indicador de estado; se mostrarÃ¡ como texto "Activo" o "Inactivo".
        activo: true,
        // fecha de creaciÃ³n que la tabla debe formatear.
        creado_en: "2025-01-15T10:30:00Z",
        // coordenadas y campus_id se incluyen para precargar el formulario de ediciÃ³n.
        lat: -17.38,
        lng: -66.16,
        campus_id: 4,
      },
    ],
    // Meta describe la paginaciÃ³n que acompaÃ±a a los datos.
    meta: {
      // PÃ¡gina actual entregada por el backend.
      page: 1,
      // Cantidad de elementos por pÃ¡gina.
      take: 8,
      // Total de pÃ¡ginas disponibles; usamos 3 para poder probar el cambio de pÃ¡gina.
      pages: 3,
      // Total de elementos existentes en la base.
      total: 12,
    },
  };

  // Antes de cada prueba configuramos un espÃ­a sobre fetch para controlar las respuestas HTTP.
  beforeEach(() => {
    // Definimos un comportamiento base que responde segÃºn el mÃ©todo HTTP y la ruta invocada.
    defaultFetchImplementation = async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();

      // Esta rama simula el GET inicial de la tabla de facultades.
      if (url.includes("/facultades") && (!init || !init.method || init.method === "GET")) {
        return {
          ok: true,
          json: async () => facultyResponse,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "content-type" ? "application/json" : null,
          },
        } as unknown as Response;
      }

      // Esta rama simula la peticiÃ³n para obtener el catÃ¡logo de campus que alimenta el selector.
      if (url.includes("/campus") && (!init || !init.method || init.method === "GET")) {
        return {
          ok: true,
          json: async () => campusResponse,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "content-type" ? "application/json" : null,
          },
        } as unknown as Response;
      }

      // Esta rama captura la creaciÃ³n de una nueva facultad.
      if (url.includes("/facultades") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ id: 42 }),
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "content-type" ? "application/json" : null,
          },
        } as unknown as Response;
      }

      // Esta rama responde al flujo de ediciÃ³n exitoso.
      if (url.includes("/facultades") && init?.method === "PATCH") {
        return {
          ok: true,
          json: async () => ({ id: 7 }),
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "content-type" ? "application/json" : null,
          },
        } as unknown as Response;
      }

      if (url.includes("/facultades/") && init?.method === "DELETE") {
        return {
          ok: true,
          status: 204,
          json: async () => undefined,
          headers: {
            get: () => null,
          },
        } as unknown as Response;
      }

      // Cualquier otra llamada devuelve una respuesta vacÃ­a exitosa.
      return {
        ok: true,
        json: async () => ({}),
        headers: {
          get: () => null,
        },
      } as unknown as Response;
    };

    // Creamos un mock que siempre devuelve una respuesta exitosa con el JSON anterior.
    fetchSpy = vi
      .spyOn(global, "fetch")
      .mockImplementation(defaultFetchImplementation);
  });

  // DespuÃ©s de cada prueba restauramos el comportamiento real de fetch y limpiamos los contadores.
  afterEach(() => {
    facultyResponse.meta = {
      page: 1,
      take: 8,
      pages: 3,
      total: 12,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    // Limpiamos los contadores de llamadas de todos los dobles usados en el escenario.
    vi.clearAllMocks();
    // Restauramos la implementaciÃ³n original de fetch despuÃ©s de cada prueba.
    vi.restoreAllMocks();
  });

  // Primera prueba: la tabla debe mostrar los datos bÃ¡sicos de una facultad y ocultar campos tÃ©cnicos.
  it("renders faculty rows showing the campus name instead of raw identifiers", async () => {
    // Renderizamos la pÃ¡gina completa como lo harÃ­a el navegador.
    render(<FacultyListPage />);

    // Esperamos a que aparezca el nombre de la facultad, lo que indica que la tabla se llenÃ³.
    await screen.findByText("Facultad de Ciencias y Tecnologia");

    // Verificamos que el nombre del campus sea visible en la misma fila.
    expect(screen.getByText("Campus Central")).toBeInTheDocument();

    // Confirmamos que el estado activo se traduzca en el texto legible para la persona usuaria.
    expect(screen.getByText("Activo")).toBeInTheDocument();

    // Revisamos que no se muestre el identificador interno de la fila, porque la regla pide ocultarlo.
    expect(screen.queryByText("7")).not.toBeInTheDocument();
  });

  // Segunda prueba: cambiar la bÃºsqueda debe reiniciar la paginaciÃ³n a la primera pÃ¡gina.
  it("resets the current page to 1 when the search query changes", async () => {
    // Volvemos a renderizar la pÃ¡gina para iniciar el escenario.
    render(<FacultyListPage />);

    // Esperamos a que cargue la primera tanda de datos (pÃ¡gina 1).
    await screen.findByText("Facultad de Ciencias y Tecnologia");

    // Buscamos el botÃ³n que avanza a la siguiente pÃ¡gina.
    const nextPageButton = screen.getByRole("button", { name: /next/i });

    // Simulamos que la persona hace clic para ir a la pÃ¡gina 2.
    await userEvent.click(nextPageButton);

    // Esperamos hasta confirmar que se haya hecho una nueva peticiÃ³n con page=2.
    await waitFor(() => {
      // Tomamos la Ãºltima URL solicitada y revisamos sus parÃ¡metros.
      const lastCall = fetchSpy.mock.calls.at(-1);
      // Si no hubo ninguna llamada, fallamos inmediatamente para evitar falsos positivos.
      expect(lastCall).toBeTruthy();
      // Extraemos el primer argumento (la URL) de la llamada.
      const requestedUrl = String(lastCall![0]);
      // Reconstruimos la URL absoluta para leer cÃ³modamente los parÃ¡metros de bÃºsqueda.
      const params = new URL(requestedUrl, "https://localhost").searchParams;
      // Validamos que la consulta haya pedido la pÃ¡gina 2.
      expect(params.get("page")).toBe("2");
    });

    // Ubicamos el campo de bÃºsqueda que filtra la tabla.
    const searchBox = screen.getByPlaceholderText(
      "Buscar por cod, nom o campus"
    );

    // Simulamos que la persona escribe un tÃ©rmino nuevo.
    await userEvent.type(searchBox, "central");

    // Esperamos la peticiÃ³n resultante y comprobamos que page vuelva a 1.
    await waitFor(() => {
      const lastCall = fetchSpy.mock.calls.at(-1);
      expect(lastCall).toBeTruthy();
      const requestedUrl = String(lastCall![0]);
      const params = new URL(requestedUrl, "https://localhost").searchParams;
      expect(params.get("page")).toBe("1");
      expect(params.get("search")).toBe("central");
    });
  });

  // Tercera prueba: el botÃ³n de crear debe mostrar un diÃ¡logo accesible para registrar una nueva facultad.
  it("opens the creation dialog when the user clicks the 'Nueva facultad' button", async () => {
    // Renderizamos la pÃ¡gina para disponer de la UI.
    render(<FacultyListPage />);

    // Esperamos a que la primera carga termine para garantizar que el componente estÃ¡ estable.
    await screen.findByText("Facultad de Ciencias y Tecnologia");

    // Localizamos el botÃ³n principal que inicia el registro de una facultad.
    const createButton = screen.getByRole("button", { name: /nueva facultad/i });

    // Simulamos el clic humano sobre el botÃ³n.
    await userEvent.click(createButton);

    // Verificamos que aparezca el encabezado del diÃ¡logo indicando que se puede crear una nueva facultad.
    expect(
      await screen.findByRole("heading", { name: /registrar nueva facultad/i })
    ).toBeInTheDocument();
  });

  // Cuarta prueba: validamos que el formulario permita crear una facultad completa incluyendo la selecciÃ³n de campus.
  it("submits the create faculty form with the selected campus", async () => {
    // Configuramos al usuario simulado para escribir y hacer clic igual que una persona.
    const user = userEvent.setup();

    // Renderizamos la pÃ¡gina de listado para interactuar con el formulario de creaciÃ³n.
    render(<FacultyListPage />);

    // Esperamos a que la tabla se cargue para asegurar que las peticiones iniciales terminaron.
    await screen.findByText("Facultad de Ciencias y Tecnologia");

    // Abrimos el diÃ¡logo de creaciÃ³n haciendo clic en el botÃ³n principal.
    const createButton = screen.getByRole("button", { name: /nueva facultad/i });
    await user.click(createButton);

    // Confirmamos que el encabezado del formulario estÃ¡ visible para continuar con los campos.
    await screen.findByRole("heading", { name: /registrar nueva facultad/i });

    // Llenamos el campo de cÃ³digo con un valor de ejemplo.
    await user.type(screen.getByLabelText(/codigo de la facultad/i), "FAC-123");

    // Llenamos el nombre oficial de la facultad.
    await user.type(
      screen.getByLabelText(/nombre de la facultad/i),
      "Facultad de Ingenieria"
    );

    // Llenamos el nombre corto opcional.
    await user.type(screen.getByLabelText(/nombre corto/i), "FI");

    // Abrimos el selector de campus para escoger la relaciÃ³n adecuada.
    await user.click(screen.getByRole("button", { name: /seleccionar campus/i }));

    // Escribimos un texto de bÃºsqueda para filtrar los campus disponibles.
    const campusSearchInput = screen.getByPlaceholderText(/buscar campus/i);
    await user.type(campusSearchInput, "central");

    // Elegimos la opciÃ³n filtrada que coincide con el tÃ©rmino introducido.
    await user.click(
      await screen.findByRole("option", { name: /campus central/i })
    );

    // Enviamos el formulario haciendo clic en el botÃ³n principal.
    await user.click(screen.getByRole("button", { name: /crear facultad/i }));

    // Verificamos que se haya realizado la peticiÃ³n POST con el payload correcto.
    await waitFor(() => {
      const postCall = fetchSpy.mock.calls.find(
        ([input, init]) =>
          String(input).includes("/facultades") && init?.method === "POST"
      );
      expect(postCall).toBeTruthy();
      const [, init] = postCall!;
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      expect(body).toMatchObject({
        codigo: "FAC-123",
        nombre: "Facultad de Ingenieria",
        nombre_corto: "FI",
        campus_id: 4,
        lat: -17.38,
        lng: -66.16,
      });
    });

    // Finalmente comprobamos que el diÃ¡logo se haya cerrado despuÃ©s del envÃ­o exitoso.
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /registrar nueva facultad/i })
      ).not.toBeInTheDocument();
    });
  });

  // Quinta prueba: el flujo de ediciÃ³n debe abrir un formulario prellenado con la informaciÃ³n existente.
  it("opens the edit dialog with the selected faculty data", async () => {
    // Configuramos a la persona usuaria virtual que ejecutarÃ¡ los eventos.
    const user = userEvent.setup();

    // Renderizamos la pÃ¡gina que lista las facultades para interactuar con ella.
    render(<FacultyListPage />);

    // Esperamos a que la primera carga finalice mostrando la fila conocida.
    await screen.findByText("Facultad de Ciencias y Tecnologia");

    // Localizamos el botÃ³n de editar presente en la fila de resultados.
    const editButton = screen.getByTitle(/editar/i);

    // Simulamos el clic humano para abrir el modal de ediciÃ³n.
    await user.click(editButton);

    // Confirmamos que el encabezado del diÃ¡logo corresponde a la acciÃ³n de editar.
    await screen.findByRole("heading", { name: /editar facultad/i });

    // Verificamos que el campo de cÃ³digo muestre el valor original recibido del backend.
    expect(
      screen.getByLabelText(/codigo de la facultad/i)
    ).toHaveValue("FAC-001");

    // Revisamos que el nombre completo se encuentre prellenado correctamente.
    expect(
      screen.getByLabelText(/nombre de la facultad/i)
    ).toHaveValue("Facultad de Ciencias y Tecnologia");

    // Revisamos tambiÃ©n el nombre corto para asegurar que no se pierden datos.
    expect(screen.getByLabelText(/nombre corto/i)).toHaveValue("FCyT");

    // Corroboramos que el selector de campus despliegue el nombre actual asignado.
    expect(screen.getByRole("button", { name: /campus central/i })).toBeInTheDocument();

    // Finalmente comprobamos que el indicador de estado activo estÃ© marcado.
    expect(
      screen.getByRole("checkbox", { name: /facultad activa/i })
    ).toBeChecked();
  });

  // Sexta prueba: el formulario de ediciÃ³n debe enviar la informaciÃ³n actualizada y cerrar el modal al finalizar.
  it("sends the updated faculty data and closes the dialog after success", async () => {
    // Preparamos al usuario virtual para realizar todos los pasos de la interacciÃ³n.
    const user = userEvent.setup();

    // Renderizamos la pantalla de listado que contiene el flujo a probar.
    render(<FacultyListPage />);

    // Esperamos a que la tabla inicial aparezca, seÃ±al de que las peticiones GET han concluido.
    await screen.findByText("Facultad de Ciencias y Tecnologia");

    // Clic en el botÃ³n de editar para abrir el modal con el formulario.
    await user.click(screen.getByTitle(/editar/i));

    // Esperamos a que el formulario se monte mostrÃ¡ndose dentro del diÃ¡logo.
    await screen.findByRole("heading", { name: /editar facultad/i });

    // Actualizamos el nombre completo para simular un cambio real.
    const nameInput = screen.getByLabelText(/nombre de la facultad/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Facultad de Ingenieria Actualizada");

    // Modificamos el nombre corto con un nuevo acrÃ³nimo.
    const shortNameInput = screen.getByLabelText(/nombre corto/i);
    await user.clear(shortNameInput);
    await user.type(shortNameInput, "FIA");

    // Abrimos el selector de campus para elegir una sede diferente.
    await user.click(screen.getByRole("button", { name: /campus central/i }));

    // Elegimos la opciÃ³n correspondiente al campus norte dentro del listado.
    await user.click(await screen.findByRole("option", { name: /campus norte/i }));

    // Desmarcamos la casilla de activo para simular que la facultad queda inactiva.
    await user.click(screen.getByRole("checkbox", { name: /facultad activa/i }));

    // Enviamos el formulario con los nuevos valores.
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    // Esperamos a que se realice la peticiÃ³n PATCH hacia el backend con el payload correcto.
    await waitFor(() => {
      const patchCall = fetchSpy.mock.calls.find(
        ([input, init]) =>
          String(input).includes("/facultades/7") && init?.method === "PATCH"
      );
      expect(patchCall).toBeTruthy();
      const [, init] = patchCall!;
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      expect(body).toMatchObject({
        codigo: "FAC-001",
        nombre: "Facultad de Ingenieria Actualizada",
        nombre_corto: "FIA",
        campus_id: 6,
        lat: -17.33,
        lng: -66.12,
        activo: false,
      });
    });

    // Validamos que el mensaje de Ã©xito se notifique a la persona usuaria.
    await waitFor(() => {
      expect(notify.success).toHaveBeenCalledWith({
        title: "Facultad actualizada",
        description: "Se guardaron los cambios correctamente.",
      });
    });

    // Confirmamos que el modal se cierre despuÃ©s de guardar los cambios.
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /editar facultad/i })
      ).not.toBeInTheDocument();
    });
  });

  // SÃ©ptima prueba: si la actualizaciÃ³n falla, se debe mostrar un mensaje de error y mantener abierto el formulario.
  it("shows an error toast when the faculty update fails", async () => {
    // Ajustamos la implementaciÃ³n para provocar un error cuando se intente actualizar.
    fetchSpy.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/facultades/7") && init?.method === "PATCH") {
        return {
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({ message: "No se pudo actualizar" }),
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "content-type" ? "application/json" : null,
          },
        } as unknown as Response;
      }
      return defaultFetchImplementation(input, init);
    });

    // Preparamos al usuario virtual para ejecutar el flujo de ediciÃ³n.
    const user = userEvent.setup();

    // Renderizamos nuevamente la pÃ¡gina objetivo del escenario.
    render(<FacultyListPage />);

    // Esperamos que aparezca la fila inicial para continuar.
    await screen.findByText("Facultad de Ciencias y Tecnologia");

    // Abrimos el modal de ediciÃ³n con el botÃ³n de la tabla.
    await user.click(screen.getByTitle(/editar/i));

    // Verificamos que el formulario se haya mostrado correctamente.
    await screen.findByRole("heading", { name: /editar facultad/i });

    // Intentamos guardar sin cambios para provocar la peticiÃ³n PATCH fallida.
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    // Confirmamos que se muestre un mensaje de error al usuario.
    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith({
        title: "No se pudo actualizar la facultad",
        description: "No se pudo actualizar",
      });
    });

    // El formulario debe mantenerse visible porque la operaciÃ³n no fue exitosa.
    expect(
      screen.getByRole("heading", { name: /editar facultad/i })
    ).toBeInTheDocument();
  });

  // Octava prueba: el boton de eliminar debe abrir un dialogo que muestre nombre y advertencias claras.
  it("opens the delete confirmation dialog showing the faculty details", async () => {
    // Configuramos a la persona usuaria virtual para simular clics reales.
    const user = userEvent.setup();

    // Renderizamos la pagina de listado donde aparece la accion de eliminar.
    render(<FacultyListPage />);

    // Esperamos a que la tabla se llene para tener un registro disponible.
    await screen.findByText("Facultad de Ciencias y Tecnologia");

    // Obtenemos el boton de eliminar ubicado en la fila mostrada.
    const deleteButton = screen.getByTitle(/eliminar/i);

    // Abrimos el dialogo de confirmacion haciendo clic en el boton.
    await user.click(deleteButton);

    // Verificamos que el titulo del dialogo corresponda a la accion destructiva.
    await screen.findByRole("heading", { name: /eliminar facultad/i });

    // Confirmamos que el nombre especifico de la facultad aparezca como referencia visual.
    expect(
      screen.getByText("Facultad de Ciencias y Tecnologia", { selector: "span" })
    ).toBeInTheDocument();

    // Validamos que el mensaje advierta sobre la eliminacion de bloques y ambientes dependientes.
    expect(
      screen.getByText(/bloques y ambientes quedar\u00E1n eliminados/i)
    ).toBeInTheDocument();
  });

  // Novena prueba: al confirmar la eliminacion se debe invocar DELETE, mostrar un toast y refrescar la tabla.
  it("deletes the faculty, refreshes the list and shows a success toast", async () => {
    // Preparamos al usuario virtual encargado de ejecutar la confirmacion.
    const user = userEvent.setup();

    // Renderizamos la pagina con el listado inicial de facultades.
    render(<FacultyListPage />);

    // Esperamos a que aparezca la fila objetivo para continuar el flujo.
    await screen.findByText("Facultad de Ciencias y Tecnologia");

    // Abrimos el dialogo pulsando el boton de eliminar disponible en la fila.
    await user.click(screen.getByTitle(/eliminar/i));

    // Tomamos el boton que confirma la accion irreversible.
    const confirmButton = await screen.findByRole("button", { name: /Eliminar/i });

    // Cerramos el flujo confirmando la eliminacion.
    await user.click(confirmButton);

    // Revisamos que se haya invocado fetch con el metodo DELETE y el id correcto.
    await waitFor(() => {
      const deleteCall = fetchSpy.mock.calls.find(
        ([input, init]) =>
          String(input).includes("/facultades/7") && init?.method === "DELETE"
      );
      expect(deleteCall).toBeTruthy();
    });

    // Corroboramos que aparezca un mensaje de exito alineado a UX.
    await waitFor(() => {
      expect(notify.success).toHaveBeenCalledWith({
        title: "Facultad eliminada",
        description: "La facultad y sus dependencias se eliminaron correctamente.",
      });
    });

    // Verificamos que el listado se actualice realizando otra peticion GET al backend.
    await waitFor(() => {
      const listRequests = fetchSpy.mock.calls.filter(([input, init]) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        return url.includes("/facultades") && method === "GET";
      });
      expect(listRequests.length).toBeGreaterThanOrEqual(2);
    });
  });

  // Decima prueba: cuando la eliminacion falla se informa el error y el dialogo permanece abierto.
  it("shows an error toast and keeps the dialog open when deletion fails", async () => {
    // Sobrescribimos la implementacion para devolver un error al intentar eliminar.
    fetchSpy.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/facultades/7") && init?.method === "DELETE") {
        return {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({ message: "El backend fallo" }),
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "content-type" ? "application/json" : null,
          },
        } as unknown as Response;
      }
      return defaultFetchImplementation(input, init);
    });

    // Configuramos a la persona usuaria simulada para realizar los clics necesarios.
    const user = userEvent.setup();

    // Renderizamos la pantalla para tener disponible la fila objetivo.
    render(<FacultyListPage />);

    // Esperamos a que la informacion inicial se muestre correctamente.
    await screen.findByText("Facultad de Ciencias y Tecnologia");

    // Abrimos el dialogo activando el boton de eliminar.
    await user.click(screen.getByTitle(/eliminar/i));

    // Extraemos el boton que confirma la eliminacion.
    const confirmButton = await screen.findByRole("button", { name: /Eliminar/i });

    // Intentamos eliminar sabiendo que se devolvera un error.
    await user.click(confirmButton);

    // Confirmamos que se haya mostrado un toast de error con el detalle del backend.
    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith({
        title: "No se pudo eliminar la facultad",
        description: "El backend fallo",
      });
    });

    // El dialogo debe continuar visible para permitir cancelar o reintentar.
    expect(
      screen.getByRole("heading", { name: /eliminar facultad/i })
    ).toBeInTheDocument();
  });

  it("habilita la siguiente pagina cuando el backend no envia pages pero indica hasNextPage", async () => {
    facultyResponse.meta = {
      page: 1,
      take: 1,
      total: 7,
      hasNextPage: true,
      hasPreviousPage: false,
    }; // Configuramos la forma observada sin pages.
    Reflect.deleteProperty(
      facultyResponse.meta as Record<string, unknown>,
      "pages"
    ); // Quitamos la propiedad pages.

    const user = userEvent.setup(); // Persona usuaria virtual.

    render(<FacultyListPage />); // Montamos la pantalla principal.

    await screen.findByText("Facultad de Ciencias y Tecnologia"); // Verificamos que se renderizo la fila inicial.

    const nextButton = screen.getByRole("button", {
      name: /go to next page/i,
    }); // Localizamos el control de avance.

    expect(nextButton).not.toBeDisabled(); // Debe seguir habilitado porque hay mas paginas segun meta.

    facultyResponse.meta.page = 2; // Simulamos que el backend responde con la pagina siguiente.

    await user.click(nextButton); // Solicitamos avanzar.

    await waitFor(() => {
      const lastCall = fetchSpy.mock.calls.at(-1); // Obtenemos la ultima llamada a fetch.
      const requestedUrl = lastCall?.[0] as string;
      expect(requestedUrl).toContain("page=2"); // Confirmamos que la query apunto a la pagina 2.
    });
  });
});
