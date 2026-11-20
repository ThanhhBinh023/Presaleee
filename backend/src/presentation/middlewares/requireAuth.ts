import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../domain/errors/AppError.js';
import { verifyAccessToken } from '../../application/services/AuthTokenService.js';
import { dbPool } from '../../infrastructure/database/connection.js';

export function requireOrganization(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth?.organizationId) {
    next(new ForbiddenError('An organization is required for this operation.'));
    return;
  }
  next();
}

export async function requireNotViewer(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.auth) {
    next(new UnauthorizedError('Authentication required.'));
    return;
  }
  if (req.auth.role !== 'VIEWER') {
    next();
    return;
  }

  // If system role is VIEWER, check if the user has an elevated PBAC role in this specific project/lead
  const rawId = req.params.id || req.params.proposalId || req.params.leadId || (req.body && (req.body.proposalId || req.body.leadId));
  const entityId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (entityId && dbPool) {
    try {
      // 1. Check if user is a member of the project with a non-VIEWER role
      const pbacCheck = await dbPool.query(`
        SELECT pm.project_role 
        FROM project_memberships pm
        WHERE pm.user_id = $1 
          AND (
            pm.project_id = $2 
            OR pm.project_id = (SELECT lead_id FROM proposals WHERE id = $2 OR lead_id = $2 LIMIT 1)
          )
        LIMIT 1;
      `, [req.auth.sub, entityId]);

      if (pbacCheck.rows[0]?.project_role && pbacCheck.rows[0].project_role !== 'VIEWER') {
        req.auth.role = pbacCheck.rows[0].project_role as any;
        next();
        return;
      }

      // 2. Check if user is creator or assignee of the lead or proposal
      const creatorCheck = await dbPool.query(`
        SELECT 1 FROM leads 
        WHERE (id = $2 OR id = (SELECT lead_id FROM proposals WHERE id = $2 OR lead_id = $2 LIMIT 1))
          AND (created_by = $1 OR assigned_to = $1)
        LIMIT 1;
      `, [req.auth.sub, entityId]);

      if (creatorCheck.rows.length > 0) {
        req.auth.role = 'PRESALE_LEAD';
        next();
        return;
      }

      // 3. Check if user created the proposal directly
      const propCreatorCheck = await dbPool.query(`
        SELECT 1 FROM proposals WHERE id = $2 AND created_by = $1 LIMIT 1;
      `, [req.auth.sub, entityId]);

      if (propCreatorCheck.rows.length > 0) {
        req.auth.role = 'PRESALE_LEAD';
        next();
        return;
      }
    } catch (err) {
      console.error('[requireNotViewer] PBAC check error:', err);
    }
  }

  next(new ForbiddenError('VIEWER role is read-only. This operation is not permitted.'));
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

const CANONICAL_ORG_MAP: Record<string, string> = {
  'fb5e76e1-edeb-450f-a579-4596feeaf8df': '4206747f-b65f-4e4a-a431-b1345545d88e',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae': '4206747f-b65f-4e4a-a431-b1345545d88e',
  'bee57320-5957-423e-8a5e-b8aa2ae97107': '4206747f-b65f-4e4a-a431-b1345545d88e'
};

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(new UnauthorizedError('Authentication required.'));
    return;
  }
  try {
    req.auth = verifyAccessToken(token);
    if (req.auth?.organizationId && CANONICAL_ORG_MAP[req.auth.organizationId]) {
      req.auth.organizationId = CANONICAL_ORG_MAP[req.auth.organizationId];
    }
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
      if (req.auth?.organizationId && CANONICAL_ORG_MAP[req.auth.organizationId]) {
        req.auth.organizationId = CANONICAL_ORG_MAP[req.auth.organizationId];
      }
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}
