import { ValidationError } from '../../domain/errors/AppError.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} is required.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new ValidationError(`${field} must not exceed ${maxLength} characters.`);
  return normalized;
}

/** Returns undefined when the key is absent, null when it is explicitly cleared. */
export function nullableText(value: unknown, field: string, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return requiredText(value, field, maxLength);
}

export function optionalUuid(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ValidationError(`${field} must be a valid UUID or null.`);
  }
  return value;
}

export function requiredUuid(value: unknown, field: string): string {
  const parsed = optionalUuid(value, field);
  if (!parsed) throw new ValidationError(`${field} must be a valid UUID.`);
  return parsed;
}

export function normalizeEmail(value: unknown, field = 'email'): string {
  if (typeof value !== 'string') throw new ValidationError(`A valid ${field} is required.`);
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 255 || !EMAIL_PATTERN.test(normalized)) {
    throw new ValidationError(`A valid ${field} is required.`);
  }
  return normalized;
}

export function nonNegativeAmount(value: unknown, field: string): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000_000) {
    throw new ValidationError(`${field} must be a non-negative number.`);
  }
  return Math.round(parsed * 100) / 100;
}

export function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new ValidationError(`${field} must be true or false.`);
  return value;
}

export function parseEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ValidationError(`${field} must be one of ${allowed.join(', ')}.`);
  }
  return value as T;
}

export function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return parseEnum(value, allowed, field);
}

export function currencyCode(value: unknown, defaultValue = 'USD'): string {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value !== 'string' || !/^[A-Z]{3}$/i.test(value.trim())) {
    throw new ValidationError('currency must be a 3-letter ISO code.');
  }
  return value.trim().toUpperCase();
}

export function isoTimestamp(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`${field} must be an ISO-8601 timestamp.`);
  }
  return new Date(value).toISOString();
}

export function pagination(value: unknown, field: string, max: number, defaultValue: number): number {
  if (value === undefined || value === '') return defaultValue;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ValidationError(`${field} must be an integer from 1 to ${max}.`);
  }
  return parsed;
}

export function booleanQuery(value: unknown, field: string, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  throw new ValidationError(`${field} must be true or false.`);
}

export function jsonObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError(`${field} must be a JSON object.`);
  return value as Record<string, unknown>;
}

/** Copies `dto[key]` into `target[key]` only when the client actually sent the field. */
export function assignIfPresent<T extends object, K extends keyof T & string>(
  dto: Record<string, unknown>,
  target: T,
  key: K,
  parse: (value: unknown) => T[K]
): void {
  if (Object.prototype.hasOwnProperty.call(dto, key)) {
    target[key] = parse(dto[key]);
  }
}
