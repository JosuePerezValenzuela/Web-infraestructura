import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EnvironmentRow } from "@/features/environments/list/columns";
import EnvironmentListPage from "../page";

const { environmentCreateFormMock } = vi.hoisted(() => ({
  // Mock para el formulario de creación; expone props para verificarlas en las pruebas.
  environmentCreateFormMock: vi.fn(
    ({
      blocks,
      environmentTypes,
      onSuccess,
      onClose,
    }: {
      blocks: Array<{ id: number; nombre: string }>;
      environmentTypes: Array<{ id: number; nombre: string }>;
      onSuccess?: () => void | Promise<void>;
      onClose?: () => void;
    }) => (
      <div data-testid="mock-create-form">
        <p>formulario de creacion</p>
        <span data-testid="create-blocks-count">{blocks.length}</span>
        <span data-testid="create-types-count">{environmentTypes.length}</span>
        <button
          type="button"
          onClick={() => {
            void onSuccess?.();
            onClose?.();
          }}
        >
          cerrar creacion
        </button>
      </div>
    )
  ),
}));

const { environmentEditDialogMock } = vi.hoisted(() => ({
  // Mock para el dialogo de edición; expone props y permite cerrar el modal.
  environmentEditDialogMock: vi.fn(
    ({
      blocks,
      environmentTypes,
      onClose,
    }: {
      environment: unknown;
      blocks: Array<{ id: number; nombre: string }>;
      environmentTypes: Array<{ id: number; nombre: string }>;
      open: boolean;
      onClose?: () => void;
      onSuccess?: () => void;
    }) => (
      <div data-testid="mock-edit-dialog">
        <span data-testid="edit-blocks-count">{blocks.length}</span>
        <span data-testid="edit-types-count">{environmentTypes.length}</span>
        <button type="button" onClick={() => onClose?.()}>
          cerrar edicion
        </button>
      </div>
    )
  ),
}));

const apiFetchMock = vi.fn();
const notifySuccessMock = vi.fn();
const notifyErrorMock = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock("@/lib/notify", () => ({
  notify: {
    success: (...args: unknown[]) => notifySuccessMock(...args),
    error: (...args: unknown[]) => notifyErrorMock(...args),
  },
}));

vi.mock("@/components/ui/input", () => {
  const { forwardRef } = require("react");
  return {
    Input: forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
      (props, ref) => <input ref={ref} {...props} />
    ),
  };
});

vi.mock("@/components/ui/label", () => ({
  Label: (props: React.ComponentProps<"label">) => <label {...props} />,
}));

vi.mock("@/components/ui/button", () => {
  const { forwardRef } = require("react");
  return {
    Button: forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(
      (props, ref) => <button ref={ref} {...props} />
    ),
  };
});

vi.mock("@/components/ui/select", () => {
  const React = require("react");
  const SelectContext = React.createContext<{
    onValueChange?: (value: string) => void;
  }>({});

  const Select = ({
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <SelectContext.Provider value={{ onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  );

  const SelectTrigger = (
    props: React.ComponentProps<"button"> & { children: React.ReactNode }
  ) => <button type="button" {...props} />;

  const SelectContent = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );

  const SelectItem = ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => {
    const { onValueChange } = React.useContext(SelectContext);
    return (
      <button type="button" onClick={() => onValueChange?.(value)}>
        {children}
      </button>
    );
  };

  const SelectValue = ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  );

  return { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
});

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange?: (value: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogClose: (props: React.ComponentProps<"button">) => (
    <button type="button" {...props} />
  ),
}));

vi.mock("@/components/data-table-view-options", () => ({
  DataTableViewOptions: () => null,
}));

vi.mock("@/components/data-table", () => {
  const React = require("react");
  return {
    DataTable: ({
      data,
      columns,
    }: {
      data: EnvironmentRow[];
      columns: Array<{ onDelete?: (row: EnvironmentRow) => void }>;
    }) => (
      <div>
        {data.length ? (
          data.map((row) => (
            <div key={row.id}>
              <span>{row.nombre}</span>
              <button
                type="button"
                onClick={() => columns?.[0]?.onDelete?.(row)}
              >
                Eliminar {row.nombre}
              </button>
            </div>
          ))
        ) : (
          <p>sin datos</p>
        )}
      </div>
    ),
  };
});

vi.mock("@/features/environments/list/columns", () => ({
  environmentColumns: (
    _onEdit: (row: EnvironmentRow) => void,
    onDelete: (row: EnvironmentRow) => void,
    _onAssets: (row: EnvironmentRow) => void
  ) => [{ id: "actions", onDelete }],
}));

vi.mock("@/features/environments/create/EnvironmentCreateForm", () => ({
  EnvironmentCreateForm: environmentCreateFormMock,
}));

vi.mock("@/features/environments/edit/EnvironmentEditDialog", () => ({
  EnvironmentEditDialog: environmentEditDialogMock,
}));

