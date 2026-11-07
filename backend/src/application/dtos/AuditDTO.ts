import { AUDIT_RESULT_STATUSES, AuditResultStatus } from '../../domain/entities/AuditLog.js';
import { isoTimestamp, optionalEnum, optionalUuid, pagination, requiredText } from '../services/RequestValidation.js';

/** Audit log filters after the presentation boundary has validated them. */
export interface ListAuditLogsQueryDTO {
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

/** Order matches the previous use-case validation so the first invalid field still wins. */
export function parseListAuditLogsQuery(query: Record<string, unknown>): ListAuditLogsQueryDTO {
  const page = pagination(query.page, 'page', 100_000, 1);
  const limit = pagination(query.limit, 'limit', 200, 50);
  const entityId = optionalUuid(query.entityId, 'entityId') || undefined;
  const actorId = optionalUuid(query.actorId, 'actorId') || undefined;
  const optionalText = (value: unknown, field: string): string | undefined =>
    value === undefined || value === '' ? undefined : requiredText(value, field, 100);
  const action = optionalText(query.action, 'action');
  const entityType = optionalText(query.entityType, 'entityType');
  const resultStatus = optionalEnum(query.resultStatus, AUDIT_RESULT_STATUSES, 'resultStatus');
  const from = isoTimestamp(query.from, 'from');
  const to = isoTimestamp(query.to, 'to');
  return { page, limit, action, entityType, entityId, actorId, resultStatus, from, to };
}
