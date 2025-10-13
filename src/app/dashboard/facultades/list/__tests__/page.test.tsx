// Importamos las utilidades de pruebas para renderizar componentes y consultar la pantalla.
import { render, screen, waitFor } from "@testing-library/react";
// Importamos userEvent para simular acciones humanas como clics o tipeos.
import userEvent from "@testing-library/user-event";
// Importamos vi desde Vitest para crear dobles (mocks) de funciones globales como fetch.
import { vi } from "vitest";
// Importamos la página que vamos a probar; aún no existe la implementación real, por eso las pruebas fallarán primero.
import FacultyListPage from "../page";

// Declaramos una variable para reutilizar el espía de fetch en cada prueba.
let fetchSpy: ReturnType<typeof vi.spyOn>;

// Agrupamos las pruebas relacionadas con la página de facultades para mantenerlas organizadas.
describe("FacultyListPage interactions", () => {
  // Definimos una respuesta base que el backend devolvería al listar facultades.
  const facultyResponse = {
    // La clave items contiene el arreglo de filas que la tabla debe mostrar.
    items: [
      {
        // id interno que NO debe aparecer en la tabla, pero sí está disponible en la respuesta.
        id: 7,
        // código único de la facultad que sí debe mostrarse.
        codigo: "FAC-001",
        // nombre completo de la facultad que debe ser visible.
        nombre: "Facultad de Ciencias y Tecnología",
        // nombre corto que también debe aparecer como columna.
        nombre_corto: "FCyT",
        // nombre del campus al que pertenece; reemplaza al campus_id en la tabla.
        campus_nombre: "Campus Central",
        // indicador de estado; se mostrará como texto "Activo" o "Inactivo".
        activo: true,
        // fecha de creación que la tabla debe formatear.
        creado_en: "2025-01-15T10:30:00Z",
      },
    ],
    // Meta describe la paginación que acompaña a los datos.
    meta: {
      // Página actual entregada por el backend.
      page: 1,
      // Cantidad de elementos por página.
      take: 8,
      // Total de páginas disponibles; usamos 3 para poder probar el cambio de página.
      pages: 3,
      // Total de elementos existentes en la base.
      total: 12,
    },
  };

  // Antes de cada prueba configuramos un espía sobre fetch para controlar las respuestas HTTP.
  beforeEach(() => {
    // Creamos un mock que siempre devuelve una respuesta exitosa con el JSON anterior.
    fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async () => ({
      ok: true,
      json: async () => facultyResponse,
      headers: {
        // Usamos un objeto mínimo con un método get para simular los encabezados HTTP.
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? "application/json" : null,
      },
    }) as unknown as Response);
  });

  // Después de cada prueba restauramos el comportamiento real de fetch para no afectar a otras suites.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Primera prueba: la tabla debe mostrar los datos básicos de una facultad y ocultar campos técnicos.
  it("renders faculty rows showing the campus name instead of raw identifiers", async () => {
    // Renderizamos la página completa como lo haría el navegador.
    render(<FacultyListPage />);

    // Esperamos a que aparezca el nombre de la facultad, lo que indica que la tabla se llenó.
    await screen.findByText("Facultad de Ciencias y Tecnología");

    // Verificamos que el nombre del campus sea visible en la misma fila.
    expect(screen.getByText("Campus Central")).toBeInTheDocument();

    // Confirmamos que el estado activo se traduzca en el texto legible para la persona usuaria.
    expect(screen.getByText("Activo")).toBeInTheDocument();

    // Revisamos que no se muestre el identificador interno de la fila, porque la regla pide ocultarlo.
    expect(screen.queryByText("7")).not.toBeInTheDocument();
  });

  // Segunda prueba: cambiar la búsqueda debe reiniciar la paginación a la primera página.
  it("resets the current page to 1 when the search query changes", async () => {
    // Volvemos a renderizar la página para iniciar el escenario.
    render(<FacultyListPage />);

    // Esperamos a que cargue la primera tanda de datos (página 1).
    await screen.findByText("Facultad de Ciencias y Tecnología");

    // Buscamos el botón que avanza a la siguiente página.
    const nextPageButton = screen.getByRole("button", { name: /next/i });

    // Simulamos que la persona hace clic para ir a la página 2.
    await userEvent.click(nextPageButton);

    // Esperamos hasta confirmar que se haya hecho una nueva petición con page=2.
    await waitFor(() => {
      // Tomamos la última URL solicitada y revisamos sus parámetros.
      const lastCall = fetchSpy.mock.calls.at(-1);
      // Si no hubo ninguna llamada, fallamos inmediatamente para evitar falsos positivos.
      expect(lastCall).toBeTruthy();
      // Extraemos el primer argumento (la URL) de la llamada.
      const requestedUrl = String(lastCall![0]);
      // Reconstruimos la URL absoluta para leer cómodamente los parámetros de búsqueda.
      const params = new URL(requestedUrl, "https://localhost").searchParams;
      // Validamos que la consulta haya pedido la página 2.
      expect(params.get("page")).toBe("2");
    });

    // Ubicamos el campo de búsqueda que filtra la tabla.
    const searchBox = screen.getByPlaceholderText(
      "Buscar por cod, nom o campus"
    );

    // Simulamos que la persona escribe un término nuevo.
    await userEvent.type(searchBox, "central");

    // Esperamos la petición resultante y comprobamos que page vuelva a 1.
    await waitFor(() => {
      const lastCall = fetchSpy.mock.calls.at(-1);
      expect(lastCall).toBeTruthy();
      const requestedUrl = String(lastCall![0]);
      const params = new URL(requestedUrl, "https://localhost").searchParams;
      expect(params.get("page")).toBe("1");
      expect(params.get("search")).toBe("central");
    });
  });

  // Tercera prueba: el botón de crear debe mostrar un diálogo accesible para registrar una nueva facultad.
  it("opens the creation dialog when the user clicks the 'Nueva facultad' button", async () => {
    // Renderizamos la página para disponer de la UI.
    render(<FacultyListPage />);

    // Esperamos a que la primera carga termine para garantizar que el componente esté estable.
    await screen.findByText("Facultad de Ciencias y Tecnología");

    // Localizamos el botón principal que inicia el registro de una facultad.
    const createButton = screen.getByRole("button", { name: /nueva facultad/i });

    // Simulamos el clic humano sobre el botón.
    await userEvent.click(createButton);

    // Verificamos que aparezca el encabezado del diálogo indicando que se puede crear una nueva facultad.
    expect(
      await screen.findByRole("heading", { name: /registrar nueva facultad/i })
    ).toBeInTheDocument();
  });
});
