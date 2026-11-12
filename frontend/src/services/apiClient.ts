import type { ApiEnvelope, ListMeta } from '../types/auth';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Override the default 10s timeout. AI intake and BANT scoring routinely exceed it. */
  timeoutMs?: number;
  /** Opaque client-portal token. Staff cookies must not be sent with these calls. */
  bearerToken?: string;
  credentials?: RequestCredentials;
}

let isRefreshing = false;
let refreshSubscribers: Array<(success: boolean) => void> = [];

function subscribeTokenRefresh(cb: (success: boolean) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

async function trySilentRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function send<T>(path: string, options: RequestOptions, isRetry = false): Promise<ApiEnvelope<T>> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.bearerToken) headers.Authorization = `Bearer ${options.bearerToken}`;
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      credentials: options.credentials ?? (options.bearerToken ? 'omit' : 'include'),
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });
  } catch {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      throw new ApiError(0, `Request timed out after ${timeoutMs / 1000}s. Is the backend running?`);
    }
    throw new ApiError(0, `Cannot reach the API at ${API_BASE_URL}. Start it with "npm run dev:backend".`);
  }
  clearTimeout(timer);

  // If 401 Unauthorized and not already retried or an auth route, try silent refresh
  const isAuthRoute = path.includes('/auth/login') || path.includes('/auth/refresh') || path.includes('/auth/register');
  if (response.status === 401 && !isRetry && !options.bearerToken && !isAuthRoute) {
    if (!isRefreshing) {
      isRefreshing = true;
      const success = await trySilentRefresh();
      isRefreshing = false;
      onRefreshed(success);
      if (success) {
        return send<T>(path, options, true);
      }
    } else {
      // Wait for existing refresh to finish
      const success = await new Promise<boolean>((resolve) => {
        subscribeTokenRefresh(resolve);
      });
      if (success) {
        return send<T>(path, options, true);
      }
    }
  }

  const text = await response.text();
  let payload: ApiEnvelope<T>;
  if (text.trim() === '') {
    payload = { success: response.ok, statusCode: response.status };
  } else {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      payload = { success: false, error: text.slice(0, 200), statusCode: response.status };
    }
  }

  if (!response.ok || payload.success === false) {
    throw new ApiError(response.status, payload.error || `Request failed with status ${response.status}`);
  }
  return payload;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await send<T>(path, options);
  return payload.data as T;
}

export async function apiRequestWithMeta<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta: ListMeta | null }> {
  const payload = await send<T>(path, options);
  return { data: payload.data as T, meta: payload.meta ?? null };
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1]);
    } catch {
      return utf[1];
    }
  }
  const ascii = /filename="?([^";]+)"?/i.exec(header);
  return ascii?.[1] ?? fallback;
}

/** Binary downloads (Excel / PDF) are not JSON envelopes. */
export async function apiDownload(
  path: string,
  fallbackName: string,
  timeoutMs = 30_000,
  extra: { bearerToken?: string } = {}
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      credentials: extra.bearerToken ? 'omit' : 'include',
      headers: extra.bearerToken ? { Authorization: `Bearer ${extra.bearerToken}` } : undefined,
      signal: controller.signal
    });
  } catch {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      throw new ApiError(0, `Download timed out after ${timeoutMs / 1000}s.`);
    }
    throw new ApiError(0, `Cannot reach the API at ${API_BASE_URL}.`);
  }
  clearTimeout(timer);

  if (!response.ok) {
    const text = await response.text();
    let message = `Download failed with status ${response.status}`;
    try {
      const payload = JSON.parse(text) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      if (text.trim()) message = text.slice(0, 200);
    }
    throw new ApiError(response.status, message);
  }

  const blob = await response.blob();
  const filename = filenameFromDisposition(response.headers.get('Content-Disposition'), fallbackName);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export { API_BASE_URL };