import {
  BILLABLE_DAYS_PER_MONTH,
  BILLABLE_HOURS_PER_DAY,
  PricingCalculationResult,
  PricingInputLine,
  PricingOutputLine
} from '../entities/Pricing.js';
import { RateCard } from '../entities/RateCard.js';

export class PricingCalculationError extends Error {
  constructor(
    public readonly code: 'NO_LINES' | 'TOO_MANY_LINES' | 'INVALID_EFFORT' | 'INVALID_RATE' | 'UNKNOWN_ROLE' | 'MIXED_CURRENCY',
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'PricingCalculationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface PricingCalculationInput {
  lines: PricingInputLine[];
  currency: string;
  rateCards: RateCard[];
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * The LLM proposes staffing effort only; every monetary figure is derived here so
 * totals never come from model arithmetic.
 */
export function calculatePricing(input: PricingCalculationInput): PricingCalculationResult {
  if (input.lines.length === 0) throw new PricingCalculationError('NO_LINES', 'At least one staffing line is required.');
  if (input.lines.length > 100) throw new PricingCalculationError('TOO_MANY_LINES', 'A quotation supports at most 100 staffing lines.');

  const rateCardsById = new Map(input.rateCards.map(card => [card.id, card]));
  const lines: PricingOutputLine[] = [];
  let totalCost = 0;
  let totalEffort = 0;

  for (const line of input.lines) {
    if (!Number.isFinite(line.manMonths) || line.manMonths <= 0 || line.manMonths > 1_200) {
      throw new PricingCalculationError('INVALID_EFFORT', `manMonths must be greater than 0 and at most 1200 for role "${line.roleName}".`);
    }

    let monthlyRate: number;
    let rateSource: PricingOutputLine['rateSource'];
    let resolvedCard: RateCard | undefined;

    if (line.monthlyRateOverride !== undefined && line.monthlyRateOverride !== null) {
      if (!Number.isFinite(line.monthlyRateOverride) || line.monthlyRateOverride < 0) {
        throw new PricingCalculationError('INVALID_RATE', `monthlyRateOverride must be a non-negative number for role "${line.roleName}".`);
      }
      monthlyRate = round(line.monthlyRateOverride);
      rateSource = 'MANUAL_OVERRIDE';
    } else {
      resolvedCard = resolveRateCard(line, rateCardsById, input.rateCards);
      if (!resolvedCard) {
        throw new PricingCalculationError(
          'UNKNOWN_ROLE',
          `No active rate card matches role "${line.roleName}"${line.level ? ` at level ${line.level}` : ''}. Provide rateCardId, monthlyRateOverride, or create the rate card first.`
        );
      }
      monthlyRate = resolveMonthlyRate(resolvedCard);
      rateSource = 'RATE_CARD';
    }

    const lineCost = round(line.manMonths * monthlyRate);
    totalEffort = round(totalEffort + line.manMonths);
    totalCost = round(totalCost + lineCost);
    lines.push({
      roleName: line.roleName,
      level: line.level ?? resolvedCard?.level ?? null,
      rateCardId: resolvedCard?.id ?? line.rateCardId ?? null,
      manMonths: line.manMonths,
      monthlyRate,
      totalCost: lineCost,
      rateSource
    });
  }

  return {
    currency: input.currency,
    totalEffortManMonths: totalEffort,
    totalCost,
    billableDaysPerMonth: BILLABLE_DAYS_PER_MONTH,
    billableHoursPerDay: BILLABLE_HOURS_PER_DAY,
    lines
  };
}

function resolveRateCard(line: PricingInputLine, rateCardsById: Map<string, RateCard>, rateCards: RateCard[]): RateCard | undefined {
  if (line.rateCardId) {
    const card = rateCardsById.get(line.rateCardId);
    return card && card.isActive ? card : undefined;
  }
  const roleName = line.roleName.trim().toLowerCase();
  const sameRole = rateCards.filter(card => card.isActive && card.roleName.trim().toLowerCase() === roleName);
  const levelMatched = line.level ? sameRole.filter(card => card.level === line.level) : sameRole;
  return levelMatched[0] ?? sameRole[0];
}

function resolveMonthlyRate(card: RateCard): number {
  if (card.monthlyRateUsd !== null && Number.isFinite(card.monthlyRateUsd)) return round(card.monthlyRateUsd);
  if (card.dailyRateUsd > 0) return round(card.dailyRateUsd * BILLABLE_DAYS_PER_MONTH);
  return round(card.hourlyRateUsd * BILLABLE_HOURS_PER_DAY * BILLABLE_DAYS_PER_MONTH);
}
