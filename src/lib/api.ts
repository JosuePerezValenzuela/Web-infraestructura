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
    const isJson = ContentType.includes('application/json');
    const data = isJson ? await res.json().catch(() => undefined): undefined;

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