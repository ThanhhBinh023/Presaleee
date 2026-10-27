import { AccessTokenClaims } from '../application/services/AuthTokenService.js';
import { PortalSession } from '../domain/entities/Portal.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenClaims;
      portalSession?: PortalSession;
    }
  }
}

export {};
