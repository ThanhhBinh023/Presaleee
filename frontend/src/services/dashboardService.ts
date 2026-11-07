import { apiRequest } from './apiClient';

export interface DashboardKpis {
  totalLeads: number;
  activeLeads: number;
  qualifiedLeads: number;
  proposalsInProgress: number;
  estimatedValueByCurrency: Array<{ currency: string; amount: number }>;
}

export interface DashboardPipelineStage {
  status: string;
  count: number;
  estimatedValueByCurrency: Array<{ currency: string; amount: number }>;
}

export interface DashboardLead {
  id: string;
  title: string;
  source: string;
  status: string;
  bantScore: number | null;
  clientName: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardOverviewData {
  kpis: DashboardKpis;
  pipeline: DashboardPipelineStage[];
  activeLeads: DashboardLead[];
  generatedAt: string;
}

export async function fetchDashboardOverview(): Promise<DashboardOverviewData | null> {
  try {
    return await apiRequest<DashboardOverviewData>('/api/v1/dashboard/overview');
  } catch (err) {
    console.error('Failed to fetch dashboard overview:', err);
    return null;
  }
}
