import { LEAD_SOURCES, LEAD_STATUSES, LeadSource, LeadStatus } from '../../domain/entities/Lead.js';
import { AuthRequestClaims } from '../../domain/entities/AuthUser.js';
import { ValidationError } from '../../domain/errors/AppError.js';

export interface AuthenticatedLeadScope {
  organizationId: string;
  userId: string;
  claims: AuthRequestClaims;
}

/**
 * Write fields arrive straight from `req.body` and are not trusted until the use case
 * validation helpers have accepted them, so every field stays optional.
 */
export interface LeadWriteInput {
  clientId?: string | null;
  assignedTo?: string | null;
  title?: string;
  source?: LeadSource;
  rawRfpContent?: string;
  extractedMetadata?: Record<string, unknown>;
}

export interface CreateLeadDTO extends AuthenticatedLeadScope, LeadWriteInput {}

export interface UpdateLeadDTO extends AuthenticatedLeadScope, LeadWriteInput {
  id: string;
}

export interface LeadListQuery {
  page?: string | number;
  limit?: string | number;
  status?: LeadStatus;
  source?: LeadSource;
  assignedTo?: string | null;
  search?: string;
}

export interface ListLeadsDTO extends AuthenticatedLeadScope, LeadListQuery {}

function enumViolationMessage(field: string, values: readonly string[]): string {
  return `${field} must be one of ${values.slice(0, -1).join(', ')}, or ${values[values.length - 1]}.`;
}

export function parseLeadSource(value: unknown, defaultValue?: LeadSource): LeadSource {
  if (value === undefined && defaultValue) return defaultValue;
  if (typeof value !== 'string' || !(LEAD_SOURCES as readonly string[]).includes(value)) {
    throw new ValidationError(enumViolationMessage('Source', LEAD_SOURCES));
  }
  return value as LeadSource;
}

export function parseLeadStatus(value: unknown): LeadStatus {
  if (typeof value !== 'string' || !(LEAD_STATUSES as readonly string[]).includes(value)) {
    throw new ValidationError(enumViolationMessage('Status', LEAD_STATUSES));
  }
  return value as LeadStatus;
}
