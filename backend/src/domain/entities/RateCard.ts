export const RATE_CARD_LEVELS = ['JUNIOR', 'MID', 'SENIOR', 'LEAD'] as const;
export type RateCardLevel = typeof RATE_CARD_LEVELS[number];

export interface RateCard {
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
