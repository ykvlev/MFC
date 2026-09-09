import { tokenStore } from './storage';

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiException extends Error {
  constructor(
    public status: number,
    public error: ApiError,
  ) {
    super(error.message);
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function setAccessToken(t: string | null): void {
  accessToken = t;
  listeners.forEach((l) => l());
}
export function getAccessToken(): string | null {
  return accessToken;
}
export function onAuthChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function doRefresh(): Promise<void> {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) {
    setAccessToken(null);
    throw new ApiException(401, { code: 'UNAUTHORIZED', message: 'Сессия истекла' });
  }
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await tokenStore.setRefresh(null);
    setAccessToken(null);
    throw new ApiException(401, { code: 'UNAUTHORIZED', message: 'Сессия истекла' });
  }
  const body = (await res.json()) as { accessToken: string; refreshToken: string };
  setAccessToken(body.accessToken);
  await tokenStore.setRefresh(body.refreshToken);
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  raw?: boolean;
}

export async function apiFetch<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const send = async (): Promise<Response> =>
    fetch(url, {
      method: opts.method ?? 'GET',
      headers: {
        ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

  let res = await send();
  if (res.status === 401 && !path.startsWith('/auth/')) {
    refreshPromise ??= doRefresh().finally(() => (refreshPromise = null));
    await refreshPromise;
    res = await send();
  }

  if (res.status === 204) return undefined as T;
  if (opts.raw) return res as unknown as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: ApiError })?.error ?? { code: 'INTERNAL_ERROR', message: 'Ошибка сервера' };
    throw new ApiException(res.status, err);
  }
  return data as T;
}

export async function loginRequest(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: ApiError })?.error ?? { code: 'UNAUTHORIZED', message: 'Ошибка входа' };
    throw new ApiException(res.status, err);
  }
  const body = data as { accessToken: string; refreshToken: string; user: unknown };
  setAccessToken(body.accessToken);
  await tokenStore.setRefresh(body.refreshToken);
  return body;
}

export async function logoutRequest(): Promise<void> {
  const refreshToken = await tokenStore.getRefresh();
  if (refreshToken) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  await tokenStore.setRefresh(null);
  setAccessToken(null);
}

export async function tryRestoreSession(): Promise<boolean> {
  try {
    await doRefresh();
    return true;
  } catch {
    return false;
  }
}
