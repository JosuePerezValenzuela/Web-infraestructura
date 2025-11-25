"use client";

import { render, screen, waitFor, within } from "@testing-library/react"; // Importamos las utilidades básicas de Testing Library para montar componentes y consultar el DOM virtual.
import userEvent from "@testing-library/user-event"; // Esta utilidad nos permite simular las acciones que haría una persona usando la interfaz.
import { vi } from "vitest"; // Vitest nos aporta las funciones para crear mocks y escribir pruebas.
import { apiFetch } from "@/lib/api"; // apiFetch es el cliente que utiliza la app para hablar con el backend; lo vamos a espiar.
import { notify } from "@/lib/notify"; // Espiamos las notificaciones para verificar los mensajes de éxito o error.
import BlockListPage from "../page"; // Importamos la pagina que vamos a probar.

// También simulamos el helper apiFetch para controlar completamente las respuestas del backend.
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(), // Creamos una función espiada que podremos configurar en cada escenario.
}));

vi.mock("@/lib/notify", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockedNotify = vi.mocked(notify);

const { blockEditFormMock } = vi.hoisted(() => ({
  blockEditFormMock: vi.fn(
    ({
      block,
      onSubmitSuccess,
      onCancel,
    }: {
      block: { id: number; nombre: string };
      faculties: unknown[];
      blockTypes: unknown[];
      onSubmitSuccess?: () => void | Promise<void>;
      onCancel?: () => void;
    }) => (
      <div data-testid="mock-edit-form">
        <p>
          Editando bloque: <span>{block.nombre}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            void onSubmitSuccess?.();
          }}
        >
          Simular guardado
        </button>
        <button
          type="button"
          onClick={() => {
            onCancel?.();
          }}
        >
          Cancelar edicion
        </button>
      </div>
    )
  ),
}));

const { blockCreateFormMock } = vi.hoisted(() => ({
  blockCreateFormMock: vi.fn(
    ({
      onSuccess,
      onCancel,
    }: {
      faculties: unknown[];
      blockTypes: unknown[];
      onSuccess?: () => void | Promise<void>;
      onCancel?: () => void;
    }) => (
      <div data-testid="mock-create-form">
        <p>Formulario de creacion de bloque</p>
        <button
          type="button"
          onClick={() => {
            void onSuccess?.();
          }}
        >
          Simular registro
        </button>
        <button
          type="button"
          onClick={() => {
            onCancel?.();
          }}
        >
          Cancelar creacion
        </button>
      </div>
    )
  ),
}));

vi.mock("@/features/blocks/edit/BlockEditForm", () => ({
  __esModule: true,
  default: blockEditFormMock,
}));

vi.mock("@/features/blocks/BlockCreateForm", () => ({
  __esModule: true,
  BlockCreateForm: blockCreateFormMock,
}));

// Jsdom no implementa hasPointerCapture/releasePointerCapture y Radix Select los requiere para manejar eventos de puntero.
if (!Element.prototype.hasPointerCapture) {
  // Proveemos una implementación mínima que solo devuelve false.
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  // Creamos un método vacío para que el selector pueda invocarlo sin fallar.
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  // Radix intenta centrar la opción activa, por eso devolvemos una función vacía.
  Element.prototype.scrollIntoView = () => {};
}

// Esta constante representa la respuesta que el backend devolvería al listar bloques.
const blockListResponse = {
  items: [
    {
      id: 44, // Identificador interno del bloque.
      codigo: "BLO-044", // Código visible que se mostrará en la tabla.
      nombre: "Bloque Central", // Nombre completo del bloque.
      nombre_corto: "Central", // Nombre corto usado para filas compactas.
      pisos: 4, // Cantidad de pisos que tiene el bloque.
      activo: true, // Estado lógico que la UI convertirá en texto.
      facultad: "Facultad de Tecnologia", // Nombre de la facultad a la que pertenece.
      facultad_id: 7, // Identificador interno de la facultad para futuros flujos de edición.
      tipo_bloque: "Academico", // Clasificación del bloque.
      tipo_bloque_id: 2, // ID del tipo de bloque.
      creado_en: "2025-01-01T12:00:00.000Z", // Fecha de creacion que se formateará.
    },
  ],
  meta: {
    total: 1, // Total de registros disponibles en el backend.
    page: 1, // pagina actual que devolvió la API.
    take: 8, // Cantidad de filas solicitadas por pagina.
    pages: 1, // Número total de paginas disponibles.
    hasNextPage: false, // Indicador para deshabilitar el boton de pagina siguiente.
    hasPreviousPage: false, // Indicador para deshabilitar el boton de pagina anterior.
  },
};

