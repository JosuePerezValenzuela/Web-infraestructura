import { describe, expect, it } from "vitest";

import {
  buildEnvironmentReportUrl,
  extractEnvironmentFilename,
} from "../download";

describe("buildEnvironmentReportUrl", () => {
  it("construye la ruta con codigo y formato", () => {
    const url = buildEnvironmentReportUrl({
      baseUrl: "https://api.test",
      code: "A-101",
      format: "pdf",
    });

    expect(url).toBe(
      "https://api.test/reportes/ambiente?codigo=A-101&formato=pdf"
    );
  });
});

describe("extractEnvironmentFilename", () => {
  it("lee filename desde Content-Disposition", () => {
    const name = extractEnvironmentFilename({
      headerValue: 'attachment; filename="ambiente-A-101-2024-01-01.pdf"',
      code: "A-101",
      extension: "pdf",
    });

    expect(name).toBe("ambiente-A-101-2024-01-01.pdf");
  });

  it("genera nombre por defecto si no hay header", () => {
    const name = extractEnvironmentFilename({
      headerValue: null,
      code: "B-202",
      extension: "xlsx",
    });

    expect(name.startsWith("ambiente-B-202-")).toBe(true);
    expect(name.endsWith(".xlsx")).toBe(true);
  });
});
