import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { notify } from "@/lib/notify";
import EnvironmentListPage from "../page";

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

// Jsdom no implementa los metodos de puntero que Radix Select necesita, por eso los simulamos.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const apiFetchMock = vi.mocked(apiFetch);
const notifyMock = vi.mocked(notify);

// Esta estructura simula el contrato real del backend para el listado principal.
const environmentListResponse = {
  // items representa las filas que la tabla debe desplegar.
  items: [
    {
      id: 10,
      codigo: "AMB-100",
      nombre: "Laboratorio de redes",
      piso: 2,
      clases: true,
      activo: true,
      capacidad: { total: 40, examen: 30 },
      tipo_ambiente_id: 3,
      bloque_id: 5,
      tipo_ambiente: { nombre: "Laboratorio" },
      bloque: { nombre: "Bloque Central" },
    },
  ],
  // meta expone la informacion de paginacion usada por la UI.
  meta: {
    page: 1,
    pages: 3,
    total: 15,
    take: 8,
  },
};

// Respuesta simplificada para el catalogo de bloques.
const blockCatalogResponse = {
  items: [
    {
      id: 5,
      nombre: "Bloque Central",
    },
  ],
};

// Respuesta simplificada para el catalogo de tipos de ambiente.
const environmentTypeCatalogResponse = {
  items: [
    {
      id: 3,
      nombre: "Laboratorio",
    },
  ],
};

// Respuesta simplificada para el catalogo de facultades.
const facultyCatalogResponse = {
  items: [
    {
      id: 7,
      nombre: "Facultad de Ingenieria",
    },
  ],
};

