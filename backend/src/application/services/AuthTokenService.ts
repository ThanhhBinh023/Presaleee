import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { UnauthorizedError } from '../../domain/errors/AppError.js';
import { AuthUser, PublicAuthUser } from '../../domain/entities/AuthUser.js';
import { env } from '../../infrastructure/config/env.js';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  organizationId: string | null;
  role: string;
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function toPublicUser(user: AuthUser): PublicAuthUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export function issueAccessToken(user: AuthUser): string {
  if (!env.jwtAccessSecret) {
    throw new Error('JWT_ACCESS_SECRET is required for authentication.');
  }
  const claims: AccessTokenClaims = {
    sub: user.id,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role
  };
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ ...claims, iat: now, exp: now + ACCESS_TOKEN_TTL_SECONDS })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const signature = createHmac('sha256', env.jwtAccessSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  if (!env.jwtAccessSecret) throw new UnauthorizedError('Invalid or expired access token.');
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token shape');
    const [headerPart, payloadPart, signaturePart] = parts;
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as { alg?: unknown; typ?: unknown };
    if (header.alg !== 'HS256' || header.typ !== 'JWT') throw new Error('Invalid token algorithm');
    const expectedSignature = createHmac('sha256', env.jwtAccessSecret).update(`${headerPart}.${payloadPart}`).digest();
    const actualSignature = Buffer.from(signaturePart, 'base64url');
    if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) {
      throw new Error('Invalid token signature');
    }
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string' || typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new Error('Invalid or expired token claims');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      organizationId: typeof payload.organizationId === 'string' ? payload.organizationId : null,
      role: typeof payload.role === 'string' ? payload.role : 'VIEWER'
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired access token.');
  }
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
