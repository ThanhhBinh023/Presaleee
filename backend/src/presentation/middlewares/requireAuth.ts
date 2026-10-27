import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../domain/errors/AppError.js';
import { AccessTokenClaims, verifyAccessToken } from '../../application/services/AuthTokenService.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenClaims;
    }
  }
}

export function requireOrganization(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth?.organizationId) {
    next(new ForbiddenError('An organization is required for this operation.'));
    return;
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
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
  const token = bearerToken || cookieToken;
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