vi.mock("@/features/environments/list/EnvironmentAssetsDialog", () => ({
  EnvironmentAssetsDialog: () => <div>dialogo de activos</div>,
}));

vi.mock("lucide-react", () => ({ X: () => <svg aria-label="icono x" /> }));

// Catálogos completos (incluyen inactivos) para usar en filtros.
const blocksAllResponse = {
  items: [
    { id: 1, nombre: "Bloque A" },
    { id: 2, nombre: "Bloque Inactivo" },
  ],
};
const environmentTypesAllResponse = {
  items: [
    { id: 10, nombre: "Laboratorio" },
    { id: 11, nombre: "Auditorio Inactivo" },
  ],
};
const facultiesAllResponse = {
  items: [
    { id: 20, nombre: "Ingenieria" },
    { id: 21, nombre: "Ciencias Sociales (Inactiva)" },
  ],
};

// Catálogos activos para usar en formularios de creación/edición.
const blocksActiveResponse = {
  items: [{ id: 1, nombre: "Bloque A" }],
};
const environmentTypesActiveResponse = {
  items: [{ id: 10, nombre: "Laboratorio" }],
};
const facultiesActiveResponse = {
  items: [{ id: 20, nombre: "Ingenieria" }],
};

// Helper para encolar las respuestas de catálogos en el orden que se consultan.
function queueCatalogResponses() {
  apiFetchMock.mockResolvedValueOnce(blocksAllResponse);
  apiFetchMock.mockResolvedValueOnce(blocksActiveResponse);
  apiFetchMock.mockResolvedValueOnce(environmentTypesAllResponse);
  apiFetchMock.mockResolvedValueOnce(environmentTypesActiveResponse);
  apiFetchMock.mockResolvedValueOnce(facultiesAllResponse);
  apiFetchMock.mockResolvedValueOnce(facultiesActiveResponse);
}