// Catálogo simulado de facultades para poblar los filtros.
const facultiesResponse = {
  items: [
    { id: 7, nombre: "Facultad de Tecnologia" }, // Opción principal usada por los tests.
    { id: 9, nombre: "Facultad de Humanidades" }, // Segunda opción para probar cambios.
  ],
};

// Catálogo de tipos de bloque que alimentará el select correspondiente.
const blockTypesResponse = {
  items: [
    { id: 2, nombre: "Academico" }, // Tipo asociado al resultado base.
    { id: 5, nombre: "Administrativo" }, // Tipo alternativo para probar filtros.
  ],
};

// Obtenemos referencias tipadas a los mocks para usarlas cómodamente.
const mockedApiFetch = vi.mocked(apiFetch);
// Esta función configura el mock para que responda correctamente a cada endpoint solicitado.
function mockSuccessfulCatalogs() {
  // Reemplazamos la implementación de apiFetch por una versión que inspecciona la ruta solicitada.
  mockedApiFetch.mockImplementation(async (path: string, options?: RequestInit) => {
    // Si la ruta consulta facultades devolvemos el catálogo preparado.
    if (path.startsWith("/facultades")) {
      return facultiesResponse as never;
    }
    // Para la lista de tipos de bloque devolvemos el catálogo correspondiente.
    if (path.startsWith("/tipo_bloques")) {
      return blockTypesResponse as never;
    }
    // Siempre que se pidan bloques devolvemos la respuesta base.
    if (path.startsWith("/bloques")) {
      if (options?.method === "DELETE") {
        return undefined as never;
      }
      return blockListResponse as never;
    }
    // Si llega una ruta inesperada fallamos explicitamente para detectar problemas en la prueba.
    throw new Error(`Unhandled path ${path}`);
  });
}

