import { UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import { IDashboardRepository, DashboardScope } from '../../domain/repositories/IDashboardRepository.js';

function parseLimit(value: string | number | undefined, defaultValue: number, max: number, field = 'limit'): number {
  if (value === undefined || value === '') return defaultValue;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ValidationError(`${field} must be an integer from 1 to ${max}.`);
  }
  return parsed;
}

function resolveScope(scopeOrOrgId: DashboardScope | string): DashboardScope {
  const scope: DashboardScope = typeof scopeOrOrgId === 'string' ? { organizationId: scopeOrOrgId } : scopeOrOrgId;
  if (!scope.organizationId) throw new UnauthorizedError('Authenticated organization is required.');
  return scope;
}

export class GetDashboardOverviewUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}
  async execute(scopeOrOrgId: DashboardScope | string, requestedLeadLimit?: string | number) {
    const scope = resolveScope(scopeOrOrgId);
    const leadLimit = parseLimit(requestedLeadLimit, 8, 50, 'leadLimit');
    return this.dashboardRepository.getOverview(scope, leadLimit);
  }
}

export class ListDashboardLeadsUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}
  async execute(scopeOrOrgId: DashboardScope | string, requestedLimit?: string | number) {
    const scope = resolveScope(scopeOrOrgId);
    const limit = parseLimit(requestedLimit, 20, 100);
    return this.dashboardRepository.listLeads(scope, limit);
  }
}

export class ListDashboardActivityUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}
  async execute(scopeOrOrgId: DashboardScope | string, requestedLimit?: string | number) {
    const scope = resolveScope(scopeOrOrgId);
    const limit = parseLimit(requestedLimit, 20, 100);
    return this.dashboardRepository.listActivity(scope, limit);
  }
}

export class GetDashboardAdminAnalyticsUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}
  async execute(scopeOrOrgId: DashboardScope | string, period?: string) {
    const scope = resolveScope(scopeOrOrgId);
    const validPeriod = period || '30d';
    return this.dashboardRepository.getAdminAnalytics(scope, validPeriod);
  }
}
