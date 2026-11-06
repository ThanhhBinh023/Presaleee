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
}

async function send<T>(path: string, options: RequestOptions): Promise<ApiEnvelope<T>> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
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

export { API_BASE_URL };