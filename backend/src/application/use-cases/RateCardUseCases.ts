import { NotFoundError, ValidationError } from '../../domain/errors/AppError.js';
import { Proposal } from '../../domain/entities/Proposal.js';
import { PricingCalculationError, calculatePricing } from '../../domain/services/calculatePricing.js';
import { RATE_CARD_LEVELS, RateCard } from '../../domain/entities/RateCard.js';
import { IRateCardRepository, RateCardInput as RateCardCreateInput, UpdateRateCardInput } from '../../domain/repositories/IRateCardRepository.js';
import { IAuditRepository } from '../../domain/repositories/IAuditRepository.js';
import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { PricingCalculationResult, PricingInputLine } from '../../domain/entities/Pricing.js';
import { AuthenticatedScope } from '../dtos/AuthenticatedScope.js';
import {
  assignIfPresent,
  booleanQuery,
  currencyCode,
  nullableText,
  nonNegativeAmount,
  pagination,
  optionalEnum,
  requiredText,
  requiredUuid
} from '../services/RequestValidation.js';

const MAX_ROLE_NAME = 100;

function requiredLevel(value: unknown): RateCardCreateInput['level'] {
  if (value === undefined || value === null || value === '') return 'SENIOR';
  return optionalEnum(value, RATE_CARD_LEVELS, 'level')!;
}

function optionalLevel(value: unknown): RateCardCreateInput['level'] | undefined {
  if (value === undefined) return undefined;
  return requiredLevel(value);
}

function buildRates(hourly: number, daily: number, monthly: number | null | undefined): { hourly: number; daily: number; monthly: number | null } {
  if (hourly <= 0 && daily <= 0 && (monthly === null || monthly === undefined)) {
    throw new ValidationError('Provide at least one of hourlyRateUsd, dailyRateUsd, or monthlyRateUsd with a value above zero.');
  }
  return { hourly, daily, monthly: monthly ?? null };
}

export class CreateRateCardUseCase {
  constructor(
    private readonly rateCardRepository: IRateCardRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async execute(scope: AuthenticatedScope, dto: Record<string, unknown>): Promise<RateCard> {
    const input: RateCardCreateInput = {
      organizationId: scope.organizationId,
      roleName: requiredText(dto.roleName, 'roleName', MAX_ROLE_NAME),
      level: requiredLevel(dto.level),
      hourlyRateUsd: nonNegativeAmount(dto.hourlyRateUsd, 'hourlyRateUsd'),
      dailyRateUsd: nonNegativeAmount(dto.dailyRateUsd, 'dailyRateUsd'),
      monthlyRateUsd: dto.monthlyRateUsd === undefined ? null : nonNegativeAmount(dto.monthlyRateUsd, 'monthlyRateUsd'),
      currency: currencyCode(dto.currency),
      isActive: dto.isActive === undefined ? true : booleanQuery(dto.isActive, 'isActive', true)
    };
    buildRates(input.hourlyRateUsd, input.dailyRateUsd, input.monthlyRateUsd);
    const rateCard = await this.rateCardRepository.create(input);
    await this.auditRepository.record({
      organizationId: scope.organizationId,
      actorId: scope.userId,
      action: 'RATE_CARD_CREATED',
      entityType: 'rate_card',
      entityId: rateCard.id,
      payload: { roleName: rateCard.roleName, level: rateCard.level, currency: rateCard.currency },
      ipAddress: scope.ipAddress
    });
    return rateCard;
  }
}

export class ListRateCardsUseCase {
  constructor(private readonly rateCardRepository: IRateCardRepository) {}

  async execute(scope: AuthenticatedScope, query: Record<string, unknown>) {
    const page = pagination(query.page, 'page', 100_000, 1);
    const limit = pagination(query.limit, 'limit', 100, 50);
    const result = await this.rateCardRepository.list({
      organizationId: scope.organizationId,
      page,
      limit,
      level: optionalEnum(query.level, RATE_CARD_LEVELS, 'level'),
      roleName: query.roleName === undefined || query.roleName === '' ? undefined : requiredText(query.roleName, 'roleName', MAX_ROLE_NAME),
      currency: query.currency === undefined || query.currency === '' ? undefined : currencyCode(query.currency),
      includeInactive: booleanQuery(query.includeInactive, 'includeInactive', false)
    });
    return {
      rateCards: result.rateCards,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit) || 1
    };
  }
}

