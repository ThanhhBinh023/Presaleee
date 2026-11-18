import type { LeadStatus } from './lead';

export const DASHBOARD_PIPELINE_STATUSES: readonly LeadStatus[] = [
  'NEW',
  'IN_REVIEW',
  'QUALIFYING',
  'QUALIFIED',
  'PROPOSAL_DRAFTING',
  'APPROVED',
  'REJECTED',
  'WON',
  'LOST'
];

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface DashboardKpis {
  totalLeads: number;
  activeLeads: number;
  qualifiedLeads: number;
  proposalsInProgress: number;
  estimatedValueByCurrency: CurrencyAmount[];
}

export interface DashboardPipelineStage {
  status: LeadStatus;
  count: number;
  estimatedValueByCurrency: CurrencyAmount[];
}

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

export type DashboardActivityType = 'LEAD_CREATED' | 'LEAD_UPDATED' | 'PROPOSAL_CREATED' | 'PROPOSAL_UPDATED';

export interface DashboardActivity {
  id: string;
  type: DashboardActivityType;
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

export interface IntakeTrendPoint {
  date: string;
  count: number;
}

export interface ScoreDistributionTier {
  tier: string;
  label: string;
  range: string;
  count: number;
  percentage: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
  percentage: number;
}

export interface SourceBreakdownItem {
  source: string;
  count: number;
  percentage: number;
}

export interface MeetingTrendPoint {
  date: string;
  count: number;
}

export interface PortalSessionAuditItem {
  id: string;
  proposalId: string;
  proposalTitle: string;
  leadTitle?: string | null;
  clientEmail: string;
  clientName: string | null;
  expiresAt: string;
  revokedAt: string | null;
  lastAccessedAt: string | null;
  createdAt: string;
  createdByName?: string | null;
  commentCount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}

export interface AdminPlatformAnalytics {
  timeHorizon: '7d' | '30d' | '90d' | '365d' | 'all';
  generatedAt: string;
  intakeAnalytics: {
    totalIntakes: number;
    trend: IntakeTrendPoint[];
    growthPercentage: number;
  };
  workspaceBantAnalytics: {
    averageScore: number;
    totalScored: number;
    scoreDistribution: ScoreDistributionTier[];
    scoredLeads: Array<{
      id: string;
      title: string;
      bantScore: number;
      status: string;
      clientName: string | null;
      createdAt: string;
    }>;
  };
  leadPipelineAnalytics: {
    totalLeads: number;
    statusBreakdown: StatusBreakdownItem[];
    sourceBreakdown: SourceBreakdownItem[];
  };
  discoveryMeetingAnalytics: {
    totalMeetings: number;
    trend: MeetingTrendPoint[];
    withGapAnalysis: number;
  };
  systemResourceTelemetry: {
    totalActiveUsers: number;
    totalProposals: number;
    totalKnowledgeDocs: number;
    auditEventsCount: number;
  };
  portalSessionAnalytics?: {
    totalSessions: number;
    activeSessions: number;
    expiredOrRevokedSessions: number;
    accessedSessions: number;
    sessions: PortalSessionAuditItem[];
  };
}
