const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "http://localhost";
const apiPort = process.env.NEXT_PUBLIC_API_BASE_PORT?.trim() ?? "3000";
const apiPrefix = process.env.NEXT_PUBLIC_API_BASE_PREFIX?.trim() ?? "/api";

function normalizePrefix(raw: string): string {
  const trimmed = raw || "/api";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/$/, "");
}

function buildApiBase(host: string, port: string | undefined, prefix: string): string {
  const cleanPrefix = normalizePrefix(prefix);
  try {
    const url = new URL(host);
    if (port) url.port = port;
    return `${url.origin}${cleanPrefix}`;
  } catch (error) {
    const base = host.replace(/\/$/, "").replace(/:$/, "");
    const portSegment = port ? `:${port}` : "";
    return `${base}${portSegment}${cleanPrefix}`;
  }
}

export const env = {
  API_BASE_URL: buildApiBase(apiHost, apiPort, apiPrefix),
};
