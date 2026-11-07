import { AuditLogEntry } from '../../domain/entities/AuditLog.js';
import { IAuditRepository } from '../../domain/repositories/IAuditRepository.js';
import { AuthenticatedScope } from '../dtos/AuthenticatedScope.js';
import { ListAuditLogsQueryDTO } from '../dtos/AuditDTO.js';

export class ListAuditLogsUseCase {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async execute(scope: AuthenticatedScope, query: ListAuditLogsQueryDTO): Promise<{
    entries: AuditLogEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.auditRepository.list({
      organizationId: scope.organizationId,
      page: query.page,
      limit: query.limit,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      actorId: query.actorId,
      resultStatus: query.resultStatus,
      from: query.from,
      to: query.to
    });
    return { ...result, page: query.page, limit: query.limit, totalPages: Math.ceil(result.total / query.limit) || 1 };
  }
}
