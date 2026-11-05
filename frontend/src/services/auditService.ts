import { apiRequestWithMeta } from './apiClient';
import type { ListMeta } from '../types/auth';
import type { AuditEntry, AuditResultStatus } from '../types/audit';

const AUDITS_PREFIX = '/api/v1/audit-logs';

export interface AuditListQuery {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  resultStatus?: AuditResultStatus | '';
  from?: string;
  to?: string;
}

function toQueryString(query: AuditListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.action) params.set('action', query.action);
  if (query.entityType) params.set('entityType', query.entityType);
  if (query.entityId) params.set('entityId', query.entityId);
  if (query.actorId) params.set('actorId', query.actorId);
  if (query.resultStatus) params.set('resultStatus', query.resultStatus);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export const auditService = {
  listEntries: async (query: AuditListQuery = {}): Promise<{ entries: AuditEntry[]; meta: ListMeta | null }> => {
    const result = await apiRequestWithMeta<AuditEntry[]>(`${AUDITS_PREFIX}${toQueryString(query)}`);
    return { entries: result.data ?? [], meta: result.meta };
  }
};