describe("EnvironmentListPage", () => {
  // Antes de cada prueba configuramos el mock del cliente HTTP.
  beforeEach(() => {
    apiFetchMock.mockReset();
    notifyMock.success.mockReset();
    notifyMock.error.mockReset();
    notifyMock.info.mockReset();
    apiFetchMock.mockImplementation(
      async (path: string, options?: { method?: string }) => {
        if (path.startsWith("/ambientes") && options?.method === "POST") {
          return { id: 99 } as unknown;
        }
        if (path.startsWith("/ambientes")) {
          return environmentListResponse as unknown;
        }
        if (path.startsWith("/bloques")) {
          return blockCatalogResponse as unknown;
        }
        if (path.startsWith("/tipo_ambientes")) {
          return environmentTypeCatalogResponse as unknown;
        }
        if (path.startsWith("/facultades")) {
          return facultyCatalogResponse as unknown;
        }
        throw new Error(`Unexpected endpoint ${path}`);
      }
    );
  });

  // Despues de cada prueba limpiamos los mocks para no compartir estado.
  afterEach(() => {
    vi.clearAllMocks();
    environmentListResponse.meta.page = 1;
  });

  it("muestra la tabla con filtros, boton de creacion y acciones por fila", async () => {
    // Renderizamos la pagina que deseamos validar.
    render(<EnvironmentListPage />);

    // Esperamos a que el nombre del ambiente aparezca como indicador de que los datos cargaron.
    await screen.findByText("Laboratorio de redes");

    // Confirmamos que el campo de busqueda principal exista y sea accesible.
    expect(
      screen.getByLabelText("Buscar ambientes")
    ).toBeInTheDocument();

    // Revisamos que el selector de tipos de ambiente se muestre en el area de filtros.
    expect(
      screen.getByLabelText("Tipo de ambiente")
    ).toBeInTheDocument();

    // Revisamos que el selector de bloques tambien este disponible.
    expect(
      screen.getByLabelText("Bloque")
    ).toBeInTheDocument();

    // Confirmamos que exista el filtro por facultad solicitado.
    expect(
      screen.getByLabelText("Facultad")
    ).toBeInTheDocument();

    // Validamos que exista la accion primaria para crear nuevos ambientes.
    expect(
      screen.getByRole("button", { name: /nuevo ambiente/i })
    ).toBeInTheDocument();

    // Comprobamos que el boton \"Ver\" (para ocultar/mostrar columnas) se presente sobre la tabla.
    expect(screen.getByRole("button", { name: /^ver$/i })).toBeInTheDocument();

    // Validamos que la columna de acciones se encuentre disponible.
    expect(
      screen.getByRole("columnheader", { name: /acciones/i })
    ).toBeInTheDocument();

    // Confirmamos que la fila renderice los botones de editar y eliminar solicitados.
    expect(
      screen.getByRole("button", { name: /editar ambiente/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /eliminar ambiente/i })
    ).toBeInTheDocument();
  });

  it("abre el modal de creacion sin scroll visible y expone los campos requeridos", async () => {
    const user = userEvent.setup();

    render(<EnvironmentListPage />);

    await screen.findByText("Laboratorio de redes");

    await user.click(screen.getByRole("button", { name: /nuevo ambiente/i }));

    const dialog = await screen.findByRole("dialog");
    const dialogUtils = within(dialog);

    expect(dialog).toHaveClass("overflow-hidden");
    expect(dialog).toHaveClass("max-h-[90vh]");

    expect(dialogUtils.getByLabelText(/^Codigo$/i)).toBeInTheDocument();
    expect(dialogUtils.getByLabelText(/^Nombre$/i)).toBeInTheDocument();
    expect(dialogUtils.getByLabelText(/Nombre corto/i)).toBeInTheDocument();
    expect(dialogUtils.getByLabelText(/^Piso$/i)).toBeInTheDocument();
    expect(dialogUtils.getByLabelText("Bloque")).toBeInTheDocument();
    expect(dialogUtils.getByLabelText("Tipo de ambiente")).toBeInTheDocument();
    expect(dialogUtils.getByLabelText("Capacidad total")).toBeInTheDocument();
    expect(dialogUtils.getByLabelText("Capacidad examen")).toBeInTheDocument();
    expect(dialogUtils.getByLabelText("Largo")).toBeInTheDocument();
    expect(dialogUtils.getByLabelText("Ancho")).toBeInTheDocument();
    expect(dialogUtils.getByLabelText("Alto")).toBeInTheDocument();
    expect(dialogUtils.getByLabelText("Unidad de medida")).toBeInTheDocument();
    expect(dialogUtils.getByLabelText(/Dicta clases/i)).toBeInTheDocument();
    expect(dialogUtils.getByLabelText(/^Activo$/i)).toBeInTheDocument();
  });

  it("incluye los filtros y la busqueda dentro de la consulta enviada al backend", async () => {
    // Configuramos una persona usuaria virtual para interactuar con la UI.
    const user = userEvent.setup();

    // Renderizamos la pagina para ejecutar la prueba.
    render(<EnvironmentListPage />);

    // Esperamos a que se muestre el contenido inicial de la tabla.
    await screen.findByText("Laboratorio de redes");

    // Guardamos el numero actual de llamadas para identificar la siguiente solicitud al backend.
    const initialCallCount = apiFetchMock.mock.calls.length;

    // Escribimos un termino de busqueda que debe llegar como query param.
    const searchInput = screen.getByLabelText("Buscar ambientes");
    await user.clear(searchInput);
    await user.type(searchInput, "Laboratorio");

    // Seleccionamos una opcion del filtro de tipos de ambiente.
    const typeTrigger = screen.getByLabelText("Tipo de ambiente");
    await user.click(typeTrigger);
    await user.click(screen.getByRole("option", { name: "Laboratorio" }));

    // Seleccionamos una opcion del filtro de bloques.
    const blockTrigger = screen.getByLabelText("Bloque");
    await user.click(blockTrigger);
    await user.click(screen.getByRole("option", { name: "Bloque Central" }));

    // Seleccionamos una facultad para limitar los ambientes.
    const facultyTrigger = screen.getByLabelText("Facultad");
    await user.click(facultyTrigger);
    await user.click(
      screen.getByRole("option", { name: "Facultad de Ingenieria" })
    );

    // Configuramos el filtro de estado para quedarse con los ambientes activos.
    const statusTrigger = screen.getByLabelText("Estado");
    await user.click(statusTrigger);
    await user.click(screen.getByRole("option", { name: /^activos$/i }));

    // Ajustamos el filtro que indica si el ambiente se usa para dictar clases.
    const classesTrigger = screen.getByLabelText("Uso academico");
    await user.click(classesTrigger);
    await user.click(screen.getByRole("option", { name: /no dicta clases/i }));

    // Ingresamos un rango para el piso minimo y maximo.
    const floorMinInput = screen.getByLabelText("Piso minimo");
    await user.clear(floorMinInput);
    await user.type(floorMinInput, "1");
    const floorMaxInput = screen.getByLabelText("Piso maximo");
    await user.clear(floorMaxInput);
    await user.type(floorMaxInput, "3");

    // Ejecutamos la accion de aplicar filtros para que se dispare la nueva consulta.
    await user.click(
      screen.getByRole("button", { name: /aplicar filtros/i })
    );

    // Esperamos a que se realice una nueva llamada que incluya todos los parametros seleccionados.
    await waitFor(() => {
      expect(apiFetchMock.mock.calls.length).toBeGreaterThan(initialCallCount);
      const lastCall =
        apiFetchMock.mock.calls[apiFetchMock.mock.calls.length - 1];
      expect(lastCall?.[0]).toContain("search=Laboratorio");
      expect(lastCall?.[0]).toContain("tipoAmbienteId=3");
      expect(lastCall?.[0]).toContain("bloqueId=5");
      expect(lastCall?.[0]).toContain("facultadId=7");
      expect(lastCall?.[0]).toContain("activo=true");
      expect(lastCall?.[0]).toContain("clases=false");
      expect(lastCall?.[0]).toContain("pisoMin=1");
      expect(lastCall?.[0]).toContain("pisoMax=3");
    });
  });

  it("crea un ambiente, cierra el modal y refresca el listado tras guardar", async () => {
    const user = userEvent.setup();

    render(<EnvironmentListPage />);

    await screen.findByText("Laboratorio de redes");

    await user.click(screen.getByRole("button", { name: /nuevo ambiente/i }));

    const dialog = await screen.findByRole("dialog");
    const dialogUtils = within(dialog);

    await dialogUtils.findByRole("heading", { name: /registrar ambiente/i });

    await user.type(dialogUtils.getByLabelText(/^Codigo$/i), "AMB-200");
    await user.type(dialogUtils.getByLabelText(/^Nombre$/i), "Laboratorio IoT");
    await user.type(dialogUtils.getByLabelText(/Nombre corto/i), "IoT");
    await user.type(dialogUtils.getByLabelText(/^Piso$/i), "2");

    const blockSelect = dialogUtils.getByLabelText("Bloque");
    await user.click(blockSelect);
    await user.click(dialogUtils.getByRole("option", { name: "Bloque Central" }));

    const typeSelect = dialogUtils.getByLabelText("Tipo de ambiente");
    await user.click(typeSelect);
    await user.click(dialogUtils.getByRole("option", { name: "Laboratorio" }));

    await user.type(dialogUtils.getByLabelText("Capacidad total"), "80");
    await user.type(dialogUtils.getByLabelText("Capacidad examen"), "40");
    await user.type(dialogUtils.getByLabelText("Largo"), "12");
    await user.type(dialogUtils.getByLabelText("Ancho"), "9");
    await user.type(dialogUtils.getByLabelText("Alto"), "4");

    const unitInput = dialogUtils.getByLabelText("Unidad de medida");
    expect(unitInput).toHaveAttribute("readonly");
    expect(unitInput).toHaveValue("metros");

    const classesCheckbox = dialogUtils.getByLabelText(/Dicta clases/i);
    await user.click(classesCheckbox);

    const activeCheckbox = dialogUtils.getByLabelText(/^Activo$/i);
    await user.click(activeCheckbox);

    await user.click(
      dialogUtils.getByRole("button", { name: /registrar ambiente/i })
    );

    await waitFor(() => {
      const postCall = apiFetchMock.mock.calls.find(
        ([path, options]) =>
          path === "/ambientes" &&
          options &&
          typeof options === "object" &&
          "method" in options &&
          (options as { method?: string }).method === "POST"
      );
      expect(postCall).toBeTruthy();
      const [, options] = postCall as [
        string,
        { method?: string; json?: unknown }
      ];
      expect(options).toMatchObject({
        method: "POST",
        json: expect.objectContaining({
          codigo: "AMB-200",
          nombre: "Laboratorio IoT",
          nombre_corto: "IoT",
          piso: 2,
          clases: false,
          activo: false,
          capacidad: { total: 80, examen: 40 },
          dimension: {
            largo: 12,
            ancho: 9,
            alto: 4,
            unid_med: "metros",
          },
          bloque_id: 5,
          tipo_ambiente_id: 3,
        }),
      });
    });

    await waitFor(() => {
      expect(notifyMock.success).toHaveBeenCalledWith({
        title: "Ambiente registrado",
        description: "El inventario se actualizo correctamente.",
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(
      apiFetchMock.mock.calls.filter(
        ([path]) => typeof path === "string" && path.startsWith("/ambientes?")
      ).length
    ).toBeGreaterThanOrEqual(2);
  });

  it("pide una nueva pagina cuando la persona usa la paginacion", async () => {
    // Generamos una persona usuaria virtual para interactuar con el control de paginacion.
    const user = userEvent.setup();

    // Renderizamos la pagina objetivo de la historia.
    render(<EnvironmentListPage />);

    // Esperamos a que el primer ambiente se renderice para confirmar que la data llego.
    await screen.findByText("Laboratorio de redes");

    // Actualizamos la simulacion para que el backend responda que navego a la pagina 2.
    environmentListResponse.meta.page = 2;

    // Localizamos el boton que pasa a la siguiente pagina.
    const nextButton = screen.getByRole("button", {
      name: /go to next page/i,
    });

    // Ejecutamos el click que simula la intencion de la persona usuaria.
    await user.click(nextButton);

    // Confirmamos que la llamada mas reciente incluya page=2 en la query.
    await waitFor(() => {
      const lastCall =
        apiFetchMock.mock.calls[apiFetchMock.mock.calls.length - 1];
      expect(lastCall?.[0]).toContain("page=2");
    });
  });
});
