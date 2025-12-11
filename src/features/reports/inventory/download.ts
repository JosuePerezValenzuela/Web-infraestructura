import { API_BASE } from "@/lib/api";

export type InventoryScope = "campus" | "facultad" | "bloque";
export type InventoryFormat = "pdf" | "xlsx";

type BuildUrlParams = {
  baseUrl?: string;
  scope: InventoryScope;
  scopeId: number | string;
  format: InventoryFormat;
};

export function buildInventoryReportUrl({
  baseUrl,
  scope,
  scopeId,
  format,
}: BuildUrlParams): string {
  const trimmedBase = (baseUrl ?? API_BASE).replace(/\/$/, "");
  const params = new URLSearchParams({
    scope,
    scopeId: String(scopeId),
    formato: format,
  });

  return `${trimmedBase}/reportes/inventario-ambientes?${params.toString()}`;
}

type ExtractFilenameParams = {
  headerValue: string | null;
  fallbackScope: InventoryScope;
  fallbackExtension: string;
};

export function extractInventoryFilename({
  headerValue,
  fallbackScope,
  fallbackExtension,
}: ExtractFilenameParams): string {
  if (typeof headerValue === "string" && headerValue.length) {
    const match = headerValue.match(/filename\*?=(?:UTF-8'')?["']?([^\"';]+)["']?/i);
    const filename = match?.[1];
    if (filename) {
      return filename;
    }
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  return `inventario_${fallbackScope}_${yyyy}-${mm}-${dd}.${fallbackExtension}`;
}

type DownloadParams = {
  scope: InventoryScope;
  scopeId: number | string;
  format: InventoryFormat;
  signal?: AbortSignal;
};

export async function downloadInventoryReport({
  scope,
  scopeId,
  format,
  signal,
}: DownloadParams): Promise<{ filename: string }> {
  if (!["campus", "facultad", "bloque"].includes(scope)) {
    throw new Error("Scope inválido para el reporte de inventario.");
  }

  if (!["pdf", "xlsx"].includes(format)) {
    throw new Error("Formato inválido para el reporte de inventario.");
  }

  const url = buildInventoryReportUrl({ scope, scopeId, format });
  const acceptHeader =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: acceptHeader,
    },
    signal,
  });

  if (!response.ok) {
    let message = response.statusText || "No se pudo generar el reporte.";

    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        message = errorBody.message;
      }
    } catch {
      // Si no hay JSON nos quedamos con el mensaje base.
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const extension = format === "pdf" ? "pdf" : "xlsx";
  const filename = extractInventoryFilename({
    headerValue: response.headers.get("content-disposition"),
    fallbackScope: scope,
    fallbackExtension: extension,
  });

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);

  return { filename };
}
