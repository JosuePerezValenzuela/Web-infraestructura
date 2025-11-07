"use client";

import { render, screen, waitFor, within } from "@testing-library/react"; // Importamos las utilidades básicas de Testing Library para montar componentes y consultar el DOM virtual.
import userEvent from "@testing-library/user-event"; // Esta utilidad nos permite simular las acciones que haría una persona usando la interfaz.
import { vi } from "vitest"; // Vitest nos aporta las funciones para crear mocks y escribir pruebas.
import { apiFetch } from "@/lib/api"; // apiFetch es el cliente que utiliza la app para hablar con el backend; lo vamos a espiar.
import BlockListPage from "../page"; // Importamos la página que vamos a probar.

// También simulamos el helper apiFetch para controlar completamente las respuestas del backend.
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(), // Creamos una función espiada que podremos configurar en cada escenario.
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
      creado_en: "2025-01-01T12:00:00.000Z", // Fecha de creación que se formateará.
    },
  ],
  meta: {
    total: 1, // Total de registros disponibles en el backend.
    page: 1, // Página actual que devolvió la API.
    take: 8, // Cantidad de filas solicitadas por página.
    pages: 1, // Número total de páginas disponibles.
    hasNextPage: false, // Indicador para deshabilitar el botón de página siguiente.
    hasPreviousPage: false, // Indicador para deshabilitar el botón de página anterior.
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
  mockedApiFetch.mockImplementation(async (path: string) => {
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
      return blockListResponse as never;
    }
    // Si llega una ruta inesperada fallamos explicitamente para detectar problemas en la prueba.
    throw new Error(`Unhandled path ${path}`);
  });
}

// Agrupamos todos los escenarios que validan el comportamiento de la página de bloques.
describe("BlockListPage", () => {
  // Antes de cada prueba dejamos el mock de la API en blanco y luego reponemos las respuestas de éxito.
  beforeEach(() => {
    mockedApiFetch.mockReset(); // Limpiamos cualquier llamada o implementación previa del mock.
    mockSuccessfulCatalogs(); // Registramos la implementación que devuelve los catálogos simulados.
  });

  // Después de cada escenario limpiamos los mocks para que no filtren estado a las siguientes pruebas.
  afterEach(() => {
    vi.clearAllMocks(); // Esta llamada limpia los spies de Vitest, incluyendo el mock de toast.
  });

  it("muestra el listado inicial de bloques con los controles de busqueda y filtros", async () => {
    render(<BlockListPage />); // Renderizamos la página igual que en el navegador.

    await screen.findByRole("table"); // Esperamos a que la tabla aparezca para asegurarnos de que los datos cargaron.

    expect(screen.getByRole("heading", { name: /bloques/i })).toBeInTheDocument(); // Confirmamos que el título principal sea visible.
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
      screen.getByRole("link", { name: /Nuevo bloque/i })
    ).toBeInTheDocument(); // El enlace para registrar nuevos bloques debe estar disponible.

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
    render(<BlockListPage />); // Montamos la página.

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
    }); // Obtenemos el botón dedicado a restaurar el formulario.
    await user.click(clearButton); // Ejecutamos la acción de limpiar.

    await waitFor(() => {
      const blockCalls = mockedApiFetch.mock.calls.filter(([path]) =>
        (path as string).startsWith("/bloques")
      );
      const lastPath = blockCalls.at(-1)?.[0] as string | undefined;
      expect(lastPath).not.toContain("facultadId="); // Confirmamos que el query param ya no esté presente.
      expect(lastPath).toContain("page=1"); // A la vez nos aseguramos de regresar a la primera página.
    });
  });

  it("ofrece un enlace directo para registrar nuevos bloques", async () => {
    render(<BlockListPage />); // Renderizamos la página objetivo.

    const createLink = await screen.findByRole("link", {
      name: /nuevo bloque/i,
    }); // Buscamos el enlace responsable de iniciar la creación.

    expect(createLink).toHaveAttribute(
      "href",
      "/dashboard/bloques/create"
    ); // Confirmamos que lleve a la ruta de creación.
  });
});
