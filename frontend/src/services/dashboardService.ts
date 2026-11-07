import { apiRequest, apiRequestWithMeta } from './apiClient';
import type { ListMeta } from '../types/auth';
import type { DashboardActivity, DashboardLead, DashboardOverview } from '../types/dashboard';

const PREFIX = '/api/v1/dashboard';

export const dashboardService = {
  getOverview: (leadLimit?: number) => {
    const query = leadLimit !== undefined ? `?leadLimit=${encodeURIComponent(String(leadLimit))}` : '';
    return apiRequest<DashboardOverview>(`${PREFIX}/overview${query}`);
  },

  listLeads: async (limit?: number): Promise<{ leads: DashboardLead[]; meta: ListMeta | null }> => {
    const query = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : '';
    const result = await apiRequestWithMeta<DashboardLead[]>(`${PREFIX}/leads${query}`);
    return { leads: result.data ?? [], meta: result.meta };
  },

  listActivity: async (limit?: number): Promise<{ activity: DashboardActivity[]; meta: ListMeta | null }> => {
    const query = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : '';
    const result = await apiRequestWithMeta<DashboardActivity[]>(`${PREFIX}/activity${query}`);
    return { activity: result.data ?? [], meta: result.meta };
  }
};
