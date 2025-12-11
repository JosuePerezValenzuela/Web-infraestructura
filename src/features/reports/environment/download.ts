import { API_BASE } from "@/lib/api";

export type EnvironmentReportFormat = "pdf" | "excel";

type BuildUrlParams = {
  baseUrl?: string;
  code: string;
  format: EnvironmentReportFormat;
};

export function buildEnvironmentReportUrl({
  baseUrl,
  code,
  format,
}: BuildUrlParams): string {
  const trimmedBase = (baseUrl ?? API_BASE).replace(/\/$/, "");
  const params = new URLSearchParams({
    codigo: code,
    formato: format,
  });

  return `${trimmedBase}/reportes/ambiente?${params.toString()}`;
}

type ExtractFilenameParams = {
  headerValue: string | null;
  code: string;
  extension: string;
};

export function extractEnvironmentFilename({
  headerValue,
  code,
  extension,
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

  return `ambiente-${code}-${yyyy}-${mm}-${dd}.${extension}`;
}

type DownloadParams = {
  code: string;
  format: EnvironmentReportFormat;
  signal?: AbortSignal;
};

export async function downloadEnvironmentReport({
  code,
  format,
  signal,
}: DownloadParams): Promise<{ filename: string }> {
  if (!code.trim()) {
    throw new Error("El código del ambiente es requerido.");
  }

  if (!["pdf", "excel"].includes(format)) {
    throw new Error("Formato inválido para el reporte de ambiente.");
  }

  const url = buildEnvironmentReportUrl({ code, format });
  const acceptHeader =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: acceptHeader },
    signal,
  });

  if (!response.ok) {
    let message = response.statusText || "No se pudo generar el reporte.";
    try {
      const body = await response.json();
      if (body?.message) {
        message = body.message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const extension = format === "pdf" ? "pdf" : "xlsx";
  const filename = extractEnvironmentFilename({
    headerValue: response.headers.get("content-disposition"),
    code,
    extension,
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
