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

// Declaramos una respuesta base para el listado de campus que el formulario necesita para popular el selector.
const campusResponse = {
  // items contiene cada campus con su identificador y nombre legible.
  items: [
    {
      id: 4,
      codigo: "CMP-001",
      nombre: "Campus Central",
    },
    {
      id: 6,
      codigo: "CMP-002",
      nombre: "Campus Norte",
    },
  ],
  // meta describe la paginación del endpoint de campus, aunque aquí solo usamos los elementos.
  meta: {
    page: 1,
    take: 20,
    pages: 1,
    total: 2,
  },
};

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
    fetchSpy = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        // Convertimos el argumento input en una cadena para comparar rutas fácilmente.
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

        // Esta rama simula la petición para obtener el catálogo de campus que alimenta el selector.
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

        // Esta rama captura la creación de una nueva facultad.
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

        // Cualquier otra llamada devuelve una respuesta vacía exitosa.
        return {
          ok: true,
          json: async () => ({}),
          headers: {
            get: () => null,
          },
        } as unknown as Response;
      });
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

  // Cuarta prueba: validamos que el formulario permita crear una facultad completa incluyendo la selección de campus.
  it("submits the create faculty form with the selected campus", async () => {
    // Configuramos al usuario simulado para escribir y hacer clic igual que una persona.
    const user = userEvent.setup();

    // Renderizamos la página de listado para interactuar con el formulario de creación.
    render(<FacultyListPage />);

    // Esperamos a que la tabla se cargue para asegurar que las peticiones iniciales terminaron.
    await screen.findByText("Facultad de Ciencias y Tecnología");

    // Abrimos el diálogo de creación haciendo clic en el botón principal.
    const createButton = screen.getByRole("button", { name: /nueva facultad/i });
    await user.click(createButton);

    // Confirmamos que el encabezado del formulario esté visible para continuar con los campos.
    await screen.findByRole("heading", { name: /registrar nueva facultad/i });

    // Llenamos el campo de código con un valor de ejemplo.
    await user.type(screen.getByLabelText(/código de la facultad/i), "FAC-123");

    // Llenamos el nombre oficial de la facultad.
    await user.type(
      screen.getByLabelText(/nombre de la facultad/i),
      "Facultad de Ingeniería"
    );

    // Llenamos el nombre corto opcional.
    await user.type(
      screen.getByLabelText(/nombre corto/i),
      "FI"
    );

    // Registramos la dirección física requerida.
    await user.type(
      screen.getByLabelText(/dirección/i),
      "Av. Universitaria 100"
    );

    // Abrimos el selector de campus para escoger la relación adecuada.
    await user.click(screen.getByRole("button", { name: /seleccionar campus/i }));

    // Escribimos un texto de búsqueda para filtrar los campus disponibles.
    const campusSearchInput = screen.getByPlaceholderText(/buscar campus/i);
    await user.type(campusSearchInput, "central");

    // Elegimos la opción filtrada que coincide con el término introducido.
    await user.click(
      await screen.findByRole("option", { name: /campus central/i })
    );

    // Llenamos la latitud obligatoria.
    await user.type(
      screen.getByLabelText(/latitud/i),
      "-17.38"
    );

    // Llenamos la longitud obligatoria.
    await user.type(
      screen.getByLabelText(/longitud/i),
      "-66.16"
    );

    // Enviamos el formulario haciendo clic en el botón principal.
    await user.click(screen.getByRole("button", { name: /crear facultad/i }));

    // Verificamos que se haya realizado la petición POST con el payload correcto.
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
        nombre: "Facultad de Ingeniería",
        nombre_corto: "FI",
        direccion: "Av. Universitaria 100",
        campus_id: 4,
        lat: -17.38,
        lng: -66.16,
      });
    });

    // Finalmente comprobamos que el diálogo se haya cerrado después del envío exitoso.
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /registrar nueva facultad/i })
      ).not.toBeInTheDocument();
    });
  });
});
