import { apiRequest, apiRequestWithMeta } from './apiClient';
import type { ListMeta } from '../types/auth';
import type {
  PricingInputLine,
  PricingResponse,
  RateCardLevel,
  RateCardRecord
} from '../types/rateCard';

const PREFIX = '/api/v1/rate-cards';

export interface RateCardListQuery {
  page?: number;
  limit?: number;
  roleName?: string;
  level?: RateCardLevel;
  currency?: string;
  includeInactive?: boolean;
}

export interface CreateRateCardInput {
  roleName: string;
  level?: RateCardLevel;
  hourlyRateUsd?: number;
  dailyRateUsd?: number;
  monthlyRateUsd?: number | null;
  currency?: string;
  isActive?: boolean;
}

export type UpdateRateCardInput = Partial<CreateRateCardInput>;

export interface CalculatePricingInput {
  currency?: string;
  proposalId?: string | null;
  apply?: boolean;
  lines: PricingInputLine[];
}

function toQueryString(query: RateCardListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.roleName) params.set('roleName', query.roleName);
  if (query.level) params.set('level', query.level);
  if (query.currency) params.set('currency', query.currency);
  if (query.includeInactive) params.set('includeInactive', 'true');
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export const rateCardService = {
  list: async (query: RateCardListQuery = {}): Promise<{ rateCards: RateCardRecord[]; meta: ListMeta | null }> => {
    const result = await apiRequestWithMeta<RateCardRecord[]>(`${PREFIX}${toQueryString(query)}`);
    return { rateCards: result.data ?? [], meta: result.meta };
  },

  getById: (id: string) => apiRequest<RateCardRecord>(`${PREFIX}/${encodeURIComponent(id)}`),

  create: (input: CreateRateCardInput) => apiRequest<RateCardRecord>(PREFIX, { method: 'POST', body: input }),

  update: (id: string, patch: UpdateRateCardInput) =>
    apiRequest<RateCardRecord>(`${PREFIX}/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),

  delete: (id: string) => apiRequest<void>(`${PREFIX}/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  calculatePricing: (input: CalculatePricingInput) =>
    apiRequest<PricingResponse>(`${PREFIX}/pricing/calculate`, { method: 'POST', body: input })
};
