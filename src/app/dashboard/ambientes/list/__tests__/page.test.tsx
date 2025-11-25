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

// Simulamos la respuesta que devuelve el nuevo servicio al consultar un NIA especifico.
const goodsResponse = [
  {
    nia: 12171,
    descripcion: "MESA DE MADERA",
    descripcionExt:
      "MESA PARA COMPUTADORA DE MADERA MARA COLOR CAFE, PARTE SUPERIOR UNA DIVISION, PARTE INFERIOR PORTA TECLADO CORREDIZO Y PORTA CPU DE:  1.12*0.79*0.95 MTS.",
    estado: "BUENO",
    marca: null,
    unidadMedida: "PIEZA",
    valorInicial: 450,
    modelo: null,
    serie: null,
    fechaCompra: "2006-01-02 00:00:00.0",
    fechaIncorporacion: "2006-03-14 00:00:00.0",
  },
];

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
const fetchMock = vi.fn();

// Esta estructura simula el contrato real del backend para el listado principal.
const environmentListResponse = {
  // items representa las filas que la tabla debe desplegar.
  items: [
    {
      id: 10,
      codigo: "AMB-100",
      nombre: "Laboratorio de redes",
      nombre_corto: "Lab redes",
      piso: 2,
      clases: true,
      activo: true,
      capacidad: { total: 40, examen: 30 },
      dimension: { largo: 10, ancho: 8, alto: 4, unid_med: "metros" },
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
    hasNextPage: true,
    hasPreviousPage: false,
  },
};

const mainEnvironment = environmentListResponse.items[0];

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

let shouldPatchFail = false;
let patchErrorMessage = "No se pudo actualizar";
let shouldDeleteFail = false;
let deleteErrorMessage = "No se pudo eliminar";

describe("EnvironmentListPage", () => {
  // Antes de cada prueba configuramos el mock del cliente HTTP.
  beforeEach(() => {
    shouldPatchFail = false;
    patchErrorMessage = "No se pudo actualizar";
    shouldDeleteFail = false;
    deleteErrorMessage = "No se pudo eliminar";
    process.env.GOODS_API_BASE_URL = "http://bienes.test/v1";
    fetchMock.mockReset();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/goods/")) {
        return Promise.resolve(
          new Response(JSON.stringify(goodsResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      throw new Error(`Unexpected fetch call to ${url}`);
    });
    // @ts-expect-error - Sobrescribimos fetch con el mock para las pruebas.
    global.fetch = fetchMock;
    apiFetchMock.mockReset();
    notifyMock.success.mockReset();
    notifyMock.error.mockReset();
    notifyMock.info.mockReset();
    apiFetchMock.mockImplementation(
      async (path: string, options?: { method?: string }) => {
        if (
          path === `/ambientes/${mainEnvironment.id}` &&
          options?.method === "PATCH"
        ) {
          if (shouldPatchFail) {
            throw { message: patchErrorMessage };
          }
          return { id: mainEnvironment.id } as unknown;
        }
        if (
          path === `/ambientes/${mainEnvironment.id}` &&
          options?.method === "DELETE"
        ) {
          if (shouldDeleteFail) {
            throw { message: deleteErrorMessage };
          }
          return undefined as unknown;
        }
        if (path === "/activos" && options?.method === "POST") {
          return { id: 501 } as unknown;
        }
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
    fetchMock.mockReset();
    delete process.env.GOODS_API_BASE_URL;
    environmentListResponse.meta = {
      page: 1,
      pages: 3,
      total: 15,
      take: 8,
      hasNextPage: true,
      hasPreviousPage: false,
    };
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

  it("abre el modal para asociar activos, consulta por NIA y guarda la seleccion", async () => {
    // Activamos temporizadores falsos para poder adelantar manualmente el debounce del buscador.
    vi.useFakeTimers();
    // Creamos una persona usuaria virtual que respeta los temporizadores simulados para las interacciones.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    // Renderizamos la pagina principal de ambientes que contiene la nueva accion.
    render(<EnvironmentListPage />);
    // Esperamos a que el nombre del ambiente aparezca, lo que confirma que la tabla cargo.
    await screen.findByText("Laboratorio de redes");
    // Buscamos el boton de la nueva accion para asociar activos en la fila del ambiente.
    const associateButton = screen.getByRole("button", {
      name: /asociar activos/i,
    });
    // Verificamos que el boton existe antes de interactuar con el.
    expect(associateButton).toBeInTheDocument();
    // Abrimos el modal haciendo clic en el boton de asociar activos.
    await user.click(associateButton);
    // Capturamos el dialogo que debe mostrarse luego del clic anterior.
    const dialog = await screen.findByRole("dialog");
    // Centralizamos las consultas dentro del dialogo para evitar falsos positivos fuera del modal.
    const dialogUtils = within(dialog);
    // Confirmamos que el modal incluye el nombre del ambiente como contexto para la asociacion.
    await dialogUtils.findByText(/Laboratorio de redes/i);
    // Ubicamos el campo que recibe el NIA y dispara la consulta al servicio externo.
    const searchInput = dialogUtils.getByLabelText(/Buscar NIA/i);
    // Llenamos el campo con el NIA de prueba provisto por el fixture.
    await user.type(searchInput, "12171");
    // Adelantamos el tiempo suficiente para que el debounce ejecute la llamada al endpoint.
    await vi.advanceTimersByTimeAsync(600);
    // Esperamos a que el mock de fetch confirme que se llamo al servicio de bienes con el NIA digitado.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`/api/goods/12171`, expect.any(Object));
    });
    // Validamos que la descripcion del bien aparezca en los resultados mostrados en el modal.
    await dialogUtils.findByText("MESA DE MADERA");
    // Identificamos el boton que agrega el resultado seleccionado a la lista de activos a asociar.
    const addButton = dialogUtils.getByRole("button", {
      name: /agregar activo/i,
    });
    // Ejecutamos el clic para sumar el activo encontrado a la tabla temporal.
    await user.click(addButton);
    // Revisamos que el NIA aparezca ahora dentro de la lista de seleccionados.
    await dialogUtils.findByText(/12171/);
    // Localizamos el boton encargado de guardar todos los activos seleccionados en el backend.
    const saveButton = dialogUtils.getByRole("button", {
      name: /guardar activos/i,
    });
    // Disparamos el guardado para enviar los activos al endpoint interno de activos.
    await user.click(saveButton);
    // Esperamos a que se invoque apiFetch con el metodo POST y el cuerpo mapeado segun lo solicitado.
    await waitFor(() => {
      const postCall = apiFetchMock.mock.calls.find(
        ([path, options]) =>
          path === "/activos" &&
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
      expect(options.json).toMatchObject({
        nia: "12171",
        nombre: "MESA DE MADERA",
        descripcion: goodsResponse[0].descripcionExt,
        ambiente_id: mainEnvironment.id,
      });
    });
    // Confirmamos que se muestre una notificacion de exito al completar la asociacion.
    await waitFor(() => {
      expect(notifyMock.success).toHaveBeenCalledWith({
        title: "Activos asociados",
        description: "Se guardaron 1 activos en el ambiente.",
      });
    });
    // Verificamos que el modal se cierre automaticamente tras guardar la seleccion.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    // Restauramos los temporizadores reales para no afectar otras pruebas.
    vi.useRealTimers();
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

  it("abre el dialogo de edicion y precarga los datos del ambiente seleccionado", async () => {
    const user = userEvent.setup();

    render(<EnvironmentListPage />);

    await screen.findByText("Laboratorio de redes");

    await user.click(screen.getByRole("button", { name: /editar ambiente/i }));

    const dialog = await screen.findByRole("dialog");
    const dialogUtils = within(dialog);

    await dialogUtils.findByRole("heading", { name: /editar ambiente/i });

    expect(dialogUtils.getByLabelText(/^Codigo$/i)).toHaveDisplayValue(
      mainEnvironment.codigo
    );
    expect(dialogUtils.getByLabelText(/^Nombre$/i)).toHaveDisplayValue(
      mainEnvironment.nombre
    );
    expect(dialogUtils.getByLabelText(/^Piso$/i)).toHaveDisplayValue(
      String(mainEnvironment.piso)
    );
    expect(
      dialogUtils.getByLabelText("Capacidad total")
    ).toHaveDisplayValue(String(mainEnvironment.capacidad.total));

    const getCall = apiFetchMock.mock.calls.find(
      ([path, options]) =>
        path === `/ambientes/${mainEnvironment.id}` &&
        (!options || !("method" in (options as { method?: string })))
    );
    expect(getCall).toBeUndefined();
  });

  it("actualiza un ambiente existente y refresca el listado tras guardar", async () => {
    const user = userEvent.setup();

    render(<EnvironmentListPage />);

    await screen.findByText("Laboratorio de redes");

    await user.click(screen.getByRole("button", { name: /editar ambiente/i }));

    const dialog = await screen.findByRole("dialog");
    const dialogUtils = within(dialog);

    const nameInput = dialogUtils.getByLabelText(/^Nombre$/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Laboratorio actualizado");

    const examCapacity = dialogUtils.getByLabelText("Capacidad examen");
    await user.clear(examCapacity);
    await user.type(examCapacity, "28");

    const activeCheckbox = dialogUtils.getByLabelText(/^Activo$/i);
    await user.click(activeCheckbox);

    await user.click(
      dialogUtils.getByRole("button", { name: /guardar cambios/i })
    );

    await waitFor(() => {
      const patchCall = apiFetchMock.mock.calls.find(
        ([path, options]) =>
          path === `/ambientes/${mainEnvironment.id}` &&
          Boolean(options) &&
          typeof options === "object" &&
          "method" in (options as { method?: string }) &&
          (options as { method?: string }).method === "PATCH"
      );
      expect(patchCall).toBeTruthy();
      const [, options] = patchCall as [
        string,
        { method?: string; json?: unknown }
      ];
      expect(options.json).toMatchObject({
        codigo: mainEnvironment.codigo,
        nombre: "Laboratorio actualizado",
        capacidad: expect.objectContaining({ examen: 28 }),
        activo: false,
      });
    });

    await waitFor(() => {
      expect(notifyMock.success).toHaveBeenCalledWith({
        title: "Ambiente actualizado",
        description: "Se guardaron los cambios correctamente.",
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

  it("mantiene abierto el dialogo y muestra un error cuando el PATCH falla", async () => {
    shouldPatchFail = true;
    patchErrorMessage = "Conflicto con el codigo";

    const user = userEvent.setup();

    render(<EnvironmentListPage />);

    await screen.findByText("Laboratorio de redes");

    await user.click(screen.getByRole("button", { name: /editar ambiente/i }));

    const dialog = await screen.findByRole("dialog");
    const dialogUtils = within(dialog);

    const nameInput = dialogUtils.getByLabelText(/^Nombre$/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Laboratorio conflictivo");

    await user.click(
      dialogUtils.getByRole("button", { name: /guardar cambios/i })
    );

    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith({
        title: "No se pudo actualizar el ambiente",
        description: patchErrorMessage,
      });
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("muestra un dialogo informativo antes de eliminar un ambiente", async () => {
    // Creamos una persona usuaria virtual para imitar los clics reales de la interfaz.
    const user = userEvent.setup();

    // Renderizamos la pagina completa para interactuar con la tabla igual que en produccion.
    render(<EnvironmentListPage />);

    // Esperamos a que aparezca el nombre del ambiente como confirmacion de que la data cargo.
    await screen.findByText("Laboratorio de redes");

    // Simulamos el clic sobre el boton de eliminar que se encuentra en la fila principal.
    await user.click(screen.getByRole("button", { name: /eliminar ambiente/i }));

    // Buscamos el dialogo modal que debe abrirse tras el clic anterior.
    const dialog = await screen.findByRole("dialog");

    // Usamos utilidades de Testing Library para consultar elementos dentro del dialogo.
    const dialogUtils = within(dialog);

    // Validamos que el encabezado del modal comunique claramente la accion que realizara.
    await dialogUtils.findByRole("heading", { name: /eliminar ambiente/i });

    // Confirmamos que el nombre del ambiente este visible para evitar eliminaciones equivocadas.
    expect(dialogUtils.getByText(/Laboratorio de redes/i)).toBeInTheDocument();

    // Tambien verificamos que el codigo del ambiente se muestre como dato complementario.
    expect(dialogUtils.getByText(/AMB-100/i)).toBeInTheDocument();

    // Revisamos que la advertencia sobre los activos asociados se despliegue en el cuerpo del dialogo.
    expect(
      dialogUtils.getByText(
        /Los activos asociados quedaran sin ambiente/i
      )
    ).toBeInTheDocument();
  });

  it("elimina el ambiente seleccionado y refresca la tabla tras confirmar", async () => {
    // Preparamos la persona usuaria virtual encargada de interactuar con los botones.
    const user = userEvent.setup();

    // Renderizamos la vista principal que lista los ambientes disponibles.
    render(<EnvironmentListPage />);

    // Esperamos a que el ambiente inicial se muestre para asegurar que la tabla termino de cargar.
    await screen.findByText("Laboratorio de redes");

    // Abrimos el dialogo de confirmacion mediante el boton de eliminar de la fila.
    await user.click(screen.getByRole("button", { name: /eliminar ambiente/i }));

    // Capturamos el dialogo que debe aparecer despues del clic anterior.
    const dialog = await screen.findByRole("dialog");

    // Obtenemos un helper para realizar consultas concentradas dentro del dialogo.
    const dialogUtils = within(dialog);

    // Identificamos el boton de confirmacion que ejecuta la eliminacion definitiva.
    const confirmButton = dialogUtils.getByRole("button", {
      name: /eliminar definitivamente/i,
    });

    // Ejecutamos el clic que confirma la eliminacion.
    await user.click(confirmButton);

    // Esperamos a que el cliente HTTP reciba la llamada DELETE con el id correcto.
    await waitFor(() => {
      const deleteCall = apiFetchMock.mock.calls.find(
        ([path, options]) =>
          path === `/ambientes/${mainEnvironment.id}` &&
          Boolean(options) &&
          typeof options === "object" &&
          "method" in (options as { method?: string }) &&
          (options as { method?: string }).method === "DELETE"
      );
      expect(deleteCall).toBeTruthy();
    });

    // Verificamos que se muestre una notificacion positiva al completar la eliminacion.
    await waitFor(() => {
      expect(notifyMock.success).toHaveBeenCalledWith({
        title: "Ambiente eliminado",
        description: expect.stringContaining("Laboratorio de redes"),
      });
    });

    // Confirmamos que el dialogo se cierre automaticamente al terminar el flujo.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Revisamos que el listado vuelva a consultarse al menos una vez para reflejar los cambios.
    await waitFor(() => {
      const listCalls = apiFetchMock.mock.calls.filter(
        ([path]) => typeof path === "string" && path.startsWith("/ambientes?")
      );
      expect(listCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("muestra un error y mantiene abierto el dialogo cuando la eliminacion falla", async () => {
    // Forzamos el escenario de error para validar la experiencia negativa.
    shouldDeleteFail = true;
    deleteErrorMessage = "Conflicto con activos asociados";

    // Generamos a la persona usuaria virtual responsable de los clics.
    const user = userEvent.setup();

    // Montamos la pagina para reproducir el flujo completo.
    render(<EnvironmentListPage />);

    // Esperamos a que se muestre el nombre del ambiente para garantizar que la informacion ya esta disponible.
    await screen.findByText("Laboratorio de redes");

    // Abrimos el dialogo de confirmacion seleccionando la accion de eliminar.
    await user.click(screen.getByRole("button", { name: /eliminar ambiente/i }));

    // Identificamos el dialogo que aparece luego del clic anterior.
    const dialog = await screen.findByRole("dialog");

    // Obtenemos las utilidades de Testing Library enfocadas en el dialogo abierto.
    const dialogUtils = within(dialog);

    // Localizamos el boton de confirmacion que dispara la eliminacion.
    const confirmButton = dialogUtils.getByRole("button", {
      name: /eliminar definitivamente/i,
    });

    // Simulamos el clic de confirmacion que hara fallar la llamada por la bandera configurada.
    await user.click(confirmButton);

    // Esperamos a que aparezca la notificacion de error con el mensaje controlado por la prueba.
    await waitFor(() => {
      expect(notifyMock.error).toHaveBeenCalledWith({
        title: "No se pudo eliminar el ambiente",
        description: deleteErrorMessage,
      });
    });

    // Confirmamos que el dialogo continue abierto para que la persona pueda reintentar o cancelar.
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Revisamos que el boton de confirmacion vuelva a estar habilitado tras el error.
    expect(confirmButton).not.toBeDisabled();
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

  it("habilita la siguiente pagina cuando el backend no envia pages pero indica hasNextPage", async () => {
    // Generamos la instancia de usuario virtual que interactuara con la UI.
    const user = userEvent.setup();

    // Reproducimos la respuesta del backend que omite la propiedad pages pero confirma que hay mas paginas.
    environmentListResponse.meta = {
      page: 1,
      total: 7,
      take: 1,
      hasNextPage: true,
      hasPreviousPage: false,
    };
    // Eliminamos pages para emular exactamente la forma de la respuesta real.
    Reflect.deleteProperty(
      environmentListResponse.meta as Record<string, unknown>,
      "pages"
    );

    // Renderizamos la pantalla para comenzar la interaccion.
    render(<EnvironmentListPage />);

    // Esperamos a que aparezca la primera fila para confirmar que la data ya esta disponible.
    await screen.findByText("Laboratorio de redes");

    // Obtenemos el boton que avanza a la pagina siguiente.
    const nextButton = screen.getByRole("button", {
      name: /go to next page/i,
    });

    // Validamos que el boton siga habilitado a pesar de no contar con la propiedad pages.
    expect(nextButton).not.toBeDisabled();

    // Simulamos que el backend devuelve la pagina siguiente al realizar el request.
    environmentListResponse.meta.page = 2;

    // Disparamos el click que solicita la siguiente pagina.
    await user.click(nextButton);

    // Confirmamos que la llamada incluye el parametro page=2 como efecto de la interaccion.
    await waitFor(() => {
      const lastCall =
        apiFetchMock.mock.calls[apiFetchMock.mock.calls.length - 1];
      expect(lastCall?.[0]).toContain("page=2");
    });
  });
});
