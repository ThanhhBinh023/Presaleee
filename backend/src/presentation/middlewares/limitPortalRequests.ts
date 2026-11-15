import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../domain/errors/AppError.js';

const WINDOW_MS = 60_000;
const SWEEP_THRESHOLD = 1000;
// One page view costs three reads, so the general budget sits far above any human pattern and only
// stops a scripted link; the two routes that spend server compute get a tight budget of their own.
const GENERAL_BUDGET = 300;
const COMPUTE_BUDGET = 20;

interface Budget { windowStart: number; general: number; compute: number }

const hits = new Map<string, Budget>();

/**
 * Bounds one issued portal link, which anyone with the link can drive as fast as they like.
 * Unauthenticated traffic is not covered here: the session id only exists after a token resolves.
 */
export function limitPortalRequests(req: Request, _res: Response, next: NextFunction): void {
  const sessionId = req.portalSession?.id;
  if (!sessionId) { next(); return; }
  const path = req.originalUrl.split('?')[0];
  const isComputeRoute = /\/(questions|export-pdf)$/.test(path);
  const now = Date.now();
  const previous = hits.get(sessionId);
  const bucket: Budget = previous && now - previous.windowStart < WINDOW_MS
    ? { windowStart: previous.windowStart, general: previous.general + 1, compute: previous.compute + (isComputeRoute ? 1 : 0) }
    : { windowStart: now, general: 1, compute: isComputeRoute ? 1 : 0 };
  hits.set(sessionId, bucket);
  if (hits.size > SWEEP_THRESHOLD) {
    for (const [key, value] of hits) if (now - value.windowStart >= WINDOW_MS) hits.delete(key);
  }
  if (bucket.general > GENERAL_BUDGET || (isComputeRoute && bucket.compute > COMPUTE_BUDGET)) {
    next(new AppError('Too many requests from this portal link. Try again in a minute.', 429));
    return;
  }
  next();
}
