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

function currencyOf(card: RateCard): string {
  return (card.currency || 'USD').toUpperCase();
}

/** Resolution order mirrors resolveMonthlyRate: explicit monthly, then daily x 21, then hourly x 8 x 21. */
export function deriveMonthlyRate(card: Pick<RateCard, 'hourlyRateUsd' | 'dailyRateUsd'>): number | null {
  if (card.dailyRateUsd > 0) return round(card.dailyRateUsd * BILLABLE_DAYS_PER_MONTH);
  if (card.hourlyRateUsd > 0) return round(card.hourlyRateUsd * BILLABLE_HOURS_PER_DAY * BILLABLE_DAYS_PER_MONTH);
  return null;
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
      const resolution = resolveRateCard(line, rateCardsById, input.rateCards, input.currency);
      if (resolution.conflict) {
        throw new PricingCalculationError(
          'MIXED_CURRENCY',
          `Rate card "${resolution.conflict.roleName}" has currency ${currencyOf(resolution.conflict)}, but this quotation is calculated in currency ${input.currency}. Create a ${input.currency} rate card or override the monthly rate.`
        );
      }
      resolvedCard = resolution.card;
      if (!resolvedCard) {
        throw new PricingCalculationError(
          'UNKNOWN_ROLE',
          `No active rate card matches role "${line.roleName}"${line.level ? ` at level ${line.level}` : ''} in currency ${input.currency}. Provide rateCardId, monthlyRateOverride, or create the rate card first.`
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
      level: resolvedCard?.level ?? line.level ?? null,
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

interface RateCardResolution {
  card?: RateCard;
  /** A card matched the role/level but is priced in another currency. */
  conflict?: RateCard;
}

function resolveRateCard(
  line: PricingInputLine,
  rateCardsById: Map<string, RateCard>,
  rateCards: RateCard[],
  currency: string
): RateCardResolution {
  if (line.rateCardId) {
    const card = rateCardsById.get(line.rateCardId);
    if (!card || !card.isActive) return {};
    if (currencyOf(card) !== currency) return { conflict: card };
    return { card };
  }
  const roleName = line.roleName.trim().toLowerCase();
  const sameRole = rateCards.filter(card => card.isActive && card.roleName.trim().toLowerCase() === roleName);
  const levelMatched = line.level ? sameRole.filter(card => card.level === line.level) : sameRole;
  const candidates = levelMatched.length ? levelMatched : sameRole;
  const inCurrency = candidates.filter(card => currencyOf(card) === currency);
  if (inCurrency.length) return { card: inCurrency[0] };
  return candidates.length ? { conflict: candidates[0] } : {};
}

function resolveMonthlyRate(card: RateCard): number {
  if (card.monthlyRateUsd !== null && Number.isFinite(card.monthlyRateUsd)) return round(card.monthlyRateUsd);
  return deriveMonthlyRate(card) ?? 0;
}
