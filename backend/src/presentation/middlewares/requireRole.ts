import { NextFunction, Request, Response } from 'express';
import { AppError, UnauthorizedError } from '../../domain/errors/AppError.js';

/**
 * Coarse gate executed after `requireAuth`. Fine-grained ownership checks stay in
 * use cases; roles come from the access token, which lives at most 15 minutes.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(new AppError(`This operation requires one of the following roles: ${roles.join(', ')}.`, 403));
      return;
    }
    next();
  };
}
