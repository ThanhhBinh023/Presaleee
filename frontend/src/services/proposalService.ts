import { apiRequestWithMeta } from './apiClient';
import type { ListMeta } from '../types/auth';
import type { ProposalSummary } from '../types/rateCard';

export const proposalService = {
  list: async (query: { page?: number; limit?: number } = {}): Promise<{ proposals: ProposalSummary[]; meta: ListMeta | null }> => {
    const params = new URLSearchParams();
    if (query.page !== undefined) params.set('page', String(query.page));
    if (query.limit !== undefined) params.set('limit', String(query.limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const result = await apiRequestWithMeta<ProposalSummary[]>(`/api/v1/proposals${suffix}`);
    return { proposals: result.data ?? [], meta: result.meta };
  }
};
