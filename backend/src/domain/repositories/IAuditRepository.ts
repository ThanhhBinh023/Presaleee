import { AuditLogEntry, AuditResultStatus } from '../entities/AuditLog.js';

export interface AuditScope {
  organizationId: string;
}

export interface ListAuditFilters extends AuditScope {
  page: number;
  limit: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  resultStatus?: AuditResultStatus;
  from?: string;
  to?: string;
}

export interface RecordAuditInput {
  organizationId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
  resultStatus?: AuditResultStatus;
  ipAddress?: string | null;
}

export interface IAuditRepository {
  record(input: RecordAuditInput): Promise<void>;
  list(filters: ListAuditFilters): Promise<{ entries: AuditLogEntry[]; total: number }>;
}
