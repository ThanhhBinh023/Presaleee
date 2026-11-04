import { LeadStatus } from './Lead.js';

export interface DashboardKpis {
  totalLeads: number;
  activeLeads: number;
  qualifiedLeads: number;
  proposalsInProgress: number;
  estimatedValueByCurrency: Array<{ currency: string; amount: number }>;
}

export interface DashboardPipelineStage {
  status: LeadStatus;
  count: number;
  estimatedValueByCurrency: Array<{ currency: string; amount: number }>;
}

export const DASHBOARD_PIPELINE_STATUSES: readonly LeadStatus[] = [
  'NEW', 'IN_REVIEW', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL_DRAFTING', 'APPROVED', 'REJECTED', 'WON', 'LOST'
];

export interface DashboardLead {
  id: string;
  title: string;
  source: string;
  status: LeadStatus;
  bantScore: number | null;
  clientName: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardActivity {
  id: string;
  type: 'LEAD_CREATED' | 'LEAD_UPDATED' | 'PROPOSAL_CREATED' | 'PROPOSAL_UPDATED';
  entityId: string;
  title: string;
  status: string;
  occurredAt: string;
}

export interface DashboardOverview {
  kpis: DashboardKpis;
  pipeline: DashboardPipelineStage[];
  activeLeads: DashboardLead[];
  generatedAt: string;
}