export class GetRateCardUseCase {
  constructor(private readonly rateCardRepository: IRateCardRepository) {}

  async execute(scope: AuthenticatedScope, id: string): Promise<RateCard> {
    const rateCard = await this.rateCardRepository.findById(requiredUuid(id, 'id'), { organizationId: scope.organizationId });
    if (!rateCard) throw new NotFoundError('Rate card not found.');
    return rateCard;
  }
}

export class UpdateRateCardUseCase {
  constructor(
    private readonly rateCardRepository: IRateCardRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async execute(scope: AuthenticatedScope, id: string, dto: Record<string, unknown>): Promise<RateCard> {
    const targetId = requiredUuid(id, 'id');
    const existing = await this.rateCardRepository.findById(targetId, { organizationId: scope.organizationId });
    if (!existing) throw new NotFoundError('Rate card not found.');

    const updates: UpdateRateCardInput = {};
    assignIfPresent(dto, updates, 'roleName', value => requiredText(value, 'roleName', MAX_ROLE_NAME));
    assignIfPresent(dto, updates, 'level', value => optionalLevel(value));
    assignIfPresent(dto, updates, 'hourlyRateUsd', value => nonNegativeAmount(value, 'hourlyRateUsd'));
    assignIfPresent(dto, updates, 'dailyRateUsd', value => nonNegativeAmount(value, 'dailyRateUsd'));
    assignIfPresent(dto, updates, 'monthlyRateUsd', value => (value === null ? null : nonNegativeAmount(value, 'monthlyRateUsd')));
    assignIfPresent(dto, updates, 'currency', value => currencyCode(value));
    assignIfPresent(dto, updates, 'isActive', value => booleanQuery(value, 'isActive', true));
    if (Object.keys(updates).length === 0) throw new ValidationError('At least one editable field is required.');

    const rates = buildRates(
      updates.hourlyRateUsd ?? existing.hourlyRateUsd,
      updates.dailyRateUsd ?? existing.dailyRateUsd,
      updates.monthlyRateUsd === undefined ? existing.monthlyRateUsd : updates.monthlyRateUsd
    );
    if (updates.monthlyRateUsd === undefined && (updates.hourlyRateUsd !== undefined || updates.dailyRateUsd !== undefined)) {
      updates.monthlyRateUsd = rates.monthly;
    }

    const rateCard = await this.rateCardRepository.update(targetId, { organizationId: scope.organizationId }, updates);
    if (!rateCard) throw new NotFoundError('Rate card not found.');
    await this.auditRepository.record({
      organizationId: scope.organizationId,
      actorId: scope.userId,
      action: 'RATE_CARD_UPDATED',
      entityType: 'rate_card',
      entityId: rateCard.id,
      payload: { changedFields: Object.keys(updates) },
      ipAddress: scope.ipAddress
    });
    return rateCard;
  }
}

export class DeleteRateCardUseCase {
  constructor(
    private readonly rateCardRepository: IRateCardRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async execute(scope: AuthenticatedScope, id: string): Promise<void> {
    const targetId = requiredUuid(id, 'id');
    const existing = await this.rateCardRepository.findById(targetId, { organizationId: scope.organizationId });
    if (!existing) throw new NotFoundError('Rate card not found.');
    const deleted = await this.rateCardRepository.delete(targetId, { organizationId: scope.organizationId });
    if (!deleted) throw new NotFoundError('Rate card not found.');
    await this.auditRepository.record({
      organizationId: scope.organizationId,
      actorId: scope.userId,
      action: 'RATE_CARD_DELETED',
      entityType: 'rate_card',
      entityId: targetId,
      payload: { roleName: existing.roleName, level: existing.level },
      ipAddress: scope.ipAddress
    });
  }
}

export class CalculateQuotationPricingUseCase {
  constructor(
    private readonly rateCardRepository: IRateCardRepository,
    private readonly auditRepository: IAuditRepository,
    private readonly proposalRepository?: IProposalRepository
  ) {}

