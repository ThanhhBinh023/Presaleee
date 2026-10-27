import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../domain/errors/AppError.js';
import { UserRole } from '../../domain/entities/User.js';

/**
 * Coarse gate executed after `requireAuth`. Fine-grained ownership checks stay in
 * use cases; roles come from the access token, which lives at most 15 minutes.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const claims = req.auth;
    if (!claims) {
      next(new UnauthorizedError());
      return;
    }
    // Token claims carry the wider auth role taxonomy, so compare instead of using includes().
    if (!roles.some(role => role === claims.role)) {
      next(new ForbiddenError(`This operation requires one of the following roles: ${roles.join(', ')}.`));
      return;
    }
    next();
  };
}