describe("EnvironmentListPage", () => {
  beforeEach(() => {
    // Reiniciamos los mocks para que cada prueba empiece limpia.
    vi.clearAllMocks();
    environmentCreateFormMock.mockClear();
    environmentEditDialogMock.mockClear();
  });

  it("carga los catalogos y la tabla inicial al montar la pantalla", async () => {
    // Preparamos catálogos completos y activos para filtros y formularios.
    queueCatalogResponses();
    // Definimos los ambientes que devolvera la API en la carga inicial.
    apiFetchMock.mockResolvedValueOnce({
      items: [
        { id: 1, nombre: "Aula 101", codigo: "A101" } as EnvironmentRow,
        { id: 2, nombre: "Laboratorio 3", codigo: "L3" } as EnvironmentRow,
      ],
      meta: { page: 1, pages: 1, take: 8 },
    });
    // Renderizamos la pagina para que ejecute sus efectos de carga.
    render(<EnvironmentListPage />);
    // Esperamos a que aparezca el texto del primer ambiente, lo que confirma que se pinto la tabla.
    await waitFor(() => expect(screen.getByText("Aula 101")).toBeInTheDocument());
    // Buscamos la llamada realizada al endpoint de ambientes para validar los parametros por defecto.
    const envCall = apiFetchMock.mock.calls.find(
      ([url]) => typeof url === "string" && url.startsWith("/ambientes?")
    );
    // Confirmamos que se solicito la primera pagina.
    expect(envCall?.[0]).toContain("page=1");
    // Confirmamos que se uso el tamaño de pagina definido por la pantalla (8).
    expect(envCall?.[0]).toContain("limit=8");
  });

  it("usa catálogos completos en filtros y solo los activos en formularios de crear y editar", async () => {
    // Encolamos catálogos: filtros reciben todos, formularios solo activos.
    queueCatalogResponses();
    // Respuesta base de ambientes para permitir abrir modales sin errores.
    apiFetchMock.mockResolvedValueOnce({
      items: [{ id: 1, nombre: "Aula 101", codigo: "A101" } as EnvironmentRow],
      meta: { page: 1, pages: 1, take: 8 },
    });

    const user = userEvent.setup();
    render(<EnvironmentListPage />);

    // Abrimos el modal de creación para inspeccionar qué opciones recibe.
    await user.click(await screen.findByRole("button", { name: /nuevo ambiente/i }));
    const createForm = await screen.findByTestId("mock-create-form");
    expect(createForm).toBeInTheDocument();
    expect(screen.getByTestId("create-blocks-count").textContent).toBe("1");
    expect(screen.getByTestId("create-types-count").textContent).toBe("1");

    // Cerramos el modal de creación para continuar con la edición.
    await user.click(screen.getByRole("button", { name: /cerrar creacion/i }));

    // El dialogo de edición recibe los catálogos activos desde el montaje inicial.
    const editProps = environmentEditDialogMock.mock.calls.at(-1)?.[0];
    expect(editProps?.blocks).toHaveLength(1);
    expect(editProps?.environmentTypes).toHaveLength(1);
  });

  it("aplica los filtros ingresados y reconsulta la API con los parametros normalizados", async () => {
    // Preparamos los catálogos que alimentan filtros (todos) y formularios (solo activos).
    queueCatalogResponses();
    // Definimos la carga inicial de ambientes para mostrar algo en pantalla.
    apiFetchMock.mockResolvedValueOnce({
      items: [{ id: 1, nombre: "Aula 101", codigo: "A101" } as EnvironmentRow],
      meta: { page: 1, pages: 1, take: 8 },
    });
    // Preparamos la respuesta que deberia llegar despues de aplicar los filtros.
    apiFetchMock.mockResolvedValueOnce({
      items: [{ id: 2, nombre: "Laboratorio 5", codigo: "LAB5" } as EnvironmentRow],
      meta: { page: 1, pages: 1, take: 8 },
    });
    // Creamos un usuario para simular interacciones reales en los campos.
    const user = userEvent.setup();
    // Renderizamos la pagina para habilitar los filtros.
    render(<EnvironmentListPage />);
    // Esperamos a que la tabla inicial muestre el primer ambiente.
    await waitFor(() => expect(screen.getByText("Aula 101")).toBeInTheDocument());
    // Obtenemos el campo de busqueda por su etiqueta accesible.
    const searchInput = screen.getByLabelText("Buscar ambientes");
    // Escribimos un texto con espacios para comprobar que se normaliza al aplicar los filtros.
    await user.type(searchInput, "  laboratorio ");
    // Seleccionamos la opcion que indica que dicta clases.
    await user.click(screen.getByRole("button", { name: "Dicta clases" }));
    // Ubicamos el campo de piso minimo para acotar la busqueda.
    const floorMinInput = screen.getByLabelText("Piso minimo");
    // Escribimos un valor numerico en el piso minimo.
    await user.type(floorMinInput, "2");
    // Pulsamos el boton de aplicar filtros para disparar la reconsulta.
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    // Esperamos a que se ejecute la llamada adicional a la API con los filtros aplicados.
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(8));
    // Tomamos la ultima llamada al endpoint de ambientes, que debe incluir los parametros filtrados.
    const lastEnvCall = apiFetchMock.mock.calls
      .filter(([url]) => typeof url === "string" && url.startsWith("/ambientes?"))
      .pop();
    // Verificamos que el termino de busqueda se haya limpiado y enviado sin espacios extra.
    expect(lastEnvCall?.[0]).toContain("search=laboratorio");
    // Confirmamos que el filtro de clases se envio como verdadero.
    expect(lastEnvCall?.[0]).toContain("clases=true");
    // Confirmamos que se incluyo el piso minimo proporcionado.
    expect(lastEnvCall?.[0]).toContain("pisoMin=2");
  });

  it("confirma la eliminacion de un ambiente y muestra la notificacion de exito", async () => {
    // Preparamos catálogos para filtros y formularios.
    queueCatalogResponses();
    // Definimos el ambiente que se mostrara inicialmente en la tabla.
    apiFetchMock.mockResolvedValueOnce({
      items: [{ id: 1, nombre: "Aula 101", codigo: "A101" } as EnvironmentRow],
      meta: { page: 1, pages: 1, take: 8 },
    });
    // Indicamos que la llamada DELETE responde sin cuerpo de datos.
    apiFetchMock.mockResolvedValueOnce({});
    // Preparamos la recarga de la tabla despues de eliminar.
    apiFetchMock.mockResolvedValueOnce({
      items: [],
      meta: { page: 1, pages: 1, take: 8 },
    });
    // Creamos un usuario para interactuar con los botones de la tabla.
    const user = userEvent.setup();
    // Renderizamos la pagina para mostrar la tabla.
    render(<EnvironmentListPage />);
    // Esperamos a que se pinte el ambiente inicial.
    await waitFor(() => expect(screen.getByText("Aula 101")).toBeInTheDocument());
    // Hacemos clic en el boton de eliminar que expone la tabla simulada.
    await user.click(screen.getByRole("button", { name: "Eliminar Aula 101" }));
    // Confirmamos la accion en el dialogo de eliminacion.
    await user.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));
    // Esperamos a que se ejecute la llamada DELETE al endpoint especifico del ambiente.
    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/ambientes/1",
        expect.objectContaining({ method: "DELETE" })
      )
    );
    // Verificamos que se haya mostrado una notificacion de exito para la persona usuaria.
    expect(notifySuccessMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Ambiente eliminado" })
    );
    // Confirmamos que la tabla se recargo despues de eliminar, provocando una segunda llamada a ambientes.
    const environmentCalls = apiFetchMock.mock.calls.filter(
      ([url]) => typeof url === "string" && url.startsWith("/ambientes?")
    );
    expect(environmentCalls.length).toBe(2);
  });
});
