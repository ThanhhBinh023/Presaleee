import { RateCardLevel } from './RateCard.js';

export const BILLABLE_DAYS_PER_MONTH = 21;
export const BILLABLE_HOURS_PER_DAY = 8;

export type RateSource = 'RATE_CARD' | 'MANUAL_OVERRIDE';

export interface PricingInputLine {
  roleName: string;
  level?: RateCardLevel;
  rateCardId?: string | null;
  manMonths: number;
  monthlyRateOverride?: number | null;
}

export interface PricingOutputLine {
  roleName: string;
  level: RateCardLevel | null;
  rateCardId: string | null;
  manMonths: number;
  monthlyRate: number;
  totalCost: number;
  rateSource: RateSource;
}

export interface PricingCalculationResult {
  currency: string;
  totalEffortManMonths: number;
  totalCost: number;
  billableDaysPerMonth: number;
  billableHoursPerDay: number;
  lines: PricingOutputLine[];
}