// Agrupamos todos los escenarios que validan el comportamiento de la pagina de bloques.
describe("BlockListPage", () => {
  // Antes de cada prueba dejamos el mock de la API en blanco y luego reponemos las respuestas de éxito.
  beforeEach(() => {
    mockedApiFetch.mockReset(); // Limpiamos cualquier llamada o implementación previa del mock.
    mockSuccessfulCatalogs(); // Registramos la implementación que devuelve los catálogos simulados.
    blockEditFormMock.mockClear(); // Aseguramos que el mock del formulario de edición empiece limpio.
    blockCreateFormMock.mockClear(); // Reiniciamos el mock de creacion para cada escenario.
  });

  // Después de cada escenario limpiamos los mocks para que no filtren estado a las siguientes pruebas.
  afterEach(() => {
    blockListResponse.meta = {
      total: 1,
      page: 1,
      take: 8,
      pages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    vi.clearAllMocks(); // Esta llamada limpia los spies de Vitest, incluyendo el mock de toast.
  });

  it("muestra el listado inicial de bloques con los controles de busqueda y filtros", async () => {
    render(<BlockListPage />); // Renderizamos la pagina igual que en el navegador.

    await screen.findByRole("table"); // Esperamos a que la tabla aparezca para asegurarnos de que los datos cargaron.

    expect(screen.getByRole("heading", { name: /bloques/i })).toBeInTheDocument(); // Confirmamos que el titulo principal sea visible.
    const searchInput = screen.getByRole("textbox", {
      name: /buscar bloques/i,
    }); // Buscamos el campo de búsqueda por su etiqueta accesible.
    expect(searchInput).toBeInTheDocument(); // Validamos que el campo exista.

    await waitFor(() => {
      const rows = screen.getAllByRole("row"); // Obtenemos todas las filas de la tabla.
      const dataRow = rows.find((row) =>
        within(row).queryByText("Bloque Central")
      ); // Identificamos la fila que contiene el nombre esperado.
      expect(dataRow).toBeTruthy(); // Aseguramos que la fila exista.
      expect(within(dataRow!).getByText("BLO-044")).toBeInTheDocument(); // Revisamos que el código esté visible.
      expect(within(dataRow!).getByText("Facultad de Tecnologia")).toBeInTheDocument(); // La pertenencia a la facultad debe mostrarse.
      expect(within(dataRow!).getByText("Academico")).toBeInTheDocument(); // El tipo de bloque también es parte del diseño.
      expect(within(dataRow!).getByText("Activo")).toBeInTheDocument(); // El estado debe traducirse a texto comprensible.
    });

    expect(
      screen.getByRole("button", { name: /Nuevo bloque/i })
    ).toBeInTheDocument(); // El boton para registrar nuevos bloques debe estar disponible.

    // Validamos que todos los filtros solicitados existan en la interfaz.
    expect(
      screen.getByLabelText(/filtrar por facultad/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/filtrar por tipo de bloque/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/filtrar por estado/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/pisos mínimos/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/pisos máximos/i)
    ).toBeInTheDocument();
  });

  it("envía el termino de búsqueda cuando la persona usuaria confirma el formulario", async () => {
    const user = userEvent.setup(); // Creamos un usuario virtual que simulará las interacciones.
    render(<BlockListPage />); // Montamos la pagina.

    const searchInput = await screen.findByRole("textbox", {
      name: /buscar bloques/i,
    }); // Ubicamos el campo de búsqueda.

    await user.clear(searchInput); // Limpiamos cualquier texto previo para partir de un estado controlado.
    await user.type(searchInput, "Laboratorio{enter}"); // Escribimos el término y presionamos Enter para enviar el formulario.

    await waitFor(() => {
      const blockCalls = mockedApiFetch.mock.calls.filter(([path]) =>
        (path as string).startsWith("/bloques")
      ); // Nos quedamos solo con las llamadas enfocadas al listado de bloques.
      const lastPath = blockCalls.at(-1)?.[0] as string | undefined; // Obtenemos la ruta de la última petición para inspeccionar los parámetros.
      expect(lastPath).toContain("search=Laboratorio"); // Verificamos que el término se haya enviado en la query string.
      expect(lastPath).toContain("page=1"); // Confirmamos que la búsqueda restablece la pagina a 1.
    });
  });

  it("aplica filtros individuales y consulta nuevamente la API", async () => {
    const user = userEvent.setup(); // Configuramos al usuario virtual.
    render(<BlockListPage />); // Renderizamos la pantalla.

    const facultyTrigger = await screen.findByLabelText(/filtrar por facultad/i); // Localizamos el trigger del select de facultades.
    await user.click(facultyTrigger); // Abrimos el listado desplegable.
    const facultyOption = await screen.findByRole("option", {
      name: "Facultad de Humanidades",
    }); // Buscamos la opción concreta por su rol accesible.
    await user.click(facultyOption); // Elegimos una facultad distinta a la inicial.

    await waitFor(() => {
      const blockCalls = mockedApiFetch.mock.calls.filter(([path]) =>
        (path as string).startsWith("/bloques")
      ); // Revisamos nuevamente las llamadas al endpoint principal.
      const lastPath = blockCalls.at(-1)?.[0] as string | undefined; // Extraemos la última ruta solicitada.
      expect(lastPath).toContain("facultadId=9"); // Confirmamos que la query incluya el identificador recién seleccionado.
    });

    const typeTrigger = screen.getByLabelText(/filtrar por tipo de bloque/i); // Repetimos la estrategia ahora para el tipo de bloque.
    await user.click(typeTrigger); // Abrimos el select de tipos.
    const blockTypeOption = await screen.findByRole("option", {
      name: "Administrativo",
    }); // Buscamos el elemento accesible correspondiente.
    await user.click(blockTypeOption); // Seleccionamos la opción administrativa.

    await waitFor(() => {
      const blockCalls = mockedApiFetch.mock.calls.filter(([path]) =>
        (path as string).startsWith("/bloques")
      );
      const lastPath = blockCalls.at(-1)?.[0] as string | undefined;
      expect(lastPath).toContain("tipoBloqueId=5"); // Validamos que el filtro se traduzca en el query param esperado.
    });

    const stateTrigger = screen.getByLabelText(/filtrar por estado/i); // Continuamos con el filtro de estado.
    await user.click(stateTrigger); // Abrimos el select.
    const inactiveOption = await screen.findByRole("option", {
      name: /solo inactivos/i,
    }); // Ubicamos la opción de inactivos usando su rol accesible.
    await user.click(inactiveOption); // Elegimos la opción de inactivos.

    await waitFor(() => {
      const blockCalls = mockedApiFetch.mock.calls.filter(([path]) =>
        (path as string).startsWith("/bloques")
      );
      const lastPath = blockCalls.at(-1)?.[0] as string | undefined;
      expect(lastPath).toContain("activo=false"); // Revisamos que el estado booleano se envíe en la URL.
    });

    const minInput = screen.getByLabelText(/pisos mínimos/i); // Identificamos el campo para el rango inferior.
    const maxInput = screen.getByLabelText(/pisos máximos/i); // Identificamos el campo para el rango superior.
    await user.clear(minInput); // Borramos el valor previo.
    await user.type(minInput, "2"); // Establecemos un límite inferior.
    await user.clear(maxInput); // Limpiamos el límite superior.
    await user.type(maxInput, "6"); // Definimos el máximo permitido.

    await waitFor(() => {
      const blockCalls = mockedApiFetch.mock.calls.filter(([path]) =>
        (path as string).startsWith("/bloques")
      );
      const lastPath = blockCalls.at(-1)?.[0] as string | undefined;
      expect(lastPath).toContain("pisosMin=2"); // La query debe incluir el rango mínimo.
      expect(lastPath).toContain("pisosMax=6"); // Y también el rango máximo.
    });
  });

  it("permite limpiar los filtros y vuelve a la pagina inicial", async () => {
    const user = userEvent.setup(); // Instanciamos al usuario virtual.
    render(<BlockListPage />); // Montamos el componente bajo prueba.

    const facultyTrigger = await screen.findByLabelText(/filtrar por facultad/i); // Abrimos el filtro para generar un estado distinto al inicial.
    await user.click(facultyTrigger);
    const defaultFaculty = await screen.findByRole("option", {
      name: "Facultad de Tecnologia",
    }); // Reutilizamos el rol accesible para identificar la opción.
    await user.click(defaultFaculty); // Seleccionamos la opción principal para luego limpiarla.

    const clearButton = await screen.findByRole("button", {
      name: /limpiar filtros/i,
    }); // Obtenemos el boton dedicado a restaurar el formulario.
    await user.click(clearButton); // Ejecutamos la accion de limpiar.

    await waitFor(() => {
      const blockCalls = mockedApiFetch.mock.calls.filter(([path]) =>
        (path as string).startsWith("/bloques")
      );
      const lastPath = blockCalls.at(-1)?.[0] as string | undefined;
      expect(lastPath).not.toContain("facultadId="); // Confirmamos que el query param ya no esté presente.
      expect(lastPath).toContain("page=1"); // A la vez nos aseguramos de regresar a la primera pagina.
    });
  });

  it("abre el modal de creacion y permite disparar el guardado desde el formulario", async () => {
    const user = userEvent.setup();
    render(<BlockListPage />); // Renderizamos la pagina objetivo.

    const createButton = await screen.findByRole("button", {
      name: /nuevo bloque/i,
    }); // Buscamos el boton responsable de iniciar la creacion.

    await user.click(createButton); // Abrimos el modal.

    const dialog = await screen.findByRole("dialog"); // Capturamos el modal abierto.
    const dialogUtils = within(dialog);

    expect(
      dialogUtils.getByRole("heading", { name: /registrar bloque/i })
    ).toBeInTheDocument(); // Validamos el titulo del modal.

    expect(
      dialogUtils.getByTestId("mock-create-form")
    ).toBeInTheDocument(); // Verificamos que el formulario de creacion se haya renderizado.

    await user.click(
      dialogUtils.getByRole("button", { name: /simular registro/i })
    ); // Disparamos el exito simulado.

    await waitFor(() => {
      const blockRequests = mockedApiFetch.mock.calls.filter(([path, options]) => {
        return (
          typeof path === "string" &&
          path.startsWith("/bloques") &&
          (!options || options.method === undefined)
        );
      });
      expect(blockRequests.length).toBeGreaterThanOrEqual(2); // Debe ejecutar una recarga adicional del listado.
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); // El modal debe cerrarse tras el guardado.
    });
  });


  it("muestra el dialogo de confirmacion de eliminacion con los datos del bloque", async () => {
    const user = userEvent.setup(); // Instanciamos al usuario virtual para operar la interfaz.
    render(<BlockListPage />); // Montamos la pagina bajo prueba.

    await screen.findByText("Bloque Central"); // Esperamos a que la fila inicial esté disponible.

    const deleteButton = screen.getByTitle(/eliminar bloque/i); // Obtenemos el boton de eliminar de la fila.
    await user.click(deleteButton); // Abrimos el dialogo de confirmación.

    await screen.findByRole("heading", { name: /eliminar bloque/i }); // Verificamos el titulo del dialogo.
    expect(
      screen.getByText(/Confirma el codigo y nombre antes de continuar/i)
    ).toBeInTheDocument(); // Validamos el mensaje de seguridad.
    expect(
      screen.getByText(/BLO-044/, { selector: "span" })
    ).toBeInTheDocument(); // Mostramos el código del bloque seleccionado.
    expect(
      screen.getByText(/Bloque Central/, { selector: "span" })
    ).toBeInTheDocument(); // También debe aparecer el nombre descriptivo.
  });

  it("elimina el bloque, refresca la tabla y muestra un toast de exito", async () => {
    const user = userEvent.setup(); // Configuramos a la persona usuaria simulada.
    render(<BlockListPage />); // Renderizamos la vista del listado.

    await screen.findByText("Bloque Central"); // Esperamos a que la data se cargue.

    await user.click(screen.getByTitle(/eliminar bloque/i)); // Abrimos el dialogo destructivo.

    const confirmButton = await screen.findByRole("button", {
      name: /eliminar/i,
    }); // Localizamos el boton que confirma la eliminación.
    await user.click(confirmButton); // Ejecutamos la accion.

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith(
        `/bloques/${blockListResponse.items[0]!.id}`,
        expect.objectContaining({ method: "DELETE" })
      ); // Validamos que se invoque DELETE con el id correcto.
    });

    await waitFor(() => {
      expect(mockedNotify.success).toHaveBeenCalledWith({
        title: "Bloque eliminado",
        description: "El bloque se eliminó correctamente.",
      }); // Confirmamos el mensaje de éxito mostrado a la persona usuaria.
    });

    await waitFor(() => {
      const listRequests = mockedApiFetch.mock.calls.filter(
        ([path, options]) =>
          typeof path === "string" &&
          path.startsWith("/bloques?") &&
          (!options || !("method" in options) || options.method === undefined)
      );
      expect(listRequests.length).toBeGreaterThanOrEqual(2); // Debe haber al menos una recarga posterior al borrado.
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /eliminar bloque/i })
      ).not.toBeInTheDocument(); // El dialogo se cierra automáticamente tras la eliminación.
    });
  });

  it("abre el dialogo de edicion y refresca el listado cuando el guardado simulado finaliza", async () => {
    const user = userEvent.setup(); // Instanciamos al usuario virtual para disparar las acciones.
    render(<BlockListPage />); // Montamos la pagina completa para probar el flujo real.

    const editButton = await screen.findByTitle(/editar bloque/i); // Localizamos el boton de edicion dentro de la tabla.
    await user.click(editButton); // Abrimos el dialogo presionando el icono de lapiz.

    expect(
      await screen.findByRole("heading", { name: /editar bloque/i })
    ).toBeInTheDocument(); // Confirmamos que el dialogo muestre el titulo correcto.

    const mockForm = await screen.findByTestId("mock-edit-form"); // El componente simulado deberia renderizarse dentro del dialogo.
    expect(mockForm).toHaveTextContent("Bloque Central"); // Validamos que reciba la fila seleccionada.

    const lastCall = blockEditFormMock.mock.calls.at(-1); // Revisamos los argumentos del mock para confirmar el registro enviado.
    expect(lastCall?.[0].block.id).toBe(44); // El bloque con id 44 deberia ser el que se intenta editar.

    await user.click(
      screen.getByRole("button", { name: /simular guardado/i })
    ); // Simulamos que el formulario termino correctamente y notifico al padre.

    await waitFor(() => {
      const blockRequests = mockedApiFetch.mock.calls.filter(([path, options]) => {
        return (
          typeof path === "string" &&
          path.startsWith("/bloques") &&
          (!options || options.method === undefined)
        );
      });
      expect(blockRequests.length).toBeGreaterThanOrEqual(2); // Debe ejecutar una recarga adicional del listado.
    });

    await waitFor(() => {
      expect(screen.queryByTestId("mock-edit-form")).not.toBeInTheDocument();
    }); // El dialogo debe cerrarse tras completar la edicion.
  });

  it("muestra un toast de error y mantiene abierto el dialogo cuando la eliminacion falla", async () => {
    const baseImplementation = mockedApiFetch.getMockImplementation(); // Guardamos la implementación de éxito por defecto.

    mockedApiFetch.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path.startsWith("/bloques") && options?.method === "DELETE") {
        throw { message: "El backend falló" };
      }
      return baseImplementation?.(path, options as RequestInit);
    }); // Sobrescribimos para simular el error en DELETE.

    const user = userEvent.setup(); // Usuario virtual para los clicks.
    render(<BlockListPage />); // Montamos la pagina.

    await screen.findByText("Bloque Central"); // Esperamos los datos iniciales.

    await user.click(screen.getByTitle(/eliminar bloque/i)); // Abrimos el dialogo.

    const confirmButton = await screen.findByRole("button", {
      name: /eliminar/i,
    }); // boton para confirmar.
    await user.click(confirmButton); // Intentamos eliminar sabiendo que fallará.

    await waitFor(() => {
      expect(mockedNotify.error).toHaveBeenCalledWith({
        title: "No se pudo eliminar el bloque",
        description: "El backend falló",
      }); // Se informa el error devuelto por la API.
    });

    expect(
      screen.getByRole("heading", { name: /eliminar bloque/i })
    ).toBeInTheDocument(); // El dialogo permanece abierto para permitir reintentar.
  });

  it("habilita el boton de siguiente pagina cuando el backend no envia pages pero indica hasNextPage", async () => {
    blockListResponse.meta = {
      total: 7,
      page: 1,
      take: 1,
      hasNextPage: true,
      hasPreviousPage: false,
    }; // Configuramos el meta sin la propiedad pages.
    Reflect.deleteProperty(
      blockListResponse.meta as Record<string, unknown>,
      "pages"
    ); // Eliminamos pages para replicar la respuesta observada.

    const user = userEvent.setup(); // Usuario virtual para interactuar con la UI.
    render(<BlockListPage />); // Montamos la pagina principal.

    await screen.findByText("Bloque Central"); // Esperamos a que cargue la fila inicial.

    const nextButton = screen.getByRole("button", {
      name: /go to next page/i,
    }); // Obtenemos el control de avanzar pagina.

    expect(nextButton).not.toBeDisabled(); // Debe estar habilitado porque meta.hasNextPage es true.

    blockListResponse.meta.page = 2; // Simulamos que el backend responde la siguiente pagina.

    await user.click(nextButton); // Solicitamos avanzar en la paginación.

    await waitFor(() => {
      const lastCall = mockedApiFetch.mock.calls.at(-1); // Observamos la última llamada realizada.
      expect(lastCall?.[0]).toContain("page=2"); // Confirmamos que se pidió la pagina 2.
    });
  });
});








