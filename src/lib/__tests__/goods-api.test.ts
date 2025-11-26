import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGoodsByNia } from "../goods-api";

describe("fetchGoodsByNia", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  it("devuelve todos los campos relevantes del activo de bienes", async () => {
    const goodsItem = {
      nia: 9173,
      descripcion: "CREDENZA DE MADERA",
      descripcionExt: "Detalle extendido",
      estado: "BUENO",
      marca: "ACME",
      valorInicial: 2666.4,
      modelo: "X12",
      serie: "ABC123",
      fechaCompra: "2006-01-02 00:00:00.0",
      fechaIncorporacion: "2006-03-03 00:00:00.0",
      unidadMedida: "PIEZA",
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [goodsItem],
      headers: { get: () => "application/json" },
    });

    const result = await fetchGoodsByNia("  NIA-0001  ");

    expect(fetchMock).toHaveBeenCalledWith("/api/goods/NIA-0001", {
      headers: { Accept: "application/json" },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject(goodsItem);
  });
});
