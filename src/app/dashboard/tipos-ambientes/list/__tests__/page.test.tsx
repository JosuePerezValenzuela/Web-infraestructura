import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import EnvironmentTypeListPage from "../page";

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
});
