import { AuthRequestClaims } from '../../domain/entities/AuthUser.js';

export interface AuthenticatedScope {
  organizationId: string;
  userId: string;
  role: string;
  claims: AuthRequestClaims;
  ipAddress?: string;
}
