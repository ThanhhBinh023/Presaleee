import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../domain/errors/AppError.js';
import { verifyAccessToken } from '../../application/services/AuthTokenService.js';

export function requireOrganization(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth?.organizationId) {
    next(new ForbiddenError('An organization is required for this operation.'));
    return;
  }
  next();
}

export function requireNotViewer(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(new UnauthorizedError('Authentication required.'));
    return;
  }
  if (req.auth.role === 'VIEWER') {
    next(new ForbiddenError('VIEWER role is read-only. This operation is not permitted.'));
    return;
  }
  next();
}

export function extractToken(req: Request): string | undefined {
  const authorization = req.header('authorization');
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : undefined;
  const accessCookie = req.headers.cookie
    ?.split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('presaleee_access='))
    ?.slice('presaleee_access='.length);
  let cookieToken: string | undefined;
  if (accessCookie) {
    try {
      cookieToken = decodeURIComponent(accessCookie);
    } catch {
      cookieToken = undefined;
    }
  }
  return bearerToken || cookieToken;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(new UnauthorizedError('Authentication required.'));
    return;
  }
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      req.auth = verifyAccessToken(token);
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}
