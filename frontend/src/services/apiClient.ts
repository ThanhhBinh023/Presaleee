import type { ApiEnvelope } from '../types/auth';

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
}

async function readEnvelope(response: Response): Promise<ApiEnvelope<unknown>> {
  const text = await response.text();
  if (text.trim() === '') return { success: response.ok, statusCode: response.status };
  try {
    return JSON.parse(text) as ApiEnvelope<unknown>;
  } catch {
    return { success: false, error: text.slice(0, 200), statusCode: response.status };
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      throw new ApiError(0, `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Is the backend running?`);
    }
    throw new ApiError(0, `Cannot reach the API at ${API_BASE_URL}. Start it with "npm run dev:backend".`);
  }
  clearTimeout(timer);

  const payload = await readEnvelope(response);
  if (!response.ok || payload.success === false) {
    throw new ApiError(response.status, payload.error || `Request failed with status ${response.status}`);
  }
  return payload.data as T;
}

export { API_BASE_URL };