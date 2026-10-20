import { RateCard, RateCardLevel } from '../entities/RateCard.js';

export interface RateCardScope {
  organizationId: string;
}

export interface ListRateCardFilters extends RateCardScope {
  page: number;
  limit: number;
  level?: RateCardLevel;
  roleName?: string;
  currency?: string;
  includeInactive: boolean;
}

export interface RateCardInput extends RateCardScope {
  roleName: string;
  level: RateCardLevel;
  hourlyRateUsd: number;
  dailyRateUsd: number;
  monthlyRateUsd: number | null;
  currency: string;
  isActive: boolean;
}

export type UpdateRateCardInput = Partial<RateCardInput>;

export interface IRateCardRepository {
  create(input: RateCardInput): Promise<RateCard>;
  list(filters: ListRateCardFilters): Promise<{ rateCards: RateCard[]; total: number }>;
  findById(id: string, scope: RateCardScope): Promise<RateCard | null>;
  update(id: string, scope: RateCardScope, input: UpdateRateCardInput): Promise<RateCard | null>;
  delete(id: string, scope: RateCardScope): Promise<boolean>;
  listActive(organizationId: string, currency?: string): Promise<RateCard[]>;
}
