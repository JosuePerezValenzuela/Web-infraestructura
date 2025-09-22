import { env } from './env';

export async function apiFetch<T>(
    path: string,
    options?: RequestInit & { parseJson?: boolean },
): Promise<T> {
    const res = await fetch(`${env.API_BASE_URL}${path}`,{
        headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
        ...options,
    });

    if (!res.ok) {
        let body: any=null;
        try { body = await res.json(); } catch {}
        const msg = body?.message ?? res.statusText;
        throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
    }

    if (options?.parseJson == false) return undefined as unknown as T;
    return res.json() as Promise<T>;
}