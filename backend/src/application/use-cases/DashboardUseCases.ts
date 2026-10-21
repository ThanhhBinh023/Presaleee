import { ValidationError } from '../../domain/errors/AppError.js';
import { IDashboardRepository } from '../../domain/repositories/IDashboardRepository.js';

function parseLimit(value: unknown, defaultValue: number, max: number, field = 'limit'): number {
  if (value === undefined || value === '') return defaultValue;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isInteger(parsed) || (parsed as number) < 1 || (parsed as number) > max) {
    throw new ValidationError(`${field} must be an integer from 1 to ${max}.`);
  }
  return parsed as number;
}

export class GetDashboardOverviewUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}
  async execute(organizationId: string, requestedLeadLimit?: unknown) {
    if (!organizationId) throw new ValidationError('Authenticated organization is required.');
    const leadLimit = parseLimit(requestedLeadLimit, 8, 50, 'leadLimit');
    return this.dashboardRepository.getOverview({ organizationId }, leadLimit);
  }
}

export class ListDashboardLeadsUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}
  async execute(organizationId: string, requestedLimit?: unknown) {
    if (!organizationId) throw new ValidationError('Authenticated organization is required.');
    const limit = parseLimit(requestedLimit, 20, 100);
    return this.dashboardRepository.listLeads({ organizationId }, limit);
  }
}

export class ListDashboardActivityUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}
  async execute(organizationId: string, requestedLimit?: unknown) {
    if (!organizationId) throw new ValidationError('Authenticated organization is required.');
    const limit = parseLimit(requestedLimit, 20, 100);
    return this.dashboardRepository.listActivity({ organizationId }, limit);
  }
}
