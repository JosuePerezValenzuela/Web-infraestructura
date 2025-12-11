import { describe, expect, it } from "vitest";

import {
  buildInventoryReportUrl,
  extractInventoryFilename,
} from "../download";

describe("buildInventoryReportUrl", () => {
  it("arma la ruta con los parámetros obligatorios", () => {
    const url = buildInventoryReportUrl({
      baseUrl: "https://api.test",
      scope: "campus",
      scopeId: 5,
      format: "excel",
    });

    expect(url).toBe(
      "https://api.test/reportes/inventario-ambientes?scope=campus&scopeId=5&formato=excel"
    );
  });
});

describe("extractInventoryFilename", () => {
  it("usa el filename cuando viene en Content-Disposition", () => {
    const filename = extractInventoryFilename({
      headerValue: 'attachment; filename="inventario_campus_2024-01-01.xlsx"',
      fallbackScope: "campus",
      fallbackExtension: "xlsx",
    });

    expect(filename).toBe("inventario_campus_2024-01-01.xlsx");
  });

  it("genera un nombre por defecto cuando no hay header", () => {
    const filename = extractInventoryFilename({
      headerValue: null,
      fallbackScope: "facultad",
      fallbackExtension: "pdf",
    });

    expect(filename.startsWith("inventario_facultad_")).toBe(true);
    expect(filename.endsWith(".pdf")).toBe(true);
  });
});
