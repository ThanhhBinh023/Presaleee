import { LeadSource, LeadStatus } from '../../domain/entities/Lead.js';
import { AuthRequestClaims } from '../../domain/entities/AuthUser.js';
import { ValidationError } from '../../domain/errors/AppError.js';

export interface AuthenticatedLeadScope {
  organizationId: string;
  userId: string;
  claims: AuthRequestClaims;
}

export interface CreateLeadDTO extends AuthenticatedLeadScope {
  clientId?: unknown;
  assignedTo?: unknown;
  title?: unknown;
  source?: unknown;
  rawRfpContent?: unknown;
  extractedMetadata?: unknown;
}

export interface UpdateLeadDTO extends AuthenticatedLeadScope {
  id: string;
  clientId?: unknown;
  assignedTo?: unknown;
  title?: unknown;
  source?: unknown;
  rawRfpContent?: unknown;
  extractedMetadata?: unknown;
}

export interface ListLeadsDTO extends AuthenticatedLeadScope {
  page?: unknown;
  limit?: unknown;
  status?: unknown;
  source?: unknown;
  assignedTo?: unknown;
  clientId?: unknown;
  search?: unknown;
}

export interface UpdateLeadStatusDTO extends AuthenticatedLeadScope {
  id: string;
  status?: unknown;
}

export function parseLeadSource(value: unknown, defaultValue?: LeadSource): LeadSource {
  if (value === undefined && defaultValue) return defaultValue;
  const allowed: readonly string[] = ['INBOUND_EMAIL', 'WEBSITE', 'REFERRAL', 'MEETING', 'MANUAL'];
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new ValidationError('Source must be one of INBOUND_EMAIL, WEBSITE, REFERRAL, MEETING, or MANUAL.');
  }
  return value as LeadSource;
}

export function parseLeadStatus(value: unknown): LeadStatus {
  const allowed: readonly string[] = ['NEW', 'IN_REVIEW', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL_DRAFTING', 'APPROVED', 'REJECTED', 'WON', 'LOST'];
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new ValidationError(`Status must be one of ${allowed.join(', ')}.`);
  }
  return value as LeadStatus;
}
