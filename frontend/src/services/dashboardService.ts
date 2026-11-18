import { apiRequest, apiRequestWithMeta } from './apiClient';
import type { ListMeta } from '../types/auth';
import type { AdminPlatformAnalytics, DashboardActivity, DashboardLead, DashboardOverview } from '../types/dashboard';

const PREFIX = '/api/v1/dashboard';

export const dashboardService = {
  getOverview: (leadLimit?: number) => {
    const query = leadLimit !== undefined ? `?leadLimit=${encodeURIComponent(String(leadLimit))}` : '';
    return apiRequest<DashboardOverview>(`${PREFIX}/overview${query}`);
  },

  getAdminAnalytics: (period?: string) => {
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    return apiRequest<AdminPlatformAnalytics>(`${PREFIX}/admin-analytics${query}`);
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
  },

  exportExcel: async (period?: string): Promise<Blob> => {
    const token = localStorage.getItem('presaleee_access_token') || localStorage.getItem('presaleee_auth_token');
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    const res = await fetch(`${PREFIX}/admin/export-excel${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error('Không thể xuất báo cáo Excel từ hệ thống.');
    return res.blob();
  },

  exportPdf: async (period?: string): Promise<Blob> => {
    const token = localStorage.getItem('presaleee_access_token') || localStorage.getItem('presaleee_auth_token');
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    const res = await fetch(`${PREFIX}/admin/export-pdf${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error('Không thể xuất báo cáo PDF từ hệ thống.');
    return res.blob();
  },

  revokePortalSession: (sessionId: string) => {
    return apiRequest<void>(`/api/v1/portal/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
  }
};
