/**
 * Lee variables de entorno y las exporta para la app.
 * 
 * Variables necesarias:
 * - NEXT_PUBLIC_API_BASE_URL: URL base del backend SIN prefijo (ej: http://localhost:3000)
 * - NEXT_PUBLIC_FRONTEND_URL: URL del frontend (ej: http://localhost:8000)
 * - NEXT_PUBLIC_GOODS_API_BASE_URL: URL de la API de bienes (ej: http://167.157.60.25/v1)
 * 
 * Nota: API_BASE_URL incluye /api como prefijo (ej: http://localhost:3000/api)
 */

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim();
const goodsApiBaseUrl = process.env.NEXT_PUBLIC_GOODS_API_BASE_URL?.trim();

function normalizeUrl(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return fallback;
  }
}

function buildApiUrl(baseUrl: string | undefined, fallback: string): string {
  const origin = normalizeUrl(baseUrl, fallback);
  return `${origin}/api`;
}

export const env = {
  API_BASE_URL: buildApiUrl(apiBaseUrl, "http://localhost:3000"),
  FRONTEND_URL: normalizeUrl(frontendUrl, "http://localhost:8000"),
  GOODS_API_BASE_URL: goodsApiBaseUrl || "http://167.157.60.25/v1",
};
