import { env } from "@/lib/env";

export const API_BASE = env.API_BASE_URL;

type Options = RequestInit & { json?: unknown };

export async function apiFetch<T>(path: string, opts: Options = {}): Promise <T> {
    const { json, headers, ...rest } = opts;

    const res = await fetch(`${API_BASE}${path}`, {
        ...rest,
        headers: {
            'Content-Type': 'application/json',
            ...(headers || {}),
        },
        body: json !== undefined ? JSON.stringify(json):rest.body,
    });

    const ContentType = res.headers.get('content-type') || '';
    let data = undefined;
    
    try {
        if (ContentType.includes('application/json') || ContentType === '') {
            data = await res.json().catch(() => undefined);
        }
    } catch {
        // Ignore JSON parse errors
    }

    // Handle 304 Not Modified - return valid empty structure
    if (res.status === 304) {
        return (data ?? { items: [], meta: { page: 1, total: 0, take: 8, hasNextPage: false, hasPreviousPage: false } }) as T;
    }

    // Handle other redirect/status codes that may have data
    if (res.status >= 300 && res.status < 400 && data) {
        return data as T;
    }

    if (!res.ok) {
        //Normalizacion de mensajes de error
        const message =
          (data && (data.message || data.error)) ||
          res.statusText ||
          'Error de red';

          const details = Array.isArray(data?.message) ? data.message : undefined;

          throw { status: res.status, message, details, raw: data} as const;
    }
    return data as T;
}