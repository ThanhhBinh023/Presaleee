import { UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import { IDashboardRepository } from '../../domain/repositories/IDashboardRepository.js';

function parseLimit(value: string | number | undefined, defaultValue: number, max: number): number {
  if (value === undefined) return defaultValue;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ValidationError(`limit must be an integer from 1 to ${max}.`);
  }
  return parsed;
}

export class GetDashboardOverviewUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}
  async execute(organizationId: string, requestedLeadLimit?: string | number) {
    if (!organizationId) throw new UnauthorizedError('Authenticated organization is required.');
    const leadLimit = parseLimit(requestedLeadLimit, 8, 50);
    return this.dashboardRepository.getOverview({ organizationId }, leadLimit);
  }
}

export class ListDashboardLeadsUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}
  async execute(organizationId: string, requestedLimit?: string | number) {
    if (!organizationId) throw new UnauthorizedError('Authenticated organization is required.');
    const limit = parseLimit(requestedLimit, 20, 100);
    return this.dashboardRepository.listLeads({ organizationId }, limit);
  }
}

export class ListDashboardActivityUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}
  async execute(organizationId: string, requestedLimit?: string | number) {
    if (!organizationId) throw new UnauthorizedError('Authenticated organization is required.');
    const limit = parseLimit(requestedLimit, 20, 100);
    return this.dashboardRepository.listActivity({ organizationId }, limit);
  }
}
