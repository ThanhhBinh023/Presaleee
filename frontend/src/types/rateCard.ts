export const RATE_CARD_LEVELS = ['JUNIOR', 'MID', 'SENIOR', 'LEAD'] as const;
export type RateCardLevel = (typeof RATE_CARD_LEVELS)[number];

export type RateSource = 'RATE_CARD' | 'MANUAL_OVERRIDE';

export interface RateCardRecord {
  id: string;
  organizationId: string;
  roleName: string;
  level: RateCardLevel;
  hourlyRateUsd: number;
  dailyRateUsd: number;
  monthlyRateUsd: number | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export interface PricingResponse {
  pricing: PricingCalculationResult;
  proposal: { id: string; title: string; totalCost: number | null; currency: string } | null;
}

export interface ProposalSummary {
  id: string;
  title: string;
  status: string;
  totalCost: number | null;
  currency: string;
  leadId: string | null;
}