  async execute(scope: AuthenticatedScope, dto: Record<string, unknown>): Promise<{
    pricing: PricingCalculationResult;
    proposal: Proposal | null;
  }> {
    const rawLines = dto.lines;
    if (!Array.isArray(rawLines) || rawLines.length === 0) throw new ValidationError('lines must be a non-empty array of staffing lines.');
    if (rawLines.length > 100) throw new ValidationError('lines supports at most 100 staffing lines.');

    const lines: PricingInputLine[] = rawLines.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ValidationError(`lines[${index}] must be an object.`);
      const line = item as Record<string, unknown>;
      return {
        roleName: requiredText(line.roleName, `lines[${index}].roleName`, MAX_ROLE_NAME),
        level: optionalEnum(line.level, RATE_CARD_LEVELS, `lines[${index}].level`),
        rateCardId: line.rateCardId === undefined || line.rateCardId === null ? null : requiredUuid(line.rateCardId, `lines[${index}].rateCardId`),
        manMonths: positiveAmount(line.manMonths, `lines[${index}].manMonths`),
        monthlyRateOverride: line.monthlyRateOverride === undefined || line.monthlyRateOverride === null
          ? null
          : nonNegativeAmount(line.monthlyRateOverride, `lines[${index}].monthlyRateOverride`)
      };
    });

    const proposalId = dto.proposalId === undefined || dto.proposalId === null || dto.proposalId === ''
      ? null
      : requiredUuid(dto.proposalId, 'proposalId');
    const shouldApply = dto.apply === undefined ? proposalId !== null : booleanQuery(dto.apply, 'apply', false);

    let currency = dto.currency === undefined || dto.currency === null ? undefined : currencyCode(dto.currency);
    if (proposalId && !currency) {
      const proposal = await this.proposalRepository?.findById(proposalId, scope.organizationId);
      if (!proposal) throw new NotFoundError('Proposal not found.');
      currency = proposal.currency || undefined;
    }

    const rateCards = await this.rateCardRepository.listActive(scope.organizationId, currency);
    let pricing: PricingCalculationResult;
    try {
      pricing = calculatePricing({ lines, currency: currency || 'USD', rateCards });
    } catch (error) {
      if (error instanceof PricingCalculationError) {
        throw error.code === 'UNKNOWN_ROLE'
          ? new ValidationError(`${error.message} Available roles: ${rateCards.map(card => card.roleName).join(', ') || 'none'}.`)
          : new ValidationError(error.message);
      }
      throw error;
    }

    let proposal = null;
    if (shouldApply) {
      if (!proposalId || !this.proposalRepository) throw new ValidationError('proposalId is required to apply a calculated quotation.');
      const updated = await this.proposalRepository.update(proposalId, scope.organizationId, {
        totalCost: pricing.totalCost,
        currency: pricing.currency
      });
      if (!updated) throw new NotFoundError('Proposal not found.');
      proposal = updated;
    }

    await this.auditRepository.record({
      organizationId: scope.organizationId,
      actorId: scope.userId,
      action: shouldApply ? 'PRICING_APPLIED' : 'PRICING_CALCULATED',
      entityType: 'proposal',
      entityId: proposalId,
      payload: { totalCost: pricing.totalCost, totalEffortManMonths: pricing.totalEffortManMonths, lineCount: pricing.lines.length },
      ipAddress: scope.ipAddress
    });

    return { pricing, proposal };
  }
}

function positiveAmount(value: unknown, field: string): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed <= 0 || parsed > 1_200) {
    throw new ValidationError(`${field} must be a number greater than 0 and at most 1200.`);
  }
  return Math.round(parsed * 100) / 100;
}
