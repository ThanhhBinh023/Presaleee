import { AuditLogEntry, AUDIT_RESULT_STATUSES, AuditResultStatus } from '../../domain/entities/AuditLog.js';
import { IAuditRepository } from '../../domain/repositories/IAuditRepository.js';
import { AuthenticatedScope } from '../dtos/AuthenticatedScope.js';
import { isoTimestamp, optionalEnum, pagination, requiredText, optionalUuid } from '../services/RequestValidation.js';

export class ListAuditLogsUseCase {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async execute(scope: AuthenticatedScope, query: Record<string, unknown>): Promise<{
    entries: AuditLogEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = pagination(query.page, 'page', 100_000, 1);
    const limit = pagination(query.limit, 'limit', 200, 50);
    const entityId = optionalUuid(query.entityId, 'entityId');
    const actorId = optionalUuid(query.actorId, 'actorId');
    const result = await this.auditRepository.list({
      organizationId: scope.organizationId,
      page,
      limit,
      action: query.action === undefined || query.action === '' ? undefined : requiredText(query.action, 'action', 100),
      entityType: query.entityType === undefined || query.entityType === '' ? undefined : requiredText(query.entityType, 'entityType', 100),
      entityId: entityId || undefined,
      actorId: actorId || undefined,
      resultStatus: optionalEnum(query.resultStatus, AUDIT_RESULT_STATUSES, 'resultStatus') as AuditResultStatus | undefined,
      from: isoTimestamp(query.from, 'from'),
      to: isoTimestamp(query.to, 'to')
    });
    return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) || 1 };
  }
}
