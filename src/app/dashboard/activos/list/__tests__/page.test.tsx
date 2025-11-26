import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Creamos un mock para apiFetch que nos permita observar las llamadas y definir respuestas controladas.
const apiFetchMock = vi.fn();
// Mock para el helper de bienes.
const goodsFetchMock = vi.fn();

// Reemplazamos el módulo real por nuestro mock.
vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock("@/lib/goods-api", () => ({
  fetchGoodsByNia: (...args: unknown[]) => goodsFetchMock(...args),
}));

// Simulamos DataTable para no depender de la implementación real y enfocarnos en el flujo de datos.
vi.mock("@/components/data-table", () => {
  const React = require("react");
  return {
    DataTable: ({
      data,
      columns,
    }: {
      data: Array<{ id: number; nia: string; nombre: string }>;
      columns: Array<{ id?: string; onView?: (row: unknown) => void }>;
    }) => (
      <div>
        {data.map((row) => (
          <div key={row.id}>
            <span>{row.nombre}</span>
            <button
              type="button"
              onClick={() => {
                const actionCol =
                  columns.find((col) => col.id === "acciones") ?? columns.at(-1);
                actionCol?.onView?.(row);
              }}
              aria-label={`Ver ${row.nombre}`}
            >
              Ver
            </button>
          </div>
        ))}
      </div>
    ),
  };
});

// Simulamos el componente que mostrará el detalle del activo para verificar que reciba los datos del fetch externo.
const { detailDialogMock } = vi.hoisted(() => ({
  detailDialogMock: vi.fn(
    ({ open, asset, onClose }: { open: boolean; asset: unknown; onClose: () => void }) =>
      open ? (
        <div data-testid="asset-detail-dialog">
          <pre>{JSON.stringify(asset)}</pre>
          <button type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      ) : null
  ),
}));

vi.mock("@/features/assets/list/AssetDetailDialog", () => ({
  AssetDetailDialog: detailDialogMock,
}));

// Importamos la página después de configurar los mocks.
import AssetListPage from "../page";

const assetsResponse = {
  items: [
    {
      id: 1,
      nia: "NIA-0001",
      nombre: "Proyector Epson X12",
      descripcion: "Proyector principal del auditorio central",
      creado_en: "2025-11-10T12:00:00.000Z",
      ambiente_id: 4,
      ambiente_nombre: "Auditorio central",
      ambiente_codigo: "AUD-001",
    },
  ],
  meta: {
    total: 1,
    page: 1,
    take: 8,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

describe("AssetListPage", () => {
  beforeEach(() => {
    // Limpiamos todos los mocks para que cada prueba empiece sin estado previo.
    vi.clearAllMocks();
    goodsFetchMock.mockReset();
  });

  it("carga el listado inicial y muestra los activos", async () => {
    // Encolamos la respuesta del listado de activos.
    apiFetchMock.mockResolvedValueOnce(assetsResponse);

    // Renderizamos la página como lo haría Next.js.
    render(<AssetListPage />);

    // Esperamos a que el primer activo aparezca, lo que confirma la carga inicial.
    await waitFor(() =>
      expect(screen.getByText("Proyector Epson X12")).toBeInTheDocument()
    );

    // Buscamos la llamada al endpoint de activos para validar los parámetros por defecto.
    const assetCall = apiFetchMock.mock.calls.find(
      ([path]) => typeof path === "string" && path.startsWith("/activos?")
    );
    expect(assetCall?.[0]).toContain("page=1");
    expect(assetCall?.[0]).toContain("limit=8");
  });

  it("aplica la búsqueda reactiva cuando la persona deja de escribir", async () => {
    // Respuesta inicial de activos.
    apiFetchMock.mockResolvedValueOnce(assetsResponse);
    // Respuesta filtrada después de aplicar search.
    apiFetchMock.mockResolvedValueOnce({
      ...assetsResponse,
      items: [
        {
          ...assetsResponse.items[0],
          id: 2,
          nia: "NIA-0099",
          nombre: "Proyector filtrado",
        },
      ],
    });

    const user = userEvent.setup();
    render(<AssetListPage />);

    // Esperamos la carga inicial.
    await screen.findByText("Proyector Epson X12");

    // Ingresamos un término de búsqueda en el input correspondiente.
    await user.type(screen.getByRole("textbox", { name: /buscar/i }), "epson");

    // Esperamos a que se dispare la llamada filtrada.
    await waitFor(() => {
      const calls = apiFetchMock.mock.calls.filter(
        ([path]) => typeof path === "string" && path.startsWith("/activos?")
      );
      // La última llamada debe contener los filtros aplicados.
      const last = calls.at(-1)?.[0] as string | undefined;
      expect(last).toContain("search=epson");
    });

    // Confirmamos que el nuevo resultado se renderiza.
    await screen.findByText("Proyector filtrado");
  });

  it("consulta detalles del activo al pulsar ver y los muestra en el modal", async () => {
    apiFetchMock.mockResolvedValueOnce(assetsResponse);
    // Simulamos el detalle que viene desde el API interno de bienes.
    const goodsDetail = [
      {
        nia: 9173,
        descripcion: "CREDENZA DE MADERA",
        estado: "BUENO",
      },
    ];
    goodsFetchMock.mockResolvedValueOnce(goodsDetail);

    const user = userEvent.setup();
    render(<AssetListPage />);

    // Esperamos a que se cargue la tabla inicial.
    await screen.findByText("Proyector Epson X12");

    // Clic en el botón de ver para el primer activo.
    await user.click(screen.getByRole("button", { name: /ver proyector epson x12/i }));

    // Verificamos que se hizo la petición al API interno con el NIA correcto.
    await waitFor(() =>
      expect(goodsFetchMock).toHaveBeenCalledWith("NIA-0001", expect.any(Object))
    );

    // Confirmamos que el modal muestra la data devuelta.
    expect(await screen.findByTestId("asset-detail-dialog")).toBeInTheDocument();
    expect(screen.getByText(/CREDENZA DE MADERA/i)).toBeInTheDocument();
  });
});
